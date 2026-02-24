'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  FileSearch,
  BarChart3,
  Loader2,
  CheckCircle2,
  CalendarDays,
  ArrowUpDown,
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
import { useResearchList } from '@/hooks/use-research-list';
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
  } = useResearchList();

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
          <h1 className="text-[28px] font-bold">대시보드</h1>
          <Button onClick={() => router.push('/research/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            새 리서치
          </Button>
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
                <Card key={stat.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
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
          <ResearchList researches={researches} />
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
    </div>
  );
}
