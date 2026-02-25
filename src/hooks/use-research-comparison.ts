'use client';

import { useState, useCallback } from 'react';
import type { ResearchComparison } from '@/types';

interface ComparisonResearch {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

export function useResearchComparison() {
  const [comparison, setComparison] = useState<ResearchComparison | null>(null);
  const [researches, setResearches] = useState<ComparisonResearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');

  const createComparison = useCallback(async (researchIds: string[]): Promise<string | null> => {
    setGenerating(true);
    setStreamedContent('');
    try {
      const res = await fetch('/api/research/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchIds }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '비교 분석 생성에 실패했습니다.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let comparisonId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'init') {
              comparisonId = data.comparisonId;
            }
            if (data.type === 'delta') {
              setStreamedContent(prev => prev + data.content);
            }
            if (data.type === 'done') {
              comparisonId = data.comparisonId;
            }
            if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // skip malformed
          }
        }
      }

      return comparisonId;
    } finally {
      setGenerating(false);
    }
  }, []);

  const fetchComparison = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research/compare/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison);
        setResearches(data.researches || []);
        if (data.comparison?.analysis) {
          setStreamedContent(data.comparison.analysis);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comparison:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { comparison, researches, loading, generating, streamedContent, createComparison, fetchComparison };
}
