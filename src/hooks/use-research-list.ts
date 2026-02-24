'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Research } from '@/types';

export type StatusFilter = 'all' | 'in_progress' | 'completed' | 'failed';
export type SortOrder = 'newest' | 'oldest';

const IN_PROGRESS_STATUSES = ['collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing'];

export function useResearchList() {
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const userIdRef = useRef<string | null>(null);

  const supabaseRef = useRef(createClient());

  const fetchResearches = useCallback(async () => {
    const supabase = supabaseRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('인증이 필요합니다.');
        return;
      }
      userIdRef.current = user.id;

      const { data, error: dbError } = await supabase
        .from('research')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setResearches((data as Research[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

  // Realtime subscription for research table
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel('dashboard-research')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'research' },
        (payload) => {
          const newRow = payload.new as Research;
          if (userIdRef.current && newRow.user_id === userIdRef.current) {
            setResearches((prev) => [newRow, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'research' },
        (payload) => {
          const updated = payload.new as Research;
          if (userIdRef.current && updated.user_id === userIdRef.current) {
            setResearches((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'research' },
        (payload) => {
          const deleted = payload.old as { id: string };
          if (deleted.id) {
            setResearches((prev) => prev.filter((r) => r.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const removeResearch = useCallback((id: string) => {
    setResearches((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const filteredResearches = useMemo(() => {
    let filtered = researches;

    // Apply status filter
    if (statusFilter === 'in_progress') {
      filtered = filtered.filter(r => IN_PROGRESS_STATUSES.includes(r.status));
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(r => r.status === 'completed');
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter(r => r.status === 'failed');
    }

    // Apply sort order
    if (sortOrder === 'oldest') {
      filtered = [...filtered].reverse();
    }

    return filtered;
  }, [researches, statusFilter, sortOrder]);

  const stats = {
    total: researches.length,
    inProgress: researches.filter(r => IN_PROGRESS_STATUSES.includes(r.status)).length,
    completed: researches.filter(r => r.status === 'completed').length,
    thisWeek: researches.filter(r => {
      if (r.status !== 'completed' || !r.completed_at) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.completed_at) >= weekAgo;
    }).length,
  };

  return {
    researches: filteredResearches,
    allResearches: researches,
    loading,
    error,
    stats,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    refetch: fetchResearches,
    removeResearch,
  };
}
