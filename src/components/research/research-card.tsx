'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { STATUS_CONFIG } from '@/lib/constants';
import type { Research, ResearchStatus } from '@/types';

interface ResearchCardProps {
  research: Research;
}

export function ResearchCard({ research }: ResearchCardProps) {
  const config = STATUS_CONFIG[research.status];
  const isInProgress = [
    'collecting',
    'phase1',
    'phase2',
    'phase3',
    'phase4',
    'finalizing',
  ].includes(research.status);

  const href =
    research.status === 'completed'
      ? `/research/${research.id}`
      : `/research/${research.id}/progress`;

  return (
    <Link href={href}>
      <Card className="group cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {research.topic}
            </h3>
            <StatusBadge status={research.status} />
          </div>

          {isInProgress && (
            <div className="space-y-1">
              <Progress value={research.progress_percent} className="h-1.5" />
              {research.current_step && (
                <p className="text-xs text-muted-foreground truncate">
                  {research.current_step}
                </p>
              )}
            </div>
          )}

          <p className="text-[13px] text-muted-foreground">
            {formatDistanceToNow(new Date(research.created_at), {
              addSuffix: true,
              locale: ko,
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: ResearchStatus }) {
  const config = STATUS_CONFIG[status];
  const isInProgress = [
    'collecting',
    'phase1',
    'phase2',
    'phase3',
    'phase4',
    'finalizing',
  ].includes(status);

  return (
    <Badge
      className="shrink-0 text-[11px] font-semibold gap-1"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {isInProgress && (
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: config.color }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
        </span>
      )}
      {config.label}
    </Badge>
  );
}
