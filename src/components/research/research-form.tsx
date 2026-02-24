'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function ResearchForm() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'full' | 'quick'>('full');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ topic?: string; description?: string }>({});

  const validate = () => {
    const newErrors: { topic?: string; description?: string } = {};
    if (!topic.trim()) {
      newErrors.topic = '리서치 주제를 입력해 주세요';
    } else if (topic.length > 500) {
      newErrors.topic = '최대 500자까지 입력 가능합니다';
    }
    if (description.length > 2000) {
      newErrors.description = '최대 2000자까지 입력 가능합니다';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), description: description.trim() || null, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const limit = data.limit || 3;
          throw new Error(
            `동시 진행 가능한 리서치는 ${limit}개입니다. 기존 리서치가 완료된 후 다시 시도해주세요.`
          );
        }
        throw new Error(data.error || '리서치 생성에 실패했습니다.');
      }

      const data = await res.json();
      toast.success('리서치가 시작되었습니다');
      router.push(`/research/${data.id}/progress`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="topic" className="text-sm font-medium">
          리서치 주제 <span className="text-destructive">*</span>
        </label>
        <Input
          id="topic"
          placeholder="리서치할 주제를 입력하세요"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            if (errors.topic) setErrors((prev) => ({ ...prev, topic: undefined }));
          }}
          maxLength={500}
          className={errors.topic ? 'border-destructive' : ''}
        />
        <div className="flex justify-between">
          {errors.topic && (
            <p className="text-xs text-destructive">{errors.topic}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">{topic.length}/500</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          추가 설명 <span className="text-muted-foreground">(선택)</span>
        </label>
        <Textarea
          id="description"
          placeholder="맥락, 관점, 특별히 알고 싶은 점 등"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          maxLength={2000}
          rows={4}
          className={errors.description ? 'border-destructive' : ''}
        />
        <div className="flex justify-between">
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {description.length}/2000
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">실행 모드</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              mode === 'full'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <p className="font-medium text-sm">전체 파이프라인</p>
            <p className="text-xs text-muted-foreground mt-1">
              4 Phase 전체 실행 (심층분석 + 비판적사고 + 지식통합 + 실전적용)
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              mode === 'quick'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <p className="font-medium text-sm">빠른 리서치</p>
            <p className="text-xs text-muted-foreground mt-1">
              Phase 1 심층분석 후 바로 보고서 생성
            </p>
          </button>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 text-base">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            리서치 시작 중...
          </>
        ) : (
          '리서치 시작'
        )}
      </Button>
    </form>
  );
}
