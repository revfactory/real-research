import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/embeddings';

interface SearchResultItem {
  research_id: string;
  topic: string;
  executive_summary: string | null;
  similarity: number;
  created_at: string | null;
}

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

    // 1) Try semantic search (may fail if pgvector not set up, or return empty if no embeddings)
    let semanticResults: SearchResultItem[] = [];
    try {
      const embeddingResult = await generateEmbedding(query);

      const { data: rpcResults, error: rpcError } = await supabase.rpc(
        'match_research' as never,
        {
          query_embedding: `[${embeddingResult.embedding.join(',')}]`,
          match_threshold: 0.4,
          match_count: 10,
          p_user_id: user.id,
        } as never,
      );

      if (!rpcError && rpcResults) {
        const rows = rpcResults as Array<{ research_id: string; topic: string; executive_summary: string; similarity: number }>;
        // Enrich with created_at
        const ids = rows.map(r => r.research_id);
        let createdAtMap: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: researchRows } = await supabase
            .from('research')
            .select('id, created_at')
            .in('id', ids);
          if (researchRows) {
            createdAtMap = Object.fromEntries(
              (researchRows as Array<{ id: string; created_at: string }>).map(r => [r.id, r.created_at]),
            );
          }
        }
        semanticResults = rows.map(r => ({
          research_id: r.research_id,
          topic: r.topic,
          executive_summary: r.executive_summary,
          similarity: Math.round(r.similarity * 100),
          created_at: createdAtMap[r.research_id] || null,
        }));
      }
    } catch (e) {
      console.warn('Semantic search failed, falling back to text search:', e instanceof Error ? e.message : e);
    }

    // 2) If semantic search returned enough results, return them
    if (semanticResults.length >= 3) {
      return NextResponse.json({ results: semanticResults });
    }

    // 3) Also do text-based search to fill gaps
    const semanticIds = new Set(semanticResults.map(r => r.research_id));
    const { data: textResults } = await supabase
      .from('research')
      .select('id, topic, created_at')
      .eq('user_id', user.id)
      .or(`topic.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    const textItems: SearchResultItem[] = [];
    if (textResults) {
      for (const r of textResults as Array<{ id: string; topic: string; created_at: string }>) {
        if (semanticIds.has(r.id)) continue; // already in semantic results
        const { data: report } = await supabase
          .from('research_report')
          .select('executive_summary')
          .eq('research_id', r.id)
          .single();
        const summary = (report as { executive_summary?: string } | null)?.executive_summary || null;
        textItems.push({
          research_id: r.id,
          topic: r.topic,
          executive_summary: summary,
          similarity: 70,
          created_at: r.created_at,
        });
      }
    }

    // 4) Merge: semantic first, then text
    const merged = [...semanticResults, ...textItems].slice(0, 10);

    return NextResponse.json({ results: merged });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
