'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Trash2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { STATUS_CONFIG } from '@/lib/constants';
import type { Research, ResearchStatus } from '@/types';

interface ResearchCardProps {
  research: Research;
  onDelete?: (id: string, topic: string) => void;
  compareMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ResearchCard({ research, onDelete, compareMode, selected, onToggleSelect }: ResearchCardProps) {
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

  const isSelectable = compareMode && research.status === 'completed';

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectable && onToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
    }
  };

  const cardContent = (
    <Card className={`group cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md relative ${isSelectable && selected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''} ${isSelectable ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''}`}>
      {isSelectable && (
        <div className={`absolute top-3 right-3 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'bg-blue-500 border-blue-500 text-white' : 'border-muted-foreground/40 bg-background'}`}>
          {selected && <Check className="h-3 w-3" />}
        </div>
      )}
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {research.topic}
          </h3>
          <div className={`flex items-center gap-1 shrink-0 ${isSelectable ? 'mr-6' : ''}`}>
            {onDelete && !compareMode && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(research.id, research.topic);
                }}
                className="hidden group-hover:flex items-center justify-center h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <StatusBadge status={research.status} />
          </div>
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
  );

  if (isSelectable) {
    return (
      <div onClick={handleClick} role="button" tabIndex={0}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={href}>
      {cardContent}
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
