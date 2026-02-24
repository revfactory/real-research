import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid research ID' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Fetch research with owner check
    const { data: research, error: researchError } = await serviceClient
      .from('research')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (researchError || !research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [sourcesResult, phaseResultsResult, factChecksResult, reportResult] = await Promise.all([
      serviceClient
        .from('research_source')
        .select('*')
        .eq('research_id', id)
        .order('created_at', { ascending: true }),
      serviceClient
        .from('research_phase_result')
        .select('*')
        .eq('research_id', id)
        .order('phase', { ascending: true })
        .order('task_id', { ascending: true }),
      serviceClient
        .from('fact_check_result')
        .select('*')
        .eq('research_id', id)
        .order('phase', { ascending: true }),
      serviceClient
        .from('research_report')
        .select('id, research_id, executive_summary, full_report, pdf_storage_path, created_at, updated_at')
        .eq('research_id', id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ...(research as Record<string, unknown>),
      sources: sourcesResult.data || [],
      phase_results: phaseResultsResult.data || [],
      fact_checks: factChecksResult.data || [],
      report: reportResult.data || null,
    });
  } catch (error) {
    console.error('Research detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const ACTIVE_STATUSES = ['collecting', 'phase1', 'phase2', 'phase3', 'phase4', 'finalizing'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify ownership and check current status
    const { data: research } = await serviceClient
      .from('research')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    if (!ACTIVE_STATUSES.includes(research.status)) {
      return NextResponse.json(
        { error: '진행 중인 리서치만 취소할 수 있습니다.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await serviceClient
      .from('research')
      .update({
        status: 'failed',
        error_message: '사용자에 의해 취소됨',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel research' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Research cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify ownership
    const { data: research } = await serviceClient
      .from('research')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    // Delete (cascades to related tables)
    const { error: deleteError } = await serviceClient
      .from('research')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete research' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Research delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
