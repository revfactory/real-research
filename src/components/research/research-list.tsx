'use client';

import { ResearchCard } from './research-card';
import type { Research } from '@/types';

interface ResearchListProps {
  researches: Research[];
}

export function ResearchList({ researches }: ResearchListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {researches.map((research) => (
        <ResearchCard key={research.id} research={research} />
      ))}
    </div>
  );
}
