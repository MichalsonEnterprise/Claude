'use client';

import { CLIENT_SEED_PATTERN } from '@gp/shared/fair';
import { formatDateTimeUTC } from '@gp/shared/format';
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  classifyGameError,
  useRotateSeed,
  useSeeds,
  type SeedPairView,
  type SeedsView,
} from '@/lib/api/games';
import { cn } from '@/lib/utils';

export function shortHash(h: string | null | undefined, head = 6, tail = 4): string {
  if (!h) return '—';
  return h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`;
}

export function CopyValue({ value, label, className }: { value: string; label: string; className?: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <IconButton
      label={done ? `${label} copied` : `Copy ${label}`}
      size="s"
      className={cn('min-h-11 min-w-11 tablet:min-h-8 tablet:min-w-8', className)}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          },
          () => undefined,
        );
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
    </IconButton>
  );
}

/** One monospaced seed line with a copy button. */
export function SeedLine({
  label,
  value,
  display,
  className,
}: {
  label: string;
  value: string | null;
  display?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-caption text-text-tertiary">{label}</span>
      <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-border-subtle bg-bg-secondary pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-mono-s text-text-primary" title={value ?? undefined}>
          {display ?? value ?? '—'}
        </span>
        {value && <CopyValue value={value} label={label.toLowerCase()} />}
      </div>
    </div>
  );
}

/**
 * Game/Seed Display: the commitment shown BEFORE play (server seed hash), the player's client seed and the next
 * nonce. "Seeds" opens {@link SeedsDialog} to change the client seed or rotate (reveals the server seed).
 */
export function SeedDisplay({
  slug,
  disabled = false,
  className,
  open: openProp,
  onOpenChange,
}: {
  slug: string;
  /** A round is in progress: rotation is refused by the server, so the button is disabled. */
  disabled?: boolean;
  className?: string;
  /** Controlled dialog (e.g. the header's "Provably fair" action opens it). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const seeds = useSeeds(slug);
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const a = seeds.data?.active;
  return (
    <section
      aria-labelledby={`seeds-${slug}`}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck aria-hidden className="size-5 text-icon-brand" />
        <h2 id={`seeds-${slug}`} className="text-h5 text-text-primary">
          Your seeds
        </h2>
        <DemoBadge size="xs" />
        <Button
          variant="secondary"
          size="s"
          className="ml-auto min-h-11 tablet:min-h-8"
          onClick={() => setOpen(true)}
          leadingIcon={<KeyRound aria-hidden />}
        >
          Change seeds
        </Button>
      </div>
      {seeds.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : a ? (
        <div className="grid grid-cols-1 gap-3 laptop:grid-cols-[1fr_1fr_auto]">
          <SeedLine label="Server seed hash (committed)" value={a.serverSeedHash} display={shortHash(a.serverSeedHash, 10, 6)} />
          <SeedLine label="Client seed" value={a.clientSeed} />
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-tertiary">Next nonce</span>
            <span className="flex min-h-10 items-center rounded-md border border-border-subtle bg-bg-secondary px-3 font-mono text-mono-s text-text-primary">
              {a.nonce}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-body-s text-text-secondary">Sign in to see your seed pair.</p>
      )}
      <p className="text-caption text-text-tertiary">
        The server seed hash is fixed before you bet. Rotate to reveal the server seed and verify every bet made with
        it.
      </p>
      <SeedsDialog slug={slug} open={open} onOpenChange={setOpen} data={seeds.data} disabled={disabled} />
    </section>
  );
}

function RevealedRow({ p }: { p: SeedPairView }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-text-tertiary">
        <span>
          {p.bets} bet{p.bets === 1 ? '' : 's'} · ended {p.endedAt ? `${formatDateTimeUTC(p.endedAt)}` : '—'}
        </span>
        <DemoBadge size="xs" />
      </div>
      <SeedLine label="Server seed (revealed)" value={p.serverSeed} display={shortHash(p.serverSeed, 10, 6)} />
      <SeedLine label="Hash (was committed)" value={p.serverSeedHash} display={shortHash(p.serverSeedHash, 10, 6)} />
      <SeedLine label="Client seed" value={p.clientSeed} />
    </li>
  );
}

/** Rotate / change client seed (reveals the current server seed and commits a new one). */
export function SeedsDialog({
  slug,
  open,
  onOpenChange,
  data,
  disabled = false,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SeedsView | undefined;
  disabled?: boolean;
}) {
  const rotate = useRotateSeed(slug);
  const [client, setClient] = React.useState('');
  React.useEffect(() => {
    if (open) setClient(data?.active.clientSeed ?? '');
  }, [open, data?.active.clientSeed]);
  const valid = CLIENT_SEED_PATTERN.test(client);
  const changed = client !== data?.active.clientSeed;

  const act = async (clientSeed?: string) => {
    try {
      const r = await rotate.mutateAsync(clientSeed);
      toast({
        type: 'success',
        title: 'Seed pair rotated',
        description: `Server seed ${shortHash(r.revealed.serverSeed)} revealed — new hash ${shortHash(r.active.serverSeedHash)} committed.`,
      });
    } catch (err) {
      const e = classifyGameError(err);
      toast({
        type: 'error',
        title: 'Could not change seeds',
        description: e.kind === 'round_in_progress' ? 'Finish the round in progress first.' : e.message,
      });
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="l"
      title="Seeds & fairness"
      description="Your results come from the server seed (hash shown before you bet), your client seed and the nonce."
    >
      <Tabs defaultValue="active" className="flex flex-col gap-4">
        <TabsList variant="segmented">
          <TabsTrigger value="active">Active pair</TabsTrigger>
          <TabsTrigger value="revealed" count={data?.revealed.length}>
            Revealed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="flex flex-col gap-4">
          {data ? (
            <>
              <SeedLine label="Server seed hash (committed)" value={data.active.serverSeedHash} />
              <div className="grid grid-cols-2 gap-3">
                <SeedLine label="Next nonce" value={String(data.active.nonce)} />
                <SeedLine label="Bets with this pair" value={String(data.active.bets)} />
              </div>
              <Field
                label="Client seed"
                helper="1–64 letters, digits, dot, dash or underscore. Changing it reveals the current server seed."
                error={client && !valid ? 'Use 1–64 letters, digits, dot, dash or underscore.' : undefined}
              >
                <Input
                  size="l"
                  value={client}
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setClient(e.target.value.trim())}
                  className="font-mono"
                />
              </Field>
              <div className="flex flex-col gap-2 tablet:flex-row">
                <Button
                  onClick={() => void act(client)}
                  disabled={disabled || !valid || !changed}
                  loading={rotate.isPending && rotate.variables !== undefined}
                  leadingIcon={<KeyRound aria-hidden />}
                >
                  Use this client seed
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void act(undefined)}
                  disabled={disabled}
                  loading={rotate.isPending && rotate.variables === undefined}
                  leadingIcon={<RefreshCw aria-hidden />}
                >
                  Rotate server seed
                </Button>
              </div>
              {disabled && (
                <p role="status" className="text-caption text-text-warning">
                  Finish the round in progress to change seeds.
                </p>
              )}
              <p className="text-caption text-text-tertiary">
                Nothing here can change a result — rotating only reveals the old server seed so you can verify it.
              </p>
            </>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </TabsContent>
        <TabsContent value="revealed">
          {data?.revealed.length ? (
            <ul className="flex flex-col gap-3">
              {data.revealed.slice(0, 10).map((p) => (
                <RevealedRow key={p.id} p={p} />
              ))}
            </ul>
          ) : (
            <p className="text-body-s text-text-secondary">
              No revealed seeds yet. Rotate your seed pair to reveal the server seed and verify past bets.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </ResponsiveModal>
  );
}
