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

  const serviceClient = createServiceClient();

  // Find existing chat
  const { data: chat } = await serviceClient
    .from('research_chat')
    .select('id')
    .eq('research_id', researchId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!chat) {
    return NextResponse.json({ chatId: null, messages: [] });
  }

  const chatData = chat as { id: string };
  const { data: messages } = await serviceClient
    .from('research_chat_message')
    .select('id, chat_id, role, content, created_at')
    .eq('chat_id', chatData.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ chatId: chatData.id, messages: messages || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: research } = await supabase
    .from('research').select('id, user_id, topic').eq('id', researchId).eq('user_id', user.id).single();
  if (!research) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const researchData = research as { id: string; topic: string };
  const body = await request.json();
  const { message, chatId: existingChatId } = body;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return NextResponse.json({ error: '메시지를 입력해 주세요 (최대 2000자)' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Fetch report context
  const { data: report } = await serviceClient
    .from('research_report')
    .select('executive_summary, full_report')
    .eq('research_id', researchId)
    .single();

  const reportData = report as { executive_summary: string | null; full_report: string | null } | null;
  if (!reportData?.executive_summary) {
    return NextResponse.json({ error: '보고서가 없습니다.' }, { status: 400 });
  }

  // Get or create chat
  let chatId = existingChatId;
  if (!chatId) {
    const { data: newChat, error: chatError } = await serviceClient
      .from('research_chat')
      .insert({ research_id: researchId, user_id: user.id })
      .select('id')
      .single();
    if (chatError || !newChat) {
      return NextResponse.json({ error: '채팅 생성 실패' }, { status: 500 });
    }
    chatId = (newChat as { id: string }).id;
  }

  // Save user message
  await serviceClient.from('research_chat_message').insert({
    chat_id: chatId,
    role: 'user',
    content: message,
  });

  // Fetch previous messages (last 20)
  const { data: prevMessages } = await serviceClient
    .from('research_chat_message')
    .select('role, content')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(20);

  // Build context
  const reportContext = [
    reportData.executive_summary,
    reportData.full_report?.slice(0, 10000) || '',
  ].join('\n\n');

  const systemPrompt = `당신은 리서치 보고서 전문 어시스턴트입니다. 다음 보고서 내용을 기반으로 사용자의 질문에 정확하고 도움이 되는 답변을 해주세요.

주제: ${researchData.topic}

보고서 내용:
${reportContext}

규칙:
- 보고서에 없는 내용은 추측하지 마세요
- 마크다운 형식으로 응답하세요
- 간결하면서도 핵심을 담은 답변을 해주세요`;

  const chatMessages: Anthropic.MessageParam[] = (prevMessages || []).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: chatMessages,
          stream: true,
        });

        let fullContent = '';

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullContent += event.delta.text;
            const data = JSON.stringify({ type: 'delta', content: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Save assistant message
        await serviceClient.from('research_chat_message').insert({
          chat_id: chatId,
          role: 'assistant',
          content: fullContent,
        });

        const doneData = JSON.stringify({ type: 'done', chatId });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errData = JSON.stringify({ type: 'error', error: errorMsg });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
