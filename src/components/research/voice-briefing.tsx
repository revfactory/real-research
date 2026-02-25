'use client';

import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceBriefing } from '@/hooks/use-voice-briefing';
import { toast } from 'sonner';

interface VoiceBriefingProps {
  researchId: string;
  hasReport: boolean;
}

export function VoiceBriefing({ researchId, hasReport }: VoiceBriefingProps) {
  const { audioUrl, loading, generating, generate } = useVoiceBriefing(researchId, hasReport);

  if (!hasReport || loading) return null;

  const handleGenerate = async () => {
    try {
      await generate();
      toast.success('음성 브리핑이 생성되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '음성 생성에 실패했습니다.');
    }
  };

  if (audioUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>음성 브리핑</span>
        </div>
        <audio controls src={audioUrl} className="w-full h-10" />
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleGenerate}
      disabled={generating}
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {generating ? '음성 생성 중...' : '음성 브리핑'}
    </Button>
  );
}
