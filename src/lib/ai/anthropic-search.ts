import Anthropic from '@anthropic-ai/sdk';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo, TokenUsage } from './types';
import { withRetry } from './retry';
import { getPrompts, getDefaultMaxResults } from './prompts';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // SDK timeout should be longer than withRetry timeout so retry logic controls timing
  timeout: 120_000,
});

export async function searchWithAnthropic(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', domains, language = 'both', maxResults } = options;

  try {
    const prompts = getPrompts(mode);
    const systemPrompt = prompts.system;
    const userPrompt = prompts.user(query, language);

    const effectiveMaxResults = maxResults ?? getDefaultMaxResults(mode);

    // Build tools with proper SDK types
    const webSearchTool: Anthropic.Messages.WebSearchTool20250305 = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: effectiveMaxResults,
    };
    if (domains && domains.length > 0) {
      webSearchTool.allowed_domains = domains;
    }

    const tools: Anthropic.Messages.ToolUnion[] = [webSearchTool];

    // Add web_fetch tool for deeper analysis
    if (mode === 'deep') {
      const webFetchTool: Anthropic.Messages.WebFetchTool20250910 = {
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 3,
      };
      tools.push(webFetchTool);
    }

    console.log(`[Anthropic] Searching: "${query.slice(0, 60)}..." (mode=${mode}, maxResults=${effectiveMaxResults}, lang=${language})`);

    const response = await withRetry(
      () => client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
      { maxRetries: 2, timeout: 90_000 },
    );

    const citations: Citation[] = [];
    const sources: SourceInfo[] = [];
    let text = '';

    for (const block of response.content) {
      // Extract text with citations
      if (block.type === 'text') {
        text += block.text;
        // Citations are nested inside text blocks
        const textBlock = block as Anthropic.Messages.TextBlock & {
          citations?: Array<{
            type: string;
            url?: string;
            title?: string;
            cited_text?: string;
          }>;
        };
        if (textBlock.citations) {
          for (const citation of textBlock.citations) {
            if (citation.type === 'web_search_result_location' && citation.url) {
              citations.push({
                url: citation.url,
                title: citation.title || '',
                citedText: citation.cited_text,
              });
              if (!sources.find(s => s.url === citation.url)) {
                sources.push({
                  url: citation.url,
                  title: citation.title || '',
                  snippet: citation.cited_text || '',
                });
              }
            }
          }
        }
      }

      // Extract sources from web_search_tool_result blocks
      if (block.type === 'web_search_tool_result') {
        const searchResult = block as Anthropic.Messages.WebSearchToolResultBlock;
        if (Array.isArray(searchResult.content)) {
          for (const result of searchResult.content) {
            if ('url' in result && 'title' in result) {
              const webResult = result as Anthropic.Messages.WebSearchResultBlock;
              if (!sources.find(s => s.url === webResult.url)) {
                sources.push({
                  url: webResult.url,
                  title: webResult.title || '',
                  snippet: '',
                  pageAge: webResult.page_age || undefined,
                });
              }
            }
          }
        }
      }
    }

    // Extract usage
    let usage: TokenUsage | undefined;
    const rawUsage = response.usage;
    if (rawUsage) {
      usage = {
        inputTokens: rawUsage.input_tokens ?? 0,
        outputTokens: rawUsage.output_tokens ?? 0,
      };
    }

    console.log(`[Anthropic] Success: ${sources.length} sources, ${text.length} chars text`);

    return {
      provider: 'anthropic',
      text,
      citations,
      sources,
      usage,
      rawResponse: response,
    };
  } catch (error) {
    // Detailed error logging for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.constructor.name : typeof error;
    const anyError = error as Record<string, unknown>;
    const status = anyError?.status;
    const errorBody = anyError?.error;

    console.error(`[Anthropic] Search failed:`, {
      errorName,
      errorMessage,
      status,
      errorBody: errorBody ? JSON.stringify(errorBody) : undefined,
      query: query.slice(0, 60),
      mode,
    });

    return {
      provider: 'anthropic',
      text: '',
      citations: [],
      sources: [],
      error: `Anthropic search failed (${errorName}${status ? ` ${status}` : ''}): ${errorMessage}`,
    };
  }
}
