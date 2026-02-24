import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharePageProps) {
  const { token } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) return { title: 'Real Research' };

  const serviceClient = createServiceClient();
  const { data: report } = await serviceClient
    .from('research_report')
    .select('research_id')
    .eq('share_token', token)
    .maybeSingle();

  if (!report) return { title: 'Real Research' };

  const { data: research } = await serviceClient
    .from('research')
    .select('topic')
    .eq('id', report.research_id)
    .single();

  return {
    title: research?.topic
      ? `${research.topic} - Real Research`
      : 'Real Research',
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  const serviceClient = createServiceClient();

  const { data: report } = await serviceClient
    .from('research_report')
    .select('id, research_id, executive_summary, full_report, created_at')
    .eq('share_token', token)
    .maybeSingle();

  if (!report) {
    notFound();
  }

  const { data: research } = await serviceClient
    .from('research')
    .select('topic, created_at')
    .eq('id', report.research_id)
    .single();

  const topic = research?.topic || 'Untitled Research';
  const createdAt = research?.created_at
    ? new Date(research.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground tracking-wider">
            REAL RESEARCH
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold leading-tight">{topic}</h1>
          {createdAt && (
            <p className="text-sm text-muted-foreground">{createdAt}</p>
          )}
        </div>

        {/* Executive Summary */}
        {report.executive_summary && (
          <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
              Executive Summary
            </p>
            <MarkdownRenderer content={report.executive_summary} />
          </div>
        )}

        {/* Full Report */}
        {report.full_report && (
          <MarkdownRenderer content={report.full_report} />
        )}

        {!report.full_report && !report.executive_summary && (
          <p className="text-center text-muted-foreground py-8">
            보고서가 아직 생성되지 않았습니다.
          </p>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Real Research - AI Multi-Agent Research Pipeline
          </p>
        </div>
      </footer>
    </div>
  );
}
