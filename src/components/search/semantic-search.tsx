'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { SearchResultCard } from './search-result-card';
import { useSemanticSearch } from '@/hooks/use-semantic-search';

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const { results, loading, error, hasSearched, search } = useSemanticSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="키워드 또는 질문으로 검색..."
            className="pl-10 pr-10 h-12 text-base"
            maxLength={500}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          시맨틱 검색: 의미 기반으로 관련 리서치를 찾습니다
        </p>
      </form>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div
              key={result.research_id}
              className="animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <SearchResultCard
                researchId={result.research_id}
                topic={result.topic}
                summary={result.executive_summary}
                similarity={result.similarity}
                createdAt={result.created_at}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <EmptyState
          icon={Search}
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색해 보세요"
        />
      )}

      {!hasSearched && !loading && (
        <EmptyState
          icon={Search}
          title="검색어를 입력하세요"
          description="과거 리서치를 의미 기반으로 검색합니다"
        />
      )}
    </div>
  );
}
