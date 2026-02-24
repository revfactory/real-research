import Anthropic from '@anthropic-ai/sdk';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function searchWithAnthropic(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', language = 'both' } = options;

  try {
    const systemPrompt = mode === 'verify'
      ? '당신은 팩트체커입니다. 주어진 주장을 검증하고 근거를 제시하세요. 한국어로 답변하세요.'
      : '당신은 리서치 어시스턴트입니다. 주어진 주제에 대해 웹을 검색하여 핵심 정보를 수집하고 정리하세요. 한국어로 답변하세요.';

    const userPrompt = mode === 'verify'
      ? `다음 주장을 검증하세요: "${query}"`
      : language === 'ko'
        ? `다음 주제에 대해 한국어 자료를 중심으로 검색하세요: ${query}`
        : `다음 주제에 대해 검색하세요: ${query}`;

    const tools: Anthropic.Messages.Tool[] = [
      {
        type: 'web_search_20260209' as unknown as 'web_search_20260209',
        name: 'web_search',
        max_uses: 5,
      } as unknown as Anthropic.Messages.Tool,
    ];

    // Add web_fetch tool for deeper analysis
    if (mode === 'deep') {
      tools.push({
        type: 'web_fetch_20260209' as unknown as 'web_fetch_20260209',
        name: 'web_fetch',
        citations: { enabled: true },
      } as unknown as Anthropic.Messages.Tool);
    }

    const response = await (client.messages.create as Function)({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      betas: ['code-execution-web-tools-2026-02-09'],
    });

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

    return {
      provider: 'anthropic',
      text,
      citations,
      sources,
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
