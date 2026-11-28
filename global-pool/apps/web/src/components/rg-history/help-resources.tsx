'use client';

import {
  ChevronRight,
  ExternalLink,
  Globe,
  Heart,
  Info,
  ListChecks,
  MessageSquare,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { SelfCheckDialog } from './self-check';
import { IconTile } from './ui';

const RESOURCES = [
  {
    name: 'Gambling Therapy',
    detail: 'Free online support and live chat in 30+ languages',
    url: 'https://www.gamblingtherapy.org',
    host: 'gamblingtherapy.org',
    icon: Globe,
  },
  {
    name: 'Gamblers Anonymous',
    detail: 'Peer support meetings worldwide',
    url: 'https://gamblersanonymous.org',
    host: 'gamblersanonymous.org',
    icon: Users,
  },
  {
    name: 'GamCare',
    detail: 'Helpline and live chat (UK)',
    url: 'https://www.gamcare.org.uk',
    host: 'gamcare.org.uk',
    icon: MessageSquare,
  },
];

/** RG/Help Resources — real help organisations (no DEMO values), self-assessment, support. */
export function HelpResources({
  className,
  region = 'Portugal',
}: {
  className?: string;
  region?: string;
}) {
  const [checkOpen, setCheckOpen] = React.useState(false);
  return (
    <Card padding="l" className={cn('gap-5', className)}>
      <div className="flex items-start gap-3">
        <IconTile icon={Heart} tone="default" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-h5 text-text-primary">Support is available</h2>
            <AgeBadge />
          </div>
          <p className="text-body-s text-text-secondary">
            Free, confidential help with gambling — 24/7 and in many languages. Talking to someone
            early helps.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {RESOURCES.map((r) => (
          <li key={r.name}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-md border border-border-subtle bg-surface-raised/40 p-3 transition-colors hover:bg-surface-hover"
            >
              <r.icon aria-hidden className="size-[18px] shrink-0 text-icon-muted" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-s-strong text-text-primary">{r.name}</span>
                <span className="text-caption text-text-secondary">{r.detail}</span>
                <span className="font-mono text-mono-s text-text-tertiary">{r.host}</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0 text-icon-muted" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setCheckOpen(true)}
        className="flex min-h-11 items-center gap-3 rounded-md bg-bg-secondary p-3 text-left transition-colors hover:bg-surface-hover"
      >
        <ListChecks aria-hidden className="size-[18px] shrink-0 text-icon-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-s-strong text-text-primary">
            Take a 2-minute self-assessment
          </span>
          <span className="text-caption text-text-tertiary">
            9 private questions · results stay on your device
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 text-icon-muted" />
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="m">
          <Link href="/support">
            <MessageSquare aria-hidden />
            Talk to support
          </Link>
        </Button>
        <Button asChild size="m" variant="ghost">
          <Link href="/responsible-gaming/deposit-limits">
            <SlidersHorizontal aria-hidden />
            Set limits
          </Link>
        </Button>
      </div>
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        GLOBAL POOL is for adults 18+ in permitted jurisdictions only. Play for entertainment, never
        to make money. Resources shown for your region ({region}); more in Responsible gaming →
        Help.
      </p>
      <SelfCheckDialog open={checkOpen} onOpenChange={setCheckOpen} />
    </Card>
  );
}
