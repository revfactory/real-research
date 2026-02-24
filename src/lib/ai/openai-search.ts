import OpenAI from 'openai';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo, TokenUsage } from './types';
import { withRetry } from './retry';
import { getPrompts, getDefaultMaxResults } from './prompts';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000 });

/**
 * Map maxResults to OpenAI search_context_size
 */
function getSearchContextSize(maxResults?: number): 'low' | 'medium' | 'high' {
  const n = maxResults ?? 5;
  if (n <= 3) return 'low';
  if (n <= 5) return 'medium';
  return 'high';
}

export async function searchWithOpenAI(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', domains, language = 'both', maxResults } = options;

  try {
    const prompts = getPrompts(mode);
    const systemPrompt = prompts.system;
    const userPrompt = prompts.user(query, language);

    const webSearchTool: Record<string, unknown> = {
      type: 'web_search',
      search_context_size: getSearchContextSize(maxResults ?? getDefaultMaxResults(mode)),
    };
    if (domains && domains.length > 0) {
      webSearchTool.search_context_filter = {
        allowed_domains: domains,
      };
    }

    const response = await withRetry(
      () => client.responses.create({
        model: 'gpt-4.1',
        tools: [webSearchTool as unknown as OpenAI.Responses.WebSearchTool],
        include: ['web_search_call.action.sources'] as unknown as OpenAI.Responses.ResponseIncludable[],
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      { maxRetries: 2 },
    );

    const citations: Citation[] = [];
    const sources: SourceInfo[] = [];
    let text = '';

    for (const item of response.output) {
      if (item.type === 'message') {
        for (const content of item.content) {
          if (content.type === 'output_text') {
            text += content.text;
            if (content.annotations) {
              for (const annotation of content.annotations) {
                if (annotation.type === 'url_citation') {
                  citations.push({
                    url: annotation.url,
                    title: annotation.title || '',
                    startIndex: annotation.start_index,
                    endIndex: annotation.end_index,
                  });
                  if (!sources.find(s => s.url === annotation.url)) {
                    sources.push({
                      url: annotation.url,
                      title: annotation.title || '',
                      snippet: text.slice(
                        Math.max(0, annotation.start_index - 100),
                        annotation.end_index
                      ).trim(),
                    });
                  }
                }
              }
            }
          }
        }
      }
      // Extract sources from web_search_call results
      if (item.type === 'web_search_call') {
        const searchItem = item as unknown as { action?: { sources?: Array<{ url: string; title: string; snippet?: string }> } };
        if (searchItem.action?.sources) {
          for (const source of searchItem.action.sources) {
            if (!sources.find(s => s.url === source.url)) {
              sources.push({
                url: source.url,
                title: source.title || '',
                snippet: source.snippet || '',
              });
            }
          }
        }
      }
    }

    // Extract usage
    let usage: TokenUsage | undefined;
    const rawUsage = (response as unknown as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
    if (rawUsage) {
      usage = {
        inputTokens: rawUsage.input_tokens ?? 0,
        outputTokens: rawUsage.output_tokens ?? 0,
      };
    }

    return {
      provider: 'openai',
      text,
      citations,
      sources,
      usage,
      rawResponse: response,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      provider: 'openai',
      text: '',
      citations: [],
      sources: [],
      error: `OpenAI search failed: ${errorMessage}`,
    };
  }
}
