import type { Provider, SourceType } from '@/types';

export interface SearchOptions {
  query: string;
  mode?: 'search' | 'verify' | 'deep';
  maxResults?: number;
  domains?: string[];
  language?: 'ko' | 'en' | 'both';
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderSearchResult {
  provider: Provider;
  text: string;
  citations: Citation[];
  sources: SourceInfo[];
  usage?: TokenUsage;
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
  reliabilityScore?: number;
  discoveryLanguage?: 'ko' | 'en';
}

export interface MultiSearchOptions extends SearchOptions {
  providers?: Provider[];
}

export interface MultiSearchResponse {
  results: ProviderSearchResult[];
  allSources: SourceInfo[];
  crossValidatedUrls: string[];
  summary: string;
  successCount: number;
  failedProviders: Provider[];
  totalUsage: TokenUsage;
}

export interface QueryDecomposition {
  original: string;
  subQueries: string[];
  mode: 'quick' | 'full';
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}
