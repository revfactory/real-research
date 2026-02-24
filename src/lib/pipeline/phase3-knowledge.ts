import Anthropic from '@anthropic-ai/sdk';
import type { SSEEvent } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TASK_PROMPTS: Record<string, {
  system: string;
  user: (topic: string, sources: string, phase1: string, phase2: string) => string;
}> = {
  '3.1': {
    system: `당신은 지식 통합 전문가입니다. MECE(Mutually Exclusive, Collectively Exhaustive) 원칙에 따라 프레임워크를 설계하세요.
마크다운 형식으로 작성하세요.`,
    user: (topic, sources, phase1, phase2) => `## 주제: ${topic}

## 원본 자료 요약:
${sources}

## Phase 1 (심층 분석) 결과:
${phase1}

## Phase 2 (비판적 사고) 결과:
${phase2}

## 분석 요청: MECE 메타 프레임워크 구축

모든 이전 분석을 통합하여 MECE 프레임워크를 설계하세요:

1. **프레임워크 구조**
   - 핵심 구성 요소 (상호배타적 카테고리)
   - 각 요소 간 관계 및 인과구조
   - 예외 및 경계 조건

2. **인과관계 맵**
   - 주요 원인 → 결과 체인
   - 피드백 루프 식별
   - 외부 영향 요인

3. **종합 분석 매트릭스**
   - 확실한 것 vs 불확실한 것
   - 합의된 것 vs 논쟁 중인 것

마크다운 다이어그램/테이블로 시각화하세요.`,
  },
  '3.2': {
    system: `당신은 미래 예측 전문가입니다. 과거 트렌드를 기반으로 미래를 예측하세요.
마크다운 형식으로 작성하세요.`,
    user: (topic, sources, phase1, phase2) => `## 주제: ${topic}

## 원본 자료 요약:
${sources}

## Phase 1 결과:
${phase1}

## Phase 2 결과:
${phase2}

## 분석 요청: 진화 타임라인 및 미래 예측

1. **타임라인 구축**
   - 주요 이정표와 전환점
   - 각 시기별 핵심 변화

2. **미래 3가지 시나리오** (각각 확신도% 포함)
   - **낙관적 시나리오** (확신도: _%)
     - 핵심 전제
     - 예상 전개
     - 기회 요인
   - **기본 시나리오** (확신도: _%)
     - 핵심 전제
     - 예상 전개
     - 모니터링 지표
   - **비관적 시나리오** (확신도: _%)
     - 핵심 전제
     - 예상 전개
     - 리스크 요인

3. **시나리오별 대응 전략**
   - 각 시나리오에 대한 권고사항

마크다운으로 구조화하세요.`,
  },
};

export async function runPhase3(
  topic: string,
  sources: string,
  phase1Content: string,
  phase2Content: string,
  taskId: string,
  emit: (event: SSEEvent) => void,
): Promise<{ content: string; modelUsed: string }> {
  const prompt = TASK_PROMPTS[taskId];
  if (!prompt) throw new Error(`Unknown task: ${taskId}`);

  emit({ type: 'task_start', phase: 3, task: taskId, message: `Phase 3 Task ${taskId} 지식 통합 중...` });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: prompt.system,
    messages: [
      {
        role: 'user',
        content: prompt.user(
          topic,
          sources.slice(0, 10000),
          phase1Content.slice(0, 5000),
          phase2Content.slice(0, 5000),
        ),
      },
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
