import type { SSEEvent } from '@/types';

export interface PipelineContext {
  researchId: string;
  topic: string;
  description?: string;
  userId: string;
  emit: (event: SSEEvent) => void;
}

export interface PhaseResult {
  phase: number;
  tasks: TaskResult[];
  completedAt: string;
}

export interface TaskResult {
  taskId: string;
  taskName: string;
  content: string;
  modelUsed: string;
  tokenUsage?: {
    input_tokens: number;
    output_tokens: number;
    search_requests?: number;
  };
}

export interface FactCheckItem {
  claim: string;
  phase: number;
  openaiResult?: string;
  anthropicResult?: string;
  geminiResult?: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidenceScore?: number;
  notes?: string;
}

export interface PipelineResult {
  phases: PhaseResult[];
  factChecks: FactCheckItem[];
  report: {
    executiveSummary: string;
    fullReport: string;
  };
}
