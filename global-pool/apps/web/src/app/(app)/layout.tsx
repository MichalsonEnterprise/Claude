import type { ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';

/** Player app route group: every page inside renders in the casino shell (sidebar, top bar, footer). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
