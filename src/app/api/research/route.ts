import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { PHASES } from '@/lib/constants';

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, description } = body;

    if (!topic || typeof topic !== 'string' || topic.length > 500) {
      return NextResponse.json(
        { error: '주제를 입력해 주세요 (최대 500자)' },
        { status: 400 }
      );
    }

    if (description && typeof description === 'string' && description.length > 2000) {
      return NextResponse.json(
        { error: '추가 설명은 최대 2000자까지 가능합니다' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Check concurrent research limit
    const { count } = await serviceClient
      .from('research')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing']);

    const maxConcurrent = parseInt(process.env.RESEARCH_MAX_CONCURRENT || '3', 10);
    if (count && count >= maxConcurrent) {
      return NextResponse.json(
        { error: `동시 진행 가능한 리서치는 ${maxConcurrent}개입니다` },
        { status: 429 }
      );
    }

    // Create research record
    const { data: research, error: insertError } = await serviceClient
      .from('research')
      .insert({
        user_id: user.id,
        topic: topic.trim(),
        description: description?.trim() || null,
        status: 'pending',
        current_phase: 0,
        progress_percent: 0,
      })
      .select()
      .single();

    if (insertError || !research) {
      return NextResponse.json(
        { error: 'Failed to create research' },
        { status: 500 }
      );
    }

    const researchRecord = research as { id: string; status: string };

    // Create initial phase result records (10 tasks total)
    const taskRecords = PHASES.flatMap(phase =>
      phase.tasks.map(task => ({
        research_id: researchRecord.id,
        phase: phase.phase as number,
        task_id: task.id as string,
        task_name: task.name as string,
        status: 'pending',
      }))
    );

    await serviceClient.from('research_phase_result').insert(taskRecords);

    // Start pipeline asynchronously (don't await)
    startPipelineAsync(researchRecord.id, topic.trim(), description?.trim() || undefined, user.id);

    return NextResponse.json({
      id: researchRecord.id,
      status: researchRecord.status,
    });
  } catch (error) {
    console.error('Research creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Start pipeline without blocking the response
function startPipelineAsync(researchId: string, topic: string, description: string | undefined, userId: string) {
  // Import and run pipeline
  import('@/lib/pipeline/orchestrator').then(({ runPipeline }) => {
    const emit = (event: import('@/types').SSEEvent) => {
      const emitters = getEmitterStore().getEmitters(researchId);
      for (const emitter of emitters) {
        try {
          emitter(event);
        } catch {
          // Emitter may have been cleaned up
        }
      }
    };

    runPipeline({ researchId, topic, description, userId, emit }).catch(err => {
      console.error(`Pipeline failed for ${researchId}:`, err);
    });
  });
}

// Global emitter store for SSE connections
type EmitFn = (event: import('@/types').SSEEvent) => void;
const emitterStore = new Map<string, Set<EmitFn>>();

export function getEmitterStore() {
  return {
    addEmitter(researchId: string, emitter: EmitFn) {
      if (!emitterStore.has(researchId)) {
        emitterStore.set(researchId, new Set());
      }
      emitterStore.get(researchId)!.add(emitter);
    },
    removeEmitter(researchId: string, emitter: EmitFn) {
      emitterStore.get(researchId)?.delete(emitter);
      if (emitterStore.get(researchId)?.size === 0) {
        emitterStore.delete(researchId);
      }
    },
    getEmitters(researchId: string): EmitFn[] {
      return Array.from(emitterStore.get(researchId) || []);
    },
  };
}
