import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/embeddings';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.length > 500) {
      return NextResponse.json(
        { error: '검색어를 입력해 주세요 (최대 500자)' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const embeddingResult = await generateEmbedding(query);

    // Search using pgvector RPC
    const { data: results, error: searchError } = await supabase.rpc(
      'match_research' as never,
      {
        query_embedding: `[${embeddingResult.embedding.join(',')}]`,
        match_threshold: 0.7,
        match_count: 10,
        p_user_id: user.id,
      } as never
    );

    if (searchError) {
      console.error('Semantic search error:', searchError);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: ((results || []) as Array<{ research_id: string; topic: string; executive_summary: string; similarity: number }>).map((r) => ({
        research_id: r.research_id,
        topic: r.topic,
        executive_summary: r.executive_summary,
        similarity: Math.round(r.similarity * 100),
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
