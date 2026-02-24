import { GoogleGenAI } from '@google/genai';
import type { SearchOptions, ProviderSearchResult, Citation, SourceInfo, TokenUsage } from './types';
import { withRetry } from './retry';
import { getPrompts } from './prompts';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function searchWithGemini(options: SearchOptions): Promise<ProviderSearchResult> {
  const { query, mode = 'search', language = 'both' } = options;

  try {
    const prompts = getPrompts(mode);
    const systemPrompt = prompts.system;
    const userPrompt = prompts.user(query, language);

    const response = await withRetry(
      () => genai.models.generateContent({
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
      }),
      { maxRetries: 2 },
    );

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

    // Extract usage
    let usage: TokenUsage | undefined;
    const rawUsage = response.usageMetadata;
    if (rawUsage) {
      usage = {
        inputTokens: rawUsage.promptTokenCount ?? 0,
        outputTokens: rawUsage.candidatesTokenCount ?? 0,
      };
    }

    return {
      provider: 'gemini',
      text,
      citations,
      sources,
      usage,
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
