'use client';

import { PHASES } from '@/lib/constants';
import { PhaseCard } from './phase-card';
import type { ResearchPhaseResult, PhaseStatus } from '@/types';

interface PipelineProgressProps {
  phaseResults: ResearchPhaseResult[];
  currentPhase: number;
  status: string;
}

export function PipelineProgress({
  phaseResults,
  currentPhase,
  status,
}: PipelineProgressProps) {
  const getPhaseStatus = (phase: number): PhaseStatus => {
    if (status === 'failed' && currentPhase === phase) return 'failed';
    const phaseTasks = phaseResults.filter((r) => r.phase === phase);
    if (phaseTasks.some((t) => t.status === 'failed')) return 'failed';
    if (phaseTasks.every((t) => t.status === 'completed') && phaseTasks.length > 0)
      return 'completed';
    if (phaseTasks.some((t) => t.status === 'running')) return 'running';
    if (currentPhase === phase) return 'running';
    if (currentPhase > phase) return 'completed';
    return 'pending';
  };

  const getTaskStatus = (taskId: string): PhaseStatus => {
    const result = phaseResults.find((r) => r.task_id === taskId);
    return (result?.status as PhaseStatus) || 'pending';
  };

  const getTaskDuration = (taskId: string): string | undefined => {
    const result = phaseResults.find((r) => r.task_id === taskId);
    if (result?.started_at && result?.completed_at) {
      const start = new Date(result.started_at).getTime();
      const end = new Date(result.completed_at).getTime();
      const seconds = Math.round((end - start) / 1000);
      if (seconds < 60) return `${seconds}초`;
      return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
    }
    return undefined;
  };

  return (
    <div className="space-y-0">
      {PHASES.map((phaseInfo, index) => (
        <PhaseCard
          key={phaseInfo.phase}
          phase={phaseInfo.phase}
          name={phaseInfo.name}
          status={getPhaseStatus(phaseInfo.phase)}
          isLast={index === PHASES.length - 1}
          tasks={phaseInfo.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            status: getTaskStatus(task.id),
            duration: getTaskDuration(task.id),
          }))}
        />
      ))}
    </div>
  );
}
