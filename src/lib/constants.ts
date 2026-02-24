import type { Provider, TrustGrade, EvidenceLevel, ResearchStatus } from '@/types';

// Phase definitions
export const PHASES = [
  {
    phase: 1,
    name: '심층 분석',
    description: '핵심 인사이트 및 논리 검증',
    icon: 'Brain',
    tasks: [
      { id: '1.1', name: '핵심 인사이트 및 통념 타파' },
      { id: '1.2', name: '논리적 엄밀성 및 근거 강도 평가' },
      { id: '1.3', name: '데이터 교차 검증 및 모순점 추적' },
    ],
  },
  {
    phase: 2,
    name: '비판적 사고',
    description: '사각지대 발굴 및 레드팀 분석',
    icon: 'ShieldAlert',
    tasks: [
      { id: '2.1', name: '레드팀식 약점 공격' },
      { id: '2.2', name: '숨겨진 전제 조건 역추적' },
      { id: '2.3', name: '학술적/실무적 공백 탐색' },
    ],
  },
  {
    phase: 3,
    name: '지식 통합',
    description: '거시적 프레임워크 및 예측',
    icon: 'Network',
    tasks: [
      { id: '3.1', name: '메타 프레임워크 구축' },
      { id: '3.2', name: '진화 타임라인 및 미래 예측' },
    ],
  },
  {
    phase: 4,
    name: '실전 적용',
    description: '실행 계획 및 커뮤니케이션',
    icon: 'Rocket',
    tasks: [
      { id: '4.1', name: '다중 이해관계자 맞춤형 메시지' },
      { id: '4.2', name: '실행 마스터플랜' },
    ],
  },
] as const;

// Status configurations
export const STATUS_CONFIG: Record<ResearchStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: '#6B7280', bgColor: '#F3F4F6' },
  collecting: { label: '자료 수집', color: '#2563EB', bgColor: '#DBEAFE' },
  phase1: { label: 'Phase 1', color: '#2563EB', bgColor: '#DBEAFE' },
  phase2: { label: 'Phase 2', color: '#2563EB', bgColor: '#DBEAFE' },
  phase3: { label: 'Phase 3', color: '#2563EB', bgColor: '#DBEAFE' },
  phase4: { label: 'Phase 4', color: '#2563EB', bgColor: '#DBEAFE' },
  finalizing: { label: '마무리', color: '#2563EB', bgColor: '#DBEAFE' },
  completed: { label: '완료', color: '#22C55E', bgColor: '#DCFCE7' },
  failed: { label: '실패', color: '#EF4444', bgColor: '#FEE2E2' },
};

// Trust grade configurations
export const TRUST_GRADE_CONFIG: Record<TrustGrade, { label: string; icon: string; color: string; bgColor: string }> = {
  A: { label: '확인됨', icon: '✅', color: '#22C55E', bgColor: '#DCFCE7' },
  B: { label: '높은 신뢰', icon: '🟢', color: '#84CC16', bgColor: '#ECFCCB' },
  C: { label: '보통 신뢰', icon: '🟡', color: '#F59E0B', bgColor: '#FEF3C7' },
  D: { label: '낮은 신뢰', icon: '🟠', color: '#F97316', bgColor: '#FFEDD5' },
  F: { label: '오류/미확인', icon: '🔴', color: '#EF4444', bgColor: '#FEE2E2' },
};

// Evidence level configurations
export const EVIDENCE_LEVEL_CONFIG: Record<EvidenceLevel, { label: string; color: string }> = {
  'meta-analysis': { label: '메타분석적', color: '#7C3AED' },
  experimental: { label: '실험적', color: '#2563EB' },
  correlational: { label: '상관관계적', color: '#F59E0B' },
  anecdotal: { label: '일화적', color: '#EF4444' },
};

// Provider configurations
export const PROVIDER_CONFIG: Record<Provider, { label: string; color: string; bgColor: string }> = {
  openai: { label: 'OpenAI', color: '#10A37F', bgColor: '#ECFDF5' },
  anthropic: { label: 'Anthropic', color: '#D97706', bgColor: '#FFFBEB' },
  gemini: { label: 'Gemini', color: '#4285F4', bgColor: '#EFF6FF' },
};

// Source type configurations
export const SOURCE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  academic: { label: '학술', color: '#7C3AED' },
  news: { label: '뉴스', color: '#2563EB' },
  official: { label: '공식', color: '#059669' },
  blog: { label: '블로그', color: '#9CA3AF' },
  other: { label: '기타', color: '#6B7280' },
};
