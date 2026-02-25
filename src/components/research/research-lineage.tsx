'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface ResearchLineageProps {
  researchId: string;
  parentId: string | null;
}

interface LineageItem {
  id: string;
  topic: string;
}

export function ResearchLineage({ researchId, parentId }: ResearchLineageProps) {
  const [parent, setParent] = useState<LineageItem | null>(null);
  const [children, setChildren] = useState<LineageItem[]>([]);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Fetch parent
    if (parentId) {
      supabase
        .from('research')
        .select('id, topic')
        .eq('id', parentId)
        .single()
        .then(({ data }) => {
          if (data) setParent(data as LineageItem);
        });
    }

    // Fetch children
    supabase
      .from('research')
      .select('id, topic')
      .eq('parent_id', researchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setChildren(data as LineageItem[]);
      });
  }, [researchId, parentId]);

  if (!parent && children.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      {parent && (
        <>
          <Link href={`/research/${parent.id}`} className="hover:underline text-muted-foreground">
            {parent.topic.length > 30 ? parent.topic.slice(0, 30) + '...' : parent.topic}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">현재</Badge>
        </>
      )}
      {children.length > 0 && (
        <>
          {!parent && <Badge variant="outline" className="text-xs">현재</Badge>}
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          {children.map((child, i) => (
            <span key={child.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">·</span>}
              <Link href={`/research/${child.id}`} className="hover:underline text-primary">
                {child.topic.length > 25 ? child.topic.slice(0, 25) + '...' : child.topic}
              </Link>
            </span>
          ))}
        </>
      )}
    </div>
  );
}
