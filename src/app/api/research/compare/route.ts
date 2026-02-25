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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { researchIds } = body;

  if (!Array.isArray(researchIds) || researchIds.length < 2 || researchIds.length > 4) {
    return NextResponse.json({ error: '2~4개의 리서치를 선택해 주세요.' }, { status: 400 });
  }

  // Verify all researches belong to user and are completed
  const { data: researches } = await supabase
    .from('research')
    .select('id, topic, status, user_id')
    .in('id', researchIds)
    .eq('user_id', user.id);

  if (!researches || researches.length !== researchIds.length) {
    return NextResponse.json({ error: '리서치를 찾을 수 없습니다.' }, { status: 404 });
  }

  const researchList = researches as Array<{ id: string; topic: string; status: string }>;
  const notCompleted = researchList.filter(r => r.status !== 'completed');
  if (notCompleted.length > 0) {
    return NextResponse.json({ error: '완료된 리서치만 비교할 수 있습니다.' }, { status: 400 });
  }

  // Fetch reports for all researches
  const serviceClient = createServiceClient();
  const { data: reports } = await serviceClient
    .from('research_report')
    .select('research_id, executive_summary, full_report')
    .in('research_id', researchIds);

  if (!reports || reports.length === 0) {
    return NextResponse.json({ error: '보고서를 찾을 수 없습니다.' }, { status: 404 });
  }

  const reportMap = new Map(
    (reports as Array<{ research_id: string; executive_summary: string | null; full_report: string | null }>)
      .map(r => [r.research_id, r])
  );

  // Create comparison record
  const title = researchList.map(r => r.topic).join(' vs ');
  const { data: comparison, error: compError } = await serviceClient
    .from('research_comparison')
    .insert({
      user_id: user.id,
      research_ids: researchIds,
      title: title.slice(0, 200),
      status: 'generating',
    })
    .select('id')
    .single();

  if (compError || !comparison) {
    return NextResponse.json({ error: '비교 생성에 실패했습니다.' }, { status: 500 });
  }

  const compId = (comparison as { id: string }).id;

  // Build prompt
  const reportsContext = researchList.map((r, i) => {
    const report = reportMap.get(r.id);
    const summary = report?.executive_summary || '(요약 없음)';
    const content = report?.full_report?.slice(0, 4000) || '';
    return `## 리서치 ${i + 1}: ${r.topic}\n### Executive Summary\n${summary}\n### 주요 내용\n${content}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `당신은 리서치 비교 분석 전문가입니다. 여러 리서치 보고서를 비교하여 체계적인 분석을 제공합니다. 마크다운 형식으로 작성하세요.`;

  const userPrompt = `다음 ${researchList.length}개의 리서치 보고서를 비교 분석하세요.

${reportsContext}

다음 구조로 비교 분석을 작성하세요:
## 비교 개요
각 리서치의 핵심 주제와 범위를 간략히 정리

## 공통 발견
모든 리서치에서 공통적으로 나타나는 패턴과 인사이트

## 핵심 차이점
리서치 간 상충되거나 다른 관점을 구체적으로 비교

## 통합 인사이트
모든 리서치를 종합했을 때 도출되는 새로운 인사이트

## 비교 매트릭스
| 차원 | ${researchList.map((r, i) => `리서치 ${i + 1}`).join(' | ')} |
주요 차원별 GFM 테이블로 비교`;

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          stream: true,
        });

        let fullContent = '';

        // Send comparison ID first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', comparisonId: compId })}\n\n`)
        );

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullContent += event.delta.text;
            const data = JSON.stringify({ type: 'delta', content: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Save analysis
        await serviceClient
          .from('research_comparison')
          .update({ analysis: fullContent, status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', compId);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', comparisonId: compId })}\n\n`)
        );
        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await serviceClient
          .from('research_comparison')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', compId);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`)
        );
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
