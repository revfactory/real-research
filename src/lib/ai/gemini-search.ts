import { GoogleGenAI } from '@google/genai';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo } from './types';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function searchWithGemini(options: SearchOptions): Promise<ProviderSearchResult> {
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

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const citations: Citation[] = [];
    const sources: SourceInfo[] = [];
    let text = '';

    // Extract text from response
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      // Get text content
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            text += part.text;
          }
        }
      }

      // Extract grounding metadata
      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata) {
        // Extract sources from groundingChunks
        if (groundingMetadata.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web) {
              const url = chunk.web.uri || '';
              const title = chunk.web.title || '';
              if (url && !sources.find(s => s.url === url)) {
                sources.push({
                  url,
                  title,
                  snippet: '',
                });
              }
            }
          }
        }

        // Extract confidence scores from groundingSupports
        if (groundingMetadata.groundingSupports) {
          for (const support of groundingMetadata.groundingSupports) {
            const segment = support.segment;
            if (segment && support.groundingChunkIndices) {
              for (let i = 0; i < support.groundingChunkIndices.length; i++) {
                const chunkIndex = support.groundingChunkIndices[i];
                const confidenceScore = support.confidenceScores?.[i];
                const chunk = groundingMetadata.groundingChunks?.[chunkIndex];
                if (chunk?.web?.uri) {
                  citations.push({
                    url: chunk.web.uri,
                    title: chunk.web.title || '',
                    citedText: segment.text || '',
                    startIndex: segment.startIndex,
                    endIndex: segment.endIndex,
                  });
                  // Update source confidence score
                  const source = sources.find(s => s.url === chunk.web!.uri);
                  if (source && confidenceScore !== undefined) {
                    source.confidenceScore = Math.max(
                      source.confidenceScore || 0,
                      confidenceScore
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      provider: 'gemini',
      text,
      citations,
      sources,
      rawResponse: response,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      provider: 'gemini',
      text: '',
      citations: [],
      sources: [],
      error: `Gemini search failed: ${errorMessage}`,
    };
  }
}
