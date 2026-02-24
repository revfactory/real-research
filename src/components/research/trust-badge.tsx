'use client';

import { Badge } from '@/components/ui/badge';
import { TRUST_GRADE_CONFIG } from '@/lib/constants';
import type { TrustGrade } from '@/types';

interface TrustBadgeProps {
  grade: TrustGrade;
  showLabel?: boolean;
}

export function TrustBadge({ grade, showLabel = true }: TrustBadgeProps) {
  const config = TRUST_GRADE_CONFIG[grade];
  return (
    <Badge
      className="text-[11px] font-semibold"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {config.icon} {grade}{showLabel && ` ${config.label}`}
    </Badge>
  );
}
