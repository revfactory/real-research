'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { PHASES } from '@/lib/constants';
import type { ResearchPhaseResult } from '@/types';

interface PhaseResultProps {
  phase: number;
  results: ResearchPhaseResult[];
}

export function PhaseResult({ phase, results }: PhaseResultProps) {
  const [open, setOpen] = useState(false);
  const phaseInfo = PHASES.find((p) => p.phase === phase);
  if (!phaseInfo) return null;

  const allCompleted = results.every((r) => r.status === 'completed');
  const hasFailed = results.some((r) => r.status === 'failed');

  const totalDuration = (() => {
    const starts = results.filter((r) => r.started_at).map((r) => new Date(r.started_at!).getTime());
    const ends = results.filter((r) => r.completed_at).map((r) => new Date(r.completed_at!).getTime());
    if (starts.length === 0 || ends.length === 0) return null;
    const seconds = Math.round((Math.max(...ends) - Math.min(...starts)) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  })();

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="font-semibold text-sm flex-1">
          Phase {phase}: {phaseInfo.name}
        </span>
        {allCompleted && (
          <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            완료
          </Badge>
        )}
        {hasFailed && (
          <Badge variant="outline" className="text-red-600 border-red-300 gap-1">
            <XCircle className="h-3 w-3" />
            실패
          </Badge>
        )}
        {totalDuration && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDuration}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t">
          {results.map((result, idx) => (
            <div key={result.id}>
              {idx > 0 && <Separator />}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {result.task_id}
                  </span>
                  <span className="text-sm font-medium">{result.task_name}</span>
                  {result.ai_model_used && (
                    <Badge variant="secondary" className="text-[10px]">
                      {result.ai_model_used}
                    </Badge>
                  )}
                </div>
                {result.content && (
                  <MarkdownRenderer
                    content={result.content}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
