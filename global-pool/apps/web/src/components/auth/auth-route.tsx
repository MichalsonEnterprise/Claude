'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useAuth } from '@/lib/auth/context';
import { useAuthUi } from '@/lib/auth/ui-context';

import { safeNext } from './safe-next';

export { safeNext };

/**
 * /sign-in, /sign-up and /verify: the lobby renders behind (dimmed) and this opens the GLOBAL POOL auth dialog at
 * the matching view. Dismissing returns to the lobby; signed-in visitors go straight to `next` (or the lobby).
 */
export function AuthRouteOpener({ view }: { view: 'sign-in' | 'sign-up' | 'verify' }) {
  const auth = useAuth();
  const ui = useAuthUi();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const email = params.get('email') ?? undefined;
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (auth.status === 'loading' || opened.current) return;
    opened.current = true;
    if (auth.status === 'member' && !ui.dialog) {
      router.replace(next ?? '/');
      return;
    }
    const intent = view === 'sign-in' ? 'sign-in' : 'sign-up';
    ui.openDialog({ view: intent, intent, next, returnTo: '/', email, syncUrl: true });
  }, [auth.status, ui, router, next, email, view]);

  return null;
}
