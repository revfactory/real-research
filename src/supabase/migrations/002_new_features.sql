-- 002: 신규 기능 테이블 (팔로업, 챗봇, 음성, 비교 분석)

-- 1. Research parent_id (팔로업 리서치 계보)
ALTER TABLE research ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES research(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_research_parent ON research(parent_id);

-- 2. Follow-up questions
CREATE TABLE IF NOT EXISTS research_followup_question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  source_phase SMALLINT DEFAULT 0,
  source_task_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_followup_research ON research_followup_question(research_id);

-- 3. Research chat (AI 챗봇)
CREATE TABLE IF NOT EXISTS research_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_research ON research_chat(research_id);

CREATE TABLE IF NOT EXISTS research_chat_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES research_chat(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_message_chat ON research_chat_message(chat_id, created_at);

-- 4. Voice briefing (음성 브리핑)
ALTER TABLE research_report ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

-- 5. Research comparison (비교 분석)
CREATE TABLE IF NOT EXISTS research_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  research_ids UUID[] NOT NULL,
  title TEXT NOT NULL,
  analysis TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comparison_user ON research_comparison(user_id, created_at DESC);

-- 6. RLS policies for new tables
ALTER TABLE research_followup_question ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_comparison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own followup questions"
  ON research_followup_question FOR ALL
  USING (research_id IN (SELECT id FROM research WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own chats"
  ON research_chat FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own chat messages"
  ON research_chat_message FOR ALL
  USING (chat_id IN (SELECT id FROM research_chat WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own comparisons"
  ON research_comparison FOR ALL
  USING (user_id = auth.uid());

-- 7. Supabase Storage bucket for audio (run separately in Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('research-audio', 'research-audio', false);
-- CREATE POLICY "Users can upload own audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'research-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can read own audio" ON storage.objects FOR SELECT USING (bucket_id = 'research-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
