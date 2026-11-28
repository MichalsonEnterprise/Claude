'use client';

/**
 * API reachability for the player shell (ERR-02 "network error" / offline). Every request that got no answer
 * (`ApiNetworkError`, `ApiTimeoutError` — reported by src/lib/api/transport.ts) or the browser going offline marks
 * the API unreachable; the next response of any kind clears it. Pages keep their own error states — this drives
 * one connection banner, so pages without API data (legal, about, …) still say why figures in the chrome show "—".
 */
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { onApiReachability } from './transport';

/** Re-run every query that is currently failing (the banner's "Try again"). */
export function refetchFailed(qc: QueryClient): Promise<void> {
  return qc.refetchQueries({ predicate: (q) => q.state.status === 'error' });
}

export function useApiConnectivity(): {
  /** The API could not be reached (or the browser is offline). */
  unreachable: boolean;
  offline: boolean;
  retry: () => void;
  retrying: boolean;
} {
  const qc = useQueryClient();
  const [unreachable, setUnreachable] = React.useState(false);
  const [offline, setOffline] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    const off = onApiReachability((reachable) => setUnreachable(!reachable));
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      void refetchFailed(qc);
    };
    setOffline(navigator.onLine === false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      off();
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [qc]);

  const retry = React.useCallback(() => {
    setRetrying(true);
    void refetchFailed(qc).finally(() => setRetrying(false));
  }, [qc]);

  return { unreachable: unreachable || offline, offline, retry, retrying };
}
