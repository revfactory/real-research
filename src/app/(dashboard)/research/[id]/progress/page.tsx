'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Header } from '@/components/layout/header';
import { PipelineProgress } from '@/components/research/pipeline-progress';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useResearchDetail } from '@/hooks/use-research-detail';
import { useResearchRealtime } from '@/hooks/use-research-realtime';
import { STATUS_CONFIG } from '@/lib/constants';
import { toast } from 'sonner';
import type { Research, ResearchStatus, ResearchPhaseResult } from '@/types';

export default function ResearchProgressPage() {
  const params = useParams();
  const router = useRouter();
  const researchId = params.id as string;

  const { research: initialResearch, phaseResults: initialPhaseResults, loading, refetch } = useResearchDetail(researchId);

  // Local state that gets updated via Realtime
  const [research, setResearch] = useState<Research | null>(null);
  const [phaseResults, setPhaseResults] = useState<ResearchPhaseResult[]>([]);
  const [logs, setLogs] = useState<Array<{ time: string; message: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [showLog, setShowLog] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const prevStepRef = useRef<string | null>(null);

  // Sync initial data
  useEffect(() => {
    if (initialResearch) setResearch(initialResearch);
  }, [initialResearch]);

  useEffect(() => {
    if (initialPhaseResults.length > 0) setPhaseResults(initialPhaseResults);
  }, [initialPhaseResults]);

  const addLog = useCallback((message: string) => {
    const now = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [...prev, { time: now, message }]);
  }, []);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/research/${researchId}`, { method: 'PUT' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '취소에 실패했습니다.');
      }
      toast.success('리서치가 취소되었습니다.');
      setShowCancelDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  }, [researchId]);

  // Realtime: research table updates
  const handleResearchUpdate = useCallback((updated: Partial<Research>) => {
    setResearch((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updated };

      // Add log from current_step changes
      if (updated.current_step && updated.current_step !== prevStepRef.current) {
        prevStepRef.current = updated.current_step;
        addLog(updated.current_step);
      }

      // Check terminal states
      if (merged.status === 'completed') setIsComplete(true);
      if (merged.status === 'failed') setIsFailed(true);

      return merged;
    });
  }, [addLog]);

  // Realtime: phase result updates
  const handlePhaseUpdate = useCallback((updated: Partial<ResearchPhaseResult>) => {
    if (!updated.id) return;

    setPhaseResults((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...updated };
        return copy;
      }
      // New row (INSERT)
      return [...prev, updated as ResearchPhaseResult];
    });

    // Log phase task status changes
    if (updated.status === 'running' && updated.task_id) {
      addLog(`Task ${updated.task_id} 시작`);
    }
    if (updated.status === 'completed' && updated.task_id) {
      addLog(`Task ${updated.task_id} 완료`);
    }
    if (updated.status === 'failed' && updated.task_id) {
      addLog(`Task ${updated.task_id} 실패`);
    }
  }, [addLog]);

  const isActive =
    research &&
    ['collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing'].includes(
      research.status
    );

  useResearchRealtime({
    researchId,
    enabled: !!isActive && !isComplete && !isFailed,
    onResearchUpdate: handleResearchUpdate,
    onPhaseUpdate: handlePhaseUpdate,
  });

  // Check initial status
  useEffect(() => {
    if (research?.status === 'completed') setIsComplete(true);
    if (research?.status === 'failed') setIsFailed(true);
  }, [research?.status]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (loading && !research) {
    return (
      <div>
        <Header />
        <div className="p-4 lg:p-8 text-center py-20">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!research) {
    return (
      <div>
        <Header />
        <div className="p-4 lg:p-8 text-center py-20">
          <p className="text-muted-foreground">리서치를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[research.status as ResearchStatus];

  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{research.topic}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              style={{
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.color,
              }}
            >
              {statusConfig.label}
            </Badge>
            <Progress
              value={research.progress_percent}
              className="flex-1 max-w-xs h-2"
            />
            <span className="text-sm text-muted-foreground">
              {research.progress_percent}%
            </span>
          </div>
          {research.current_step && isActive && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {research.current_step}
            </p>
          )}
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              취소
            </Button>
          )}
        </div>

        {/* Cancel confirmation dialog */}
        <ConfirmDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          title="리서치를 취소하시겠습니까?"
          description="진행 중인 리서치를 취소하면 현재까지의 분석 결과가 저장되지 않을 수 있습니다."
          confirmLabel="취소하기"
          cancelLabel="계속 진행"
          variant="destructive"
          onConfirm={handleCancel}
          loading={cancelling}
        />

        {/* Pipeline */}
        <PipelineProgress
          phaseResults={phaseResults}
          currentPhase={research.current_phase}
          status={research.status}
        />

        {/* Completion actions */}
        {isComplete && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                리서치가 완료되었습니다
              </p>
              <Button
                onClick={() => router.push(`/research/${researchId}`)}
                className="gap-2"
              >
                보고서 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {isFailed && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                리서치 실행에 실패했습니다
              </p>
              {research.error_message && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {research.error_message}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push('/research/new')}
              >
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live log */}
        <div className="space-y-2">
          <button
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowLog(!showLog)}
          >
            실시간 로그 {showLog ? '접기' : '펼치기'}
          </button>
          {showLog && (
            <Card>
              <ScrollArea className="h-[240px]">
                <CardContent className="p-4 space-y-1 font-mono text-xs">
                  {logs.length === 0 && (
                    <p className="text-muted-foreground">
                      {isActive ? '로그 대기 중...' : '로그가 없습니다.'}
                    </p>
                  )}
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">
                        [{log.time}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </CardContent>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
