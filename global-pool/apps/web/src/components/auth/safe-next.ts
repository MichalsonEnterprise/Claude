/** Fixed, never-navigated base used only to resolve `next` and compare origins (server- and client-safe). */
const BASE = 'http://next.invalid';

/**
 * Only same-origin relative paths are accepted as `next` (no open redirects). Server- and client-safe.
 * Control characters, whitespace and backslashes are rejected outright: the WHATWG URL parser strips TAB / LF / CR
 * (so `/\t/evil.example` becomes `//evil.example`) and treats `\` as `/`. Whatever survives is resolved against a
 * fixed origin and must stay on it; the normalised path + query + hash is returned.
 */
export function safeNext(raw: string | null | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex -- control characters are exactly what this rejects
  if (!raw || /[\u0000-\u001F\u007F\s\\]/.test(raw)) return undefined;
  if (!raw.startsWith('/') || raw.startsWith('//')) return undefined;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return undefined;
  }
  if (url.origin !== BASE) return undefined;
  // Dot segments can turn a path that passed every check into a protocol-relative URL once normalised
  // ('/.//evil.example' → '//evil.example', also '/..//x', '/pool/..//x', '/%2e//x'): the result must itself still be
  // a same-origin path, or a browser resolving it later leaves the site (R36).
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return undefined;
  return path;
}

/** Admin variant: a safe `next` that also stays inside the admin console (`/admin`, `/admin/…`). */
export function safeAdminNext(raw: string | null | undefined): string | undefined {
  const next = safeNext(raw);
  return next && /^\/admin(?:[/?#]|$)/.test(next) ? next : undefined;
}
