'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEEvent } from '@/types';

interface UseResearchStreamOptions {
  researchId: string;
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useResearchStream({
  researchId,
  enabled = true,
  onEvent,
  onComplete,
  onError,
}: UseResearchStreamOptions) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !researchId) return;

    const es = new EventSource(`/api/research/${researchId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, event]);
        onEvent?.(event);

        if (event.type === 'pipeline_complete') {
          onComplete?.();
          disconnect();
        }
        if (event.type === 'pipeline_error') {
          onError?.(event.error || event.message);
          disconnect();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [researchId, enabled, onEvent, onComplete, onError, disconnect]);

  return { events, connected, disconnect };
}
