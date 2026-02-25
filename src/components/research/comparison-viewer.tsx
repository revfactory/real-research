'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { Loader2 } from 'lucide-react';

interface ComparisonResearch {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

interface ComparisonViewerProps {
  researches: ComparisonResearch[];
  content: string;
  generating?: boolean;
}

export function ComparisonViewer({ researches, content, generating }: ComparisonViewerProps) {
  return (
    <div className="space-y-6">
      {/* Research cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {researches.map((r, i) => (
          <Card key={r.id} className="border-l-4" style={{ borderLeftColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i] }}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">리서치 {i + 1}</p>
              <p className="text-sm font-medium line-clamp-2">{r.topic}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis content */}
      <Card>
        <CardContent className="p-6">
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={content} />
            </div>
          ) : generating ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">비교 분석 생성 중...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">분석 결과가 없습니다.</p>
          )}
          {generating && content && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm ml-0.5" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
