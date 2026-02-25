'use client';

import { ResearchCard } from './research-card';
import type { Research } from '@/types';

interface ResearchListProps {
  researches: Research[];
  onDelete?: (id: string, topic: string) => void;
  compareMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function ResearchList({ researches, onDelete, compareMode, selectedIds, onToggleSelect }: ResearchListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {researches.map((research) => (
        <ResearchCard
          key={research.id}
          research={research}
          onDelete={onDelete}
          compareMode={compareMode}
          selected={selectedIds?.includes(research.id)}
          onToggleSelect={() => onToggleSelect?.(research.id)}
        />
      ))}
    </div>
  );
}
