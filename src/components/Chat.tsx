import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { DisplayMessage } from '../hooks/useChat';
import type { PromptMode } from '../lib/prompts';

interface ChatProps {
  messages: DisplayMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
  onClearChat: () => void;
  activeMode: PromptMode | null;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function Chat({
  messages,
  isLoading,
  onSendMessage,
  onStopStreaming,
  onClearChat,
  activeMode,
  onToggleSidebar,
  sidebarOpen,
}: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-hover)]"
            title={sidebarOpen ? 'Close settings' : 'Open settings'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </>
              )}
            </svg>
          </button>
          <div>
            <h1 className="font-display text-xl leading-tight">Reflect</h1>
            {activeMode && (
              <p className="text-xs opacity-50">
                {activeMode.icon} {activeMode.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="rounded-lg px-3 py-1.5 text-xs font-medium opacity-50 transition-all hover:bg-[var(--color-surface-hover)] hover:opacity-100"
            >
              Clear chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="mb-6 text-5xl opacity-20">🪞</div>
              <h2 className="font-display mb-3 text-2xl">Begin reflecting</h2>
              <p className="text-sm leading-relaxed opacity-50">
                {activeMode
                  ? activeMode.description
                  : 'Select a mode from the sidebar to get started. Paste a message, draft an email, or explore how your communication lands.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--color-border)] px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl bg-[var(--color-input-bg)] px-4 py-3 ring-1 ring-[var(--color-border)] transition-all focus-within:ring-[var(--color-accent)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeMode
                  ? `Paste a message, describe a situation, or ask for help...`
                  : 'Select a mode from the sidebar first...'
              }
              disabled={!activeMode}
              rows={1}
              className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-[0.938rem] leading-relaxed outline-none placeholder:opacity-40 disabled:opacity-30"
            />
            {isLoading ? (
              <button
                onClick={onStopStreaming}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger)] text-white transition-transform hover:scale-105 active:scale-95"
                title="Stop generating"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !activeMode}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                title="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[0.688rem] opacity-30">
            Nothing is stored. Your conversation vanishes when you close or refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
