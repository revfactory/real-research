import Anthropic from '@anthropic-ai/sdk';
import type { PhaseResult, FactCheckItem } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateReport(
  topic: string,
  phaseResults: PhaseResult[],
  factChecks: FactCheckItem[],
): Promise<{ executiveSummary: string; fullReport: string }> {
  // Compile all phase results
  const phaseContents = phaseResults.map(phase => {
    const taskContents = phase.tasks
      .map(t => `### Task ${t.taskId}: ${t.taskName}\n${t.content}`)
      .join('\n\n');
    return `## Phase ${phase.phase}\n${taskContents}`;
  }).join('\n\n---\n\n');

  // Compile fact check summary
  const factCheckSummary = factChecks.map((fc, i) => {
    return `${i + 1}. [${fc.grade}] ${fc.claim}`;
  }).join('\n');

  const gradeDistribution = {
    A: factChecks.filter(fc => fc.grade === 'A').length,
    B: factChecks.filter(fc => fc.grade === 'B').length,
    C: factChecks.filter(fc => fc.grade === 'C').length,
    D: factChecks.filter(fc => fc.grade === 'D').length,
    F: factChecks.filter(fc => fc.grade === 'F').length,
  };

  // Generate executive summary
  const summaryResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: '당신은 경영 보고서 작성 전문가입니다. 핵심을 간결하게 요약하세요.',
    messages: [
      {
        role: 'user',
        content: `다음 리서치 결과의 Executive Summary를 300~500자로 작성하세요.
핵심 발견, 주요 위험, 권고사항을 포함하세요.

주제: ${topic}

Phase 결과:
${phaseContents.slice(0, 8000)}

팩트체크: ${factCheckSummary}`,
      },
    ],
  });

  let executiveSummary = '';
  for (const block of summaryResponse.content) {
    if (block.type === 'text') {
      executiveSummary += block.text;
    }
  }

  // Generate full report
  const reportResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `당신은 리서치 보고서 편집장입니다. 모든 분석 결과를 하나의 완성된 보고서로 통합하세요.
반드시 마크다운 형식으로 작성하세요. GFM 테이블을 활용하세요.
Red Flag 항목에는 반드시 별도 섹션을 만들어 표시하세요.`,
    messages: [
      {
        role: 'user',
        content: `## 주제: ${topic}

## Executive Summary:
${executiveSummary}

## Phase별 분석 결과:
${phaseContents.slice(0, 15000)}

## 팩트체크 결과:
${factCheckSummary}

등급 분포: A(${gradeDistribution.A}) B(${gradeDistribution.B}) C(${gradeDistribution.C}) D(${gradeDistribution.D}) F(${gradeDistribution.F})

---

위 모든 내용을 통합하여 최종 리서치 보고서를 작성하세요.

보고서 구조:
1. **Executive Summary** (이미 작성됨, 그대로 포함)
2. **심층 분석 결과** (Phase 1 핵심)
   - 핵심 인사이트
   - 근거 강도 평가
   - 교차 검증 결과
3. **비판적 분석** (Phase 2 핵심)
   - 방법론적 한계
   - 숨겨진 가정
   - 미답 질문
4. **지식 프레임워크** (Phase 3 핵심)
   - MECE 프레임워크
   - 미래 시나리오
5. **실전 전략** (Phase 4 핵심)
   - 이해관계자별 메시지
   - 실행 마스터플랜
6. **팩트체크 요약**
   - 등급 분포
   - 주의 필요 항목 (D, F 등급)
7. **Red Flag 항목** (주의가 필요한 모든 항목 모음)
8. **부록**
   - 소스 신뢰도
   - 방법론 설명

마크다운으로 완성도 높게 작성하세요.`,
      },
    ],
  });

  let fullReport = '';
  for (const block of reportResponse.content) {
    if (block.type === 'text') {
      fullReport += block.text;
    }
  }

  return { executiveSummary, fullReport };
}
