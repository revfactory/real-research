'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileText,
  Globe,
  Layers,
  ShieldCheck,
  Download,
  Trash2,
  Loader2,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/header';
import { ReportViewer } from '@/components/research/report-viewer';
import { SourceList } from '@/components/research/source-list';
import { PhaseResult } from '@/components/research/phase-result';
import { FactCheckTable } from '@/components/research/fact-check-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ReportSkeleton } from '@/components/shared/loading-skeleton';
import { useResearchDetail } from '@/hooks/use-research-detail';
import { STATUS_CONFIG } from '@/lib/constants';
import type { ResearchStatus } from '@/types';
import { toast } from 'sonner';

export default function ResearchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const researchId = params.id as string;

  const { research, sources, phaseResults, factChecks, report, loading } =
    useResearchDetail(researchId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/research/${researchId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('공유 링크 생성에 실패했습니다.');
      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('링크가 복사되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '공유 링크 생성에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${researchId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      toast.success('리서치가 삭제되었습니다.');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`/api/research/${researchId}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="p-4 lg:p-8">
          <ReportSkeleton />
        </div>
      </div>
    );
  }

  if (!research) {
    return (
      <div>
        <Header />
        <div className="p-4 lg:p-8 text-center py-20">
          <p className="text-muted-foreground">리서치를 찾을 수 없습니다.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            대시보드로 이동
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[research.status as ResearchStatus];

  // Group phase results by phase number
  const phaseGroups = [1, 2, 3, 4].map((phase) =>
    phaseResults.filter((r) => r.phase === phase)
  );

  // Calculate duration from created_at to completed_at
  const duration =
    research.created_at && research.completed_at
      ? (() => {
          const seconds = Math.round(
            (new Date(research.completed_at).getTime() -
              new Date(research.created_at).getTime()) /
              1000
          );
          if (seconds < 60) return `${seconds}초`;
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          if (mins < 60) return `${mins}분 ${secs}초`;
          const hrs = Math.floor(mins / 60);
          return `${hrs}시간 ${mins % 60}분 ${secs}초`;
        })()
      : null;

  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-[28px] font-bold leading-tight">
              {research.topic}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                style={{
                  backgroundColor: statusConfig.bgColor,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.label}
              </Badge>
              <span className="text-[13px] text-muted-foreground">
                {formatDistanceToNow(new Date(research.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
              {duration && (
                <span className="text-[13px] text-muted-foreground">
                  소요 {duration}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              공유
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="report" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="report" className="gap-1.5">
              <FileText className="h-4 w-4" />
              보고서
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5">
              <Globe className="h-4 w-4" />
              소스
              {sources.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                  {sources.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="phases" className="gap-1.5">
              <Layers className="h-4 w-4" />
              Phase별 결과
            </TabsTrigger>
            <TabsTrigger value="factcheck" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              팩트체크
              {factChecks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                  {factChecks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <ReportViewer
              executiveSummary={report?.executive_summary || null}
              fullReport={report?.full_report || null}
            />
          </TabsContent>

          <TabsContent value="sources">
            <SourceList sources={sources} />
          </TabsContent>

          <TabsContent value="phases">
            <div className="space-y-4">
              {phaseGroups.map((results, idx) =>
                results.length > 0 ? (
                  <PhaseResult
                    key={idx + 1}
                    phase={idx + 1}
                    results={results}
                  />
                ) : null
              )}
              {phaseGroups.every((g) => g.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  Phase 결과가 아직 없습니다.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="factcheck">
            {factChecks.length > 0 ? (
              <FactCheckTable factChecks={factChecks} />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                팩트체크 결과가 아직 없습니다.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="리서치 삭제"
        description="이 리서치와 모든 관련 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
