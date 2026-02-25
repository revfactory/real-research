'use client';

import { useState, useCallback, useEffect } from 'react';

export function useVoiceBriefing(researchId: string, hasReport: boolean) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const checkExisting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research/${researchId}/voice`);
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.audioUrl);
      }
    } catch (err) {
      console.error('Failed to check voice:', err);
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/research/${researchId}/voice`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.audioUrl);
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '음성 생성에 실패했습니다.');
      }
    } finally {
      setGenerating(false);
    }
  }, [researchId]);

  useEffect(() => {
    if (hasReport) checkExisting();
  }, [hasReport, checkExisting]);

  return { audioUrl, loading, generating, generate };
}
