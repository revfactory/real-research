'use client';

import { Badge } from '@/components/ui/badge';
import { EVIDENCE_LEVEL_CONFIG } from '@/lib/constants';
import type { EvidenceLevel } from '@/types';

interface EvidenceBadgeProps {
  level: EvidenceLevel;
}

export function EvidenceBadge({ level }: EvidenceBadgeProps) {
  const config = EVIDENCE_LEVEL_CONFIG[level];
  return (
    <Badge
      variant="outline"
      className="text-[11px] font-semibold uppercase tracking-wider"
      style={{ borderColor: config.color, color: config.color }}
    >
      {config.label}
    </Badge>
  );
}
