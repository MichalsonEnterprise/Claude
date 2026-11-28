/**
 * One player-readable description for any error a query or mutation can throw (ERR-02 error matrix). Used by the
 * shared `<ErrorState>` (src/components/ui/error-state.tsx) and every module's QueryError wrapper.
 *
 * Kinds: network (no answer / offline) · timeout · rate-limited (429, with the Retry-After seconds when the API
 * exposes them) · maintenance (503) · server (5xx) · not-found (404) · forbidden (403) · unauthenticated (401) ·
 * validation (400 / 422 VALIDATION_FAILED with field issues) · client (other 4xx business errors — the API's own
 * message is already written for players) · unknown.
 *
 * Copy rules: never show raw transport text ("Failed to fetch", "502 Bad Gateway", "signal is aborted"), never
 * claim nothing happened for a write whose outcome is unknown (that is `isOutcomeUnknown()`'s job), and always
 * say what the player can do next.
 */
import { ApiError } from '@/lib/data/source';

import { ApiRequestError } from './client';
import { ApiNetworkError, ApiTimeoutError } from './transport';

export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'rate-limited'
  | 'maintenance'
  | 'server'
  | 'not-found'
  | 'forbidden'
  | 'unauthenticated'
  | 'validation'
  | 'client'
  | 'unknown';

export interface ErrorDescription {
  kind: ErrorKind;
  title: string;
  description: string;
  /** A retry can help (network, timeout, 429 after the wait, 503, 5xx). */
  retryable: boolean;
  /** 429: seconds to wait before retrying (from Retry-After / details), when known. */
  retryAfterSeconds?: number;
  /** API request id (`X-Request-Id`) for support. */
  reference?: string;
  /** 400 / 422 field issues (path → message). */
  issues?: { path: string; message: string }[];
}

/** Minimum wait before a retry after a 429 when the API did not say how long (seconds). */
export const DEFAULT_RATE_LIMIT_WAIT_SECONDS = 10;

const isAbort = (err: unknown) =>
  err instanceof Error && (err.name === 'AbortError' || err.name === 'CancelledError');

function retryAfterOf(err: ApiRequestError): number | undefined {
  const raw = err.details?.retryAfterSeconds ?? err.details?.retryAfter;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.ceil(n) : undefined;
}

/** A readable sentence from an API message, or the fallback when it is empty / looks like raw transport text. */
function readable(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/^\d{3}\b|<html|<!doctype|failed to fetch|networkerror|\bundefined\b|\[object/i.test(message))
    return fallback;
  return message;
}

/**
 * @param what  what was being loaded / done, for titles ("your balances", "this page").
 */
