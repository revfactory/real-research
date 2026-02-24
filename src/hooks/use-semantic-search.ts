'use client';

import { useState, useCallback } from 'react';

interface SearchResult {
  research_id: string;
  topic: string;
  executive_summary: string;
  similarity: number;
  created_at?: string;
}

export function useSemanticSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '검색에 실패했습니다.');
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, hasSearched, search };
}
