import Anthropic from '@anthropic-ai/sdk';
import type { SSEEvent } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TASK_PROMPTS: Record<string, {
  system: string;
  user: (topic: string, phase1: string, phase2: string, phase3: string) => string;
}> = {
  '4.1': {
    system: `당신은 전략 커뮤니케이션 전문가입니다. 다양한 이해관계자에게 맞춤형 메시지를 작성하세요.
마크다운 형식으로 작성하세요.`,
    user: (topic, phase1, phase2, phase3) => `## 주제: ${topic}

## 심층 분석 (Phase 1):
${phase1}

## 비판적 사고 (Phase 2):
${phase2}

## 지식 통합 (Phase 3):
${phase3}

## 요청: 다중 이해관계자 맞춤형 메시지

지금까지의 모든 분석을 바탕으로 3개 버전의 메시지를 작성하세요:

### 1. 경영진용 (Executive Brief)
- 분량: 500자 이내
- 초점: 비즈니스 임팩트, ROI, 리스크
- 톤: 간결하고 결단력 있는
- 핵심 수치 포함
- 결론/권고안 명확

### 2. 실무진용 (Practitioner Guide)
- 분량: 1000자 이내
- 초점: 구체적 실행 방법, 기술적 디테일
- 톤: 실용적이고 구체적인
- 단계별 가이드 포함
- 주의사항/함정 명시

### 3. 고객/일반인용 (Public Summary)
- 분량: 500자 이내
- 초점: 영향/혜택, 이해하기 쉬운 설명
- 톤: 친근하고 이해하기 쉬운
- 전문 용어 최소화
- 핵심 메시지 1~2개

마크다운으로 각 버전을 명확히 구분하여 작성하세요.`,
  },
  '4.2': {
    system: `당신은 실행 전략 전문가입니다. SMART 기준에 맞는 실행 마스터플랜을 수립하세요.
마크다운 형식(테이블 포함)으로 작성하세요.`,
    user: (topic, phase1, phase2, phase3) => `## 주제: ${topic}

## 심층 분석 (Phase 1):
${phase1}

## 비판적 사고 (Phase 2):
${phase2}

## 지식 통합 (Phase 3):
${phase3}

## 요청: SMART 실행 마스터플랜

모든 분석을 종합하여 실행 가능한 마스터플랜을 수립하세요:

### 1. Quick Win (즉시 실행 가능, 1~2주)
- 구체적 액션 3~5개
- 각각의 SMART 기준: Specific, Measurable, Achievable, Relevant, Time-bound
- 예상 효과

### 2. 중기 계획 (1~3개월)
- 주요 마일스톤
- 필요 리소스 (인력, 예산, 도구)
- 의존성 관계

### 3. 장기 전략 (3~12개월)
- 목표 상태 정의
- 단계별 로드맵
- KPI/성과 지표

### 4. 리스크 관리
- Top 5 리스크 (확률 x 영향도 매트릭스)
- 각 리스크의 완화 전략
- 모니터링 지표

### 5. 의사결정 프레임워크
- Go/No-Go 기준
- 피벗 트리거

마크다운 테이블과 구조화된 형식으로 작성하세요.`,
  },
};

export async function runPhase4(
  topic: string,
  phase1Content: string,
  phase2Content: string,
  phase3Content: string,
  taskId: string,
  emit: (event: SSEEvent) => void,
): Promise<{ content: string; modelUsed: string }> {
  const prompt = TASK_PROMPTS[taskId];
  if (!prompt) throw new Error(`Unknown task: ${taskId}`);

  emit({ type: 'task_start', phase: 4, task: taskId, message: `Phase 4 Task ${taskId} 전략 수립 중...` });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: prompt.system,
    messages: [
      {
        role: 'user',
        content: prompt.user(
          topic,
          phase1Content.slice(0, 4000),
          phase2Content.slice(0, 4000),
          phase3Content.slice(0, 4000),
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
