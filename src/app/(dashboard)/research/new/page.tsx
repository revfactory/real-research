'use client';

import { useState } from 'react';
import {
  Brain,
  ShieldAlert,
  Network,
  Rocket,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { ResearchForm } from '@/components/research/research-form';
import { PHASES } from '@/lib/constants';

const phaseIcons: Record<number, React.ElementType> = {
  1: Brain,
  2: ShieldAlert,
  3: Network,
  4: Rocket,
};

export default function NewResearchPage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 max-w-[640px] mx-auto space-y-8">
        <h1 className="text-[28px] font-bold">새 리서치</h1>

        <ResearchForm />

        {/* Pipeline preview */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            파이프라인 미리보기
          </h2>
          <div className="space-y-2">
            {PHASES.map((phase) => {
              const Icon = phaseIcons[phase.phase];
              const isExpanded = expandedPhase === phase.phase;
              return (
                <div key={phase.phase} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedPhase(isExpanded ? null : phase.phase)
                    }
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        Phase {phase.phase}: {phase.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {phase.description}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/20">
                      <ul className="space-y-1.5">
                        {phase.tasks.map((task) => (
                          <li
                            key={task.id}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="text-xs font-mono">{task.id}</span>
                            {task.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
