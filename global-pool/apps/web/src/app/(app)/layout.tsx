import type { ReactNode } from 'react';

import { ComplianceGate, GateContent } from '@/components/compliance/compliance-gate';
import { RealityCheckHost } from '@/components/rg-history/reality-check';
import { AppShell } from '@/components/shell/app-shell';

/** Player app route group: every page inside renders in the casino shell (sidebar, top bar, footer). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    // PUB-21 / PUB-22: geo interstitial instead of gaming / financial pages for a restricted location, age gate over
    // gambling surfaces for guests (components/compliance). The API enforces the same rules on every request.
    <ComplianceGate>
      <AppShell>
        <GateContent>{children}</GateContent>
        {/* USR-RG5: activity heartbeat + reality-check reminder at the player's interval (API data source only). */}
        <RealityCheckHost />
      </AppShell>
    </ComplianceGate>
  );
}
