import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved relative to the compiled/executed file so it works both under
// tsx (src/) and node (dist/) — knowledge/ always lives at the project root.
const HERE = fileURLToPath(new URL('.', import.meta.url));
const KNOWLEDGE_DIR = join(HERE, '..', '..', 'knowledge');

interface KnowledgeFile {
  name: string;
  path: string;
  mtimeMs: number;
  content: string;
}

let cache: Map<string, KnowledgeFile> = new Map();

function listKnowledgeFiles(): string[] {
  try {
    return readdirSync(KNOWLEDGE_DIR).filter((f) =>
      ['.md', '.txt', '.json'].includes(extname(f).toLowerCase()),
    );
  } catch {
    return [];
  }
}

/**
 * Loads all knowledge/ files, re-reading any file whose mtime changed since
 * the last load. This is the mechanism that satisfies "if the file changes,
 * the agent uses the new version on the next run" without a restart.
 */
export function loadKnowledgeBase(): KnowledgeFile[] {
  const files = listKnowledgeFiles();
  const next: Map<string, KnowledgeFile> = new Map();

  for (const name of files) {
    const path = join(KNOWLEDGE_DIR, name);
    const stat = statSync(path);
    const cached = cache.get(name);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      next.set(name, cached);
    } else {
      next.set(name, {
        name,
        path,
        mtimeMs: stat.mtimeMs,
        content: readFileSync(path, 'utf-8'),
      });
    }
  }

  cache = next;
  return Array.from(next.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Concatenated knowledge base, formatted for inclusion in an LLM prompt. */
export function knowledgeBaseAsPromptBlock(): string {
  const files = loadKnowledgeBase();
  if (files.length === 0) {
    return '(no knowledge base files found — proceed with maximum caution, avoid any specific product claims)';
  }
  return files
    .map((f) => `### ${f.name}\n\n${f.content.trim()}`)
    .join('\n\n---\n\n');
}
