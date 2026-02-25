import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: research } = await supabase
    .from('research').select('id, user_id').eq('id', researchId).eq('user_id', user.id).single();
  if (!research) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: questions } = await supabase
    .from('research_followup_question')
    .select('*')
    .eq('research_id', researchId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ questions: questions || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership and completed status
  const { data: research } = await supabase
    .from('research').select('id, user_id, topic, status').eq('id', researchId).eq('user_id', user.id).single();
  if (!research) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const researchData = research as { id: string; user_id: string; topic: string; status: string };
  if (researchData.status !== 'completed') {
    return NextResponse.json({ error: '완료된 리서치만 팔로업 질문을 생성할 수 있습니다.' }, { status: 400 });
  }

  // Check if already generated (idempotent)
  const { data: existing } = await supabase
    .from('research_followup_question').select('*').eq('research_id', researchId);
  if (existing && existing.length > 0) {
    return NextResponse.json({ questions: existing });
  }

  // Fetch phase results for context
  const { data: phaseResults } = await supabase
    .from('research_phase_result')
    .select('phase, task_id, content')
    .eq('research_id', researchId)
    .eq('status', 'completed')
    .order('phase', { ascending: true });

  const phaseContent = (phaseResults || [])
    .map((p: { phase: number; task_id: string; content: string | null }) =>
      `[Phase ${p.phase}, Task ${p.task_id}]\n${p.content || ''}`
    ).join('\n\n');

  // Generate follow-up questions with Claude Haiku
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `당신은 리서치 분석 전문가입니다. 분석 결과에서 발견된 사각지대, 미해결 질문, 추가 탐구가 필요한 영역을 기반으로 후속 리서치 질문을 생성합니다.
결과를 반드시 다음 JSON 형식으로만 반환하세요 (다른 텍스트 없이):
[{"question": "후속 질문", "source_phase": 2, "source_task_id": "2.1"}]`,
    messages: [{
      role: 'user',
      content: `주제: ${researchData.topic}\n\n분석 결과:\n${phaseContent.slice(0, 8000)}\n\n위 분석에서 발견된 사각지대, 미해결 과제, 추가 탐구가 필요한 5개 핵심 질문을 생성하세요.`,
    }],
  });

  let questionsText = '';
  for (const block of response.content) {
    if (block.type === 'text') questionsText += block.text;
  }

  // Parse JSON
  const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: '질문 생성에 실패했습니다.' }, { status: 500 });
  }

  let parsedQuestions: Array<{ question: string; source_phase?: number; source_task_id?: string }>;
  try {
    parsedQuestions = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: '질문 파싱에 실패했습니다.' }, { status: 500 });
  }

  // Save to DB using service client
  const serviceClient = createServiceClient();
  const insertData = parsedQuestions.slice(0, 5).map(q => ({
    research_id: researchId,
    question: q.question,
    source_phase: q.source_phase || 1,
    source_task_id: q.source_task_id || null,
  }));

  const { data: saved, error: insertError } = await serviceClient
    .from('research_followup_question')
    .insert(insertData)
    .select();

  if (insertError) {
    console.error('Failed to save followup questions:', insertError);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ questions: saved });
}
