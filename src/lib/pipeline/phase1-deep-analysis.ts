import Anthropic from '@anthropic-ai/sdk';
import type { SSEEvent } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TASK_PROMPTS: Record<string, { system: string; user: (topic: string, sources: string) => string }> = {
  '1.1': {
    system: `당신은 세계 최고의 리서치 분석가입니다. 수집된 자료를 분석하여 핵심 인사이트를 도출하세요.
결과는 반드시 마크다운 형식으로 작성하세요.`,
    user: (topic, sources) => `## 주제: ${topic}

## 수집된 자료:
${sources}

## 분석 요청: 핵심 인사이트 및 통념 타파

위 자료를 바탕으로 다음을 수행하세요:

1. **핵심 인사이트 3~5개** 도출
   - 각 인사이트에 대해 근거가 되는 소스를 명시
   - 기존 통념과 다른 새로운 발견을 강조

2. **통념 타파 분석**
   - 일반적으로 알려진 것과 다른 사실 식별
   - 왜 기존 통념이 잘못되었는지 근거 제시

결과를 구조화된 마크다운으로 작성하세요.`,
  },
  '1.2': {
    system: `당신은 논리학과 연구 방법론 전문가입니다. 주장의 근거 강도를 평가하세요.
결과는 반드시 마크다운 형식(테이블 포함)으로 작성하세요.`,
    user: (topic, sources) => `## 주제: ${topic}

## 수집된 자료:
${sources}

## 분석 요청: 논리적 엄밀성 및 근거 강도 평가

위 자료에서 주요 주장들을 추출하고, 각 주장에 대해 다음 4단계로 근거 강도를 평가하세요:

| 등급 | 설명 | 기준 |
|------|------|------|
| 메타분석적 | 최고 수준 | 다수의 체계적 연구 종합 |
| 실험적 | 높은 수준 | 통제된 실험/연구 기반 |
| 상관관계적 | 중간 수준 | 상관관계는 있으나 인과 불확실 |
| 일화적 | 낮은 수준 | 개인 경험/단일 사례 기반 |

각 주장에 대해:
1. 주장 내용
2. 근거 강도 등급
3. 근거 요약
4. 약점/한계

결과를 마크다운 테이블로 정리하세요.`,
  },
  '1.3': {
    system: `당신은 데이터 교차 검증 전문가입니다. 소스 간 모순과 충돌을 식별하세요.
결과는 반드시 마크다운 형식으로 작성하세요.`,
    user: (topic, sources) => `## 주제: ${topic}

## 수집된 자료:
${sources}

## 분석 요청: 데이터 교차 검증 및 모순점 추적

위 자료들 간의 모순/충돌을 식별하세요:

1. **일치하는 사항** — 여러 소스가 동의하는 핵심 사실
2. **모순/충돌** — 소스 간 상반된 주장 (각각의 근거 포함)
3. **정보 공백** — 모든 소스에서 다루지 않는 중요한 영역
4. **편향 분석** — 각 소스의 잠재적 편향 요인

마크다운으로 구조화하여 작성하세요.`,
  },
};

export async function runPhase1(
  topic: string,
  sources: string,
  taskId: string,
  emit: (event: SSEEvent) => void,
): Promise<{ content: string; modelUsed: string }> {
  const prompt = TASK_PROMPTS[taskId];
  if (!prompt) throw new Error(`Unknown task: ${taskId}`);

  emit({ type: 'task_start', phase: 1, task: taskId, message: `Phase 1 Task ${taskId} AI 분석 중...` });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: prompt.system,
    messages: [
      { role: 'user', content: prompt.user(topic, sources.slice(0, 15000)) },
    ],
  });

  let content = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      content += block.text;
    }
  }

  return { content, modelUsed: 'claude-sonnet-4-6' };
}
