'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileSearch,
  BarChart3,
  Loader2,
  CheckCircle2,
  CalendarDays,
  ArrowUpDown,
  GitCompareArrows,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/header';
import { ResearchList } from '@/components/research/research-list';
import { EmptyState } from '@/components/shared/empty-state';
import { CardGridSkeleton, StatCardSkeleton } from '@/components/shared/loading-skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useResearchList } from '@/hooks/use-research-list';
import { useResearchComparison } from '@/hooks/use-research-comparison';
import { toast } from 'sonner';
import type { StatusFilter, SortOrder } from '@/hooks/use-research-list';

const statIcons = [BarChart3, Loader2, CheckCircle2, CalendarDays];

export default function DashboardPage() {
  const router = useRouter();
  const {
    researches,
    allResearches,
    loading,
    stats,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    removeResearch,
  } = useResearchList();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; topic: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { createComparison, generating: comparingLoading } = useResearchComparison();

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleStartComparison = async () => {
    if (selectedIds.length < 2) {
      toast.error('2개 이상의 리서치를 선택해 주세요.');
      return;
    }
    try {
      const comparisonId = await createComparison(selectedIds);
      if (comparisonId) {
        router.push(`/research/compare/${comparisonId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '비교 분석 생성에 실패했습니다.');
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode(prev => !prev);
    setSelectedIds([]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      toast.success('리서치가 삭제되었습니다.');
      removeResearch(deleteTarget.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const statCards = [
    { label: '전체 리서치', value: stats.total },
    { label: '진행 중', value: stats.inProgress },
    { label: '완료', value: stats.completed },
    { label: '이번 주', value: stats.thisWeek },
  ];

  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">대시보드</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              className={`gap-2 ${compareMode ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
              onClick={handleToggleCompareMode}
            >
              {compareMode ? <X className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
              {compareMode ? '비교 취소' : '비교 분석'}
            </Button>
            <Button onClick={() => router.push('/research/new')} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:text-white hover:-translate-y-0.5 transition-all shadow-md hover:shadow-purple-500/30 rounded-xl px-4 py-3 text-sm font-bold">
              <Plus className="h-4 w-4" />
              새 리서치
            </Button>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => {
              const Icon = statIcons[idx];
              return (
                <Card key={stat.label} className="glass-card hover:-translate-y-1 transition-transform duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 font-bold">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filter / Sort controls */}
        {!loading && allResearches.length > 0 && (
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="in_progress">진행 중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === 'newest' ? '최신순' : '오래된순'}
            </Button>
          </div>
        )}

        {/* Research list */}
        {loading ? (
          <CardGridSkeleton />
        ) : researches.length > 0 ? (
          <ResearchList
            researches={researches}
            onDelete={(id, topic) => setDeleteTarget({ id, topic })}
            compareMode={compareMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        ) : allResearches.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              해당 필터에 맞는 리서치가 없습니다.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="아직 리서치가 없습니다"
            description="새 리서치를 시작해 보세요"
            actionLabel="첫 리서치 시작하기"
            onAction={() => router.push('/research/new')}
          />
        )}
      </div>

      {/* Compare mode floating bar */}
      {compareMode && selectedIds.length >= 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedIds.length}개 선택됨
            <span className="text-muted-foreground ml-1">(2~4개 선택)</span>
          </span>
          <Button
            size="sm"
            disabled={selectedIds.length < 2 || comparingLoading}
            onClick={handleStartComparison}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:text-white"
          >
            {comparingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCompareArrows className="h-4 w-4" />
            )}
            비교 시작
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="리서치 삭제"
        description={`"${deleteTarget?.topic || ''}" 리서치를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
