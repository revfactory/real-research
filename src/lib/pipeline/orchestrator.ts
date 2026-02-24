import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { PipelineContext, PhaseResult } from './types';
import type { ResearchStatus } from '@/types';
import { multiSearch } from '@/lib/ai/multi-search';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { runPhase1 } from './phase1-deep-analysis';
import { runPhase2 } from './phase2-red-team';
import { runPhase3 } from './phase3-knowledge';
import { runPhase4 } from './phase4-strategy';
import { runFactCheck } from './fact-checker';
import { generateReport } from './report-generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createServiceClient(): any {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function updateResearch(
  researchId: string,
  updates: {
    status?: ResearchStatus;
    current_phase?: number;
    current_step?: string;
    progress_percent?: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  }
) {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('research') as any).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', researchId);
}

async function updateTaskStatus(
  researchId: string,
  taskId: string,
  updates: {
    status?: string;
    content?: string;
    started_at?: string;
    completed_at?: string;
    ai_model_used?: string;
    token_usage?: Record<string, unknown>;
  }
) {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('research_phase_result') as any).update(updates).eq('research_id', researchId).eq('task_id', taskId);
}

export async function runPipeline(context: PipelineContext): Promise<void> {
  const { researchId, topic, description, emit } = context;

  try {
    // Mark as started
    await updateResearch(researchId, {
      status: 'collecting',
      started_at: new Date().toISOString(),
      progress_percent: 5,
      current_step: '3사 AI 웹 검색 시작',
    });

    emit({
      type: 'search_progress',
      message: '3사 AI 웹 검색을 시작합니다...',
      progress: 5,
    });

    // Phase 0: Multi-provider search
    const searchQuery = description ? `${topic}. ${description}` : topic;
    const searchResult = await multiSearch({
      query: searchQuery,
      mode: 'search',
      language: 'both',
    });

    // Save sources to DB
    const supabase = createServiceClient();
    for (const providerResult of searchResult.results) {
      if (providerResult.error) continue;
      for (const source of providerResult.sources) {
        const isCrossValidated = searchResult.crossValidatedUrls.includes(source.url);
        await supabase.from('research_source').insert({
          research_id: researchId,
          provider: providerResult.provider,
          title: source.title,
          url: source.url,
          snippet: source.snippet || null,
          source_type: source.sourceType || 'other',
          reliability_score: source.confidenceScore ? Math.round(source.confidenceScore * 5) : null,
          cross_validated: isCrossValidated,
          page_age: source.pageAge || null,
          raw_data: null,
        });
      }
    }

    emit({
      type: 'search_progress',
      message: `웹 검색 완료: ${searchResult.allSources.length}개 소스 수집`,
      progress: 15,
    });

    await updateResearch(researchId, {
      progress_percent: 15,
      current_step: '웹 검색 완료',
    });

    // Collect source texts for analysis
    const sourceSummary = searchResult.results
      .filter(r => !r.error)
      .map(r => `[${r.provider}]\n${r.text}`)
      .join('\n\n---\n\n');

    // Phase 1: Deep Analysis
    await updateResearch(researchId, {
      status: 'phase1',
      current_phase: 1,
      current_step: 'Phase 1: 심층 분석 시작',
      progress_percent: 20,
    });

    emit({ type: 'phase_start', phase: 1, message: 'Phase 1: 심층 분석을 시작합니다', progress: 20 });

    const phase1Result = await executePhase(
      context, 1, sourceSummary,
      (taskId) => runPhase1(topic, sourceSummary, taskId, emit),
      ['1.1', '1.2', '1.3'],
      20, 35,
    );

    // Phase 2: Red Team
    await updateResearch(researchId, {
      status: 'phase2',
      current_phase: 2,
      current_step: 'Phase 2: 비판적 사고 시작',
      progress_percent: 40,
    });

    emit({ type: 'phase_start', phase: 2, message: 'Phase 2: 비판적 사고를 시작합니다', progress: 40 });

    const phase1Content = phase1Result.tasks.map(t => t.content).join('\n\n');
    const phase2Result = await executePhase(
      context, 2, `${sourceSummary}\n\n[Phase 1 결과]\n${phase1Content}`,
      (taskId) => runPhase2(topic, sourceSummary, phase1Content, taskId, emit),
      ['2.1', '2.2', '2.3'],
      40, 55,
    );

    // Phase 3: Knowledge Integration
    await updateResearch(researchId, {
      status: 'phase3',
      current_phase: 3,
      current_step: 'Phase 3: 지식 통합 시작',
      progress_percent: 60,
    });

    emit({ type: 'phase_start', phase: 3, message: 'Phase 3: 지식 통합을 시작합니다', progress: 60 });

    const phase2Content = phase2Result.tasks.map(t => t.content).join('\n\n');
    const phase3Result = await executePhase(
      context, 3, `${sourceSummary}\n\n[Phase 1 결과]\n${phase1Content}\n\n[Phase 2 결과]\n${phase2Content}`,
      (taskId) => runPhase3(topic, sourceSummary, phase1Content, phase2Content, taskId, emit),
      ['3.1', '3.2'],
      60, 70,
    );

    // Phase 4: Strategy
    await updateResearch(researchId, {
      status: 'phase4',
      current_phase: 4,
      current_step: 'Phase 4: 실전 적용 시작',
      progress_percent: 75,
    });

    emit({ type: 'phase_start', phase: 4, message: 'Phase 4: 실전 적용을 시작합니다', progress: 75 });

    const phase3Content = phase3Result.tasks.map(t => t.content).join('\n\n');
    const phase4Result = await executePhase(
      context, 4, `${sourceSummary}\n\n모든 이전 분석 결과`,
      (taskId) => runPhase4(topic, phase1Content, phase2Content, phase3Content, taskId, emit),
      ['4.1', '4.2'],
      75, 85,
    );

    // Fact Checking
    await updateResearch(researchId, {
      status: 'finalizing',
      current_step: '팩트체크 진행 중',
      progress_percent: 87,
    });

    emit({ type: 'fact_check_start', message: '팩트체크를 시작합니다', progress: 87 });

    const allPhaseResults = [phase1Result, phase2Result, phase3Result, phase4Result];
    const factChecks = await runFactCheck(topic, allPhaseResults, emit);

    // Save fact checks to DB
    for (const fc of factChecks) {
      await supabase.from('fact_check_result').insert({
        research_id: researchId,
        phase: fc.phase,
        claim: fc.claim,
        grade: fc.grade,
        openai_result: fc.openaiResult || null,
        anthropic_result: fc.anthropicResult || null,
        gemini_result: fc.geminiResult || null,
        confidence_score: fc.confidenceScore || null,
        notes: fc.notes || null,
      });
    }

    emit({ type: 'fact_check_complete', message: `팩트체크 완료: ${factChecks.length}개 주장 검증`, progress: 92 });

    // Report Generation
    await updateResearch(researchId, {
      current_step: '최종 보고서 생성 중',
      progress_percent: 93,
    });

    const report = await generateReport(topic, allPhaseResults, factChecks);

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    try {
      const embeddingResult = await generateEmbedding(report.executiveSummary);
      embedding = embeddingResult.embedding;
    } catch {
      // Embedding failure is non-critical
    }

    // Save report to DB
    console.log(`[Pipeline] Saving report for ${researchId}, summary length: ${report.executiveSummary.length}, report length: ${report.fullReport.length}`);
    const { error: reportInsertError } = await supabase.from('research_report').insert({
      research_id: researchId,
      executive_summary: report.executiveSummary,
      full_report: report.fullReport,
      embedding: embedding ? `[${embedding.join(',')}]` : null,
    });
    if (reportInsertError) {
      console.error('Failed to insert research_report:', reportInsertError);
      throw new Error(`보고서 저장 실패: ${reportInsertError.message}`);
    }

    // Mark as completed
    await updateResearch(researchId, {
      status: 'completed',
      progress_percent: 100,
      current_step: '완료',
      completed_at: new Date().toISOString(),
    });

    emit({ type: 'pipeline_complete', message: '리서치가 완료되었습니다!', progress: 100 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateResearch(researchId, {
      status: 'failed',
      error_message: errorMessage,
    });
    emit({ type: 'pipeline_error', message: `파이프라인 오류: ${errorMessage}`, error: errorMessage });
  }
}

async function executePhase(
  context: PipelineContext,
  phase: number,
  _sourceData: string,
  runTask: (taskId: string) => Promise<{ content: string; modelUsed: string }>,
  taskIds: string[],
  startProgress: number,
  endProgress: number,
): Promise<PhaseResult> {
  const tasks: PhaseResult['tasks'] = [];
  const progressStep = (endProgress - startProgress) / taskIds.length;

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const progress = Math.round(startProgress + progressStep * i);

    context.emit({ type: 'task_start', phase, task: taskId, message: `Task ${taskId} 시작`, progress });

    await updateTaskStatus(context.researchId, taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      const result = await runTask(taskId);

      await updateTaskStatus(context.researchId, taskId, {
        status: 'completed',
        content: result.content,
        completed_at: new Date().toISOString(),
        ai_model_used: result.modelUsed,
      });

      tasks.push({
        taskId,
        taskName: `Phase ${phase} Task ${taskId}`,
        content: result.content,
        modelUsed: result.modelUsed,
      });

      context.emit({
        type: 'task_complete',
        phase,
        task: taskId,
        message: `Task ${taskId} 완료`,
        progress: Math.round(startProgress + progressStep * (i + 1)),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await updateTaskStatus(context.researchId, taskId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });
      tasks.push({
        taskId,
        taskName: `Phase ${phase} Task ${taskId}`,
        content: `[Error] ${msg}`,
        modelUsed: 'none',
      });
    }
  }

  context.emit({
    type: 'phase_complete',
    phase,
    message: `Phase ${phase} 완료`,
    progress: endProgress,
  });

  return {
    phase,
    tasks,
    completedAt: new Date().toISOString(),
  };
}
