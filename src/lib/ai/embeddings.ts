import OpenAI from 'openai';
import type { EmbeddingResult } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

  const response = await client.embeddings.create({
    model,
    input: text,
    dimensions: 1536,
  });

  return {
    embedding: response.data[0].embedding,
    model,
    usage: {
      prompt_tokens: response.usage.prompt_tokens,
      total_tokens: response.usage.total_tokens,
    },
  };
}
