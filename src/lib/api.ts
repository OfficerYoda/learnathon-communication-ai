export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

// Use Vite's dev server proxy to avoid CORS — requests to /api get
// forwarded to the LiteLLM proxy server-side.
const API_BASE_URL = '/api';

function getApiKey(): string {
  return import.meta.env.VITE_HAI_PROXY_API_KEY || '';
}

export async function fetchModels(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
    const data = await res.json();
    return (data.data as { id: string }[])
      .map((m) => m.id)
      .filter((id) => !id.includes('embedding'))
      .sort();
  } catch (err) {
    console.error('Failed to fetch models:', err);
    return [];
  }
}

export async function streamChat(
  messages: ChatMessage[],
  model: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: abortSignal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      callbacks.onError(`API error ${res.status}: ${errorBody}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          callbacks.onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            callbacks.onToken(delta);
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      callbacks.onDone();
    } else {
      callbacks.onError((err as Error).message);
    }
  }
}
