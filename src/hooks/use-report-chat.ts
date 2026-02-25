'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types';

export function useReportChat(researchId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/research/${researchId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setChatId(data.chatId);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoaded(true);
    }
  }, [researchId]);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: chatId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Placeholder for assistant message
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      chat_id: chatId || '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`/api/research/${researchId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, chatId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to send message');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m
                )
              );
            }
            if (data.type === 'done' && data.chatId) {
              setChatId(data.chatId);
            }
            if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Remove empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
      throw err;
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [researchId, chatId]);

  return { messages, chatId, streaming, loaded, loadHistory, sendMessage };
}
