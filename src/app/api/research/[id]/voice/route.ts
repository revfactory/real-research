import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: research } = await supabase
    .from('research').select('id, user_id').eq('id', researchId).eq('user_id', user.id).single();
  if (!research) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check existing audio
  const serviceClient = createServiceClient();
  const { data: report } = await serviceClient
    .from('research_report')
    .select('audio_storage_path')
    .eq('research_id', researchId)
    .single();

  const reportData = report as { audio_storage_path: string | null } | null;
  if (!reportData?.audio_storage_path) {
    return NextResponse.json({ audioUrl: null });
  }

  // Generate signed URL
  const { data: signedUrl } = await serviceClient.storage
    .from('research-audio')
    .createSignedUrl(reportData.audio_storage_path, 3600);

  return NextResponse.json({ audioUrl: signedUrl?.signedUrl || null });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: researchId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: research } = await supabase
    .from('research').select('id, user_id, status').eq('id', researchId).eq('user_id', user.id).single();
  if (!research) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const researchData = research as { id: string; status: string };
  if (researchData.status !== 'completed') {
    return NextResponse.json({ error: '완료된 리서치만 음성을 생성할 수 있습니다.' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Fetch report
  const { data: report } = await serviceClient
    .from('research_report')
    .select('executive_summary, audio_storage_path')
    .eq('research_id', researchId)
    .single();

  const reportData = report as { executive_summary: string | null; audio_storage_path: string | null } | null;
  if (!reportData?.executive_summary) {
    return NextResponse.json({ error: '보고서가 없습니다.' }, { status: 400 });
  }

  // If audio already exists, return signed URL
  if (reportData.audio_storage_path) {
    const { data: signedUrl } = await serviceClient.storage
      .from('research-audio')
      .createSignedUrl(reportData.audio_storage_path, 3600);
    return NextResponse.json({ audioUrl: signedUrl?.signedUrl || null });
  }

  try {
    // Call OpenAI TTS API
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: reportData.executive_summary.slice(0, 4096),
      response_format: 'mp3',
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const storagePath = `${researchId}/briefing.mp3`;

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from('research-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Audio upload failed:', uploadError);
      return NextResponse.json({ error: '오디오 업로드에 실패했습니다.' }, { status: 500 });
    }

    // Update report with audio path
    await serviceClient
      .from('research_report')
      .update({ audio_storage_path: storagePath })
      .eq('research_id', researchId);

    // Generate signed URL
    const { data: signedUrl } = await serviceClient.storage
      .from('research-audio')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({ audioUrl: signedUrl?.signedUrl || null });
  } catch (error) {
    console.error('TTS generation failed:', error);
    return NextResponse.json({ error: '음성 생성에 실패했습니다.' }, { status: 500 });
  }
}
