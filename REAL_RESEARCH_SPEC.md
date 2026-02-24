<project_specification>

<project_name>Real Research - AI Multi-Agent Research Pipeline Platform</project_name>

<overview>
Real Research는 OpenAI, Anthropic(Claude), Google Gemini 3사의 AI 모델과 웹 서치 기능을 통합 활용하여 고도화된 리서치 보고서를 생성하는 웹 플랫폼이다. NotebookLM의 리서치 파이프라인을 Agentic Flow로 자동화하여, 4개 Phase(심층분석 → 비판적사고 → 지식통합 → 실전적용) 10단계의 체계적 리서치를 수행한다.

핵심 기능: (1) 주제 입력 시 3사 AI가 병렬로 웹 검색하여 자료 수집, (2) 전문 에이전트들이 심층 분석·레드팀 비판·프레임워크 구축·실행 계획을 순차 생성, (3) 팩트체커가 3사 교차 검증으로 신뢰도 등급 부여, (4) 최종 보고서를 구조화된 마크다운으로 출력. 모든 리서치 히스토리는 Supabase에 저장되며, pgvector를 통해 과거 리서치를 시맨틱 검색할 수 있다.

CRITICAL: 모든 AI API 호출은 서버 사이드(Next.js Route Handlers / Server Actions)에서만 수행한다. API 키가 클라이언트에 노출되면 안 된다. 리서치 파이프라인은 장시간(수 분~수십 분) 실행되므로, Server-Sent Events(SSE)를 통해 실시간 진행 상태를 클라이언트에 스트리밍한다.

CRITICAL: 3사 웹 검색 도구의 정확한 API 명세를 준수해야 한다.
- OpenAI: Responses API + `web_search` 도구 (url_citation annotations)
- Anthropic: Messages API + `web_search_20260209` 도구 (동적 필터링, citations) + `web_fetch_20260209` (URL 페치)
- Gemini: generateContent API + `google_search` 도구 (groundingChunks, groundingSupports with confidenceScores)
</overview>

<scope_boundaries>
  <in_scope>
    - Google OAuth 로그인 및 사용자 관리
    - 리서치 주제 입력 및 파이프라인 실행
    - 4-Phase 10-Step 리서치 파이프라인 (전체/개별 Phase 실행)
    - 3사(OpenAI, Anthropic, Gemini) 웹 검색 병렬 실행 및 결과 통합
    - Phase별 전문 에이전트 분석 (심층분석, 레드팀, 지식통합, 전략)
    - 3사 교차 팩트체크 및 신뢰도 등급 (A~F)
    - 실시간 파이프라인 진행 상태 스트리밍 (SSE)
    - 최종 보고서 생성 및 마크다운 렌더링
    - 리서치 히스토리 목록 및 상세 조회
    - 과거 리서치 시맨틱 검색 (pgvector)
    - 리서치 보고서 PDF 다운로드
    - 다크/라이트 테마
    - 반응형 디자인 (데스크톱/태블릿/모바일)
  </in_scope>
  <out_of_scope>
    - 팀/조직 단위 공유 및 협업 기능
    - 리서치 보고서 편집기 (직접 수정)
    - 파일 업로드 기반 리서치 (URL/텍스트 입력만 지원)
    - 결제/구독 시스템
    - 이메일/비밀번호 로그인 (Google OAuth만 지원)
    - 모바일 네이티브 앱
    - 다국어 UI (한국어 기본, 보고서는 한/영 혼합)
  </out_of_scope>
  <future_considerations>
    - 리서치 보고서 공유 링크 (public URL)
    - 팀 워크스페이스 및 권한 관리
    - 파일 업로드 기반 소스 분석 (PDF, DOCX)
    - 결제 시스템 및 API 사용량 관리
    - 커스텀 에이전트 프롬프트 편집
    - Slack/Discord 웹훅 알림
  </future_considerations>
</scope_boundaries>

<technology_stack>
  <frontend>
    <framework>Next.js 16 (App Router) with TypeScript 5.7</framework>
    <ui_library>React 19</ui_library>
    <styling>Tailwind CSS v4.0</styling>
    <component_library>shadcn/ui (latest) — Button, Card, Dialog, Input, Textarea, Select, Badge, Tabs, Tooltip, Progress, Skeleton, Sheet, DropdownMenu, Command, ScrollArea, Separator, Avatar, Sonner(toast)</component_library>
    <icons>Lucide React v0.468</icons>
    <markdown_rendering>react-markdown v9 + remark-gfm + rehype-raw + rehype-sanitize</markdown_rendering>
    <pdf_generation>@react-pdf/renderer v4 또는 html2canvas + jsPDF</pdf_generation>
    <state_management>React Server Components + Zustand v5.0 (클라이언트 UI 상태만)</state_management>
  </frontend>
  <backend>
    <runtime>Next.js Route Handlers + Server Actions</runtime>
    <ai_openai>openai v5 (Responses API + web_search 도구)</ai_openai>
    <ai_anthropic>@anthropic-ai/sdk v1 (Messages API + web_search_20260209 + web_fetch_20260209)</ai_anthropic>
    <ai_gemini>@google/genai v1 (generateContent + google_search 도구)</ai_gemini>
    <streaming>Server-Sent Events (SSE) via ReadableStream</streaming>
    <embeddings>OpenAI text-embedding-3-small (1536차원) — 리서치 보고서 벡터화</embeddings>
  </backend>
  <data_layer>
    <database>Supabase (PostgreSQL) — 사용자, 리서치, 보고서 저장</database>
    <vector_db>Supabase pgvector extension — 리서치 임베딩 저장 및 시맨틱 검색</vector_db>
    <auth>Supabase Auth (Google OAuth 2.0)</auth>
    <storage>Supabase Storage — PDF 보고서 파일 저장</storage>
    <realtime>Supabase Realtime — 리서치 상태 변경 구독 (보조)</realtime>
    <client>@supabase/supabase-js v2 + @supabase/ssr v0.5</client>
  </data_layer>
  <dev_tools>
    <linting>ESLint v9 + typescript-eslint</linting>
    <formatting>Prettier v3</formatting>
    <package_manager>pnpm v9</package_manager>
  </dev_tools>
</technology_stack>

<prerequisites>
  <environment_setup>
    - Node.js v20+ and pnpm v9+
    - Supabase 프로젝트 (pgvector extension 활성화 필수)
    - Google Cloud Console OAuth 2.0 클라이언트 ID
    - OpenAI API 키 (web search 접근 권한)
    - Anthropic API 키 (web search 활성화)
    - Google Gemini API 키 (AI Studio 발급)
  </environment_setup>
  <build_configuration>
    - Next.js 16 App Router (app/ 디렉토리)
    - TypeScript strict mode
    - Tailwind CSS v4 with @tailwindcss/postcss plugin
    - Path alias: @ → src/
    - shadcn/ui CLI로 컴포넌트 설치 (npx shadcn@latest init)
  </build_configuration>
</prerequisites>

<environment_variables>
  <required>
    <!-- Supabase -->
    <var name="NEXT_PUBLIC_SUPABASE_URL" example="https://xxxx.supabase.co" description="Supabase 프로젝트 URL" />
    <var name="NEXT_PUBLIC_SUPABASE_ANON_KEY" example="eyJhbGciOi..." description="Supabase 공개 anon 키" />
    <var name="SUPABASE_SERVICE_ROLE_KEY" example="eyJhbGciOi..." description="Supabase 서비스 역할 키 (서버 전용, CRITICAL: 클라이언트 노출 금지)" />

    <!-- AI Providers -->
    <var name="OPENAI_API_KEY" example="sk-proj-..." description="OpenAI API 키 (Responses API + web_search)" />
    <var name="ANTHROPIC_API_KEY" example="sk-ant-..." description="Anthropic API 키 (Messages API + web_search_20260209)" />
    <var name="GEMINI_API_KEY" example="AIzaSy..." description="Google Gemini API 키 (google_search 그라운딩)" />

    <!-- OpenAI Embedding -->
    <var name="OPENAI_EMBEDDING_MODEL" example="text-embedding-3-small" description="임베딩 모델 (기본: text-embedding-3-small, 1536차원)" />
  </required>
  <optional>
    <var name="NEXT_PUBLIC_APP_URL" example="http://localhost:3000" description="앱 공개 URL (OAuth 콜백)" />
    <var name="RESEARCH_MAX_CONCURRENT" example="3" description="동시 실행 가능 리서치 수 (기본: 3)" />
    <var name="ANTHROPIC_DYNAMIC_FILTERING" example="true" description="Claude 동적 필터링 활성화 (기본: true)" />
  </optional>
