import Anthropic from '@anthropic-ai/sdk';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo, TokenUsage } from './types';
import { withRetry } from './retry';
import { getPrompts, getDefaultMaxResults } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000 });

export async function searchWithAnthropic(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', domains, language = 'both', maxResults } = options;

  try {
    const prompts = getPrompts(mode);
    const systemPrompt = prompts.system;
    const userPrompt = prompts.user(query, language);

    const effectiveMaxResults = maxResults ?? getDefaultMaxResults(mode);

    // Build web_search tool (web_search_20250305: stable, supports max_uses + domain filtering)
    const webSearchTool: Record<string, unknown> = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: effectiveMaxResults,
    };
    if (domains && domains.length > 0) {
      webSearchTool.allowed_domains = domains;
    }

    const tools: unknown[] = [webSearchTool];

    // Add web_fetch tool for deeper analysis
    if (mode === 'deep') {
      tools.push({
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 3,
      });
    }

    const response = await withRetry(
      () => client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Anthropic.Messages.Tool[],
        messages: [
          { role: 'user', content: userPrompt },
        ],
      } as Anthropic.Messages.MessageCreateParamsNonStreaming),
      { maxRetries: 2 },
    );

    const msg = response as Anthropic.Message;
    const citations: Citation[] = [];
    const sources: SourceInfo[] = [];
    let text = '';

    for (const block of msg.content) {
      // Extract text with citations
      if (block.type === 'text') {
        text += block.text;
        const textBlock = block as unknown as {
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

      // Extract sources from web_search_tool_result
      const anyBlock = block as unknown as {
        type: string;
        content?: Array<{
          type: string;
          url?: string;
          title?: string;
          page_age?: string;
          snippet?: string;
          encrypted_content?: string;
        }>;
      };
      if (anyBlock.type === 'web_search_tool_result' && anyBlock.content) {
        for (const result of anyBlock.content) {
          if (result.type === 'web_search_result' && result.url) {
            if (!sources.find(s => s.url === result.url)) {
              sources.push({
                url: result.url,
                title: result.title || '',
                snippet: result.snippet || '',
                pageAge: result.page_age,
              });
            }
          }
        }
      }
    }

    // Extract usage
    let usage: TokenUsage | undefined;
    const rawUsage = msg.usage;
    if (rawUsage) {
      usage = {
        inputTokens: rawUsage.input_tokens ?? 0,
        outputTokens: rawUsage.output_tokens ?? 0,
      };
    }

    return {
      provider: 'anthropic',
      text,
      citations,
      sources,
      usage,
      rawResponse: response,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      provider: 'anthropic',
      text: '',
      citations: [],
      sources: [],
      error: `Anthropic search failed: ${errorMessage}`,
    };
  }
}
