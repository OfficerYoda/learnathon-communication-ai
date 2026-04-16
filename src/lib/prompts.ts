export interface PromptMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }
  return { meta, body: match[2] };
}

// Auto-discover all .md files in src/prompts/ at build time
const promptFiles = import.meta.glob('/src/prompts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export function loadPromptModes(): PromptMode[] {
  const modes: PromptMode[] = [];

  for (const [path, raw] of Object.entries(promptFiles)) {
    const filename = path.split('/').pop()?.replace('.md', '') ?? 'unknown';
    const { meta, body } = parseFrontmatter(raw);

    modes.push({
      id: filename,
      title: meta.title || filename.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: meta.description || '',
      icon: meta.icon || '📝',
      content: body.trim(),
    });
  }

  // Sort alphabetically by title for consistent ordering
  return modes.sort((a, b) => a.title.localeCompare(b.title));
}
