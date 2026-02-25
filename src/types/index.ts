// Global type definitions for Real Research

export type ResearchStatus =
  | 'pending'
  | 'collecting'
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'finalizing'
  | 'completed'
  | 'failed';

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Provider = 'openai' | 'anthropic' | 'gemini';

export type SourceType = 'academic' | 'news' | 'official' | 'blog' | 'other';

export type TrustGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type EvidenceLevel = 'meta-analysis' | 'experimental' | 'correlational' | 'anecdotal';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Research {
  id: string;
  user_id: string;
  topic: string;
  description: string | null;
  status: ResearchStatus;
  current_phase: number;
  current_step: string | null;
  progress_percent: number;
  error_message: string | null;
  parent_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSource {
  id: string;
  research_id: string;
  provider: Provider;
  title: string | null;
  url: string | null;
  snippet: string | null;
  source_type: SourceType | null;
  reliability_score: number | null;
  cross_validated: boolean;
  page_age: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ResearchPhaseResult {
  id: string;
  research_id: string;
  phase: number;
  task_id: string;
  task_name: string;
  content: string | null;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  ai_model_used: string | null;
  token_usage: { input_tokens?: number; output_tokens?: number; search_requests?: number } | null;
  created_at: string;
}

export interface FactCheckResult {
  id: string;
  research_id: string;
  phase: number;
  claim: string;
  grade: TrustGrade;
  openai_result: string | null;
  anthropic_result: string | null;
  gemini_result: string | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface ResearchReport {
  id: string;
  research_id: string;
  executive_summary: string | null;
  full_report: string | null;
  pdf_storage_path: string | null;
  audio_storage_path: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupQuestion {
  id: string;
  research_id: string;
  question: string;
  source_phase: number;
  source_task_id: string | null;
  created_at: string;
}

export interface ResearchChat {
  id: string;
  research_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ResearchComparison {
  id: string;
  user_id: string;
  research_ids: string[];
  title: string;
  analysis: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// SSE Event types
export type SSEEventType =
  | 'phase_start'
  | 'task_start'
  | 'search_progress'
  | 'task_complete'
  | 'phase_complete'
  | 'fact_check_start'
  | 'fact_check_complete'
  | 'pipeline_complete'
  | 'pipeline_error';

export interface SSEEvent {
  type: SSEEventType;
  phase?: number;
  task?: string;
  message: string;
  progress?: number;
  provider?: Provider;
  error?: string;
}

// Search result types
export interface SearchResult {
  provider: Provider;
  title: string;
  url: string;
  snippet: string;
  sourceType?: SourceType;
  reliabilityScore?: number;
  pageAge?: string;
  citedText?: string;
  confidenceScore?: number;
  rawData?: Record<string, unknown>;
}

export interface MultiSearchResult {
  results: SearchResult[];
  crossValidated: SearchResult[];
  providerStats: Record<Provider, { count: number; success: boolean }>;
}
