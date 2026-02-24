import { createClient } from '@/lib/supabase/server';
import { getEmitterStore } from '@/app/api/research/route';
import type { SSEEvent } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify research ownership
  const { data: research } = await supabase
    .from('research')
    .select('id, status, user_id')
    .eq('id', researchId)
    .eq('user_id', user.id)
    .single();

  if (!research) {
    return new Response('Research not found', { status: 404 });
  }

  const researchData = research as { id: string; status: string; user_id: string };

  // If already completed or failed, return current status
  if (researchData.status === 'completed' || researchData.status === 'failed') {
    const encoder = new TextEncoder();
    const eventType = researchData.status === 'completed' ? 'pipeline_complete' : 'pipeline_error';
    const message = researchData.status === 'completed' ? '리서치가 완료되었습니다!' : '리서치 처리 중 오류가 발생했습니다';
    const data = JSON.stringify({
      type: eventType,
      message,
      progress: researchData.status === 'completed' ? 100 : 0,
    });
    const body = encoder.encode(`data: ${data}\n\n`);
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  const encoder = new TextEncoder();
  const { addEmitter, removeEmitter } = getEmitterStore();

  const stream = new ReadableStream({
    start(controller) {
      const emitter = (event: SSEEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Close stream on completion or error
          if (event.type === 'pipeline_complete' || event.type === 'pipeline_error') {
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                // Already closed
              }
            }, 1000);
          }
        } catch {
          // Stream may have been closed
        }
      };

      addEmitter(researchId, emitter);

      // Send initial connection event
      const initData = JSON.stringify({
        type: 'search_progress' as const,
        message: '스트림 연결됨',
        progress: 0,
      });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        removeEmitter(researchId, emitter);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          removeEmitter(researchId, emitter);
        }
      }, 15000);

      // Auto-cleanup after 30 minutes
      setTimeout(() => {
        clearInterval(heartbeat);
        removeEmitter(researchId, emitter);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 30 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
