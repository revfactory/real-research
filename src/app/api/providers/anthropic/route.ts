import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchWithAnthropic } from '@/lib/ai/anthropic-search';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, mode, language } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const result = await searchWithAnthropic({ query, mode, language });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Anthropic proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
