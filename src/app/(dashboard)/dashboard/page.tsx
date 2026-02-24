'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  FileSearch,
  BarChart3,
  Loader2,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { ResearchList } from '@/components/research/research-list';
import { EmptyState } from '@/components/shared/empty-state';
import { CardGridSkeleton, StatCardSkeleton } from '@/components/shared/loading-skeleton';
import { useResearchList } from '@/hooks/use-research-list';

const statIcons = [BarChart3, Loader2, CheckCircle2, CalendarDays];

export default function DashboardPage() {
  const router = useRouter();
  const { researches, loading, stats } = useResearchList();

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

        {/* Research list */}
        {loading ? (
          <CardGridSkeleton />
        ) : researches.length > 0 ? (
          <ResearchList researches={researches} />
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
