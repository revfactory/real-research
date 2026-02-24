'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrustBadge } from './trust-badge';
import { TRUST_GRADE_CONFIG } from '@/lib/constants';
import type { FactCheckResult, TrustGrade } from '@/types';

interface FactCheckTableProps {
  factChecks: FactCheckResult[];
}

export function FactCheckTable({ factChecks }: FactCheckTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort by grade: F -> D -> C -> B -> A
  const gradeOrder: TrustGrade[] = ['F', 'D', 'C', 'B', 'A'];
  const sorted = [...factChecks].sort(
    (a, b) =>
      gradeOrder.indexOf(a.grade as TrustGrade) -
      gradeOrder.indexOf(b.grade as TrustGrade)
  );

  // Summary stats
  const gradeCounts = factChecks.reduce(
    (acc, fc) => {
      acc[fc.grade as TrustGrade] = (acc[fc.grade as TrustGrade] || 0) + 1;
      return acc;
    },
    {} as Record<TrustGrade, number>
  );
  const total = factChecks.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">등급별 요약</h3>
        <div className="space-y-2">
          {[...gradeOrder].reverse().map((grade) => {
            const count = gradeCounts[grade] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const config = TRUST_GRADE_CONFIG[grade];
            return (
              <div key={grade} className="flex items-center gap-3">
                <span className="text-sm w-24">
                  {config.icon} {grade} ({config.label})
                </span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: config.color,
                      minWidth: count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-10 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold w-8">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">검증 대상</th>
              <th className="px-4 py-3 text-left text-xs font-semibold w-20">등급</th>
              <th className="px-4 py-3 text-left text-xs font-semibold w-20 hidden md:table-cell">
                OpenAI
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold w-20 hidden md:table-cell">
                Anthropic
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold w-20 hidden md:table-cell">
                Gemini
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((fc, idx) => (
              <FactCheckRow
                key={fc.id}
                factCheck={fc}
                index={idx + 1}
                expanded={expandedId === fc.id}
                onToggle={() =>
                  setExpandedId(expandedId === fc.id ? null : fc.id)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FactCheckRow({
  factCheck,
  index,
  expanded,
  onToggle,
}: {
  factCheck: FactCheckResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail =
    factCheck.openai_result || factCheck.anthropic_result || factCheck.gemini_result;

  return (
    <>
      <tr
        className={cn(
          'border-b hover:bg-muted/30 transition-colors',
          hasDetail && 'cursor-pointer'
        )}
        onClick={() => hasDetail && onToggle()}
      >
        <td className="px-4 py-3 text-sm text-muted-foreground">{index}</td>
        <td className="px-4 py-3 text-sm">{factCheck.claim}</td>
        <td className="px-4 py-3">
          <TrustBadge grade={factCheck.grade as TrustGrade} showLabel={false} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[120px]">
          {factCheck.openai_result ? '확인' : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[120px]">
          {factCheck.anthropic_result ? '확인' : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[120px]">
          {factCheck.gemini_result ? '확인' : '-'}
        </td>
        <td className="px-4 py-3">
          {hasDetail &&
            (expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ))}
        </td>
      </tr>
      {expanded && hasDetail && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-3 text-sm">
              {factCheck.openai_result && (
                <div>
                  <p className="font-medium text-xs text-[#10A37F] mb-1">OpenAI</p>
                  <p className="text-muted-foreground">{factCheck.openai_result}</p>
                </div>
              )}
              {factCheck.anthropic_result && (
                <div>
                  <p className="font-medium text-xs text-[#D97706] mb-1">Anthropic</p>
                  <p className="text-muted-foreground">{factCheck.anthropic_result}</p>
                </div>
              )}
              {factCheck.gemini_result && (
                <div>
                  <p className="font-medium text-xs text-[#4285F4] mb-1">Gemini</p>
                  <p className="text-muted-foreground">{factCheck.gemini_result}</p>
                </div>
              )}
              {factCheck.notes && (
                <div>
                  <p className="font-medium text-xs mb-1">비고</p>
                  <p className="text-muted-foreground">{factCheck.notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
