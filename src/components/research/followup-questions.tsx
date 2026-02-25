'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFollowupQuestions } from '@/hooks/use-followup-questions';
import { toast } from 'sonner';

interface FollowupQuestionsProps {
  researchId: string;
  isCompleted: boolean;
}

export function FollowupQuestions({ researchId, isCompleted }: FollowupQuestionsProps) {
  const router = useRouter();
  const { questions, loading, generating, fetchQuestions, generateQuestions } = useFollowupQuestions(researchId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isCompleted) fetchQuestions();
  }, [isCompleted, fetchQuestions]);

  if (!isCompleted) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const selected = questions.filter(q => selectedIds.has(q.id));
    if (selected.length === 0) return;

    setCreating(true);
    try {
      for (const q of selected) {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: q.question,
            parent_id: researchId,
            mode: 'full',
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || '리서치 생성 실패');
        }
      }
      toast.success(`${selected.length}개 팔로업 리서치가 시작되었습니다.`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '리서치 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">팔로업 리서치</h3>
          {questions.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={generateQuestions}
              disabled={generating || loading}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? '생성 중...' : '팔로업 질문 생성'}
            </Button>
          )}
        </div>

        {questions.length > 0 && (
          <div className="space-y-2">
            {questions.map((q) => (
              <label
                key={q.id}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm flex-1">{q.question}</span>
              </label>
            ))}

            {selectedIds.size > 0 && (
              <Button
                className="w-full gap-2"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {creating ? '생성 중...' : `${selectedIds.size}개 질문으로 새 리서치 시작`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
