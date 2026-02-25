'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Research,
  ResearchSource,
  ResearchPhaseResult,
  FactCheckResult,
  ResearchReport,
} from '@/types';

interface ResearchDetail {
  research: Research | null;
  sources: ResearchSource[];
  phaseResults: ResearchPhaseResult[];
  factChecks: FactCheckResult[];
  report: ResearchReport | null;
}

export function useResearchDetail(researchId: string) {
  const [data, setData] = useState<ResearchDetail>({
    research: null,
    sources: [],
    phaseResults: [],
    factChecks: [],
    report: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());

  const fetchDetail = useCallback(async () => {
    const supabase = supabaseRef.current;
    setLoading(true);
    setError(null);
    try {
      const [researchRes, sourcesRes, phasesRes, factsRes, reportRes] =
        await Promise.all([
          supabase.from('research').select('*').eq('id', researchId).single(),
          supabase
            .from('research_source')
            .select('*')
            .eq('research_id', researchId)
            .order('created_at', { ascending: true }),
          supabase
            .from('research_phase_result')
            .select('*')
            .eq('research_id', researchId)
            .order('phase', { ascending: true })
            .order('task_id', { ascending: true }),
          supabase
            .from('fact_check_result')
            .select('*')
            .eq('research_id', researchId)
            .order('phase', { ascending: true }),
          supabase
            .from('research_report')
            .select('*')
            .eq('research_id', researchId)
            .maybeSingle(),
        ]);

      if (researchRes.error) throw researchRes.error;
      if (reportRes.error) console.error('Report fetch error:', reportRes.error);

      setData({
        research: researchRes.data as Research,
        sources: (sourcesRes.data as ResearchSource[]) || [],
        phaseResults: (phasesRes.data as ResearchPhaseResult[]) || [],
        factChecks: (factsRes.data as FactCheckResult[]) || [],
        report: (reportRes.data as unknown as ResearchReport) || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  useEffect(() => {
    if (researchId) {
      fetchDetail();
    }
  }, [researchId, fetchDetail]);

  return { ...data, loading, error, refetch: fetchDetail };
}
