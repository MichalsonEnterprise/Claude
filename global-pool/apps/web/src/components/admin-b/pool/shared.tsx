'use client';

import { formatCountdown } from '@gp/shared/format';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoundHistory, usePoolOverview } from '@/lib/api/admin-b';

import { roundLabel } from '../primitives';

/** Round picker (?round=1248) for the per-round pool pages; defaults to the current round. */
export function useRoundParam(fallback: number | null): [number | null, (n: number) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const raw = sp.get('round');
  const n = raw && /^\d+$/.test(raw) ? Number(raw) : fallback;
  const set = React.useCallback(
    (v: number) => {
      const p = new URLSearchParams(sp.toString());
      p.set('round', String(v));
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, sp],
  );
  return [n, set];
}

export function RoundPicker({
  value,
  onChange,
  include = 'all',
}: {
  value: number | null;
  onChange: (n: number) => void;
  include?: 'all' | 'settled' | 'cancelled';
}) {
  const overview = usePoolOverview();
  const history = useRoundHistory({
    page: 1,
    pageSize: 30,
    status: include === 'all' ? undefined : include,
  });
  const options = [
    ...(include === 'all' && overview.data?.round
      ? [
          {
            number: overview.data.round.number,
            label: `${overview.data.round.numberLabel} · ${overview.data.round.statusLabel}`,
          },
        ]
      : []),
    ...(history.data?.items ?? []).map((r) => ({
      number: r.number,
      label: `${roundLabel(r.number)} · ${r.statusLabel}`,
    })),
  ].filter((o, i, all) => all.findIndex((x) => x.number === o.number) === i);
  return (
    <Select value={value ? String(value) : undefined} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full tablet:w-56" aria-label="Round" size="s">
        <SelectValue placeholder="Choose a round" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.number} value={String(o.number)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Countdown from the server's clock (never a fake timer): serverNow + elapsed since the response. */
export function ServerCountdown({
  closesAt,
  serverNow,
  receivedAt,
}: {
  closesAt: string;
  serverNow: string;
  receivedAt: number;
}) {
  const [tick, setTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const now = new Date(new Date(serverNow).getTime() + (tick - receivedAt));
  const done = now.getTime() >= new Date(closesAt).getTime();
  return (
    <span className="font-mono tabular-nums" aria-live="off">
      {done ? 'Closed' : formatCountdown(closesAt, now)}
    </span>
  );
}
