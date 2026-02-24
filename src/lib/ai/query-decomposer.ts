import Anthropic from '@anthropic-ai/sdk';
import type { QueryDecomposition } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DECOMPOSE_PROMPT = `주어진 리서치 주제를 다각적으로 조사하기 위한 서브쿼리로 분해하세요.

관점:
1. 핵심 정의 및 개념 (이것은 무엇인가?)
2. 주요 플레이어 및 이해관계자 (누가 관련되어 있나?)
3. 최신 동향 및 현황 (현재 어떤 상황인가?)
4. 리스크, 비판, 반대 의견 (무엇이 문제인가?)
5. 미래 전망 및 영향 (앞으로 어떻게 될 것인가?)

규칙:
- 각 서브쿼리는 독립적인 웹 검색에 적합해야 합니다
- 원래 주제의 맥락을 유지하면서도 구체적이어야 합니다
- 한국어로 작성하되, 영어 키워드가 더 적합한 경우 영어를 혼용하세요
- JSON 배열만 출력하세요 (다른 텍스트 없이)`;

/**
 * Decompose a research topic into sub-queries using Claude Haiku.
 * Quick mode: 3 sub-queries, Full mode: 5 sub-queries
 */
export async function decomposeQuery(
  topic: string,
  description: string | undefined,
  mode: 'quick' | 'full' = 'full',
): Promise<QueryDecomposition> {
  const count = mode === 'quick' ? 3 : 5;
  const topicContext = description ? `${topic}. ${description}` : topic;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: DECOMPOSE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `주제: "${topicContext}"\n\n위 주제를 ${count}개의 서브쿼리로 분해하세요. JSON 배열 형태로 출력하세요.\n예시: ["서브쿼리1", "서브쿼리2", "서브쿼리3"]`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[QueryDecomposer] Failed to parse JSON, using fallback');
      return fallbackDecomposition(topic, mode);
    }

    const subQueries: string[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(subQueries) || subQueries.length === 0) {
      return fallbackDecomposition(topic, mode);
    }

    return {
      original: topicContext,
      subQueries: subQueries.slice(0, count),
      mode,
    };
  } catch (error) {
    console.warn('[QueryDecomposer] API call failed, using fallback:', error instanceof Error ? error.message : error);
    return fallbackDecomposition(topic, mode);
  }
}

/**
 * Simple fallback decomposition when API fails
 */
function fallbackDecomposition(topic: string, mode: 'quick' | 'full'): QueryDecomposition {
  const subQueries = mode === 'quick'
    ? [
        `${topic} 개요 정의`,
        `${topic} 최신 동향 2024 2025`,
        `${topic} 전망 분석`,
      ]
    : [
        `${topic} 정의 개념 설명`,
        `${topic} 주요 기업 플레이어`,
        `${topic} 최신 동향 뉴스 2024 2025`,
        `${topic} 문제점 비판 리스크`,
        `${topic} 미래 전망 예측`,
      ];

  return { original: topic, subQueries, mode };
}