</environment_variables>

<file_structure>
src/
├── app/
│   ├── layout.tsx                          # 루트 레이아웃 (Providers, ThemeProvider)
│   ├── page.tsx                            # 랜딩 페이지 (비로그인 시)
│   ├── globals.css                         # Tailwind imports, 커스텀 스타일
│   ├── (auth)/
│   │   ├── login/page.tsx                  # 로그인 페이지 (Google OAuth)
│   │   └── callback/route.ts               # Supabase OAuth 콜백 핸들러
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # 대시보드 레이아웃 (사이드바 + 메인)
│   │   ├── page.tsx                        # 대시보드 홈 (최근 리서치 목록)
│   │   ├── research/
│   │   │   ├── new/page.tsx                # 새 리서치 시작 페이지
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # 리서치 상세 (보고서 뷰)
│   │   │       └── progress/page.tsx       # 리서치 진행 상태 (실시간)
│   │   └── search/page.tsx                 # 시맨틱 검색 페이지
│   └── api/
│       ├── research/
│       │   ├── route.ts                    # POST: 리서치 생성 및 파이프라인 시작
│       │   └── [id]/
│       │       ├── route.ts                # GET: 리서치 상세, DELETE: 삭제
│       │       ├── stream/route.ts         # GET(SSE): 실시간 진행 스트리밍
│       │       └── pdf/route.ts            # GET: PDF 다운로드
│       ├── search/
│       │   └── route.ts                    # POST: 시맨틱 검색 (pgvector)
│       └── providers/
│           ├── openai/route.ts             # POST: OpenAI web_search 프록시
│           ├── anthropic/route.ts          # POST: Anthropic web_search + web_fetch 프록시
│           └── gemini/route.ts             # POST: Gemini google_search 프록시
├── components/
│   ├── ui/                                 # shadcn/ui 컴포넌트 (자동 생성)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── progress.tsx
│   │   ├── skeleton.tsx
│   │   ├── sheet.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── command.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── avatar.tsx
│   │   └── sonner.tsx
│   ├── layout/
│   │   ├── sidebar.tsx                     # 대시보드 사이드바
│   │   ├── header.tsx                      # 상단 헤더 (유저 메뉴)
│   │   ├── mobile-nav.tsx                  # 모바일 네비게이션
│   │   └── theme-toggle.tsx                # 다크/라이트 테마 토글
│   ├── research/
│   │   ├── research-form.tsx               # 리서치 주제 입력 폼
│   │   ├── research-card.tsx               # 리서치 목록 카드
│   │   ├── research-list.tsx               # 리서치 목록 그리드
│   │   ├── pipeline-progress.tsx           # 파이프라인 진행 상태 UI
│   │   ├── phase-card.tsx                  # Phase별 상태 카드
│   │   ├── phase-result.tsx                # Phase별 결과 표시
│   │   ├── source-list.tsx                 # 수집 소스 목록
│   │   ├── fact-check-table.tsx            # 팩트체크 결과 테이블
│   │   ├── evidence-badge.tsx              # 근거 강도 뱃지 (4단계)
│   │   ├── trust-badge.tsx                 # 신뢰도 등급 뱃지 (A~F)
│   │   ├── provider-badge.tsx              # 프로바이더 뱃지 (OpenAI/Anthropic/Gemini)
│   │   └── report-viewer.tsx              # 최종 보고서 마크다운 뷰어
│   ├── search/
│   │   ├── semantic-search.tsx             # 시맨틱 검색 입력 + 결과
│   │   └── search-result-card.tsx          # 검색 결과 카드
│   └── shared/
│       ├── markdown-renderer.tsx           # 마크다운 렌더러 (GFM, 테이블, 코드)
│       ├── loading-skeleton.tsx            # 로딩 스켈레톤
│       ├── empty-state.tsx                 # 빈 상태 컴포넌트
│       ├── error-boundary.tsx              # 에러 바운더리
│       └── confirm-dialog.tsx              # 확인 다이얼로그
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Supabase 브라우저 클라이언트
│   │   ├── server.ts                       # Supabase 서버 클라이언트
│   │   ├── middleware.ts                   # Auth 미들웨어 헬퍼
│   │   └── types.ts                        # Supabase 타입 (supabase gen types)
│   ├── ai/
│   │   ├── openai-search.ts                # OpenAI Responses API + web_search
│   │   ├── anthropic-search.ts             # Anthropic Messages API + web_search_20260209 + web_fetch_20260209
│   │   ├── gemini-search.ts                # Gemini generateContent + google_search
│   │   ├── multi-search.ts                 # 3사 병렬 검색 통합
│   │   ├── embeddings.ts                   # OpenAI 임베딩 생성
│   │   └── types.ts                        # 검색 결과 공통 타입
│   ├── pipeline/
│   │   ├── orchestrator.ts                 # 파이프라인 오케스트레이터
│   │   ├── phase1-deep-analysis.ts         # Phase 1: 심층 분석
│   │   ├── phase2-red-team.ts              # Phase 2: 비판적 사고
│   │   ├── phase3-knowledge.ts             # Phase 3: 지식 통합
│   │   ├── phase4-strategy.ts              # Phase 4: 실전 적용
│   │   ├── fact-checker.ts                 # 팩트체커
│   │   ├── report-generator.ts             # 최종 보고서 생성
│   │   └── types.ts                        # 파이프라인 타입
│   ├── utils.ts                            # cn(), formatDate, truncate 등
│   └── constants.ts                        # Phase 정의, 신뢰도 등급, 색상
├── hooks/
│   ├── use-research-list.ts                # 리서치 목록 조회
│   ├── use-research-detail.ts              # 리서치 상세 조회
│   ├── use-research-stream.ts              # SSE 스트림 구독
│   └── use-semantic-search.ts              # 시맨틱 검색
├── stores/
│   └── ui-store.ts                         # Zustand: 사이드바, 테마, 현재 Phase 등
├── types/
│   └── index.ts                            # 전역 타입 정의
├── middleware.ts                            # Next.js 미들웨어 (인증 체크)
└── supabase/
    └── migrations/
        ├── 001_create_tables.sql           # 테이블 생성
        ├── 002_enable_pgvector.sql         # pgvector 확장 활성화
        ├── 003_create_indexes.sql          # 인덱스 생성
        └── 004_rls_policies.sql            # Row Level Security 정책
</file_structure>

