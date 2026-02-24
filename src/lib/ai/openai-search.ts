import OpenAI from 'openai';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function searchWithOpenAI(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', domains, language = 'both' } = options;

  try {
    const systemPrompt = mode === 'verify'
      ? '당신은 팩트체커입니다. 주어진 주장을 검증하고 근거를 제시하세요. 한국어로 답변하세요.'
      : '당신은 리서치 어시스턴트입니다. 주어진 주제에 대해 웹을 검색하여 핵심 정보를 수집하고 정리하세요. 한국어로 답변하세요.';

    const userPrompt = mode === 'verify'
      ? `다음 주장을 검증하세요: "${query}"`
      : language === 'ko'
        ? `다음 주제에 대해 한국어 자료를 중심으로 검색하세요: ${query}`
        : `다음 주제에 대해 검색하세요: ${query}`;

    const webSearchTool: Record<string, unknown> = { type: 'web_search' };
    if (domains && domains.length > 0) {
      webSearchTool.search_context_filter = {
        allowed_domains: domains,
      };
    }

    const response = await client.responses.create({
      model: 'gpt-4.1',
      tools: [webSearchTool as unknown as OpenAI.Responses.WebSearchTool],
      include: ['web_search_call.action.sources'] as unknown as OpenAI.Responses.ResponseIncludable[],
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

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

    return {
      provider: 'openai',
      text,
      citations,
      sources,
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
