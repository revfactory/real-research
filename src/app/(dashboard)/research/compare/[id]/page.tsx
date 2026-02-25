'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { ComparisonViewer } from '@/components/research/comparison-viewer';
import { useResearchComparison } from '@/hooks/use-research-comparison';

export default function ComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const comparisonId = params.id as string;
  const { researches, loading, streamedContent, fetchComparison } = useResearchComparison();

  useEffect(() => {
    fetchComparison(comparisonId);
  }, [comparisonId, fetchComparison]);

  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">리서치 비교 분석</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
        ) : (
          <ComparisonViewer
            researches={researches}
            content={streamedContent}
          />
        )}
      </div>
    </div>
  );
}
