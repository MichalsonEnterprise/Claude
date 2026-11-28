import type { ReactNode } from 'react';

import { AdminConsoleGate } from '@/components/admin-a/console-gate';

/** Every admin page except sign-in: session guard + admin shell (sidebar 248, top bar, ⌘K, timeout). */
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminConsoleGate>{children}</AdminConsoleGate>;
}
