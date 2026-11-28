import type { ReactNode } from 'react';

import { RealityCheckHost } from '@/components/rg-history/reality-check';
import { AppShell } from '@/components/shell/app-shell';

/** Player app route group: every page inside renders in the casino shell (sidebar, top bar, footer). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      {/* USR-RG5: activity heartbeat + reality-check reminder at the player's interval (API data source only). */}
      <RealityCheckHost />
    </AppShell>
  );
}
