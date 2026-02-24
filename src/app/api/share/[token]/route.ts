import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Fetch report by share_token with research info
    const { data: report, error } = await serviceClient
      .from('research_report')
      .select('id, research_id, executive_summary, full_report, created_at, updated_at')
      .eq('share_token', token)
      .maybeSingle();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Fetch research info (topic, created_at)
    const { data: research } = await serviceClient
      .from('research')
      .select('topic, created_at')
      .eq('id', report.research_id)
      .single();

    return NextResponse.json({
      ...report,
      topic: research?.topic || null,
      research_created_at: research?.created_at || null,
    });
  } catch (error) {
    console.error('Share fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
