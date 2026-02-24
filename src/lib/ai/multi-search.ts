import { searchWithOpenAI } from './openai-search';
import { searchWithAnthropic } from './anthropic-search';
import { searchWithGemini } from './gemini-search';
import type { MultiSearchOptions, MultiSearchResponse, ProviderSearchResult, SourceInfo } from './types';
import type { Provider } from '@/types';

export async function multiSearch(options: MultiSearchOptions): Promise<MultiSearchResponse> {
  const { providers = ['openai', 'anthropic', 'gemini'], ...searchOptions } = options;

  const searchFns: Record<Provider, () => Promise<ProviderSearchResult>> = {
    openai: () => searchWithOpenAI(searchOptions),
    anthropic: () => searchWithAnthropic(searchOptions),
    gemini: () => searchWithGemini(searchOptions),
  };

  // Execute searches in parallel
  const startTime = Date.now();
  const promises = providers.map(provider => searchFns[provider]());
  const settled = await Promise.allSettled(promises);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const results: ProviderSearchResult[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        provider: providers[i],
        text: '',
        citations: [],
        sources: [],
        error: result.reason?.message || 'Unknown error',
      });
    }
  }

  // Collect all sources and deduplicate by URL
  const urlMap = new Map<string, { source: SourceInfo; providers: Set<Provider> }>();

  for (const result of results) {
    if (result.error) continue;
    for (const source of result.sources) {
      if (!source.url) continue;
      const existing = urlMap.get(source.url);
      if (existing) {
        existing.providers.add(result.provider);
        // Merge snippet if missing
        if (!existing.source.snippet && source.snippet) {
          existing.source.snippet = source.snippet;
        }
        // Use highest confidence score
        if (source.confidenceScore && (!existing.source.confidenceScore || source.confidenceScore > existing.source.confidenceScore)) {
          existing.source.confidenceScore = source.confidenceScore;
        }
      } else {
        urlMap.set(source.url, {
          source: { ...source },
          providers: new Set([result.provider]),
        });
      }
    }
  }

  const allSources: SourceInfo[] = [];
  const crossValidatedUrls: string[] = [];

  for (const [url, { source, providers: sourceProviders }] of urlMap) {
    allSources.push(source);
    // Cross-validated if found in 2+ providers
    if (sourceProviders.size >= 2) {
      crossValidatedUrls.push(url);
    }
  }

  // Build summary from successful results
  const successfulTexts = results
    .filter(r => !r.error && r.text)
    .map(r => r.text);
  const summary = successfulTexts.join('\n\n---\n\n');

  return {
    results,
    allSources,
    crossValidatedUrls,
    summary,
  };
}
