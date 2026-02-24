import type { Provider, SourceType } from '@/types';

export interface SearchOptions {
  query: string;
  mode?: 'search' | 'verify' | 'deep';
  maxResults?: number;
  domains?: string[];
  language?: 'ko' | 'en' | 'both';
}

export interface ProviderSearchResult {
  provider: Provider;
  text: string;
  citations: Citation[];
  sources: SourceInfo[];
  rawResponse?: unknown;
  error?: string;
}

export interface Citation {
  url: string;
  title: string;
  citedText?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface SourceInfo {
  url: string;
  title: string;
  snippet?: string;
  pageAge?: string;
  sourceType?: SourceType;
  confidenceScore?: number;
}

export interface MultiSearchOptions extends SearchOptions {
  providers?: Provider[];
}

export interface MultiSearchResponse {
  results: ProviderSearchResult[];
  allSources: SourceInfo[];
  crossValidatedUrls: string[];
  summary: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}
