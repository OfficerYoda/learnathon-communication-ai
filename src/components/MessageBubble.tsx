import { MarkdownRenderer } from './MarkdownRenderer';
import type { DisplayMessage } from '../hooks/useChat';

interface MessageBubbleProps {
  message: DisplayMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`message-enter flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative max-w-[80%] rounded-2xl px-5 py-3.5 ${
          isUser
            ? 'bg-[var(--color-user-bubble)] text-[var(--color-user-text)]'
            : 'bg-[var(--color-ai-bubble)] text-[var(--color-ai-text)]'
        }`}
        style={{
          borderBottomRightRadius: isUser ? '6px' : undefined,
          borderBottomLeftRadius: !isUser ? '6px' : undefined,
        }}
      >
        {!isUser && (
          <div className="mb-1.5 text-xs font-medium tracking-wide uppercase opacity-50">
            Reflect
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed text-[0.938rem]">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && (
              <span className="streaming-cursor ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-current opacity-70" />
            )}
          </>
        )}

        <div
          className={`mt-1.5 text-[0.688rem] opacity-40 ${isUser ? 'text-right' : 'text-left'}`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
