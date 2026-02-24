'use client';

import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';

interface ReportViewerProps {
  executiveSummary: string | null;
  fullReport: string | null;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function ReportViewer({ executiveSummary, fullReport }: ReportViewerProps) {
  const [showToc, setShowToc] = useState(true);

  const toc = useMemo(() => {
    if (!fullReport) return [];
    const items: TOCItem[] = [];
    const lines = fullReport.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[#*`]/g, '').trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w가-힣]+/g, '-')
          .replace(/(^-|-$)/g, '');
        items.push({ id, text, level });
      }
    });
    return items;
  }, [fullReport]);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {executiveSummary && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
              Executive Summary
            </p>
            <MarkdownRenderer content={executiveSummary} />
          </CardContent>
        </Card>
      )}

      {/* TOC + Report */}
      {fullReport && (
        <div className="relative">
          {/* TOC toggle */}
          {toc.length > 0 && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowToc(!showToc)}
              >
                <List className="h-4 w-4" />
                목차 {showToc ? '접기' : '펼치기'}
              </Button>
            </div>
          )}

          {/* TOC */}
          {showToc && toc.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  목차
                </p>
                <nav className="space-y-1">
                  {toc.map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className={cn(
                        'block text-sm text-muted-foreground hover:text-foreground transition-colors',
                        item.level === 3 && 'pl-4'
                      )}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          )}

          {/* Report content */}
          <MarkdownRenderer content={fullReport} />
        </div>
      )}

      {!fullReport && !executiveSummary && (
        <p className="text-center text-muted-foreground py-8">
          보고서가 아직 생성되지 않았습니다.
        </p>
      )}
    </div>
  );
}