<core_data_entities>
  <user_profile>
    - id: uuid (PK, Supabase Auth uid 연동)
    - email: text (not null, unique)
    - display_name: text (Google 프로필 이름)
    - avatar_url: text (Google 프로필 이미지)
    - created_at: timestamptz (default now())
    - updated_at: timestamptz (default now())
    RLS: 본인 레코드만 SELECT, UPDATE
  </user_profile>

  <research>
    - id: uuid (PK, default gen_random_uuid())
    - user_id: uuid (FK → user_profile.id, not null)
    - topic: text (not null, max 500자, 리서치 주제)
    - description: text (optional, max 2000자, 추가 설명/맥락)
    - status: enum ('pending', 'collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing', 'completed', 'failed')
    - current_phase: smallint (0~4, 현재 진행 중인 Phase)
    - current_step: text (현재 실행 중인 세부 단계 설명)
    - progress_percent: smallint (0~100)
    - error_message: text (실패 시 에러 메시지)
    - started_at: timestamptz
    - completed_at: timestamptz
    - created_at: timestamptz (default now())
    - updated_at: timestamptz (default now())
    Indexes: [user_id, created_at DESC], [status]
    RLS: 본인 리서치만 CRUD
  </research>

  <research_source>
    - id: uuid (PK)
    - research_id: uuid (FK → research.id, ON DELETE CASCADE)
    - provider: enum ('openai', 'anthropic', 'gemini')
    - title: text (소스 제목)
    - url: text (소스 URL)
    - snippet: text (핵심 내용 발췌)
    - source_type: enum ('academic', 'news', 'official', 'blog', 'other')
    - reliability_score: smallint (1~5)
    - cross_validated: boolean (default false, 2사 이상 확인 시 true)
    - page_age: text (페이지 날짜 정보)
    - raw_data: jsonb (프로바이더별 원본 응답 - citations, groundingChunks 등)
    - created_at: timestamptz (default now())
    Indexes: [research_id], [research_id, provider]
    RLS: 본인 리서치의 소스만 접근
  </research_source>

  <research_phase_result>
    - id: uuid (PK)
    - research_id: uuid (FK → research.id, ON DELETE CASCADE)
    - phase: smallint (1~4)
    - task_id: text (예: '1.1', '2.3', '4.2')
    - task_name: text (태스크 이름)
    - content: text (분석 결과, 마크다운)
    - status: enum ('pending', 'running', 'completed', 'failed')
    - started_at: timestamptz
    - completed_at: timestamptz
    - ai_model_used: text (사용된 AI 모델명)
    - token_usage: jsonb ({input_tokens, output_tokens, search_requests})
    - created_at: timestamptz (default now())
    Indexes: [research_id, phase, task_id]
    RLS: 본인 리서치의 결과만 접근
  </research_phase_result>

  <fact_check_result>
    - id: uuid (PK)
    - research_id: uuid (FK → research.id, ON DELETE CASCADE)
    - phase: smallint (검증 대상 Phase)
    - claim: text (검증 대상 주장)
    - grade: enum ('A', 'B', 'C', 'D', 'F')
    - openai_result: text (OpenAI 검증 결과)
    - anthropic_result: text (Anthropic 검증 결과)
    - gemini_result: text (Gemini 검증 결과)
    - confidence_score: real (0.0~1.0, Gemini groundingSupports 참조)
    - notes: text (비고)
    - created_at: timestamptz (default now())
    Indexes: [research_id, phase], [grade]
    RLS: 본인 리서치의 팩트체크만 접근
  </fact_check_result>

  <research_report>
    - id: uuid (PK)
    - research_id: uuid (FK → research.id, ON DELETE CASCADE, UNIQUE)
    - executive_summary: text (요약)
    - full_report: text (전체 보고서 마크다운)
    - pdf_storage_path: text (Supabase Storage 경로)
    - embedding: vector(1536) (pgvector, 시맨틱 검색용)
    - created_at: timestamptz (default now())
    - updated_at: timestamptz (default now())
    Indexes: [research_id UNIQUE], embedding (ivfflat for cosine distance)
    RLS: 본인 리서치의 보고서만 접근
  </research_report>
</core_data_entities>

