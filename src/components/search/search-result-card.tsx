'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResultCardProps {
  researchId: string;
  topic: string;
  summary: string | null;
  similarity: number;
  createdAt?: string;
}

export function SearchResultCard({
  researchId,
  topic,
  summary,
  similarity,
  createdAt,
}: SearchResultCardProps) {
  const pct = Math.round(similarity * 100);

  return (
    <Link href={`/research/${researchId}`}>
      <Card className="group cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {topic}
            </h3>
            <Badge
              variant="secondary"
              className="shrink-0 text-xs font-semibold"
            >
              {pct}% 관련
            </Badge>
          </div>
          {summary && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {summary}
            </p>
          )}
          {createdAt && (
            <p className="text-[13px] text-muted-foreground">
              {new Date(createdAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
