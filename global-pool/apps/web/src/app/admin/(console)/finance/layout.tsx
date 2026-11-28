import type { ReactNode } from 'react';

/** admin-b module pages; the module sub-navigation is rendered under each page header (ModuleHeader). */
export default function ModuleLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-5">{children}</div>;
}
