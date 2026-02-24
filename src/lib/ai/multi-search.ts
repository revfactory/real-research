import { searchWithOpenAI } from './openai-search';
import { searchWithAnthropic } from './anthropic-search';
import { searchWithGemini } from './gemini-search';
import { normalizeUrl } from './url-utils';
import { scoreAndFilterSources } from './source-scorer';
import type {
  MultiSearchOptions,
  MultiSearchResponse,
  ProviderSearchResult,
  SourceInfo,
  SearchOptions,
  TokenUsage,
} from './types';
import type { Provider } from '@/types';

export async function multiSearch(options: MultiSearchOptions): Promise<MultiSearchResponse> {
  const { providers = ['openai', 'anthropic', 'gemini'], language = 'both', ...searchOptions } = options;

  // If bilingual, run separate ko + en searches
  if (language === 'both') {
    const [koResult, enResult] = await Promise.all([
      executeSingleLanguageSearch({ ...searchOptions, language: 'ko', providers }),
      executeSingleLanguageSearch({ ...searchOptions, language: 'en', providers }),
    ]);
    return mergeMultiSearchResponses([koResult, enResult]);
  }

  return executeSingleLanguageSearch({ ...searchOptions, language, providers });
}

export interface BatchSearchProgress {
  /** 0-based index of the completed query */
  queryIndex: number;
  /** Total number of queries */
  totalQueries: number;
  /** The query string that just completed */
  query: string;
  /** Number of sources found in this query */
  sourcesFound: number;
  /** Providers that succeeded for this query */
  succeededProviders: string[];
  /** Providers that failed for this query */
  failedProviders: string[];
}

/**
 * Batch search: run queries with concurrency limit and progress reporting.
 * Processes up to `concurrency` queries at a time to avoid rate limits.
 */
export async function multiSearchBatch(
  queries: string[],
  options: Omit<MultiSearchOptions, 'query'> & {
    concurrency?: number;
    onProgress?: (progress: BatchSearchProgress) => void;
  },
): Promise<MultiSearchResponse> {
  const { concurrency = 2, onProgress, ...searchOptions } = options;
  const results: MultiSearchResponse[] = [];

  // Process queries in chunks with concurrency limit
  for (let i = 0; i < queries.length; i += concurrency) {
    const chunk = queries.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(query => multiSearch({ ...searchOptions, query })),
    );

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j];
      results.push(result);

      const idx = i + j;
      if (onProgress) {
        const succeeded = result.results
          .filter(r => !r.error)
          .map(r => r.provider);
        const failed = result.results
          .filter(r => !!r.error)
          .map(r => r.provider);

        onProgress({
          queryIndex: idx,
          totalQueries: queries.length,
          query: queries[idx],
          sourcesFound: result.allSources.length,
          succeededProviders: succeeded,
          failedProviders: failed,
        });
      }
    }
  }

  return mergeMultiSearchResponses(results);
}

/** Per-provider hard timeout (ms). If a provider takes longer, it returns error. */
const PROVIDER_TIMEOUT_MS = 90_000;

function raceWithTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Execute search with a specific language across all providers.
 */
