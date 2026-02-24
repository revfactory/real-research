import Anthropic from '@anthropic-ai/sdk';
import type { SSEEvent } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TASK_PROMPTS: Record<string, { system: string; user: (topic: string, sources: string, phase1: string) => string }> = {
  '2.1': {
    system: `당신은 레드팀 비판적 분석가입니다. 주어진 분석 결과의 약점을 공격적으로 찾아내세요.
철저하게 비판하되, 건설적인 비판이어야 합니다. 마크다운 형식으로 작성하세요.`,
    user: (topic, sources, phase1) => `## 주제: ${topic}

## 원본 자료:
${sources}

## Phase 1 분석 결과:
${phase1}

## 레드팀 분석 요청: 약점 공격

Phase 1의 분석 결과를 공격적으로 비판하세요:

1. **방법론적 결함** (각각 심각도 1~10)
   - 데이터 수집의 편향
   - 표본 크기 문제
   - 측정 방법의 한계

2. **논리적 비약** (각각 심각도 1~10)
   - 상관관계를 인과관계로 착각한 부분
   - 일반화의 오류
   - 확증 편향

3. **대안적 해석**
   - 동일 데이터의 다른 해석 가능성
   - 무시된 변수들

결과를 심각도 순으로 정렬하여 마크다운으로 작성하세요.`,
  },
  '2.2': {
    system: `당신은 숨겨진 가정과 전제를 찾아내는 전문가입니다. 분석의 기저에 깔린 가정들을 역추적하세요.
마크다운 형식으로 작성하세요.`,
    user: (topic, sources, phase1) => `## 주제: ${topic}

## 원본 자료:
${sources}

## Phase 1 분석 결과:
${phase1}

## 분석 요청: 숨겨진 전제 조건 역추적

1. **숨은 가정 목록**
   - 각 주요 주장의 기저에 깔린 암묵적 가정
   - 가정이 틀릴 경우의 영향

2. **파괴 시나리오**
   - 각 가정이 무너질 경우의 시나리오
   - 어떤 조건에서 가정이 무너지는지

3. **리스크 매트릭스**
   - 가정 실패 확률 x 영향도 매트릭스

마크다운으로 구조화하세요.`,
  },
  '2.3': {
    system: `당신은 학술적/실무적 공백을 탐색하는 전문가입니다. 아직 답하지 못한 핵심 질문들을 도출하세요.
마크다운 형식으로 작성하세요.`,
    user: (topic, sources, phase1) => `## 주제: ${topic}

## 원본 자료:
${sources}

## Phase 1 분석 결과:
${phase1}

## 분석 요청: 학술적/실무적 공백 탐색

지금까지의 분석에서 답하지 못한 심층 질문 5~7개를 생성하세요:

각 질문에 대해:
1. **질문** — 구체적이고 탐구할 가치가 있는 질문
2. **왜 중요한가** — 이 질문이 왜 핵심적인지
3. **현재 상태** — 현재까지 알려진 것과 모르는 것
4. **탐구 방향** — 어떻게 답을 찾을 수 있는지

마크다운으로 구조화하세요.`,
  },
};

export async function runPhase2(
  topic: string,
  sources: string,
  phase1Content: string,
  taskId: string,
  emit: (event: SSEEvent) => void,
): Promise<{ content: string; modelUsed: string }> {
  const prompt = TASK_PROMPTS[taskId];
  if (!prompt) throw new Error(`Unknown task: ${taskId}`);

  emit({ type: 'task_start', phase: 2, task: taskId, message: `Phase 2 Task ${taskId} 레드팀 분석 중...` });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: prompt.system,
    messages: [
      { role: 'user', content: prompt.user(topic, sources.slice(0, 12000), phase1Content.slice(0, 6000)) },
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
