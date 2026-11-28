'use client';

import * as React from 'react';

import { useAuth } from '@/lib/auth';

import { CrashLiveClient, type CrashLiveState } from './live-client';

/**
 * One live `/crash` connection per mounted game screen. Re-authenticates when the player signs in or out, so the
 * socket always carries the current player token (bets need it; watching does not).
 */
export function useCrashLive(): { live: CrashLiveState; client: CrashLiveClient } {
  const auth = useAuth();
  const tokenRef = React.useRef(auth.getAccessToken);
  tokenRef.current = auth.getAccessToken;
  const [client] = React.useState(
    () => new CrashLiveClient(() => (tokenRef.current ? tokenRef.current() : Promise.resolve(null))),
  );

  React.useEffect(() => {
    client.start();
    return () => client.stop();
  }, [client]);

  const status = auth.status;
  const first = React.useRef(true);
  React.useEffect(() => {
    if (status === 'loading') return;
    if (first.current) {
      first.current = false;
      void client.loadMine();
      // the socket may have connected before the session was ready: make sure it carries the player token
      if (status === 'member') void client.ensureAuth();
      return;
    }
    client.reauth();
  }, [status, client]);

  const live = React.useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  return { live, client };
}

/**
 * Server "now" (client epoch ms + measured offset), re-rendered every `stepMs` while `active` — drives the betting
 * countdown and "next round in …" from the SERVER's absolute times (never a fake timer).
 */
export function useServerNow(offsetMs: number, active: boolean, stepMs = 100): number {
  const [now, setNow] = React.useState(() => Date.now() + offsetMs);
  React.useEffect(() => {
    setNow(Date.now() + offsetMs);
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now() + offsetMs), stepMs);
    return () => window.clearInterval(id);
  }, [offsetMs, active, stepMs]);
  return now;
}
