/**
 * Test helper: does an internal href resolve to a built page under src/app (route groups and `_private` folders
 * skipped, dynamic `[x]` and catch-all `[...x]` segments honoured, /legal/[doc] limited to the known documents)?
 * Used by the "every link resolves" guards (R11 / R57 / R11b / Q09 / Q13).
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { LEGAL_DOC_KEYS } from '@/components/legal/legal-docs';

const APP = path.resolve(import.meta.dirname, '../../src/app');

function pageRoutes(dir = APP, segs: string[] = []): string[][] {
  const out: string[][] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      const isGroup = name.startsWith('(') && name.endsWith(')');
      out.push(...pageRoutes(full, isGroup || name.startsWith('_') ? segs : [...segs, name]));
    } else if (name === 'page.tsx') out.push(segs);
  }
  return out;
}

export const ROUTE_PATTERNS = pageRoutes();

function segments(href: string): string[] {
  return href.split('#')[0]!.split('?')[0]!.split('/').filter(Boolean);
}

/** True when the href is served by a page (a catch-all counts unless `exact` is set). */
export function resolves(href: string, { exact = false }: { exact?: boolean } = {}): boolean {
  const segs = segments(href);
  return ROUTE_PATTERNS.some((r) => {
    if (r.at(-1)?.startsWith('[...')) {
      if (exact) return false;
      const pre = r.slice(0, -1);
      return segs.length > pre.length && pre.every((s, i) => s.startsWith('[') || s === segs[i]);
    }
    if (r.length !== segs.length) return false;
    if (r.includes('[doc]'))
      return segs[0] === 'legal' && (LEGAL_DOC_KEYS as readonly string[]).includes(segs[1]!);
    return r.every((s, i) => s.startsWith('[') || s === segs[i]);
  });
}
