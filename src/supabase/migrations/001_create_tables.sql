-- 001: pgvector extension + table creation
CREATE EXTENSION IF NOT EXISTS vector;

-- User profiles (synced from Supabase Auth)
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research projects
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
CREATE INDEX idx_research_status ON research(status);

-- Research sources (collected from web search)
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
CREATE INDEX idx_source_research_provider ON research_source(research_id, provider);

-- Phase analysis results
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

-- Fact check results
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
CREATE INDEX idx_factcheck_grade ON fact_check_result(grade);

-- Research reports (with vector embedding)
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

-- RLS policies
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
CREATE POLICY "Users can manage own sources" ON research_source FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own phase results" ON research_phase_result FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own fact checks" ON fact_check_result FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own reports" ON research_report FOR ALL USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));

-- Semantic search RPC function
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
    r.research_id,
    res.topic,
    r.executive_summary,
    (1 - (r.embedding <=> query_embedding))::FLOAT AS similarity
  FROM research_report r
  JOIN research res ON r.research_id = res.id
  WHERE res.user_id = p_user_id
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Enable Realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE research;
ALTER PUBLICATION supabase_realtime ADD TABLE research_phase_result;
