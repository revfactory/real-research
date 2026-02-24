'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Research } from '@/types';

export function useResearchList() {
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchResearches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('인증이 필요합니다.');
        return;
      }

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
  }, [supabase]);

  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

  const stats = {
    total: researches.length,
    inProgress: researches.filter(r =>
      ['collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing'].includes(r.status)
    ).length,
    completed: researches.filter(r => r.status === 'completed').length,
    thisWeek: researches.filter(r => {
      if (r.status !== 'completed' || !r.completed_at) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.completed_at) >= weekAgo;
    }).length,
  };

  return { researches, loading, error, stats, refetch: fetchResearches };
}
