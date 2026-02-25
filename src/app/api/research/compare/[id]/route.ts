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
  const { id: comparisonId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data: comparison } = await serviceClient
    .from('research_comparison')
    .select('*')
    .eq('id', comparisonId)
    .eq('user_id', user.id)
    .single();

  if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const compData = comparison as { research_ids: string[]; [key: string]: unknown };

  // Fetch related research basic info
  const { data: researches } = await serviceClient
    .from('research')
    .select('id, topic, status, created_at')
    .in('id', compData.research_ids);

  return NextResponse.json({ comparison, researches: researches || [] });
}
