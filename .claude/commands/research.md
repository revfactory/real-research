# 전체 리서치 파이프라인

주제: $ARGUMENTS

당신은 Real Research 오케스트레이터입니다. 아래 절차에 따라 **전체 4-Phase 리서치 파이프라인**을 실행하십시오.

## 실행 절차

### Pre-Phase: 팀 구성 및 자료 수집
1. `research-output/` 하위 디렉토리 구조를 생성합니다 (sources, phase1~4, report)
2. TeamCreate로 리서치 팀을 구성합니다
3. `web-researcher` 에이전트를 Task로 생성하여 멀티 프로바이더 웹 리서치를 수행합니다
   - 통합 검색: `python3 scripts/multi_search.py "주제" --mode deep --lang both`
     → OpenAI(Responses API + web_search), Anthropic(Messages API + web_search_20260209), Gemini(generateContent + google_search) 3사 병렬 실행
   - 심화 수집: `python3 scripts/anthropic_search.py "주제" --mode deep --fetch --dynamic`
     → Claude의 동적 필터링 + web_fetch로 핵심 문서 원문 페치
4. 수집된 자료를 `research-output/sources/`에 저장

### Phase 1: 심층 분석 및 논리 검증
`deep-analyst` 에이전트를 Task로 생성하여:
- Task 1.1: 핵심 인사이트 및 통념 타파 (전문가 분석)
- Task 1.2: 논리적 엄밀성 및 근거 강도 평가
- Task 1.3: 데이터 교차 검증 및 모순점 추적
→ `fact-checker` 에이전트로 Phase 1 결과 검증

### Phase 2: 비판적 사고 및 사각지대 발굴
`red-team-critic` 에이전트를 Task로 생성하여:
- Task 2.1: 레드팀식 약점 공격
- Task 2.2: 숨겨진 전제 조건 역추적
- Task 2.3: 학술적/실무적 공백 탐색

### Phase 3: 거시적 지식 통합 및 예측
`knowledge-architect` 에이전트를 Task로 생성하여:
- Task 3.1: 메타 프레임워크 구축
- Task 3.2: 진화 타임라인 및 미래 예측

### Phase 4: 실전 적용 및 커뮤니케이션
`strategist` 에이전트를 Task로 생성하여:
- Task 4.1: 다중 이해관계자 맞춤형 메시지
- Task 4.2: 실행 마스터플랜

### 최종 보고서 편집
모든 Phase 결과를 통합하여 `research-output/report/final-report.md`에 최종 보고서 작성:
- Executive Summary
- Phase 1-4 핵심 결과 통합
- 팩트체크 요약
- 부록 (소스 목록, 상세 데이터)

## 검색 도구 참조
| 스크립트 | 프로바이더 | API 도구 |
|---------|----------|---------|
| `scripts/openai_search.py` | OpenAI | Responses API + `web_search` |
| `scripts/anthropic_search.py` | Anthropic | Messages API + `web_search_20260209` + `web_fetch_20260209` |
| `scripts/gemini_search.py` | Google | generateContent + `google_search` |
| `scripts/multi_search.py` | 3사 통합 | 병렬 실행 + 교차 검증 보고서 |

## 실행 원칙
- 각 Phase는 이전 Phase 결과에 기반하므로 순차 실행
- web-researcher와 fact-checker는 필요 시 비동기 실행
- 모든 결과는 마크다운 파일로 저장
- 3사 AI 프로바이더를 골고루 활용하여 다각도 검증
- Anthropic의 동적 필터링(web_search_20260209)으로 토큰 절약 + 정확도 향상
- Gemini의 groundingSupports 신뢰도 점수를 교차 검증에 활용