async function executeSingleLanguageSearch(
  options: MultiSearchOptions & { language: 'ko' | 'en' },
): Promise<MultiSearchResponse> {
  const { providers = ['openai', 'anthropic', 'gemini'], ...searchOptions } = options;

  const searchFns: Record<Provider, () => Promise<ProviderSearchResult>> = {
    openai: () => searchWithOpenAI(searchOptions),
    anthropic: () => searchWithAnthropic(searchOptions),
    gemini: () => searchWithGemini(searchOptions),
  };

  // Execute searches in parallel, each with a hard timeout guard
  const promises = providers.map(provider =>
    raceWithTimeout(searchFns[provider](), PROVIDER_TIMEOUT_MS, `${provider}(${options.language})`),
  );
  const settled = await Promise.allSettled(promises);

  const results: ProviderSearchResult[] = [];
  const failedProviders: Provider[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      // Tag sources with discovery language
      for (const source of result.value.sources) {
        source.discoveryLanguage = options.language;
      }
      if (result.value.error) {
        failedProviders.push(providers[i]);
      }
      results.push(result.value);
    } else {
      failedProviders.push(providers[i]);
      results.push({
        provider: providers[i],
        text: '',
        citations: [],
        sources: [],
        error: result.reason?.message || 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => !r.error).length;

  // Collect all sources and deduplicate by normalized URL
  const urlMap = new Map<string, { source: SourceInfo; providers: Set<Provider> }>();

  for (const result of results) {
    if (result.error) continue;
    for (const source of result.sources) {
      if (!source.url) continue;
      const normalizedUrl = normalizeUrl(source.url);
      const existing = urlMap.get(normalizedUrl);
      if (existing) {
        existing.providers.add(result.provider);
        if (!existing.source.snippet && source.snippet) {
          existing.source.snippet = source.snippet;
        }
        if (source.confidenceScore && (!existing.source.confidenceScore || source.confidenceScore > existing.source.confidenceScore)) {
          existing.source.confidenceScore = source.confidenceScore;
        }
        if (!existing.source.pageAge && source.pageAge) {
          existing.source.pageAge = source.pageAge;
        }
        if (!existing.source.discoveryLanguage && source.discoveryLanguage) {
          existing.source.discoveryLanguage = source.discoveryLanguage;
        }
      } else {
        urlMap.set(normalizedUrl, {
          source: { ...source, url: normalizedUrl },
          providers: new Set([result.provider]),
        });
      }
    }
  }

  const allSources: SourceInfo[] = [];
  const crossValidatedUrls: string[] = [];

  for (const [url, { source, providers: sourceProviders }] of urlMap) {
    allSources.push(source);
    if (sourceProviders.size >= 2) {
      crossValidatedUrls.push(url);
    }
  }

  // Build summary from successful results
  const successfulTexts = results
    .filter(r => !r.error && r.text)
    .map(r => r.text);
  const summary = successfulTexts.join('\n\n---\n\n');

  // Aggregate token usage
  const totalUsage = aggregateUsage(results);

  return {
    results,
    allSources,
    crossValidatedUrls,
    summary,
    successCount,
    failedProviders,
    totalUsage,
  };
}

/**
 * Merge multiple MultiSearchResponse objects into one.
 * Handles URL dedup, cross-validation recalculation, and usage aggregation.
 */
function mergeMultiSearchResponses(responses: MultiSearchResponse[]): MultiSearchResponse {
  const allResults: ProviderSearchResult[] = [];
  const allFailedProviders: Set<Provider> = new Set();
  let totalSuccess = 0;

  for (const resp of responses) {
    allResults.push(...resp.results);
    totalSuccess += resp.successCount;
    for (const fp of resp.failedProviders) {
      allFailedProviders.add(fp);
    }
  }

  // Re-deduplicate all sources by normalized URL
  const urlMap = new Map<string, { source: SourceInfo; providers: Set<Provider> }>();

  for (const result of allResults) {
    if (result.error) continue;
    for (const source of result.sources) {
      if (!source.url) continue;
      const normalizedUrl = normalizeUrl(source.url);
      const existing = urlMap.get(normalizedUrl);
      if (existing) {
        existing.providers.add(result.provider);
        if (!existing.source.snippet && source.snippet) {
          existing.source.snippet = source.snippet;
        }
        if (source.confidenceScore && (!existing.source.confidenceScore || source.confidenceScore > existing.source.confidenceScore)) {
          existing.source.confidenceScore = source.confidenceScore;
        }
        if (!existing.source.pageAge && source.pageAge) {
          existing.source.pageAge = source.pageAge;
        }
        if (!existing.source.discoveryLanguage && source.discoveryLanguage) {
          existing.source.discoveryLanguage = source.discoveryLanguage;
        }
      } else {
        urlMap.set(normalizedUrl, {
          source: { ...source, url: normalizedUrl },
          providers: new Set([result.provider]),
        });
      }
    }
  }

  const allSources: SourceInfo[] = [];
  const crossValidatedUrls: string[] = [];

  for (const [url, { source, providers }] of urlMap) {
    allSources.push(source);
    if (providers.size >= 2) {
      crossValidatedUrls.push(url);
    }
  }

  const summaryParts = responses.map(r => r.summary).filter(Boolean);
  const summary = summaryParts.join('\n\n---\n\n');

  // Aggregate usage across all responses
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  for (const resp of responses) {
    totalUsage.inputTokens += resp.totalUsage.inputTokens;
    totalUsage.outputTokens += resp.totalUsage.outputTokens;
  }

  return {
    results: allResults,
    allSources,
    crossValidatedUrls,
    summary,
    successCount: totalSuccess,
    failedProviders: [...allFailedProviders],
    totalUsage,
  };
}

/**
 * Aggregate token usage from provider results.
 */
function aggregateUsage(results: ProviderSearchResult[]): TokenUsage {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const r of results) {
    if (r.usage) {
      inputTokens += r.usage.inputTokens;
      outputTokens += r.usage.outputTokens;
    }
  }
  return { inputTokens, outputTokens };
}

/**
 * Apply source scoring and filtering to a MultiSearchResponse.
 * Call this after search to enrich sources with reliability scores.
 */
export function enrichSearchResults(response: MultiSearchResponse): MultiSearchResponse {
  const crossValidatedSet = new Set(response.crossValidatedUrls);
  const enrichedSources = scoreAndFilterSources(response.allSources, crossValidatedSet);

  return {
    ...response,
    allSources: enrichedSources,
  };
}
