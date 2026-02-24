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

    const serviceClient = createServiceClient();

    const { data: research } = await serviceClient
      .from('research')
      .select('id, topic, user_id, created_at, completed_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!research) {
      return NextResponse.json({ error: 'Research not found' }, { status: 404 });
    }

    const researchData = research as { id: string; topic: string; created_at: string; completed_at: string | null };

    const { data: report } = await serviceClient
      .from('research_report')
      .select('executive_summary, full_report')
      .eq('research_id', id)
      .single();

    const reportData = report as { executive_summary: string | null; full_report: string | null } | null;

    if (!reportData || !reportData.full_report) {
      return NextResponse.json({ error: 'Report not available' }, { status: 404 });
    }

    // Get fact checks
    const { data: factChecks } = await serviceClient
      .from('fact_check_result')
      .select('claim, grade, notes')
      .eq('research_id', id)
      .order('phase', { ascending: true });

    // Get sources
    const { data: sources } = await serviceClient
      .from('research_source')
      .select('provider, title, url, cross_validated')
      .eq('research_id', id)
      .order('created_at', { ascending: true });

    const html = buildReportHTML({
      topic: researchData.topic,
      createdAt: researchData.created_at,
      completedAt: researchData.completed_at,
      executiveSummary: reportData.executive_summary,
      fullReport: reportData.full_report,
      factChecks: (factChecks || []) as Array<{ claim: string; grade: string; notes: string | null }>,
      sources: (sources || []) as Array<{ provider: string; title: string | null; url: string | null; cross_validated: boolean }>,
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function buildReportHTML(data: {
  topic: string;
  createdAt: string;
  completedAt: string | null;
  executiveSummary: string | null;
  fullReport: string;
  factChecks: Array<{ claim: string; grade: string; notes: string | null }>;
  sources: Array<{ provider: string; title: string | null; url: string | null; cross_validated: boolean }>;
}): string {
  const date = new Date(data.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const reportHTML = markdownToHTML(data.fullReport);

  const factCheckRows = data.factChecks.map(fc => {
    const gradeColor = fc.grade === 'A' ? '#16a34a' : fc.grade === 'B' ? '#2563eb' : fc.grade === 'C' ? '#ca8a04' : fc.grade === 'D' ? '#ea580c' : '#dc2626';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:600;color:#fff;background:${gradeColor};font-size:12px;">${fc.grade}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${escapeHTML(fc.claim)}</td>
    </tr>`;
  }).join('\n');

  const sourceRows = data.sources.map(s => {
    const providerLabel = s.provider === 'openai' ? 'OpenAI' : s.provider === 'anthropic' ? 'Anthropic' : 'Gemini';
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${providerLabel}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;">${s.url ? `<a href="${escapeHTML(s.url)}" style="color:#2563eb;text-decoration:none;">${escapeHTML(s.title || s.url)}</a>` : escapeHTML(s.title || '-')}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${s.cross_validated ? '✓' : ''}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(data.topic)} - Real Research Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1a1a1a;
    line-height: 1.8;
    background: #fff;
    font-size: 14px;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 32px;
  }

  /* Header */
  .report-header {
    text-align: center;
    padding-bottom: 32px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 32px;
  }
  .report-header h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .report-header .meta {
    font-size: 13px;
    color: #6b7280;
  }
  .report-header .badge {
    display: inline-block;
    padding: 4px 12px;
    background: #2563eb;
    color: #fff;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  /* Executive Summary */
  .executive-summary {
    background: #f0f7ff;
    border-left: 4px solid #2563eb;
    padding: 20px 24px;
    margin-bottom: 32px;
    border-radius: 0 8px 8px 0;
  }
  .executive-summary .label {
    font-size: 11px;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .executive-summary p {
    font-size: 14px;
    line-height: 1.8;
    color: #374151;
  }

  /* Report content */
  .report-content h1 { font-size: 20px; font-weight: 700; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  .report-content h2 { font-size: 17px; font-weight: 600; margin: 28px 0 12px; color: #1e40af; }
  .report-content h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; }
  .report-content p { margin-bottom: 12px; }
  .report-content ul, .report-content ol { padding-left: 24px; margin-bottom: 12px; }
  .report-content li { margin-bottom: 4px; }
  .report-content strong { font-weight: 600; }
  .report-content blockquote {
    border-left: 3px solid #d1d5db;
    padding: 8px 16px;
    margin: 12px 0;
    color: #6b7280;
    background: #f9fafb;
  }
  .report-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 13px;
  }
  .report-content th {
    background: #f3f4f6;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #d1d5db;
  }
  .report-content td {
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  .report-content code {
    background: #f3f4f6;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 13px;
  }
  .report-content hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
  }

  /* Section */
  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  /* Print button */
  .print-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #1a1a1a;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
  }
  .print-bar span { color: #fff; font-size: 13px; }
  .print-bar button {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .print-bar button:hover { background: #1d4ed8; }

  @media print {
    .print-bar { display: none !important; }
    body { font-size: 11px; }
    .container { padding: 0; max-width: 100%; }
    .report-header { padding-bottom: 16px; margin-bottom: 16px; }
    .executive-summary { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
    table { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span>Real Research Report</span>
  <button onclick="window.print()">PDF로 저장</button>
</div>

<div class="container" style="margin-top:60px;">
  <div class="report-header">
    <div class="badge">REAL RESEARCH</div>
    <h1>${escapeHTML(data.topic)}</h1>
    <div class="meta">${date} · AI 멀티에이전트 리서치 파이프라인</div>
  </div>

  ${data.executiveSummary ? `
  <div class="executive-summary">
    <div class="label">Executive Summary</div>
    <p>${escapeHTML(data.executiveSummary)}</p>
  </div>
  ` : ''}

  <div class="report-content">
    ${reportHTML}
  </div>

  ${data.factChecks.length > 0 ? `
  <div class="section">
    <div class="section-title">팩트체크 결과</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:left;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:12px;width:60px;">등급</th>
          <th style="padding:8px 12px;text-align:left;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:12px;">주장</th>
        </tr>
      </thead>
      <tbody>
        ${factCheckRows}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${data.sources.length > 0 ? `
  <div class="section">
    <div class="section-title">소스 목록 (${data.sources.length}개)</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:6px 12px;text-align:left;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:11px;width:80px;">Provider</th>
          <th style="padding:6px 12px;text-align:left;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:11px;">제목 / URL</th>
          <th style="padding:6px 12px;text-align:center;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:11px;width:60px;">교차검증</th>
        </tr>
      </thead>
      <tbody>
        ${sourceRows}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div style="text-align:center;padding:32px 0;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;margin-top:40px;">
    Generated by Real Research · AI Multi-Agent Research Pipeline
  </div>
</div>

</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHTML(md: string): string {
  let html = escapeHTML(md);

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>');

  // Blockquote
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, header, _divider, body) => {
    const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Unordered lists
  html = html.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li data-level="${level}">${content}</li>`;
  });
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, (match) => {
    return '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>';
  });

  // Paragraphs: wrap remaining lines
  html = html.replace(/^(?!<[a-z/])((?!<).+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
