import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert user profile
      const serviceClient = createServiceClient();
      const user = data.user;

      await serviceClient.from('user_profile').upsert(
        {
          id: user.id,
          email: user.email || '',
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
