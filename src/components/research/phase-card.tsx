'use client';

import {
  CheckCircle2,
  Loader2,
  XCircle,
  Circle,
  Brain,
  ShieldAlert,
  Network,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseStatus } from '@/types';

const phaseIcons: Record<number, React.ElementType> = {
  1: Brain,
  2: ShieldAlert,
  3: Network,
  4: Rocket,
};

interface PhaseCardProps {
  phase: number;
  name: string;
  status: PhaseStatus;
  tasks?: {
    id: string;
    name: string;
    status: PhaseStatus;
    duration?: string;
  }[];
  isLast?: boolean;
}

export function PhaseCard({ phase, name, status, tasks, isLast }: PhaseCardProps) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px border-l-2 border-dashed border-muted-foreground/20" />
      )}

      {/* Phase indicator */}
      <div className="relative z-10 flex-shrink-0">
        <PhaseIndicator phase={phase} status={status} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-base">Phase {phase}: {name}</h3>
          <PhaseStatusLabel status={status} />
        </div>

        {tasks && tasks.length > 0 && (
          <div className="space-y-2 ml-1">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <TaskIcon status={task.status} />
                <span
                  className={cn(
                    task.status === 'completed' && 'text-muted-foreground',
                    task.status === 'failed' && 'text-destructive'
                  )}
                >
                  {task.name}
                </span>
                {task.duration && task.status === 'completed' && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {task.duration}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseIndicator({ phase, status }: { phase: number; status: PhaseStatus }) {
  const baseClasses =
    'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300';

  switch (status) {
    case 'completed':
      return (
        <div className={cn(baseClasses, 'bg-green-500 text-white scale-100')}>
          <CheckCircle2 className="h-5 w-5" />
        </div>
      );
    case 'running':
      return (
        <div className={cn(baseClasses, 'bg-blue-600 text-white animate-pulse')}>
          {phase}
        </div>
      );
    case 'failed':
      return (
        <div className={cn(baseClasses, 'bg-red-500 text-white')}>
          <XCircle className="h-5 w-5" />
        </div>
      );
    default:
      return (
        <div className={cn(baseClasses, 'bg-muted text-muted-foreground')}>
          {phase}
        </div>
      );
  }
}

function PhaseStatusLabel({ status }: { status: PhaseStatus }) {
  switch (status) {
    case 'completed':
      return <span className="text-xs text-green-600 dark:text-green-400 font-medium">완료</span>;
    case 'running':
      return (
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          진행 중
        </span>
      );
    case 'failed':
      return <span className="text-xs text-red-600 dark:text-red-400 font-medium">실패</span>;
    default:
      return <span className="text-xs text-muted-foreground">대기</span>;
  }
}

function TaskIcon({ status }: { status: PhaseStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}
