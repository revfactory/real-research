export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      research: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          description: string | null;
          status: string;
          current_phase: number;
          current_step: string | null;
          progress_percent: number;
          error_message: string | null;
          parent_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          description?: string | null;
          status?: string;
          current_phase?: number;
          current_step?: string | null;
          progress_percent?: number;
          error_message?: string | null;
          parent_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          topic?: string;
          description?: string | null;
          status?: string;
          current_phase?: number;
          current_step?: string | null;
          progress_percent?: number;
          error_message?: string | null;
          parent_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      research_source: {
        Row: {
          id: string;
          research_id: string;
          provider: string;
          title: string | null;
          url: string | null;
          snippet: string | null;
          source_type: string | null;
          reliability_score: number | null;
          cross_validated: boolean;
          page_age: string | null;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          provider: string;
          title?: string | null;
          url?: string | null;
          snippet?: string | null;
          source_type?: string | null;
          reliability_score?: number | null;
          cross_validated?: boolean;
          page_age?: string | null;
          raw_data?: Json | null;
        };
        Update: {
          provider?: string;
          title?: string | null;
          url?: string | null;
          snippet?: string | null;
          source_type?: string | null;
          reliability_score?: number | null;
          cross_validated?: boolean;
          page_age?: string | null;
          raw_data?: Json | null;
        };
      };
      research_phase_result: {
        Row: {
          id: string;
          research_id: string;
          phase: number;
          task_id: string;
          task_name: string;
          content: string | null;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          ai_model_used: string | null;
          token_usage: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          phase: number;
          task_id: string;
          task_name: string;
          content?: string | null;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          ai_model_used?: string | null;
          token_usage?: Json | null;
        };
        Update: {
          content?: string | null;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          ai_model_used?: string | null;
          token_usage?: Json | null;
        };
      };
      fact_check_result: {
        Row: {
          id: string;
          research_id: string;
          phase: number;
          claim: string;
          grade: string;
          openai_result: string | null;
          anthropic_result: string | null;
          gemini_result: string | null;
          confidence_score: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          phase: number;
          claim: string;
          grade: string;
          openai_result?: string | null;
          anthropic_result?: string | null;
          gemini_result?: string | null;
          confidence_score?: number | null;
          notes?: string | null;
        };
        Update: {
          grade?: string;
          openai_result?: string | null;
          anthropic_result?: string | null;
          gemini_result?: string | null;
          confidence_score?: number | null;
          notes?: string | null;
        };
      };
      research_report: {
        Row: {
          id: string;
          research_id: string;
          executive_summary: string | null;
          full_report: string | null;
          pdf_storage_path: string | null;
          audio_storage_path: string | null;
          embedding: string | null;
          share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          executive_summary?: string | null;
          full_report?: string | null;
          pdf_storage_path?: string | null;
          audio_storage_path?: string | null;
          embedding?: string | null;
          share_token?: string | null;
        };
        Update: {
          executive_summary?: string | null;
          full_report?: string | null;
          pdf_storage_path?: string | null;
          audio_storage_path?: string | null;
          embedding?: string | null;
          share_token?: string | null;
          updated_at?: string;
        };
      };
      research_followup_question: {
        Row: {
          id: string;
          research_id: string;
          question: string;
          source_phase: number;
          source_task_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          question: string;
          source_phase?: number;
          source_task_id?: string | null;
        };
        Update: {
          question?: string;
          source_phase?: number;
          source_task_id?: string | null;
        };
      };
      research_chat: {
        Row: {
          id: string;
          research_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_id: string;
          user_id: string;
        };
        Update: Record<string, never>;
      };
      research_chat_message: {
        Row: {
          id: string;
          chat_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: string;
          content: string;
        };
        Update: {
          content?: string;
        };
      };
      research_comparison: {
        Row: {
          id: string;
          user_id: string;
          research_ids: string[];
          title: string;
          analysis: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          research_ids: string[];
          title: string;
          analysis?: string | null;
          status?: string;
        };
        Update: {
          title?: string;
          analysis?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      match_research: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          p_user_id?: string;
        };
        Returns: {
          research_id: string;
          topic: string;
          executive_summary: string;
          similarity: number;
        }[];
      };
    };
  };
}
