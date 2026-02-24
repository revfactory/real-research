import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from 'dotenv';
config({ path: '.env.local' });

const RESEARCH_ID = process.argv[2];
if (!RESEARCH_ID) {
  console.error('Usage: npx tsx scripts/regenerate-report.ts <research-id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  console.log(`[1/5] 리서치 데이터 조회: ${RESEARCH_ID}`);

  const { data: research, error: researchErr } = await supabase
    .from('research')
    .select('*')
    .eq('id', RESEARCH_ID)
    .single();

  if (researchErr || !research) {
    console.error('리서치를 찾을 수 없습니다:', researchErr);
    process.exit(1);
  }

  console.log(`   주제: ${research.topic}`);

  // Phase results
  const { data: phaseRows } = await supabase
    .from('research_phase_result')
    .select('*')
    .eq('research_id', RESEARCH_ID)
    .order('phase', { ascending: true })
    .order('task_id', { ascending: true });

  // Fact checks
  const { data: factRows } = await supabase
    .from('fact_check_result')
    .select('*')
    .eq('research_id', RESEARCH_ID)
    .order('phase', { ascending: true });

  console.log(`   Phase 결과: ${phaseRows?.length || 0}개`);
  console.log(`   팩트체크: ${factRows?.length || 0}개`);

  // Build phase results
  const phaseMap = new Map<number, { taskId: string; taskName: string; content: string }[]>();
  for (const row of phaseRows || []) {
    if (!phaseMap.has(row.phase)) phaseMap.set(row.phase, []);
    phaseMap.get(row.phase)!.push({
      taskId: row.task_id,
      taskName: row.task_name,
      content: row.content || '[결과 없음]',
    });
  }

  const phaseContents = Array.from(phaseMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([phase, tasks]) => {
      const taskContents = tasks
        .map(t => `### Task ${t.taskId}: ${t.taskName}\n${t.content}`)
        .join('\n\n');
      return `## Phase ${phase}\n${taskContents}`;
    })
    .join('\n\n---\n\n');

  const factCheckSummary = (factRows || [])
    .map((fc, i) => `${i + 1}. [${fc.grade}] ${fc.claim}`)
    .join('\n');

  const gradeDistribution = {
    A: (factRows || []).filter(fc => fc.grade === 'A').length,
    B: (factRows || []).filter(fc => fc.grade === 'B').length,
    C: (factRows || []).filter(fc => fc.grade === 'C').length,
    D: (factRows || []).filter(fc => fc.grade === 'D').length,
    F: (factRows || []).filter(fc => fc.grade === 'F').length,
  };

  // Generate executive summary
  console.log(`[2/5] Executive Summary 생성 중...`);
  const summaryResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: '당신은 경영 보고서 작성 전문가입니다. 핵심을 간결하게 요약하세요.',
    messages: [{
      role: 'user',
      content: `다음 리서치 결과의 Executive Summary를 300~500자로 작성하세요.
핵심 발견, 주요 위험, 권고사항을 포함하세요.

주제: ${research.topic}

Phase 결과:
${phaseContents.slice(0, 8000)}

팩트체크: ${factCheckSummary}`,
    }],
  });

  let executiveSummary = '';
  for (const block of summaryResponse.content) {
    if (block.type === 'text') executiveSummary += block.text;
  }
  console.log(`   Summary 길이: ${executiveSummary.length}자`);

  // Generate full report
  console.log(`[3/5] 전체 보고서 생성 중...`);
  const reportResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `당신은 리서치 보고서 편집장입니다. 모든 분석 결과를 하나의 완성된 보고서로 통합하세요.
반드시 마크다운 형식으로 작성하세요. GFM 테이블을 활용하세요.
Red Flag 항목에는 반드시 별도 섹션을 만들어 표시하세요.`,
    messages: [{
      role: 'user',
      content: `## 주제: ${research.topic}

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
3. **비판적 분석** (Phase 2 핵심)
4. **지식 프레임워크** (Phase 3 핵심)
5. **실전 전략** (Phase 4 핵심)
6. **팩트체크 요약**
7. **Red Flag 항목**
8. **부록**

마크다운으로 완성도 높게 작성하세요.`,
    }],
  });

  let fullReport = '';
  for (const block of reportResponse.content) {
    if (block.type === 'text') fullReport += block.text;
  }
  console.log(`   Report 길이: ${fullReport.length}자`);

  // Generate embedding
  console.log(`[4/5] 임베딩 생성 중...`);
  let embedding: number[] | null = null;
  try {
    const embResponse = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: executiveSummary,
      dimensions: 1536,
    });
    embedding = embResponse.data[0].embedding;
    console.log(`   임베딩: ${embedding.length}차원`);
  } catch (err) {
    console.warn('   임베딩 생성 실패 (비필수):', err);
  }

  // Upsert report
  console.log(`[5/5] DB 저장 중...`);

  // Delete existing report if any
  await supabase.from('research_report').delete().eq('research_id', RESEARCH_ID);

  const { error: insertError } = await supabase.from('research_report').insert({
    research_id: RESEARCH_ID,
    executive_summary: executiveSummary,
    full_report: fullReport,
    embedding: embedding ? `[${embedding.join(',')}]` : null,
  });

  if (insertError) {
    console.error('DB 저장 실패:', insertError);
    process.exit(1);
  }

  // Update research status to completed
  await supabase.from('research').update({
    status: 'completed',
    progress_percent: 100,
    current_step: '완료',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', RESEARCH_ID);

  console.log('\n완료! 보고서가 저장되었습니다.');
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
