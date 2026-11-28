import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { DemoBar } from '@/components/ui/demo-badge';

import { DS_SECTIONS } from '../_sections/ds';

export const metadata: Metadata = {
  title: 'Design system',
  description: 'GLOBAL POOL web component catalogue (visual QA, DEMO data).',
  robots: { index: false, follow: false },
};

/** Dev kitchen sink — every component and state, used for visual QA (not linked from the product). */
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <DemoBar />
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border-subtle bg-bg-base/95 px-4 backdrop-blur-md tablet:px-8">
        <Link href="/" aria-label="GLOBAL POOL — lobby">
          <Logo height={32} title="" />
        </Link>
        <span className="hidden text-label-m text-text-secondary tablet:inline">Design system · @gp/web</span>
        <Link href="/design-system/shell" className="ml-auto text-label-m text-text-brand hover:underline">
          Live shell preview →
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-[1440px] gap-10 px-4 py-8 tablet:px-8">
        <nav aria-label="Sections" className="sticky top-24 hidden h-fit w-48 shrink-0 laptop:block">
          <ul className="flex flex-col gap-1">
            {DS_SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-sm px-3 py-1.5 text-body-s text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-12">
          {children}
        </main>
      </div>
    </div>
  );
}
