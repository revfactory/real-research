import Anthropic from '@anthropic-ai/sdk';
import { searchWithOpenAI } from '@/lib/ai/openai-search';
import { searchWithAnthropic } from '@/lib/ai/anthropic-search';
import { searchWithGemini } from '@/lib/ai/gemini-search';
import type { PhaseResult, FactCheckItem } from './types';
import type { SSEEvent, TrustGrade } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runFactCheck(
  topic: string,
  phaseResults: PhaseResult[],
  emit: (event: SSEEvent) => void,
): Promise<FactCheckItem[]> {
  // Step 1: Extract key claims from phase results
  const allContent = phaseResults
    .flatMap(p => p.tasks.map(t => t.content))
    .join('\n\n');

  const claimsResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: '당신은 팩트체크 전문가입니다. 주어진 텍스트에서 검증이 필요한 핵심 주장들을 추출하세요.',
    messages: [
      {
        role: 'user',
        content: `다음 리서치 결과에서 사실 여부를 검증해야 할 핵심 주장 5~8개를 추출하세요.
각 주장은 한 줄로 간결하게 작성하세요.
주장만 번호를 매겨 나열하세요 (다른 설명 없이).

주제: ${topic}

분석 결과:
${allContent.slice(0, 10000)}`,
      },
    ],
  });

  let claimsText = '';
  for (const block of claimsResponse.content) {
    if (block.type === 'text') {
      claimsText += block.text;
    }
  }

  // Parse claims
  const claims = claimsText
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 10);

  const factChecks: FactCheckItem[] = [];

  emit({
    type: 'fact_check_start',
    message: `${claims.length}개 핵심 주장 추출 완료, 3사 교차 검증 시작`,
  });

  // Step 2: Verify each claim with 3 providers in parallel
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    emit({
      type: 'fact_check_start',
      message: `주장 ${i + 1}/${claims.length} 검증 중: ${claim.slice(0, 60)}...`,
    });

    // Find which phase this claim most likely belongs to
    let claimPhase = 1;
    for (const phaseResult of phaseResults) {
      for (const task of phaseResult.tasks) {
        if (task.content.includes(claim.slice(0, 30))) {
          claimPhase = phaseResult.phase;
          break;
        }
      }
    }

    // Verify with all 3 providers in parallel
    const [openaiResult, anthropicResult, geminiResult] = await Promise.allSettled([
      searchWithOpenAI({ query: claim, mode: 'verify' }),
      searchWithAnthropic({ query: claim, mode: 'verify' }),
      searchWithGemini({ query: claim, mode: 'verify' }),
    ]);

    const openaiText = openaiResult.status === 'fulfilled' && !openaiResult.value.error
      ? openaiResult.value.text : null;
    const anthropicText = anthropicResult.status === 'fulfilled' && !anthropicResult.value.error
      ? anthropicResult.value.text : null;
    const geminiText = geminiResult.status === 'fulfilled' && !geminiResult.value.error
      ? geminiResult.value.text : null;

    // Get confidence score from Gemini if available
    let confidenceScore: number | undefined;
    if (geminiResult.status === 'fulfilled' && geminiResult.value.citations.length > 0) {
      const scores = geminiResult.value.citations
        .map(c => c.startIndex) // Use as proxy for confidence
        .filter((s): s is number => s !== undefined);
      if (scores.length > 0) {
        // Get average confidence from Gemini sources
        const geminiSources = geminiResult.value.sources;
        const confScores = geminiSources
          .map(s => s.confidenceScore)
          .filter((s): s is number => s !== undefined);
        if (confScores.length > 0) {
          confidenceScore = confScores.reduce((a, b) => a + b, 0) / confScores.length;
        }
      }
    }

    // Determine grade based on provider agreement
    const grade = determineGrade(openaiText, anthropicText, geminiText);

    factChecks.push({
      claim,
      phase: claimPhase,
      openaiResult: openaiText || undefined,
      anthropicResult: anthropicText || undefined,
      geminiResult: geminiText || undefined,
      grade,
      confidenceScore,
      notes: `검증 결과: ${grade === 'A' ? '3사 일치' : grade === 'B' ? '2사 확인' : grade === 'C' ? '1사 확인' : grade === 'D' ? '부분 불일치' : '오류/상충'}`,
    });
  }

  return factChecks;
}

function determineGrade(
  openaiText: string | null,
  anthropicText: string | null,
  geminiText: string | null,
): TrustGrade {
  const availableResults = [openaiText, anthropicText, geminiText].filter(Boolean);

  if (availableResults.length === 0) return 'F';
  if (availableResults.length === 1) return 'C';

  // Simple heuristic: check if results generally agree
  // Look for contradictory signals
  const contradictionKeywords = ['아니', '틀린', '잘못', '거짓', '부정확', '반박', 'incorrect', 'false', 'wrong', 'inaccurate'];
  const confirmationKeywords = ['맞', '확인', '사실', '정확', '일치', '근거', 'correct', 'true', 'confirmed', 'verified'];

  let confirmCount = 0;
  let contradictCount = 0;

  for (const text of availableResults) {
    if (!text) continue;
    const lower = text.toLowerCase();
    const hasContradiction = contradictionKeywords.some(k => lower.includes(k));
    const hasConfirmation = confirmationKeywords.some(k => lower.includes(k));

    if (hasConfirmation && !hasContradiction) {
      confirmCount++;
    } else if (hasContradiction) {
      contradictCount++;
    } else {
      confirmCount++; // Default to confirmation if neutral
    }
  }

  if (contradictCount > 0 && confirmCount > 0) return 'D';
  if (contradictCount >= 2) return 'F';

  if (confirmCount >= 3) return 'A';
  if (confirmCount >= 2) return 'B';
  if (confirmCount >= 1) return 'C';

  return 'D';
}
