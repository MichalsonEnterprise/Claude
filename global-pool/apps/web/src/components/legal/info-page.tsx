import Link from 'next/link';
import type * as React from 'react';

import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

export interface InfoSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export interface InfoLink {
  label: string;
  href: string;
}

/**
 * Plain information page inside the casino shell (legal summaries, support, promotions, "not built yet").
 * Server-component safe. Every page carries the DEMO marker: this build is testnet-only and real money is disabled.
 */
export function InfoPage({
  crumb,
  title,
  intro,
  sections = [],
  related = [],
  children,
}: {
  crumb: { label: string; href?: string };
  title: string;
  intro: React.ReactNode;
  sections?: InfoSection[];
  related?: InfoLink[];
  children?: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex w-full max-w-[880px] flex-col gap-6 pb-6">
      <nav aria-label="Breadcrumb" className="text-caption text-text-tertiary">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-text-secondary">
              Lobby
            </Link>
          </li>
          <li aria-hidden>/</li>
          {crumb.href ? (
            <>
              <li>
                <Link href={crumb.href} className="hover:text-text-secondary">
                  {crumb.label}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-text-secondary">
                {title}
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-text-secondary">
              {crumb.label}
            </li>
          )}
        </ol>
      </nav>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-text-primary">{title}</h1>
          <DemoBadge size="m" />
        </div>
        <div className="text-body-m text-text-secondary">{intro}</div>
      </header>
      {children}
      {sections.length > 0 && (
        <Card padding="l" className="gap-6">
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className="flex flex-col gap-2"
            >
              <h2 id={`${s.id}-title`} className="text-h5 text-text-primary">
                {s.title}
              </h2>
              <div className="flex flex-col gap-2 text-body-s text-text-secondary [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-text-primary">
                {s.body}
              </div>
            </section>
          ))}
        </Card>
      )}
      {related.length > 0 && (
        <nav aria-label="Related pages" className="flex flex-wrap gap-x-5 gap-y-2 text-label-m">
          {related.map((l) => (
            <Link key={l.href} href={l.href} className="text-text-brand hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </article>
  );
}

/** Honest "not in this build yet" state for planned routes linked from the navigation. */
export function ComingSoonPage({
  title,
  description,
  alternatives,
}: {
  title: string;
  description: string;
  alternatives: InfoLink[];
}) {
  return (
    <InfoPage
      crumb={{ label: title }}
      title={title}
      intro={
        <p>
          {description} This page is not part of this DEMO build yet — nothing here is hidden from
          you, and nothing is pending on your account.
        </p>
      }
    >
      <Card padding="l" className="gap-3">
        <h2 className="text-h5">Meanwhile</h2>
        <ul className={cn('flex flex-col gap-2 text-body-s')}>
          {alternatives.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="text-text-brand hover:underline">
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </InfoPage>
  );
}
