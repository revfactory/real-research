'use client';

import { useState } from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderBadge } from './provider-badge';
import { SOURCE_TYPE_CONFIG } from '@/lib/constants';
import type { ResearchSource, Provider, SourceType } from '@/types';

interface SourceListProps {
  sources: ResearchSource[];
}

type ProviderFilter = 'all' | Provider;
type ReliabilityFilter = 'all' | '5' | '4+' | '3+';
type ValidationFilter = 'all' | 'validated' | 'unvalidated';

export function SourceList({ sources }: SourceListProps) {
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [reliabilityFilter, setReliabilityFilter] = useState<ReliabilityFilter>('all');
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');

  const filtered = sources.filter((s) => {
    if (providerFilter !== 'all' && s.provider !== providerFilter) return false;
    if (reliabilityFilter !== 'all') {
      const score = s.reliability_score || 0;
      if (reliabilityFilter === '5' && score !== 5) return false;
      if (reliabilityFilter === '4+' && score < 4) return false;
      if (reliabilityFilter === '3+' && score < 3) return false;
    }
    if (validationFilter === 'validated' && !s.cross_validated) return false;
    if (validationFilter === 'unvalidated' && s.cross_validated) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">프로바이더</label>
          <div className="flex gap-1">
            {(['all', 'openai', 'anthropic', 'gemini'] as const).map((val) => (
              <Button
                key={val}
                variant={providerFilter === val ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setProviderFilter(val)}
              >
                {val === 'all' ? '전체' : val === 'openai' ? 'OpenAI' : val === 'anthropic' ? 'Anthropic' : 'Gemini'}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">신뢰도</label>
          <div className="flex gap-1">
            {(['all', '5', '4+', '3+'] as const).map((val) => (
              <Button
                key={val}
                variant={reliabilityFilter === val ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReliabilityFilter(val)}
              >
                {val === 'all' ? '전체' : `★${val}`}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">교차검증</label>
          <div className="flex gap-1">
            {(['all', 'validated', 'unvalidated'] as const).map((val) => (
              <Button
                key={val}
                variant={validationFilter === val ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setValidationFilter(val)}
              >
                {val === 'all' ? '전체' : val === 'validated' ? '확인됨' : '미확인'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Source items */}
      <div className="space-y-3">
        {filtered.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            필터 조건에 맞는 소스가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function SourceItem({ source }: { source: ResearchSource }) {
  const sourceTypeConfig = source.source_type
    ? SOURCE_TYPE_CONFIG[source.source_type]
    : null;

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={source.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-medium hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
          >
            {source.title || '제목 없음'}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          {source.url && (
            <p className="text-[13px] text-blue-600 dark:text-blue-400 truncate">
              {source.url}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {source.cross_validated ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ProviderBadge provider={source.provider as Provider} />
        {sourceTypeConfig && (
          <Badge
            variant="outline"
            className="text-[11px]"
            style={{ color: sourceTypeConfig.color, borderColor: sourceTypeConfig.color }}
          >
            {sourceTypeConfig.label}
          </Badge>
        )}
        {source.reliability_score && (
          <Badge variant="secondary" className="text-[11px] gap-0.5">
            <Star className="h-3 w-3 fill-current" />
            {source.reliability_score}
          </Badge>
        )}
      </div>

      {source.snippet && (
        <p className="text-sm text-muted-foreground line-clamp-3">{source.snippet}</p>
      )}
    </div>
  );
}
