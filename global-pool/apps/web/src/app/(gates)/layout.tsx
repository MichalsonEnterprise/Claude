import type { ReactNode } from 'react';

/**
 * Compliance gate pages (PUB-21 `/region-unavailable`, PUB-22 exit `/age-restricted`) — focused pages WITHOUT the
 * casino shell: no game navigation, no tab bar (Figma: navigation is blocked). Each page renders its own frame
 * (DEMO bar, logo top bar, licence / RG footer). Outside `(app)` so the shell and the gates never wrap them.
 */
export default function GatesLayout({ children }: { children: ReactNode }) {
  return children;
}