<authentication>
  <strategy>Supabase Auth with Google OAuth 2.0</strategy>
  <providers>
    <google_oauth>
      - Supabase Dashboard → Authentication → Providers → Google 활성화
      - Google Cloud Console에서 OAuth 2.0 Client ID 발급
      - Redirect URI: {SUPABASE_URL}/auth/v1/callback
      - 요청 scope: email, profile
    </google_oauth>
  </providers>
  <session_management>
    - Supabase Auth가 JWT 세션 자동 관리
    - @supabase/ssr로 서버/클라이언트 세션 동기화
    - Next.js middleware에서 인증 상태 확인 후 리다이렉트
    - 세션 만료 시 자동 갱신 (refresh token)
  </session_management>
  <authorization>
    <roles>
      - authenticated: 로그인된 사용자 (기본 역할)
      - anon: 비로그인 사용자 (랜딩 페이지만 접근)
    </roles>
    <rls_policy>
      - CRITICAL: 모든 테이블에 RLS 활성화
      - user_id = auth.uid() 조건으로 본인 데이터만 접근
    </rls_policy>
  </authorization>
  <protected_routes>
    - /dashboard/** → 인증 필요 (미인증 시 /login 리다이렉트)
    - /research/** → 인증 필요
    - /search → 인증 필요
    - /api/research/** → 인증 필요 (서버에서 세션 검증)
    - /api/providers/** → 인증 필요
  </protected_routes>
</authentication>

<route_definitions>
  <public_routes>
    <route path="/" page="LandingPage" description="비로그인 랜딩 페이지" />
    <route path="/login" page="LoginPage" description="Google 로그인" />
    <route path="/callback" handler="OAuthCallback" description="OAuth 콜백" />
  </public_routes>
  <protected_routes>
    <route path="/dashboard" page="DashboardHome" description="최근 리서치 목록" />
    <route path="/research/new" page="NewResearch" description="새 리서치 시작" />
    <route path="/research/[id]" page="ResearchDetail" description="리서치 보고서 상세" />
    <route path="/research/[id]/progress" page="ResearchProgress" description="실시간 진행 상태" />
    <route path="/search" page="SemanticSearch" description="시맨틱 검색" />
  </protected_routes>
  <api_routes>
    <route method="POST" path="/api/research" description="리서치 생성 + 파이프라인 시작" />
    <route method="GET" path="/api/research/[id]" description="리서치 상세 조회" />
    <route method="DELETE" path="/api/research/[id]" description="리서치 삭제" />
    <route method="GET" path="/api/research/[id]/stream" description="SSE: 실시간 진행 스트리밍" />
    <route method="GET" path="/api/research/[id]/pdf" description="PDF 다운로드" />
    <route method="POST" path="/api/search" description="시맨틱 검색 (pgvector)" />
    <route method="POST" path="/api/providers/openai" description="OpenAI web_search 프록시" />
    <route method="POST" path="/api/providers/anthropic" description="Anthropic web_search + web_fetch 프록시" />
    <route method="POST" path="/api/providers/gemini" description="Gemini google_search 프록시" />
  </api_routes>
</route_definitions>

<component_hierarchy>
  <root_layout>
    <html lang="ko">
      <body>
        <theme_provider default_theme="system">
          <supabase_provider>
            <toaster position="top-right" />  <!-- Sonner toast -->
            <children />                       <!-- 페이지 콘텐츠 -->
          </supabase_provider>
        </theme_provider>
      </body>
    </html>
  </root_layout>

  <dashboard_layout>
    <sidebar width="280px" collapsible>
      <sidebar_header>
        <app_logo />                          <!-- "Real Research" 로고 -->
        <theme_toggle />
      </sidebar_header>
      <nav_menu>
        <nav_item icon="LayoutDashboard" to="/dashboard" label="대시보드" />
        <nav_item icon="Plus" to="/research/new" label="새 리서치" />
        <nav_item icon="Search" to="/search" label="검색" />
      </nav_menu>
      <recent_research_list>                  <!-- 최근 리서치 5개 -->
        <research_nav_item />
      </recent_research_list>
      <sidebar_footer>
        <user_menu>                           <!-- 아바타 + 이름 + 드롭다운 -->
          <avatar />
          <display_name />
          <dropdown: 설정, 로그아웃 />
        </user_menu>
      </sidebar_footer>
    </sidebar>
    <main_content>
      <header>
        <mobile_menu_trigger />               <!-- 모바일: 햄버거 버튼 -->
        <breadcrumb />
      </header>
      <children />                            <!-- 페이지 콘텐츠 -->
    </main_content>
  </dashboard_layout>

  <research_progress_page>
    <page_header topic="..." status="..." />
    <pipeline_progress>                       <!-- 4 Phase 진행 상태 -->
      <phase_card phase="1" title="심층 분석" status="completed|running|pending">
        <task_item task="1.1" name="핵심 인사이트" status="..." />
        <task_item task="1.2" name="근거 강도 평가" status="..." />
        <task_item task="1.3" name="교차 검증" status="..." />
      </phase_card>
      <phase_card phase="2" ... />
      <phase_card phase="3" ... />
      <phase_card phase="4" ... />
    </pipeline_progress>
    <live_log>                                <!-- 실시간 로그 스트림 -->
      <log_entry timestamp="..." message="..." />
    </live_log>
  </research_progress_page>

  <research_detail_page>
    <report_header topic="..." date="..." status="..." />
    <tabs default="report">
      <tab value="report">
        <report_viewer markdown="..." />      <!-- 최종 보고서 -->
      </tab>
      <tab value="sources">
        <source_list>                         <!-- 수집 소스 목록 -->
          <source_item provider="..." url="..." trust="..." />
        </source_list>
      </tab>
      <tab value="phases">
        <phase_result phase="1" ... />        <!-- Phase별 상세 결과 -->
        <phase_result phase="2" ... />
        <phase_result phase="3" ... />
        <phase_result phase="4" ... />
      </tab>
      <tab value="factcheck">
        <fact_check_table>                    <!-- 팩트체크 테이블 -->
          <fact_check_row claim="..." grade="A" ... />
        </fact_check_table>
      </tab>
    </tabs>
    <action_bar>
      <download_pdf_button />
      <delete_button />
    </action_bar>
  </research_detail_page>
</component_hierarchy>

<pages_and_interfaces>
  <landing_page path="/">
    <layout>
      - 풀스크린 히어로 섹션
      - 중앙 정렬, max-width 1200px
    </layout>
    <hero>
      - 타이틀: "AI 리서치의 새로운 기준" — 36px/800 weight
      - 서브타이틀: "OpenAI, Claude, Gemini가 함께 만드는 10단계 심층 리서치" — 18px/400 #6B7280
      - CTA 버튼: "Google로 시작하기" — primary 색상, Google 아이콘 포함, 48px height
      - 하단: 파이프라인 4-Phase 시각화 (아이콘 + 화살표 흐름)
    </hero>
    <features_section>
      - 3개 Feature Card (320px 너비):
        1. "3사 AI 통합 검색" — 아이콘: Globe, 설명: OpenAI+Claude+Gemini 병렬 웹 검색
        2. "4단계 심층 분석" — 아이콘: Layers, 설명: 전문가 분석·레드팀·프레임워크·실행계획
        3. "교차 팩트체크" — 아이콘: ShieldCheck, 설명: 3사 검증 기반 A~F 신뢰도 등급
    </features_section>
  </landing_page>

  <login_page path="/login">
    <layout>
      - 중앙 Card (400px 너비), 수직 중앙 정렬
    </layout>
    <content>
      - 로고: "Real Research" 텍스트 — 24px/700
      - 설명: "AI 멀티 에이전트 리서치 플랫폼" — 14px #6B7280
      - Google 로그인 버튼: shadcn Button variant="outline", Google 로고 SVG, "Google로 로그인"
      - 하단: "계속함으로써 서비스 약관에 동의합니다" — 12px #9CA3AF
    </content>
  </login_page>

  <dashboard_page path="/dashboard">
    <header>
      - 타이틀: "대시보드" — 28px/700
      - 우측: "새 리서치" 버튼 (Plus 아이콘)
    </header>
    <stats_bar>
      - 4개 Stat Card (가로 균등 분할):
        1. "전체 리서치" — 총 개수
        2. "진행 중" — 현재 실행 중인 리서치 수
        3. "완료" — 완료된 리서치 수
        4. "이번 주" — 최근 7일 완료 수
    </stats_bar>
    <research_list>
      - 그리드: 3열 (데스크톱), 2열 (태블릿), 1열 (모바일)
      - 정렬: created_at DESC
      <research_card>
        - 제목: topic 텍스트, max 2줄 말줄임 — 16px/600
        - 상태 뱃지: status에 따른 색상 뱃지
          - pending: #6B7280 배경
          - collecting/phase1~4/finalizing: #2563EB 배경 + 애니메이션 점
          - completed: #22C55E 배경
          - failed: #EF4444 배경
        - 날짜: "2일 전" relative time — 13px #9CA3AF
        - 진행률: progress_percent 프로그레스 바 (진행 중일 때만 표시)
        - 클릭: 완료 시 → /research/[id], 진행 중 → /research/[id]/progress
      </research_card>
    </research_list>
    <empty_state>
      - 아이콘: FileSearch (64px, #9CA3AF)
      - 타이틀: "아직 리서치가 없습니다" — 18px/600
      - 서브: "새 리서치를 시작해 보세요" — 14px #9CA3AF
      - CTA: "첫 리서치 시작하기" 버튼
    </empty_state>
  </dashboard_page>

  <new_research_page path="/research/new">
    <layout>
      - 중앙 정렬, max-width 640px
    </layout>
    <form>
      - 타이틀: "새 리서치" — 28px/700
      - 주제 입력 (Input): placeholder "리서치할 주제를 입력하세요", max 500자, 필수
      - 추가 설명 (Textarea): placeholder "맥락, 관점, 특별히 알고 싶은 점 등", max 2000자, 선택
      - 실행 모드 (Radio Group):
        - "전체 파이프라인" (기본) — 4 Phase 전체 실행
        - "빠른 리서치" — 축약 버전
      - 제출 버튼: "리서치 시작" — primary, 48px height, Loader 스피너 (제출 중)
    </form>
    <pipeline_preview>
      - 실행될 파이프라인 미리보기 (4 Phase 아이콘 흐름)
      - 각 Phase에 포함된 태스크 리스트 (접기/펼치기)
    </pipeline_preview>
  </new_research_page>

  <research_progress_page path="/research/[id]/progress">
    <header>
      - 주제: topic — 24px/700
      - 상태: status 뱃지 + progress_percent 바
      - current_step 텍스트 — 14px #6B7280, 점멸 애니메이션
    </header>
    <pipeline_visualization>
      - 4개 Phase Card (수직 타임라인 레이아웃):
        <phase_card>
          - 좌측: Phase 번호 원형 (40px)
            - pending: #E5E7EB 배경, #9CA3AF 텍스트
            - running: #2563EB 배경, 흰색 텍스트, pulse 애니메이션
            - completed: #22C55E 배경, 흰색 체크 아이콘
            - failed: #EF4444 배경, X 아이콘
          - 중앙: Phase 이름 + 세부 태스크 리스트
            <task_row>
              - 체크 아이콘 (completed) 또는 스피너 (running) 또는 빈 원 (pending)
              - 태스크 이름 — 14px
              - 소요 시간 (completed 시) — 12px #9CA3AF
            </task_row>
          - Phase 간 연결선: 세로 점선 (dashed border-left)
        </phase_card>
    </pipeline_visualization>
    <live_log_panel>
      - 하단 접기/펼치기 패널
      - 실시간 로그 스트림 (SSE)
      - 각 로그: [시간] [프로바이더] 메시지
      - 자동 스크롤 (latest)
      - 모노스페이스 폰트, 12px
    </live_log_panel>
    <completion_action>
      - 완료 시: "보고서 보기" 버튼 표시 → /research/[id] 이동
      - 실패 시: 에러 메시지 + "다시 시도" 버튼
    </completion_action>
  </research_progress_page>

  <research_detail_page path="/research/[id]">
    <header>
      - 주제: topic — 28px/700
      - 메타: 생성일, 소요 시간, 상태 뱃지
      - 액션: PDF 다운로드 버튼, 삭제 버튼 (확인 다이얼로그)
    </header>
    <tabs>
      <tab label="보고서" icon="FileText">
        <executive_summary>
          - Card 배경: #F0F9FF (light) / #0C2D48 (dark)
          - "Executive Summary" 라벨 — 13px uppercase
          - 요약 텍스트 — 16px/500
        </executive_summary>
        <full_report>
          - 마크다운 렌더링 (GFM 테이블, 코드 블록, 리스트)
          - 제목: h2, h3 기반 목차 자동 생성 (좌측 또는 상단)
          - 인용: blockquote 스타일링 (좌측 #2563EB 보더)
          - 테이블: 줄무늬 행, 호버 효과
          - Red Flag(🚩) 포함 텍스트: #FEF2F2 배경 하이라이트
        </full_report>
      </tab>
      <tab label="소스" icon="Globe" badge_count="N">
        <filter_bar>
          - 프로바이더 필터: 전체 / OpenAI / Anthropic / Gemini
          - 신뢰도 필터: 전체 / ★5 / ★4+ / ★3+
          - 교차검증 필터: 전체 / 확인됨(✅) / 미확인(⚠️)
        </filter_bar>
        <source_list>
          <source_item>
            - 제목 (링크) — 15px/500
            - URL — 13px #2563EB, truncate
            - 프로바이더 뱃지: OpenAI(#10A37F) / Anthropic(#D97706) / Gemini(#4285F4)
            - 유형 뱃지: 학술(#7C3AED) / 뉴스(#2563EB) / 공식(#059669) / 블로그(#9CA3AF)
            - 교차검증: ✅ 또는 ⚠️
            - 스니펫 — 14px #6B7280, max 3줄
          </source_item>
        </source_list>
      </tab>
      <tab label="Phase별 결과" icon="Layers">
        <phase_accordion>
          - Phase 1~4 Accordion (기본: 모두 접힌 상태)
          <phase_section>
            - Phase 이름 + 상태 뱃지 + 소요 시간
            - 태스크별 결과 마크다운 렌더링
            - 각 태스크 사이 Separator
          </phase_section>
        </phase_accordion>
      </tab>
      <tab label="팩트체크" icon="ShieldCheck" badge_count="N">
        <summary_stats>
          - 5개 등급별 개수 + 비율 바 차트 (가로 막대)
          - ✅A / 🟢B / 🟡C / 🟠D / 🔴F
        </summary_stats>
        <fact_check_table>
          | # | 검증 대상 | 등급 | OpenAI | Anthropic | Gemini | 비고 |
          - 등급 셀: 해당 색상 뱃지
          - 행 클릭: 상세 패널 확장 (프로바이더별 검증 결과 원문)
          - 정렬: 등급 오름차순 (F → A)
        </fact_check_table>
      </tab>
    </tabs>
  </research_detail_page>

  <semantic_search_page path="/search">
    <header>
      - 타이틀: "리서치 검색" — 28px/700
    </header>
    <search_input>
      - Command 컴포넌트 (shadcn) 스타일 검색창
      - placeholder: "키워드 또는 질문으로 검색..."
      - 우측 아이콘: Search
      - Enter로 검색 실행
      - 아래: "시맨틱 검색: 의미 기반으로 관련 리서치를 찾습니다" — 12px #9CA3AF
    </search_input>
    <search_results>
      <search_result_card>
        - 유사도 점수 뱃지: "92% 관련" — 소수점 없음
        - 주제 — 16px/600, 클릭 시 /research/[id] 이동
        - Executive Summary 발췌 — 14px #6B7280, max 3줄
        - 날짜 — 13px #9CA3AF
      </search_result_card>
    </search_results>
    <empty_state>
      - 아이콘: Search (48px, #9CA3AF)
      - "검색어를 입력하세요" 또는 "검색 결과가 없습니다"
    </empty_state>
  </semantic_search_page>
</pages_and_interfaces>

<core_functionality>
  <research_pipeline>
    <pipeline_orchestration>
      - POST /api/research로 리서치 생성 시 파이프라인 비동기 시작
      - 오케스트레이터가 Phase 순서대로 실행, 각 단계 결과를 DB에 저장
      - SSE로 실시간 진행 상태를 클라이언트에 스트리밍
      - 각 Phase 완료 시 research.status + progress_percent 업데이트
      - 실패 시 error_message에 상세 에러 저장, status='failed'
    </pipeline_orchestration>

    <phase_execution>
      - Phase 1 (심층 분석): deep-analyst 에이전트 로직
        - Task 1.1: 핵심 인사이트 3~5개 도출 (통념 타파)
        - Task 1.2: 주장별 근거 강도 4단계 평가 (일화적/상관관계/실험적/메타분석)
        - Task 1.3: 소스 간 모순/충돌 식별
      - Phase 2 (비판적 사고): red-team-critic 에이전트 로직
        - Task 2.1: 방법론 결함, 논리적 비약 공격 (심각도 1~10)
        - Task 2.2: 숨은 가정 역추적 + 파괴 시나리오
        - Task 2.3: 미답 심층 질문 5~7개 생성
      - Phase 3 (지식 통합): knowledge-architect 에이전트 로직
        - Task 3.1: MECE 프레임워크 설계 (구성 요소, 인과관계, 예외)
        - Task 3.2: 타임라인 구축 + 미래 3가지 예측 (확신도%)
      - Phase 4 (실전 적용): strategist 에이전트 로직
        - Task 4.1: 경영진/실무진/고객 3개 버전 메시지
        - Task 4.2: SMART 실행 마스터플랜 (의존성, 리스크, Quick Win)
    </phase_execution>
  </research_pipeline>

  <multi_provider_search>
    <openai_web_search>
      - OpenAI Responses API 호출
      - tools: [{type: "web_search"}] — 도메인 필터(filters.allowed_domains), 위치(user_location)
      - include: ["web_search_call.action.sources"]로 전체 소스 리스트 획득
      - 응답에서 output_text + annotations(url_citation) 추출
      - 모델: gpt-4.1 (기본)
    </openai_web_search>
    <anthropic_web_search>
      - Anthropic Messages API 호출
      - tools: [{type: "web_search_20260209", name: "web_search", max_uses: 5}]
      - 동적 필터링: anthropic-beta: "code-execution-web-tools-2026-02-09" 헤더
      - web_fetch 추가: [{type: "web_fetch_20260209", name: "web_fetch", citations: {enabled: true}}]
      - 응답에서 text + citations(web_search_result_location: url, title, cited_text) 추출
      - 검색 결과에서 url, title, page_age 추출
      - 모델: claude-sonnet-4-6 (기본)
    </anthropic_web_search>
    <gemini_grounding_search>
      - Gemini generateContent API 호출
      - tools: [{google_search: {}}]
      - 응답에서 parts[].text 추출
      - groundingMetadata에서:
        - groundingChunks[].web → {uri, title} 소스 목록
        - groundingSupports[] → {segment: {startIndex, endIndex, text}, groundingChunkIndices, confidenceScores}
        - webSearchQueries → 사용된 검색 쿼리
      - 모델: gemini-2.5-flash (기본)
    </gemini_grounding_search>
    <parallel_execution>
      - Promise.allSettled()로 3사 병렬 실행
      - 개별 프로바이더 실패 시 나머지 결과로 계속 진행
      - 결과 통합: 중복 URL 제거, 교차 검증 플래그 설정
    </parallel_execution>
  </multi_provider_search>

  <fact_checking>
    - 각 Phase 완료 후 주요 주장 자동 추출
    - 3사 verify 모드 병렬 실행으로 교차 확인
    - 신뢰도 등급 자동 부여:
      - A(✅): 3사 일치 확인
      - B(🟢): 2사 확인
      - C(🟡): 1사만 확인
      - D(🟠): 부분 불일치
      - F(🔴): 오류 또는 상충
    - Gemini confidenceScores를 보조 지표로 활용
  </fact_checking>

  <semantic_search>
    - 리서치 보고서 완성 시 executive_summary를 OpenAI text-embedding-3-small로 벡터화
    - research_report.embedding 컬럼에 1536차원 벡터 저장
    - 검색 쿼리도 동일 모델로 벡터화 후 코사인 유사도로 검색
    - Supabase pgvector: SELECT *, 1 - (embedding <=> query_embedding) AS similarity ORDER BY similarity DESC LIMIT 10
  </semantic_search>

  <report_generation>
    - 모든 Phase 결과 + 팩트체크 결과를 통합
    - 구조: Executive Summary → Phase 1~4 핵심 결과 → 팩트체크 요약 → 부록
    - 마크다운 형식, GFM 테이블 활용
    - Red Flag(🚩) 항목은 별도 섹션으로 분리
  </report_generation>

  <pdf_export>
    - 최종 보고서 마크다운을 PDF로 변환
    - Supabase Storage에 저장, 다운로드 URL 제공
  </pdf_export>
</core_functionality>

<error_handling>
  <user_facing>
    <form_validation>
      - 주제 미입력: "리서치 주제를 입력해 주세요" — Input 하단 빨간 텍스트
      - 주제 500자 초과: "최대 500자까지 입력 가능합니다" + 글자 수 카운터
      - 설명 2000자 초과: 동일 패턴
    </form_validation>
    <api_errors>
      - AI 프로바이더 개별 실패: toast 경고 "OpenAI 검색 실패, 나머지 프로바이더로 계속합니다"
      - 3사 모두 실패: 진행 중단, "검색에 실패했습니다. 잠시 후 다시 시도해 주세요" + 재시도 버튼
      - Rate limit: "API 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요"
      - 인증 만료: 자동으로 /login 리다이렉트
    </api_errors>
    <pipeline_errors>
      - Phase 실패: 해당 Phase "실패" 표시, 에러 메시지 표시, 이전 Phase 결과는 보존
      - 전체 파이프라인 실패: research.status='failed', 에러 상세 표시
    </pipeline_errors>
  </user_facing>
  <error_boundary>
    - React Error Boundary로 페이지 레벨 에러 포착
    - 폴백 UI: "문제가 발생했습니다" + "새로고침" 버튼
    - 에러 로그: console.error + Supabase 에러 테이블 (향후)
  </error_boundary>
</error_handling>

<aesthetic_guidelines>
  <design_philosophy>
    리서치 도구로서의 신뢰감과 전문성을 전달하는 깔끔하고 체계적인 디자인.
    데이터 밀도가 높은 보고서를 편안하게 읽을 수 있도록 타이포그래피와 여백에 집중.
    shadcn/ui의 미니멀한 컴포넌트를 기반으로, 상태 표현에 색상을 적극 활용.
  </design_philosophy>

  <color_palette>
    <light_theme>
      - Background: #FFFFFF
      - Surface: #F9FAFB
      - Sidebar bg: #FAFAFA
      - Card bg: #FFFFFF
      - Border: #E5E7EB
      - Text primary: #111827
      - Text secondary: #6B7280
      - Text muted: #9CA3AF
      - Primary: #2563EB (Blue-600)
      - Primary hover: #1D4ED8
      - Accent: #7C3AED (Violet-600)
    </light_theme>
    <dark_theme>
      - Background: #09090B
      - Surface: #18181B
      - Sidebar bg: #0F0F12
      - Card bg: #1C1C22
      - Border: #27272A
      - Text primary: #FAFAFA
      - Text secondary: #A1A1AA
      - Text muted: #71717A
      - Primary: #3B82F6 (Blue-500)
      - Primary hover: #60A5FA
      - Accent: #8B5CF6 (Violet-500)
    </dark_theme>
    <status_colors>
      - Success: #22C55E (Green-500)
      - Warning: #F59E0B (Amber-500)
      - Danger: #EF4444 (Red-500)
      - Info: #3B82F6 (Blue-500)
    </status_colors>
    <provider_colors>
      - OpenAI: #10A37F
      - Anthropic: #D97706
      - Gemini: #4285F4
    </provider_colors>
    <trust_grade_colors>
      - A (확인됨): #22C55E
      - B (높은 신뢰): #84CC16
      - C (보통 신뢰): #F59E0B
      - D (낮은 신뢰): #F97316
      - F (오류): #EF4444
    </trust_grade_colors>
    <evidence_level_colors>
      - 메타분석적: #7C3AED
      - 실험적: #2563EB
      - 상관관계적: #F59E0B
      - 일화적: #EF4444
    </evidence_level_colors>
  </color_palette>

  <typography>
    <font_families>
      - Primary: "Pretendard", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
      - Monospace: "JetBrains Mono", "Fira Code", monospace
    </font_families>
    <font_sizes>
      - Page title: 28px / 700
      - Section title: 20px / 600
      - Card title: 16px / 600
      - Body: 15px / 400
      - Small: 14px / 400
      - Caption: 13px / 500
      - Tiny: 12px / 400
      - Badge: 11px / 600 uppercase tracking-wider
    </font_sizes>
  </typography>

  <spacing>
    - Base unit: 4px
    - Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
    - Page padding: 32px (데스크톱), 16px (모바일)
    - Card padding: 24px
    - Section gap: 32px
    - Element gap: 16px
  </spacing>

  <responsive_design>
    <breakpoints>
      - mobile: 0–767px
      - tablet: 768–1023px
      - desktop: 1024px+
      - wide: 1440px+
    </breakpoints>
    <mobile_adaptations>
      - 사이드바 → Sheet 오버레이 (좌측 슬라이드)
      - 리서치 카드 그리드: 1열
      - 팩트체크 테이블: 가로 스크롤
      - 탭: 스크롤 가능한 가로 탭 바
      - 최소 터치 타겟: 44x44px
    </mobile_adaptations>
  </responsive_design>

  <animations>
    - 페이지 전환: fade-in 200ms ease-out
    - 카드 호버: translateY(-2px) + shadow 증가, 150ms ease
    - Phase 완료: 원형 아이콘 scale(0→1) + 체크 표시, 300ms spring
    - 진행 중 스피너: rotate 1s linear infinite
    - 프로그레스 바: width transition 500ms ease-out
    - toast: slide-in from top-right 200ms, fade-out 150ms
    - 사이드바 열기/닫기: width 200ms ease-in-out
    - 검색 결과: stagger fade-in 각 50ms 간격
  </animations>

  <icons>
    Lucide React 사용. 주요 아이콘 매핑:
    - 대시보드: LayoutDashboard
    - 새 리서치: Plus
    - 검색: Search
    - Phase 1: Brain
    - Phase 2: ShieldAlert
    - Phase 3: Network
    - Phase 4: Rocket
    - 팩트체크: ShieldCheck
    - 소스: Globe
    - 보고서: FileText
    - PDF: Download
    - 삭제: Trash2
    - 설정: Settings
    - 로그아웃: LogOut
    - OpenAI: Bot (또는 커스텀 SVG)
    - Anthropic: Sparkles (또는 커스텀 SVG)
    - Gemini: Stars (또는 커스텀 SVG)
    - 완료: CheckCircle2
    - 진행 중: Loader2 (spin)
    - 실패: XCircle
    - Red Flag: Flag (#EF4444)
  </icons>
</aesthetic_guidelines>

<security_considerations>
  <api_key_protection>
    - CRITICAL: 모든 AI API 키는 서버 사이드(.env.local)에만 저장
    - NEXT_PUBLIC_ 접두사가 없는 변수는 클라이언트에 노출되지 않음
    - API 호출은 반드시 Next.js Route Handlers / Server Actions에서만 수행
    - Supabase SERVICE_ROLE_KEY는 서버에서만 사용 (관리 작업용)
  </api_key_protection>
  <authentication_security>
    - Supabase RLS(Row Level Security)로 모든 테이블 보호
    - auth.uid() 기반으로 본인 데이터만 접근 가능
    - API 라우트에서 세션 검증 후 요청 처리
    - OAuth state 파라미터로 CSRF 방어 (Supabase Auth 자동 처리)
  </authentication_security>
  <input_validation>
    - 주제/설명 입력: XSS 방지를 위해 HTML 태그 제거
    - 마크다운 렌더링: rehype-sanitize로 위험한 HTML 제거
    - URL 파라미터: UUID 형식 검증 (research ID)
    - 검색 쿼리: 최대 500자 제한
  </input_validation>
  <rate_limiting>
    - 리서치 생성: 사용자당 동시 3개 제한
    - AI API 호출: 프로바이더별 rate limit 준수, 429 시 exponential backoff
    - 검색 API: 분당 30회 제한
  </rate_limiting>
</security_considerations>

<third_party_integrations>
  <supabase>
    <sdk>@supabase/supabase-js v2, @supabase/ssr v0.5</sdk>
    <features>
      - Auth: Google OAuth 2.0
      - Database: PostgreSQL (리서치 데이터)
      - pgvector: 벡터 임베딩 저장 및 시맨틱 검색
      - Storage: PDF 보고서 파일 저장
      - Realtime: 리서치 상태 변경 구독 (보조)
    </features>
  </supabase>
  <openai>
    <sdk>openai v5</sdk>
    <features>
      - Responses API + web_search 도구 (웹 검색)
      - text-embedding-3-small (벡터 임베딩)
      - 각 Phase 분석을 위한 텍스트 생성 (gpt-4.1)
    </features>
  </openai>
  <anthropic>
    <sdk>@anthropic-ai/sdk v1</sdk>
    <features>
      - Messages API + web_search_20260209 (웹 검색, 동적 필터링)
      - Messages API + web_fetch_20260209 (URL 페치, PDF 지원)
      - 각 Phase 분석을 위한 텍스트 생성 (claude-sonnet-4-6)
    </features>
  </anthropic>
  <google_gemini>
    <sdk>@google/genai v1</sdk>
    <features>
      - generateContent + google_search (웹 검색 그라운딩)
      - groundingChunks + groundingSupports (소스 매핑 + 신뢰도)
      - 각 Phase 분석을 위한 텍스트 생성 (gemini-2.5-flash)
    </features>
  </google_gemini>
</third_party_integrations>

<advanced_functionality>
  <sse_streaming>
    - GET /api/research/[id]/stream 엔드포인트
    - ReadableStream + TextEncoder로 SSE 구현
    - 이벤트 형식: data: {type, phase, task, message, progress}\n\n
    - 클라이언트: EventSource API로 수신, 자동 재연결
    - 파이프라인 각 단계에서 이벤트 발행:
      - phase_start: Phase 시작
      - task_start: 태스크 시작
      - search_progress: 검색 진행 (프로바이더별)
      - task_complete: 태스크 완료
      - phase_complete: Phase 완료
      - fact_check_start/complete: 팩트체크 진행
      - pipeline_complete: 전체 완료
      - pipeline_error: 에러 발생
  </sse_streaming>

  <vector_search>
    - Supabase pgvector extension 활성화: CREATE EXTENSION vector;
    - embedding 컬럼: vector(1536)
    - IVFFlat 인덱스: CREATE INDEX ON research_report USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    - RPC 함수: match_research(query_embedding vector, match_threshold float, match_count int)
    - 코사인 유사도 기반 검색, threshold 0.7 이상만 반환
  </vector_search>

  <theme_switching>
    - next-themes 라이브러리 사용
    - system / light / dark 3가지 옵션
    - localStorage에 저장, SSR hydration mismatch 방지
  </theme_switching>
</advanced_functionality>

<final_integration_test>
  <test_scenario_1>
    <description>Google 로그인 후 새 리서치 실행</description>
    <steps>
      1. / 접속 → 랜딩 페이지 확인
      2. "Google로 시작하기" 클릭 → Google OAuth 팝업
      3. 로그인 완료 → /dashboard 리다이렉트
      4. 대시보드 빈 상태 확인 ("아직 리서치가 없습니다")
      5. "새 리서치" 클릭 → /research/new 이동
      6. 주제 입력: "2026년 AI 에이전트 시장 전망"
      7. "리서치 시작" 클릭 → /research/[id]/progress 리다이렉트
      8. SSE 스트림으로 Phase 1~4 진행 상태 실시간 업데이트 확인
      9. 각 Phase 완료 시 원형 아이콘 체크 표시 전환 확인
      10. 전체 완료 → "보고서 보기" 버튼 표시
    </steps>
  </test_scenario_1>

  <test_scenario_2>
    <description>리서치 보고서 상세 조회</description>
    <steps>
      1. 완료된 리서치 클릭 → /research/[id] 이동
      2. "보고서" 탭: Executive Summary + 전체 보고서 마크다운 렌더링 확인
      3. 보고서 내 테이블, 불릿 포인트, Red Flag 하이라이트 확인
      4. "소스" 탭: 프로바이더별 뱃지, 교차검증 상태 확인
      5. 프로바이더 필터 "OpenAI" 선택 → OpenAI 소스만 표시
      6. "Phase별 결과" 탭: Phase 1~4 아코디언 열기/닫기 확인
      7. "팩트체크" 탭: 등급별 요약 통계 + 상세 테이블 확인
      8. PDF 다운로드 클릭 → 파일 다운로드 확인
    </steps>
  </test_scenario_2>

  <test_scenario_3>
    <description>시맨틱 검색</description>
    <steps>
      1. /search 접속
      2. "AI 에이전트" 입력 후 Enter
      3. 관련 리서치 결과 유사도 순으로 표시 확인
      4. 결과 카드에 유사도 점수, 주제, 요약 발췌 확인
      5. 결과 클릭 → 해당 리서치 상세 페이지 이동
    </steps>
  </test_scenario_3>

  <test_scenario_4>
    <description>에러 핸들링</description>
    <steps>
      1. 주제 미입력 시 "리서치 시작" 클릭 → 유효성 검증 에러 메시지
      2. AI 프로바이더 1개 실패 시 → toast 경고 + 나머지로 계속
      3. 인증 세션 만료 상태에서 API 호출 → /login 리다이렉트
      4. 존재하지 않는 리서치 ID 접근 → 404 페이지
    </steps>
  </test_scenario_4>

  <test_scenario_5>
    <description>반응형 디자인</description>
    <steps>
      1. 데스크톱 (1440px): 사이드바 + 메인 콘텐츠 풀 레이아웃
      2. 태블릿 (768px): 사이드바 접힘, 햄버거 메뉴
      3. 모바일 (375px): 카드 1열, 테이블 가로 스크롤, Sheet 네비게이션
      4. 다크 모드 토글: 모든 페이지에서 테마 전환 확인
    </steps>
  </test_scenario_5>
</final_integration_test>

<success_criteria>
  <functionality>
    - Google 로그인 및 세션 유지 동작
    - 3사(OpenAI, Anthropic, Gemini) 웹 검색 모두 정상 실행 및 결과 통합
    - 4-Phase 파이프라인 전체 플로우 정상 완료
    - 팩트체크 A~F 등급 자동 부여
    - SSE 실시간 진행 스트리밍 동작
    - 시맨틱 검색으로 관련 리서치 검색 가능
    - PDF 다운로드 정상 동작
  </functionality>
  <user_experience>
    - 리서치 시작(입력→제출) 2초 이내 응답
    - SSE 스트림 지연 1초 이내
    - 대시보드 로딩 (스켈레톤 포함) 1.5초 이내
    - 보고서 마크다운 렌더링 500ms 이내
    - 모든 인터랙티브 요소에 포커스 인디케이터
  </user_experience>
  <technical_quality>
    - TypeScript strict 모드 에러 0건
    - ESLint 에러 0건
    - Supabase RLS 모든 테이블 적용
    - API 키 클라이언트 노출 0건
    - 프로바이더 개별 실패 시 graceful degradation
  </technical_quality>
  <design>
    - 다크/라이트 테마 완전 지원
    - 3개 브레이크포인트 (모바일/태블릿/데스크톱) 반응형
    - shadcn/ui 컴포넌트 일관된 사용
    - 상태별 (pending/running/completed/failed) 시각적 구분 명확
  </design>
  <build>
    - pnpm build 정상 완료
    - Vercel 배포 가능
    - Chrome, Firefox, Safari 최신 버전 호환
  </build>
</success_criteria>

<build_output>
  <build_command>pnpm build</build_command>
  <output_directory>.next/</output_directory>
  <deployment>Vercel (Next.js 네이티브 지원, SSR + API Routes + SSE)</deployment>
  <post_deploy>
    - Supabase 프로젝트에서 pgvector 확장 활성화 확인
    - SQL 마이그레이션 실행 (테이블, 인덱스, RLS, RPC 함수)
    - Vercel 환경 변수 설정 (모든 API 키)
    - Google OAuth redirect URI에 프로덕션 URL 추가
  </post_deploy>
</build_output>

<key_implementation_notes>
  <critical_paths>
    1. Supabase Auth + RLS 설정 — 보안의 기초
    2. AI 프로바이더 통합 (3사 웹 검색) — 핵심 데이터 수집 기능
    3. 파이프라인 오케스트레이터 + SSE — 장시간 비동기 실행의 핵심
    4. pgvector 벡터 검색 — 시맨틱 검색 기능의 기반
  </critical_paths>

  <recommended_implementation_order>
    1. Next.js + Tailwind + shadcn/ui 프로젝트 초기 설정
    2. Supabase 프로젝트 설정 (테이블, pgvector, RLS, Auth)
    3. Google OAuth 로그인 + 미들웨어 + 보호 라우트
    4. 대시보드 레이아웃 (사이드바 + 헤더 + 테마 토글)
    5. 리서치 CRUD (생성, 목록, 상세, 삭제)
    6. AI 프로바이더 검색 모듈 (OpenAI → Anthropic → Gemini → 통합)
    7. 파이프라인 오케스트레이터 (Phase 1~4 순차 실행)
    8. SSE 실시간 스트리밍 (진행 상태)
    9. 보고서 생성 + 마크다운 렌더링
    10. 팩트체크 모듈
    11. 벡터 임베딩 + 시맨틱 검색
    12. PDF 다운로드
    13. 반응형 디자인 + 모바일 최적화
    14. 에러 핸들링, 빈 상태, 로딩 스켈레톤 마무리
  </recommended_implementation_order>

  <database_schema_sql>
    ```sql
    -- 001: pgvector 확장 활성화
    CREATE EXTENSION IF NOT EXISTS vector;

    -- 002: 테이블 생성
    CREATE TABLE user_profile (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE research (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
      topic TEXT NOT NULL CHECK (char_length(topic) <= 500),
      description TEXT CHECK (char_length(description) <= 2000),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collecting','phase1','phase2','phase3','phase4','finalizing','completed','failed')),
      current_phase SMALLINT DEFAULT 0,
      current_step TEXT,
      progress_percent SMALLINT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
      error_message TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_research_user_date ON research(user_id, created_at DESC);

    CREATE TABLE research_source (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('openai','anthropic','gemini')),
      title TEXT,
      url TEXT,
      snippet TEXT,
      source_type TEXT CHECK (source_type IN ('academic','news','official','blog','other')),
      reliability_score SMALLINT CHECK (reliability_score BETWEEN 1 AND 5),
      cross_validated BOOLEAN DEFAULT FALSE,
      page_age TEXT,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_source_research ON research_source(research_id);

    CREATE TABLE research_phase_result (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
      phase SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 4),
      task_id TEXT NOT NULL,
      task_name TEXT NOT NULL,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      ai_model_used TEXT,
      token_usage JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_phase_result ON research_phase_result(research_id, phase, task_id);

    CREATE TABLE fact_check_result (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
      phase SMALLINT NOT NULL,
      claim TEXT NOT NULL,
      grade TEXT NOT NULL CHECK (grade IN ('A','B','C','D','F')),
      openai_result TEXT,
      anthropic_result TEXT,
      gemini_result TEXT,
      confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_factcheck_research ON fact_check_result(research_id, phase);

    CREATE TABLE research_report (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      research_id UUID NOT NULL UNIQUE REFERENCES research(id) ON DELETE CASCADE,
      executive_summary TEXT,
      full_report TEXT,
      pdf_storage_path TEXT,
      embedding VECTOR(1536),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_report_embedding ON research_report USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

    -- 003: RLS 정책
    ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
    ALTER TABLE research ENABLE ROW LEVEL SECURITY;
    ALTER TABLE research_source ENABLE ROW LEVEL SECURITY;
    ALTER TABLE research_phase_result ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fact_check_result ENABLE ROW LEVEL SECURITY;
    ALTER TABLE research_report ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own profile" ON user_profile FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON user_profile FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert own profile" ON user_profile FOR INSERT WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can CRUD own research" ON research FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users can view own sources" ON research_source FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
    CREATE POLICY "Users can view own phase results" ON research_phase_result FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
    CREATE POLICY "Users can view own fact checks" ON fact_check_result FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
    CREATE POLICY "Users can view own reports" ON research_report FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));

    -- 004: 시맨틱 검색 RPC 함수
    CREATE OR REPLACE FUNCTION match_research(
      query_embedding VECTOR(1536),
      match_threshold FLOAT DEFAULT 0.7,
      match_count INT DEFAULT 10,
      p_user_id UUID DEFAULT auth.uid()
    )
    RETURNS TABLE (
      research_id UUID,
      topic TEXT,
      executive_summary TEXT,
      similarity FLOAT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        r.id AS research_id,
        res.topic,
        r.executive_summary,
        1 - (r.embedding <=> query_embedding) AS similarity
      FROM research_report r
      JOIN research res ON r.research_id = res.id
      WHERE res.user_id = p_user_id
        AND 1 - (r.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    END;
    $$;
    ```
  </database_schema_sql>

  <ai_search_implementation_notes>
    CRITICAL: 각 프로바이더 검색 모듈은 정확한 API 명세를 따라야 한다.

    OpenAI (lib/ai/openai-search.ts):
    - client.responses.create({model, tools: [{type: "web_search"}], input: [...]})
    - include: ["web_search_call.action.sources"] 로 소스 획득
    - output[].type === "message" → content[].annotations 에서 url_citation 추출

    Anthropic (lib/ai/anthropic-search.ts):
    - client.messages.create / client.beta.messages.create (동적 필터링 시)
    - tools: [{type: "web_search_20260209", name: "web_search", max_uses: 5}]
    - 동적 필터링: betas: ["code-execution-web-tools-2026-02-09"]
    - web_fetch 추가: [{type: "web_fetch_20260209", name: "web_fetch", citations: {enabled: true}}]
    - content[].citations → web_search_result_location {url, title, cited_text}
    - content[].type === "web_search_tool_result" → web_search_result {url, title, page_age}

    Gemini (lib/ai/gemini-search.ts):
    - model.generateContent({contents, tools: [{google_search: {}}]})
    - candidate.groundingMetadata.groundingChunks[].web → {uri, title}
    - candidate.groundingMetadata.groundingSupports[] → {segment, groundingChunkIndices, confidenceScores}
    - candidate.groundingMetadata.webSearchQueries → 검색 쿼리
  </ai_search_implementation_notes>

  <performance_notes>
    - 3사 검색은 Promise.allSettled()로 병렬 실행 (총 소요 시간 = 가장 느린 프로바이더)
    - Phase 분석은 각 Phase 내의 태스크도 가능한 한 병렬 실행
    - SSE 스트림에서 큰 데이터는 보내지 않음 (상태 변경만 전송, 실제 데이터는 DB 조회)
    - 벡터 검색은 IVFFlat 인덱스로 빠른 응답 보장
    - 보고서 마크다운은 서버에서 미리 생성하여 DB 저장 (클라이언트 렌더링 부담 최소화)
  </performance_notes>
</key_implementation_notes>

</project_specification>
