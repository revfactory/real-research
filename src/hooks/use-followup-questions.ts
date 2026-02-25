'use client';

import { useState, useCallback } from 'react';
import type { FollowupQuestion } from '@/types';

export function useFollowupQuestions(researchId: string) {
  const [questions, setQuestions] = useState<FollowupQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research/${researchId}/followup`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to fetch followup questions:', err);
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  const generateQuestions = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/research/${researchId}/followup`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '질문 생성에 실패했습니다.');
      }
    } finally {
      setGenerating(false);
    }
  }, [researchId]);

  return { questions, loading, generating, fetchQuestions, generateQuestions };
}
