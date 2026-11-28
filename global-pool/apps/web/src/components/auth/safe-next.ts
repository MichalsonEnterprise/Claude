/** Only same-origin relative paths are accepted as `next` (no open redirects). Server- and client-safe. */
export function safeNext(raw: string | null | undefined): string | undefined {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\'))
    return undefined;
  return raw;
}
