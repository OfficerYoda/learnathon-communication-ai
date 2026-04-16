import { useState, useCallback, useRef } from 'react';
import { streamChat, type ChatMessage } from '../lib/api';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseChatOptions {
  systemPrompt: string;
  model: string;
  relationship: string;
  situation: string;
  tones?: string[];
}

export function useChat({ systemPrompt, model, relationship, situation, tones }: UseChatOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Keep a ref to messages so the streaming callback always has access
  const messagesRef = useRef<DisplayMessage[]>([]);

  const updateMessages = useCallback((updater: (prev: DisplayMessage[]) => DisplayMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const buildSystemMessage = useCallback((): string => {
    let prompt = systemPrompt;

    if (relationship.trim()) {
      prompt += `\n\n## Current Context — Relationship\nThe user's relationship with the other party: ${relationship.trim()}`;
    }

    if (situation.trim()) {
      prompt += `\n\n## Current Context — Situation\n${situation.trim()}`;
    }

    if (tones && tones.length > 0) {
      prompt += `\n\n## Current Context — Desired Tone\nThe user wants the email to convey the following tone(s): ${tones.join(', ')}. Ensure the drafted or overhauled email reflects these tonal qualities.`;
    }

    return prompt;
  }, [systemPrompt, relationship, situation, tones]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      // Build the API messages from current state BEFORE updating
      const apiMessages: ChatMessage[] = [
        { role: 'system', content: buildSystemMessage() },
      ];

      // Add all existing messages from the ref (reliable source of current state)
      for (const msg of messagesRef.current) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }

      // Add the new user message
      apiMessages.push({ role: 'user', content: content.trim() });

      // Now update the display
      updateMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        apiMessages,
        model,
        {
          onToken: (token) => {
            updateMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          },
          onDone: () => {
            updateMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, isStreaming: false };
              }
              return updated;
            });
            setIsLoading(false);
            abortRef.current = null;
          },
          onError: (error) => {
            updateMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: `Error: ${error}`,
                  isStreaming: false,
                };
              }
              return updated;
            });
            setIsLoading(false);
            abortRef.current = null;
          },
        },
        controller.signal
      );
    },
    [isLoading, model, buildSystemMessage, updateMessages]
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const clearChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    messagesRef.current = [];
    setIsLoading(false);
  }, [stopStreaming]);

  return {
    messages,
    isLoading,
    sendMessage,
    stopStreaming,
    clearChat,
  };
}