export function describeError(err: unknown, what = 'this'): ErrorDescription {
  if (err instanceof ApiNetworkError || (err instanceof TypeError && !(err instanceof ApiError))) {
    return {
      kind: 'network',
      title: 'You seem to be offline',
      description:
        'We couldn’t reach GLOBAL POOL. Check your internet connection and try again — your balance is safe.',
      retryable: true,
    };
  }
  if (err instanceof ApiTimeoutError || (err instanceof Error && err.name === 'TimeoutError')) {
    return {
      kind: 'timeout',
      title: 'This is taking longer than usual',
      description: 'The server didn’t answer in time. Please try again in a moment.',
      retryable: true,
    };
  }
  if (isAbort(err)) {
    return {
      kind: 'network',
      title: `We couldn’t load ${what}`,
      description: 'The request was interrupted. Please try again.',
      retryable: true,
    };
  }
  if (err instanceof ApiError) {
    const req = err instanceof ApiRequestError ? err : undefined;
    const reference = req?.requestId;
    const code = req?.code;
    const status = err.status;
    if (status === 429 || code === 'RATE_LIMITED') {
      const wait = req ? retryAfterOf(req) : undefined;
      return {
        kind: 'rate-limited',
        title: 'Too many requests',
        description:
          wait !== undefined
            ? `You’ve made a lot of requests in a short time. Please wait ${wait} s, then try again.`
            : 'You’ve made a lot of requests in a short time. Please wait a moment, then try again.',
        retryable: true,
        retryAfterSeconds: wait ?? DEFAULT_RATE_LIMIT_WAIT_SECONDS,
        reference,
      };
    }
    if (status === 503 || code === 'SERVICE_UNAVAILABLE') {
      return {
        kind: 'maintenance',
        title: 'Temporarily unavailable',
        description: `${readable(
          code === 'SERVICE_UNAVAILABLE' ? err.message : undefined,
          'This part of GLOBAL POOL is paused for maintenance.',
        ).replace(/\.?$/, '.')} Your balance and entries are safe. Please try again later.`,
        retryable: true,
        reference,
      };
    }
    if (status === 408 || status === 504) {
      return {
        kind: 'timeout',
        title: 'This is taking longer than usual',
        description: 'The server didn’t answer in time. Please try again in a moment.',
        retryable: true,
        reference,
      };
    }
    if (status >= 500) {
      return {
        kind: 'server',
        title: `We couldn’t load ${what}`,
        description:
          'Something went wrong on our side. Please try again in a moment — if it keeps happening, contact support with the reference below.',
        retryable: true,
        reference,
      };
    }
    if (status === 404) {
      return {
        kind: 'not-found',
        title: 'Not found',
        description: readable(
          code && code !== 'HTTP_ERROR' && !/^Cannot (GET|POST)/.test(err.message)
            ? err.message
            : undefined,
          'We couldn’t find what you were looking for. It may have moved or no longer exists.',
        ),
        retryable: false,
        reference,
      };
    }
    if (status === 401) {
      return {
        kind: 'unauthenticated',
        title: 'Please sign in again',
        description: 'Your session has ended. Sign in again to continue.',
        retryable: false,
        reference,
      };
    }
    if (status === 403) {
      return {
        kind: 'forbidden',
        title: 'Not available for your account',
        description: readable(
          code && code !== 'HTTP_ERROR' ? err.message : undefined,
          'You don’t have access to this.',
        ),
        retryable: false,
        reference,
      };
    }
    if (
      code === 'VALIDATION_FAILED' ||
      ((status === 400 || status === 422) && req?.issues?.length)
    ) {
      const issues = (req?.issues ?? []).map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return {
        kind: 'validation',
        title: 'Please check the highlighted details',
        description:
          issues.length > 0
            ? issues.map((i) => i.message).join(' · ')
            : readable(err.message, 'Some details aren’t valid. Please check them and try again.'),
        retryable: false,
        reference,
        issues,
      };
    }
    return {
      kind: 'client',
      title: `We couldn’t complete this`,
      description: readable(
        code && code !== 'HTTP_ERROR' ? err.message : undefined,
        'The request couldn’t be completed. Please check the details and try again.',
      ),
      retryable: false,
      reference,
    };
  }
  return {
    kind: 'unknown',
    title: `We couldn’t load ${what}`,
    description: 'Something went wrong. Please try again.',
    retryable: true,
  };
}

/**
 * TanStack Query `retry` policy for every query: one automatic retry for transient failures (network, timeout,
 * 5xx except 501), never for 4xx — a 429 is not hammered again and a 404 / 403 / validation error cannot heal.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError)
    return error.status >= 500 && error.status !== 501 && error.status !== 503;
  return !isAbort(error);
}

/** The bits of a TanStack query result `failedQueries` needs. */
export interface QueryResultLike {
  data: unknown;
  isError: boolean;
  error: unknown;
  isFetching?: boolean;
  refetch: () => unknown;
}

/**
 * Queries that failed with nothing to show (an error and no cached data) — render an `<ErrorState>` for them
 * instead of their skeleton (a failed query is never "still loading"). `retry` refetches only those.
 */
export function failedQueries(...queries: QueryResultLike[]): {
  failed: boolean;
  error: unknown;
  retry: () => void;
  retrying: boolean;
} {
  const failed = queries.filter((q) => q.isError && q.data === undefined);
  return {
    failed: failed.length > 0,
    error: failed[0]?.error ?? null,
    retry: () => {
      for (const q of failed) void q.refetch();
    },
    retrying: failed.some((q) => q.isFetching === true),
  };
}
