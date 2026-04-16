import { useState, useEffect } from 'react';
import type { PromptMode } from '../lib/prompts';
import { fetchModels } from '../lib/api';

interface SidebarProps {
  modes: PromptMode[];
  activeModeId: string;
  onModeChange: (id: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  relationship: string;
  onRelationshipChange: (value: string) => void;
  situation: string;
  onSituationChange: (value: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  modes,
  activeModeId,
  onModeChange,
  model,
  onModelChange,
  relationship,
  onRelationshipChange,
  situation,
  onSituationChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    fetchModels().then((models) => {
      setAvailableModels(models);
      setLoadingModels(false);
    });
  }, []);

  const activeMode = modes.find((m) => m.id === activeModeId);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-transition fixed top-0 z-40 flex h-full w-[320px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar-bg)] lg:relative lg:z-auto ${
          isOpen ? 'left-0' : '-left-[320px] lg:left-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🪞</span>
            <span className="font-display text-lg">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md opacity-40 transition-opacity hover:opacity-100 lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Mode Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold tracking-wider uppercase opacity-50">
              Mode
            </label>
            <div className="space-y-1.5">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onModeChange(mode.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    activeModeId === mode.id
                      ? 'bg-[var(--color-accent)]/12 ring-1 ring-[var(--color-accent)]/30'
                      : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{mode.icon}</span>
                    <span
                      className={`text-sm font-medium ${
                        activeModeId === mode.id ? 'text-[var(--color-accent)]' : ''
                      }`}
                    >
                      {mode.title}
                    </span>
                  </div>
                  <p className="mt-1 pl-[30px] text-xs leading-relaxed opacity-45">
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Active mode indicator */}
          {activeMode && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 px-4 py-3">
              <p className="text-[0.688rem] font-medium uppercase tracking-wider opacity-40">
                Active
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {activeMode.icon} {activeMode.title}
              </p>
            </div>
          )}

          {/* Divider */}
          <hr className="border-[var(--color-border)]" />

          {/* Context Fields */}
          <div className="space-y-2.5">
            <label
              htmlFor="relationship"
              className="text-xs font-semibold tracking-wider uppercase opacity-50"
            >
              Relationship with the other party
            </label>
            <input
              id="relationship"
              type="text"
              value={relationship}
              onChange={(e) => onRelationshipChange(e.target.value)}
              placeholder="e.g., colleague, manager, friend, partner..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-35 focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="situation"
              className="text-xs font-semibold tracking-wider uppercase opacity-50"
            >
              Description of the situation
            </label>
            <textarea
              id="situation"
              value={situation}
              onChange={(e) => onSituationChange(e.target.value)}
              placeholder="Provide context about what's happening, the history, emotional stakes, or anything relevant..."
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm leading-relaxed outline-none transition-all placeholder:opacity-35 focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20"
            />
          </div>

          {/* Divider */}
          <hr className="border-[var(--color-border)]" />

          {/* Model Selection */}
          <div className="space-y-2.5">
            <label
              htmlFor="model"
              className="text-xs font-semibold tracking-wider uppercase opacity-50"
            >
              Model
            </label>
            {loadingModels ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                <span className="text-sm opacity-40">Loading models...</span>
              </div>
            ) : (
              <select
                id="model"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[var(--color-border)] px-5 py-3">
          <p className="text-[0.625rem] leading-relaxed opacity-30">
            No data is stored. All conversations and settings are ephemeral and will be lost on page refresh.
          </p>
        </div>
      </aside>
    </>
  );
}
