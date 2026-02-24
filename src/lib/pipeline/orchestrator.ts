import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { PipelineContext, PhaseResult } from './types';
import type { ResearchStatus } from '@/types';
import { multiSearchBatch, enrichSearchResults } from '@/lib/ai/multi-search';
import { decomposeQuery } from '@/lib/ai/query-decomposer';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { runPhase1 } from './phase1-deep-analysis';
import { runPhase2 } from './phase2-red-team';
import { runPhase3 } from './phase3-knowledge';
import { runPhase4 } from './phase4-strategy';
import { runFactCheck } from './fact-checker';
import { generateReport } from './report-generator';
import { PHASES } from '@/lib/constants';

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

// Lookup task name from constants
function getTaskName(taskId: string): string {
  for (const phase of PHASES) {
    const task = phase.tasks.find(t => t.id === taskId);
    if (task) return task.name;
  }
  return taskId;
}

export async function runPipeline(context: PipelineContext): Promise<void> {
  const { researchId, topic, description, emit } = context;
  const isQuickMode = context.mode === 'quick';

  // Single log helper: updates current_step → triggers Realtime → client sees log
  const log = (message: string, extra?: { progress_percent?: number; status?: ResearchStatus; current_phase?: number }) =>
    updateResearch(researchId, { current_step: message, ...extra });

  try {
    // Mark as started
    await updateResearch(researchId, {
      status: 'collecting',
      started_at: new Date().toISOString(),
      progress_percent: 2,
      current_step: '리서치 파이프라인 초기화',
    });

    emit({
      type: 'search_progress',
      message: '리서치 파이프라인을 시작합니다...',
      progress: 2,
    });

    // ── Step 1: Query Decomposition ──
    await log('쿼리 분해 중 (Claude Haiku)...', { progress_percent: 3 });

    const decomposition = await decomposeQuery(
      topic,
      description ?? undefined,
      isQuickMode ? 'quick' : 'full',
    );

    await log(`쿼리 분해 완료: ${decomposition.subQueries.length}개 서브쿼리 생성`, { progress_percent: 5 });
    for (const sq of decomposition.subQueries) {
      await log(`  → ${sq}`);
    }

    emit({
      type: 'search_progress',
      message: `${decomposition.subQueries.length}개 서브쿼리로 분해 완료. 이중 언어 배치 검색을 시작합니다...`,
      progress: 5,
    });

    // ── Step 2: Bilingual Batch Search ──
    const totalQueries = decomposition.subQueries.length;
    await log(`이중 언어 배치 검색 시작 (3사 × ${totalQueries}쿼리 × 한/영)`, { progress_percent: 6 });

    const searchStart = Date.now();
    let searchResult;
    searchResult = await multiSearchBatch(
      decomposition.subQueries,
      {
        mode: 'search',
        language: 'both',
        concurrency: 2,
        onProgress: (progress) => {
          const secs = Math.round((Date.now() - searchStart) / 1000);
          const done = progress.queryIndex + 1;
          const pct = Math.round(6 + (done / progress.totalQueries) * 7); // 6% → 13%
          const providerInfo = progress.succeededProviders.length > 0
            ? `성공: ${progress.succeededProviders.join(', ')}`
            : '검색 중';
          const failInfo = progress.failedProviders.length > 0
            ? ` | 실패: ${progress.failedProviders.join(', ')}`
            : '';

          updateResearch(researchId, {
            current_step: `[${done}/${progress.totalQueries}] "${progress.query.slice(0, 40)}${progress.query.length > 40 ? '...' : ''}" → ${progress.sourcesFound}개 소스 (${providerInfo}${failInfo}) — ${secs}초`,
            progress_percent: pct,
          }).catch(err => console.error('[Pipeline] Progress update failed:', err));
        },
      },
    );

    const searchSecs = Math.round((Date.now() - searchStart) / 1000);

    // ── Step 3: Error Recovery Check ──
    if (searchResult.successCount === 0) {
      throw new Error(
        `모든 프로바이더 검색 실패: ${searchResult.failedProviders.join(', ')}. ` +
        'API 키와 네트워크 상태를 확인하세요.'
      );
    }

    if (searchResult.successCount === 1) {
      const workingProvider = searchResult.results.find(r => !r.error)?.provider;
      await log(`⚠️ 1개 프로바이더만 성공 (${workingProvider}). 교차검증이 제한됩니다.`);
    }

    // ── Step 4: Source Scoring & Filtering ──
    searchResult = enrichSearchResults(searchResult);

    await log(`웹 검색 완료 (${searchSecs}초)`, { progress_percent: 13 });

    // Log provider results
    const providerSummary = new Map<string, { sources: number; chars: number }>();
    for (const r of searchResult.results) {
      if (r.error) continue;
      const existing = providerSummary.get(r.provider) || { sources: 0, chars: 0 };
      existing.sources += r.sources.length;
      existing.chars += r.text.length;
      providerSummary.set(r.provider, existing);
    }

    for (const [provider, stats] of providerSummary) {
      await log(`${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${stats.sources}개 소스, ${stats.chars.toLocaleString()}자 수집`);
    }

    // Log failed providers
    for (const r of searchResult.results) {
      if (r.error) {
        await log(`${r.provider.charAt(0).toUpperCase() + r.provider.slice(1)} 검색 실패: ${r.error}`);
      }
    }

    // Log usage
    const { totalUsage } = searchResult;
    if (totalUsage.inputTokens > 0 || totalUsage.outputTokens > 0) {
      await log(`토큰 사용량: 입력 ${totalUsage.inputTokens.toLocaleString()}, 출력 ${totalUsage.outputTokens.toLocaleString()}`);
    }

    // Save sources to DB
    const supabase = createServiceClient();
    await log(`소스 DB 저장 중 (${searchResult.allSources.length}개)...`);
    const crossValidatedSet = new Set(searchResult.crossValidatedUrls);

    let savedSourceCount = 0;
    for (const source of searchResult.allSources) {
      const isCrossValidated = crossValidatedSet.has(source.url);
      await supabase.from('research_source').insert({
        research_id: researchId,
        provider: source.discoveredBy || 'openai',
        title: source.title,
        url: source.url,
        snippet: source.snippet || null,
        source_type: source.sourceType || 'other',
        reliability_score: source.reliabilityScore != null ? Math.round(source.reliabilityScore * 5) : null,
        cross_validated: isCrossValidated,
        page_age: source.pageAge || null,
        raw_data: null,
      });
      savedSourceCount++;
    }

    const crossCount = searchResult.crossValidatedUrls.length;
    await log(`소스 저장 완료: ${savedSourceCount}개, 교차 검증 ${crossCount}개`, { progress_percent: 15 });

    emit({
      type: 'search_progress',
      message: `웹 검색 완료: ${searchResult.allSources.length}개 소스 수집 (교차검증 ${crossCount}개)`,
      progress: 15,
    });

    // Collect source texts for analysis
    const sourceSummary = searchResult.results
      .filter(r => !r.error)
      .map(r => `[${r.provider}]\n${r.text}`)
      .join('\n\n---\n\n');

    // Phase 1: Deep Analysis
    await log('Phase 1: 심층 분석 시작 (인사이트 도출, 논리 검증, 교차 검증)', { status: 'phase1', current_phase: 1, progress_percent: 20 });
    emit({ type: 'phase_start', phase: 1, message: 'Phase 1: 심층 분석을 시작합니다', progress: 20 });

    const phase1EndProgress = isQuickMode ? 55 : 35;
    const phase1Result = await executePhase(
      context, 1, sourceSummary,
      (taskId) => runPhase1(topic, sourceSummary, taskId, emit),
      ['1.1', '1.2', '1.3'],
      20, phase1EndProgress,
    );

    const phase1Content = phase1Result.tasks.map(t => t.content).join('\n\n');

    let allPhaseResults: PhaseResult[];

    if (isQuickMode) {
      // Quick mode: skip Phases 2-4, go straight to fact check & report
      allPhaseResults = [phase1Result];
    } else {
      // Full mode: run Phases 2-4
      // Phase 2: Red Team
      await log('Phase 2: 비판적 사고 시작 (레드팀 분석, 숨은 가정 역추적, 공백 탐색)', { status: 'phase2', current_phase: 2, progress_percent: 40 });
      emit({ type: 'phase_start', phase: 2, message: 'Phase 2: 비판적 사고를 시작합니다', progress: 40 });

      const phase2Result = await executePhase(
        context, 2, `${sourceSummary}\n\n[Phase 1 결과]\n${phase1Content}`,
        (taskId) => runPhase2(topic, sourceSummary, phase1Content, taskId, emit),
        ['2.1', '2.2', '2.3'],
        40, 55,
      );

      // Phase 3: Knowledge Integration
      await log('Phase 3: 지식 통합 시작 (메타 프레임워크 구축, 미래 예측)', { status: 'phase3', current_phase: 3, progress_percent: 60 });
      emit({ type: 'phase_start', phase: 3, message: 'Phase 3: 지식 통합을 시작합니다', progress: 60 });

      const phase2Content = phase2Result.tasks.map(t => t.content).join('\n\n');
      const phase3Result = await executePhase(
        context, 3, `${sourceSummary}\n\n[Phase 1 결과]\n${phase1Content}\n\n[Phase 2 결과]\n${phase2Content}`,
        (taskId) => runPhase3(topic, sourceSummary, phase1Content, phase2Content, taskId, emit),
        ['3.1', '3.2'],
        60, 70,
      );

      // Phase 4: Strategy
      await log('Phase 4: 실전 적용 시작 (이해관계자 메시지, 실행 마스터플랜)', { status: 'phase4', current_phase: 4, progress_percent: 75 });
      emit({ type: 'phase_start', phase: 4, message: 'Phase 4: 실전 적용을 시작합니다', progress: 75 });

      const phase3Content = phase3Result.tasks.map(t => t.content).join('\n\n');
      const phase4Result = await executePhase(
        context, 4, `${sourceSummary}\n\n모든 이전 분석 결과`,
        (taskId) => runPhase4(topic, phase1Content, phase2Content, phase3Content, taskId, emit),
        ['4.1', '4.2'],
        75, 85,
      );

      allPhaseResults = [phase1Result, phase2Result, phase3Result, phase4Result];
    }

    // Fact Checking
    const factCheckProgress = isQuickMode ? 60 : 87;
    await log('팩트체크 시작 — 핵심 주장 추출 중...');
    await updateResearch(researchId, { status: 'finalizing', progress_percent: factCheckProgress, current_step: '팩트체크 진행 중' });
    emit({ type: 'fact_check_start', message: '팩트체크를 시작합니다', progress: factCheckProgress });

    const factChecks = await runFactCheck(topic, allPhaseResults, (event) => {
      emit(event);
      if (event.message) {
        log(event.message).catch(() => {});
      }
    });

    const gradeA = factChecks.filter(f => f.grade === 'A').length;
    const gradeB = factChecks.filter(f => f.grade === 'B').length;
    const gradeC = factChecks.filter(f => f.grade === 'C').length;
    const gradeD = factChecks.filter(f => f.grade === 'D').length;
    const gradeF = factChecks.filter(f => f.grade === 'F').length;
    await log(`팩트체크 완료: ${factChecks.length}개 주장 검증`);
    await log(`등급 분포 — A:${gradeA} B:${gradeB} C:${gradeC} D:${gradeD} F:${gradeF}`);

    // Save fact checks to DB
    await log('팩트체크 결과 DB 저장 중...');
    for (const fc of factChecks) {
      await supabase.from('fact_check_result').insert({
        research_id: researchId,
        phase: fc.phase,
        claim: fc.claim,
        grade: fc.grade,
        openai_result: fc.openaiResult || null,
        anthropic_result: fc.anthropicResult || null,
        gemini_result: fc.geminiResult || null,
        confidence_score: fc.confidenceScore ?? null,
        notes: fc.notes || null,
      });
    }

    const factCheckDoneProgress = isQuickMode ? 75 : 92;
    emit({ type: 'fact_check_complete', message: `팩트체크 완료: ${factChecks.length}개 주장 검증`, progress: factCheckDoneProgress });

    // Report Generation
    const reportProgress = isQuickMode ? 80 : 93;
    await log('Executive Summary 생성 중 (Claude Sonnet 호출)...');
    await updateResearch(researchId, { progress_percent: reportProgress, current_step: 'Executive Summary 생성 중' });

    const reportStart = Date.now();
    const report = await generateReport(topic, allPhaseResults, factChecks);
    const reportSecs = Math.round((Date.now() - reportStart) / 1000);

    await log(`Executive Summary 완료 (${report.executiveSummary.length.toLocaleString()}자)`);
    await log(`전체 보고서 작성 완료 (${report.fullReport.length.toLocaleString()}자, ${reportSecs}초)`);

    // Generate embedding for semantic search
    await log('벡터 임베딩 생성 중 (OpenAI text-embedding-3-small)...');
    let embedding: number[] | null = null;
    try {
      const embeddingResult = await generateEmbedding(report.executiveSummary);
      embedding = embeddingResult.embedding;
      await log(`벡터 임베딩 생성 완료 (${embedding.length}차원)`);
    } catch {
      await log('벡터 임베딩 생성 실패 (비치명적, 건너뜀)');
    }

    // Save report to DB
    await log('최종 보고서 DB 저장 중...');
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

    await log('보고서 저장 완료');

    // Mark as completed
    await updateResearch(researchId, {
      status: 'completed',
      progress_percent: 100,
      current_step: '리서치 완료',
      completed_at: new Date().toISOString(),
    });

    await log('리서치 파이프라인 완료!');
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

async function checkCancelled(researchId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('research')
    .select('status')
    .eq('id', researchId)
    .single();
  return data?.status === 'failed';
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
  // Check if research was cancelled before starting this phase
  if (await checkCancelled(context.researchId)) {
    throw new Error('사용자에 의해 취소됨');
  }

  const tasks: PhaseResult['tasks'] = [];
  const progressStep = (endProgress - startProgress) / taskIds.length;

  await updateResearch(context.researchId, { current_step: `Phase ${phase}: ${taskIds.length}개 태스크 순차 실행` });

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const taskName = getTaskName(taskId);
    const progress = Math.round(startProgress + progressStep * i);

    await updateResearch(context.researchId, {
      current_step: `Task ${taskId}: ${taskName} — AI 모델 호출 중...`,
      progress_percent: progress,
    });

    context.emit({ type: 'task_start', phase, task: taskId, message: `Task ${taskId} 시작`, progress });

    const taskStart = Date.now();
    await updateTaskStatus(context.researchId, taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      const result = await runTask(taskId);
      const taskSecs = Math.round((Date.now() - taskStart) / 1000);
      const completedProgress = Math.round(startProgress + progressStep * (i + 1));

      await updateTaskStatus(context.researchId, taskId, {
        status: 'completed',
        content: result.content,
        completed_at: new Date().toISOString(),
        ai_model_used: result.modelUsed,
      });

      await updateResearch(context.researchId, {
        current_step: `Task ${taskId}: ${taskName} 완료 — ${result.modelUsed}, ${result.content.length.toLocaleString()}자, ${taskSecs}초`,
        progress_percent: completedProgress,
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
        progress: completedProgress,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const taskSecs = Math.round((Date.now() - taskStart) / 1000);
      await updateTaskStatus(context.researchId, taskId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });

      await updateResearch(context.researchId, { current_step: `Task ${taskId}: ${taskName} 실패 (${taskSecs}초) — ${msg}` });

      tasks.push({
        taskId,
        taskName: `Phase ${phase} Task ${taskId}`,
        content: `[Error] ${msg}`,
        modelUsed: 'none',
      });
    }
  }

  await updateResearch(context.researchId, { current_step: `Phase ${phase} 전체 완료` });
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
