# Real Research - AI Multi-Agent Research Pipeline

## 프로젝트 개요
NotebookLM 스타일의 궁극의 리서치 파이프라인을 AI Multi-Agent 시스템으로 구현한 서비스.
OpenAI, Anthropic, Google Gemini 3사의 AI 모델과 웹 서치 기능을 활용하여 고도화된 리서치 결과를 생성한다.

## 아키텍처
- **Agentic Flow**: 오케스트레이터가 전체 파이프라인을 조율하고, 각 Phase별 전문 에이전트가 병렬/순차 실행
- **Multi-Provider Web Search**: 3사 검색을 병렬 실행 후 교차 검증
- **4 Phase Pipeline**: 심층분석 → 비판적사고 → 지식통합 → 실전적용

## AI 프로바이더 및 API

### OpenAI
- **Web Search**: Responses API + `web_search` 도구 (도메인 필터, 위치 기반, 소스 포함)
- **Agent SDK**: `@openai/agents` (Agent, Tool, Handoff, Runner, MemorySession)
- **모델**: gpt-4.1, gpt-5
- **스크립트**: `scripts/openai_search.py`
- **문서**: https://developers.openai.com/api/docs/guides/tools-web-search/

### Google Gemini
- **Web Search**: generateContent API + `google_search` 도구 (groundingMetadata, groundingChunks, groundingSupports)
- **Agent SDK**: `@google/adk` (LlmAgent, google_search tool)
- **모델**: gemini-2.5-flash, gemini-2.5-pro
- **스크립트**: `scripts/gemini_search.py`
- **문서**: https://ai.google.dev/gemini-api/docs/google-search

### Anthropic (Claude)
- **Web Search**: Messages API + `web_search_20260209` 도구 (동적 필터링, 도메인 필터, citations)
- **Web Fetch**: Messages API + `web_fetch_20260209` 도구 (URL 페치, PDF 지원, 동적 필터링)
- **Agent SDK**: `@anthropic-ai/claude-agent-sdk` (query, tool, createSdkMcpServer)
- **모델**: claude-opus-4-6, claude-sonnet-4-6
- **스크립트**: `scripts/anthropic_search.py`
- **문서**: https://platform.claude.com/docs/ko/agents-and-tools/tool-use/web-search-tool

## 에이전트 구성
| 에이전트 | 역할 | Phase |
|---------|------|-------|
| research-orchestrator | 파이프라인 총괄 조율 | 전체 |
| web-researcher | 멀티 프로바이더 웹 리서치 | 전체 (도구) |
| deep-analyst | 심층 분석 및 논리 검증 | Phase 1 |
| red-team-critic | 비판적 사고 및 사각지대 발굴 | Phase 2 |
| knowledge-architect | 거시적 지식 통합 및 예측 | Phase 3 |
| strategist | 실전 적용 및 커뮤니케이션 | Phase 4 |
| fact-checker | 교차 검증 및 팩트체크 | 전체 (도구) |

## 커맨드
- `/research [주제]` - 전체 파이프라인 실행
- `/quick-research [주제]` - 간략 리서치
- `/deep-analysis [주제]` - Phase 1만 실행
- `/red-team [주제]` - Phase 2만 실행
- `/synthesize [주제]` - Phase 3만 실행
- `/action-plan [주제]` - Phase 4만 실행

## 검색 스크립트
| 스크립트 | API | 도구 |
|---------|-----|------|
| `scripts/openai_search.py` | OpenAI Responses API | `web_search` (도메인 필터, 위치 기반) |
| `scripts/anthropic_search.py` | Claude Messages API | `web_search_20260209` + `web_fetch_20260209` |
| `scripts/gemini_search.py` | Gemini generateContent API | `google_search` (그라운딩) |
| `scripts/multi_search.py` | 3사 통합 | 3사 병렬 실행 + 결과 통합 |

## 환경 변수
- `OPENAI_API_KEY` - OpenAI API 키
- `ANTHROPIC_API_KEY` - Anthropic API 키
- `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY` - Google Gemini API 키
