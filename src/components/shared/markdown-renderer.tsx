'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return '';
    return marked.parse(content, { async: false, gfm: true, breaks: true }) as string;
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={cn('markdown-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
