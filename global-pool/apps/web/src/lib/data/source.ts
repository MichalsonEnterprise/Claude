/**
 * Data source switch for the web data layer (src/lib/data/*).
 *
 * `mock` (default) — every fetcher resolves DEMO data from @gp/shared/demo (+ the homepage DEMO extras in
 * ./mock-home.ts). Works offline, on the server (prefetch) and in the browser.
 * `api` — fetchers call the NestJS API (NEXT_PUBLIC_API_URL) where an endpoint exists; resources the API does
 * not serve yet stay on the mock (marked `// api: not yet` in ./queries.ts).
 *
 * Set NEXT_PUBLIC_DATA_SOURCE=api at build time to switch. Values are inlined by Next.js, so each variable is
 * read with a literal `process.env.NEXT_PUBLIC_…` access.
 */
import { publicEnv } from '@/lib/env';

export type DataSource = 'mock' | 'api';

export const DATA_SOURCE: DataSource =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** GET a JSON resource from the API. Errors use the shared error envelope's `message` when present. */
export async function apiGet<T>(path: string, init?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(`${publicEnv.apiUrl}${path}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: init?.signal,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body.error?.message ?? body.message ?? message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, path, message);
  }
  return (await res.json()) as T;
}

/**
 * Resolve a mock value. A structured clone keeps cached query data independent from the shared DEMO constants
 * (callers can never mutate @gp/shared/demo by accident). No artificial latency — SSR prefetch stays instant.
 */
export function mockResolve<T>(value: T): Promise<T> {
  return Promise.resolve(structuredClone(value));
}
