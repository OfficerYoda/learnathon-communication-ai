import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import { fetchModels } from "../../lib/api";
import { useChat } from "../../hooks/useChat";
import { loadPromptModes, type PromptMode } from "../../lib/prompts";
import "./corporate.css";

// ─── Constants ──────────────────────────────────────────────

const TONE_OPTIONS = [
  "Assertive",
  "Calm",
  "Compassionate",
  "Direct",
  "Objective",
  "Pragmatic",
  "Reassuring",
  "Respectful",
  "Sincere",
  "Thoughtful",
] as const;

const EMAIL_MODE_ID = "email-drafting";

// ─── Helpers ────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

const DEFAULT_MODEL =
  import.meta.env.VITE_DEFAULT_MODEL || "anthropic--claude-4-sonnet";

// ─── Main Component ─────────────────────────────────────────

export default function CorporateTheme() {
  const modes = useMemo(() => loadPromptModes(), []);

  const [activeModeId, setActiveModeId] = useState(modes[0]?.id ?? "");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [relationship, setRelationship] = useState("");
  const [situation, setSituation] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  const activeMode = modes.find((m) => m.id === activeModeId) ?? null;
  const isEmailMode = activeModeId === EMAIL_MODE_ID;

  const { messages, isLoading, sendMessage, stopStreaming, clearChat } =
    useChat({
      systemPrompt: activeMode?.content ?? "",
      model,
      relationship,
      situation,
      tones: isEmailMode ? selectedTones : undefined,
    });

  const onModeChange = (id: string) => {
    setActiveModeId(id);
    clearChat();
  };
  const onModelChange = (m: string) => setModel(m);
  const onRelationshipChange = (v: string) => setRelationship(v);
  const onSituationChange = (v: string) => setSituation(v);

  const [input, setInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Fetch models on mount
  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    fetchModels().then((fetched) => {
      if (!cancelled) {
        setModels(fetched);
        setModelsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Send handler
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, sendMessage]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Model display name (truncate for sidebar)
  const modelDisplayName = (m: string) => {
    const parts = m.split("/");
    return parts[parts.length - 1] || m;
  };

  return (
    <div className="theme-corporate">
      {/* Mobile sidebar overlay */}
      <div
        className={`corp-sidebar-overlay ${sidebarOpen ? "corp-sidebar-overlay-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Dark Sidebar ────────────────────────── */}
      <aside
        className={`corp-sidebar ${sidebarOpen ? "corp-sidebar-open" : ""}`}
      >
        <div className="corp-sidebar-header">
          <span className="corp-sidebar-logo">Reflect</span>
        </div>

        <div className="corp-sidebar-body">
          {/* Navigation / Modes */}
          <div className="corp-sidebar-section">
            <div className="corp-sidebar-section-label">Modules</div>
            <div className="corp-nav-list">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  className={`corp-nav-item ${activeModeId === mode.id ? "corp-nav-active" : ""}`}
                  onClick={() => {
                    onModeChange(mode.id);
                    setSidebarOpen(false);
                  }}
                  title={mode.description}
                >
                  <span className="corp-nav-icon">{mode.icon}</span>
                  <span className="corp-nav-label">{mode.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="corp-sidebar-section">
            <div className="corp-sidebar-section-label">Configuration</div>

            <div className="corp-sidebar-field">
              <label className="corp-sidebar-field-label">Relationship</label>
              <input
                type="text"
                className="corp-sidebar-input"
                value={relationship}
                onChange={(e) => onRelationshipChange(e.target.value)}
                placeholder="e.g. Manager, Partner, Friend"
              />
            </div>

            <div className="corp-sidebar-field">
              <label className="corp-sidebar-field-label">Situation</label>
              <textarea
                className="corp-sidebar-textarea"
                value={situation}
                onChange={(e) => onSituationChange(e.target.value)}
                placeholder="Describe the context..."
                rows={3}
              />
            </div>

            <div className="corp-sidebar-field">
              <label className="corp-sidebar-field-label">
                Email Tone
                {!isEmailMode && (
                  <span className="corp-field-hint"> — select Email module to enable</span>
                )}
              </label>
              <ToneMultiselect
                options={TONE_OPTIONS}
                selected={selectedTones}
                onChange={setSelectedTones}
                disabled={!isEmailMode}
              />
            </div>

            <div className="corp-sidebar-field">
              <label className="corp-sidebar-field-label">Model</label>
              <select
                className="corp-sidebar-select"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={modelsLoading}
              >
                {modelsLoading && <option value="">Loading models...</option>}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {modelDisplayName(m)}
                  </option>
                ))}
                {!modelsLoading && !models.find((m) => m === model) && (
                  <option value={model}>{modelDisplayName(model)}</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────── */}
      <div className="corp-main">
        {/* Header Bar */}
        <header className="corp-header">
          <div className="corp-header-left">
            <button
              className="corp-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <nav className="corp-breadcrumb">
              <span className="corp-breadcrumb-item">
                <span
                  className="corp-breadcrumb-link"
                  style={{ cursor: "default" }}
                >
                  Reflect
                </span>
              </span>
              <span className="corp-breadcrumb-sep">›</span>
              <span className="corp-breadcrumb-current">
                {activeMode?.title ?? "Select Module"}
              </span>
            </nav>
          </div>

          <div className="corp-header-right">
            <span
              className="corp-font-mono"
              style={{
                fontSize: "10px",
                color: "var(--corp-text-dim)",
                marginRight: "4px"
              }}
            >
              {modelDisplayName(model)}
            </span>
            {messages.length > 0 && (
              <button
                className="corp-header-btn corp-header-btn-danger"
                onClick={clearChat}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="corp-chat-area">
          {messages.length === 0 ? (
            <EmptyState
              activeMode={activeMode}
              model={model}
              modelDisplayName={modelDisplayName}
            />
          ) : (
            <div className="corp-messages-scroll" ref={messagesScrollRef}>
              <div className="corp-messages-container">
                {messages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="corp-input-area">
            <div className="corp-input-container">
              <form onSubmit={handleSubmit} className="corp-input-row">
                <textarea
                  ref={textareaRef}
                  className="corp-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeMode
                      ? `Message — ${activeMode.title}...`
                      : "Type your message..."
                  }
                  rows={1}
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    className="corp-stop-btn"
                    onClick={stopStreaming}
                  >
                    ■ Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="corp-send-btn"
                    disabled={!input.trim()}
                  >
                    Send →
                  </button>
                )}
              </form>
              <div className="corp-input-footer">
                <span className="corp-char-count">{input.length} chars</span>
                <span className="corp-input-hint">
                  Shift+Enter for new line
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Item ───────────────────────────────────────────

interface MessageItemProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
  };
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`corp-message ${isUser ? "corp-message-user" : "corp-message-assistant"}`}
    >
      <div
        className={`corp-message-card ${isUser ? "corp-message-card-user" : "corp-message-card-assistant"}`}
      >
        <div className="corp-message-header">
          <span
            className={`corp-message-role ${isUser ? "corp-message-role-user" : "corp-message-role-assistant"}`}
          >
            {isUser ? "You" : "Assistant"}
          </span>
          <span
            className={`corp-message-time ${isUser ? "corp-message-time-user" : "corp-message-time-assistant"}`}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div
          className={`corp-message-content ${isUser ? "corp-message-content-user" : ""}`}
        >
          {isUser ? (
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
        {message.isStreaming && (
          <div className="corp-streaming">
            <span className="corp-streaming-dot" />
            <span className="corp-streaming-dot" />
            <span className="corp-streaming-dot" />
            <span className="corp-streaming-label">generating</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tone Multiselect Dropdown ──────────────────────────────

interface ToneMultiselectProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled: boolean;
}

function ToneMultiselect({ options, selected, onChange, disabled }: ToneMultiselectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const toggle = (tone: string) => {
    if (selected.includes(tone)) {
      onChange(selected.filter((t) => t !== tone));
    } else {
      onChange([...selected, tone]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const summary =
    selected.length === 0
      ? "Select tones..."
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`;

  return (
    <div
      className={`corp-multiselect ${disabled ? "corp-multiselect-disabled" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="corp-multiselect-trigger"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`corp-multiselect-value ${selected.length === 0 ? "corp-multiselect-placeholder" : ""}`}>
          {summary}
        </span>
        <span className="corp-multiselect-indicators">
          {selected.length > 0 && !disabled && (
            <span className="corp-multiselect-clear" onClick={clearAll} title="Clear all">
              ✕
            </span>
          )}
          <span className={`corp-multiselect-chevron ${open ? "corp-multiselect-chevron-open" : ""}`}>
            ‹
          </span>
        </span>
      </button>

      {open && !disabled && (
        <div className="corp-multiselect-dropdown" role="listbox" aria-multiselectable="true">
          {options.map((tone) => {
            const isSelected = selected.includes(tone);
            return (
              <button
                key={tone}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`corp-multiselect-option ${isSelected ? "corp-multiselect-option-selected" : ""}`}
                onClick={() => toggle(tone)}
              >
                <span className="corp-multiselect-check">
                  {isSelected ? "✓" : ""}
                </span>
                <span>{tone}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

interface EmptyStateProps {
  activeMode: PromptMode | null;
  model: string;
  modelDisplayName: (m: string) => string;
}

function EmptyState({ activeMode, model, modelDisplayName }: EmptyStateProps) {
  return (
    <div className="corp-empty">
      <div className="corp-empty-icon">💼</div>
      <div className="corp-empty-title">
        {activeMode ? activeMode.title : "Reflect — Communication Workspace"}
      </div>
      <div className="corp-empty-desc">
        {activeMode
          ? activeMode.description
          : "Select a module from the sidebar to begin a structured self-reflection session."}
      </div>
      <div className="corp-empty-meta">
        <div className="corp-empty-meta-item">
          <span className="corp-empty-meta-dot" />
          <span>Model: {modelDisplayName(model)}</span>
        </div>
        {activeMode && (
          <div className="corp-empty-meta-item">
            <span className="corp-empty-meta-dot" />
            <span>Module: {activeMode.title}</span>
          </div>
        )}
        <div className="corp-empty-meta-item">
          <span className="corp-empty-meta-dot" />
          <span>Session: {formatTimestamp(new Date())}</span>
        </div>
      </div>
    </div>
  );
}
