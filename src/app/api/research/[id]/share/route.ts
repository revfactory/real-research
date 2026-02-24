import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
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

    // Check if report exists and already has a share_token
    const { data: report } = await serviceClient
      .from('research_report')
      .select('id, share_token')
      .eq('research_id', id)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // If share_token already exists, return it
    if (report.share_token) {
      return NextResponse.json({ share_token: report.share_token });
    }

    // Generate new share_token using gen_random_uuid()
    const { data: updated, error: updateError } = await serviceClient
      .from('research_report')
      .update({ share_token: crypto.randomUUID() })
      .eq('id', report.id)
      .select('share_token')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
    }

    return NextResponse.json({ share_token: updated.share_token });
  } catch (error) {
    console.error('Share token creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
