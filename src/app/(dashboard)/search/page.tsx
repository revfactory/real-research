'use client';

import { Header } from '@/components/layout/header';
import { SemanticSearch } from '@/components/search/semantic-search';

export default function SearchPage() {
  return (
    <div>
      <Header />
      <div className="p-4 lg:p-8 max-w-[800px] mx-auto space-y-6">
        <h1 className="text-[28px] font-bold">리서치 검색</h1>
        <SemanticSearch />
      </div>
    </div>
  );
}
