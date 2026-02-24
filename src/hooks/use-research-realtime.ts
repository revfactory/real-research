'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Research, ResearchPhaseResult } from '@/types';

interface UseResearchRealtimeOptions {
  researchId: string;
  enabled?: boolean;
  onResearchUpdate?: (research: Partial<Research>) => void;
  onPhaseUpdate?: (phaseResult: Partial<ResearchPhaseResult>) => void;
}

export function useResearchRealtime({
  researchId,
  enabled = true,
  onResearchUpdate,
  onPhaseUpdate,
}: UseResearchRealtimeOptions) {
  const supabaseRef = useRef(createClient());

  const subscribe = useCallback(() => {
    if (!enabled || !researchId) return null;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`research:${researchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research',
          filter: `id=eq.${researchId}`,
        },
        (payload) => {
          onResearchUpdate?.(payload.new as Partial<Research>);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_phase_result',
          filter: `research_id=eq.${researchId}`,
        },
        (payload) => {
          onPhaseUpdate?.(payload.new as Partial<ResearchPhaseResult>);
        }
      )
      .subscribe();

    return channel;
  }, [researchId, enabled, onResearchUpdate, onPhaseUpdate]);

  useEffect(() => {
    const channel = subscribe();
    return () => {
      if (channel) {
        supabaseRef.current.removeChannel(channel);
      }
    };
  }, [subscribe]);
}
