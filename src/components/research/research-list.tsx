'use client';

import { ResearchCard } from './research-card';
import type { Research } from '@/types';

interface ResearchListProps {
  researches: Research[];
  onDelete?: (id: string, topic: string) => void;
}

export function ResearchList({ researches, onDelete }: ResearchListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {researches.map((research) => (
        <ResearchCard key={research.id} research={research} onDelete={onDelete} />
      ))}
    </div>
  );
}
