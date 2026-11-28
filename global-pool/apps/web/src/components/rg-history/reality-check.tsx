'use client';

import type { RealityCheckAction, RgSessionView } from '@gp/shared/schemas';
import { REALITY_CHECK_INTERVALS } from '@gp/shared/limits';
import { formatTimeUTC } from '@gp/shared/format';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, Clock, History, PauseCircle, Play, Timer } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { SwitchField } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { rgApi, rgKeys, useRgHistory, useRgMutation } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { DATA_SOURCE } from '@/lib/data/source';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { minutesLabel, shortDateTime, signed, toneOf } from './format';
import { HelpResources } from './help-resources';
import { RG_BASE, RgPage } from './rg-common';
import { Bullet, CardHead, Chip, Columns, KV } from './ui';

const ACTIONS: { action: RealityCheckAction; label: string; icon: typeof Play }[] = [
  { action: 'continue', label: 'Continue playing', icon: Play },
  { action: 'history', label: 'View history', icon: History },
  { action: 'break', label: 'Take a break', icon: PauseCircle },
];

/** RG/Reality Check content: time played + net result + three EQUAL choices (no close icon, nothing highlighted). */
export function RealityCheckCard({
  minutes,
  net,
  intervalMinutes,
  onChoose,
  busy,
  preview = false,
  titleAs: TitleAs = 'h2',
  descriptionAs: DescAs = 'p',
}: {
  minutes: number;
  net: string;
  intervalMinutes: number;
  onChoose?: (a: RealityCheckAction) => void;
  busy?: RealityCheckAction | null;
  preview?: boolean;
  titleAs?: React.ElementType;
  descriptionAs?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-tint text-icon-brand">
          <Bell aria-hidden className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <TitleAs className="text-h4 text-text-primary">
            You have been playing for {minutesLabel(minutes)}
          </TitleAs>
          <DescAs className="text-body-s text-text-secondary">
            Your game is paused. The round in progress has been settled.
          </DescAs>
        </div>
      </div>
      <div className="rounded-lg bg-surface-raised px-4">
        <KV label="Time this session" value={minutesLabel(minutes)} demo={false} />
        <KV
          label="Net result this session"
          value={`${signed(net)} USDT`}
          valueClassName={toneOf(net)}
          divider={false}
          demo={preview}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
        {ACTIONS.map((a) => (
          <Button
            key={a.action}
            variant="secondary"
            size="l"
            block
            disabled={preview || (busy !== null && busy !== undefined)}
            loading={busy === a.action}
            onClick={() => onChoose?.(a.action)}
            leadingIcon={<a.icon aria-hidden />}
          >
            {a.label}
          </Button>
        ))}
      </div>
      <p className="text-caption text-text-tertiary">
        Next reminder in {minutesLabel(intervalMinutes)}. Change the interval in Responsible gaming
        → Reality checks.
      </p>
    </div>
  );
}

/**
 * App-wide reality-check host (mounted in the player layout). While the player is actually playing (visible tab on a
 * Global Pool / game page with recent input) it sends an activity heartbeat every 60 s — this drives the server-side
 * time limits — and it opens the reminder whenever the server says it is due, at the interval the player configured,
 * on any page. Runs only against the real API (NEXT_PUBLIC_DATA_SOURCE=api).
 */
const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
const PLAY_PREFIXES = ['/pool', '/games', '/casino', '/originals'];
/** Routes where time counts as play (Global Pool, games). Browsing account / wallet / history pages does not. */
export function isPlayRoute(pathname: string | null): boolean {
  return !!pathname && PLAY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function RealityCheckHost() {
  const { status } = useAuth();
  const enabled = status === 'member' && DATA_SOURCE === 'api';
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useMediaQuery(MQ.tablet, true);
  const [session, setSession] = React.useState<RgSessionView | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<RealityCheckAction | null>(null);

  const playing = isPlayRoute(pathname);
  const playingRef = React.useRef(playing);
  playingRef.current = playing;

  React.useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let dueTimer: number | undefined;
    let lastInput = 0;
    const onInput = () => {
      lastInput = Date.now();
    };
    const apply = (s: RgSessionView) => {
      if (stopped) return;
      setSession(s);
      qc.setQueryData(rgKeys.session, s);
      window.clearTimeout(dueTimer);
      if (s.realityCheck.due) setOpen(true);
      else if (s.realityCheck.nextAt) {
        const ms = new Date(s.realityCheck.nextAt).getTime() - Date.now();
        if (ms > 0 && ms < 2 ** 31 - 1) dueTimer = window.setTimeout(() => void check(), ms + 500);
      }
    };
    // Read-only: is a reminder due (the session may have been started on another device)?
    const check = async () => {
      try {
        apply(await rgApi.session());
      } catch {
        /* offline / signed out */
      }
    };
    // Play time = a visible tab on a game / Global Pool page with real input in the last 90 s.
    const beat = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!playingRef.current || Date.now() - lastInput > 90_000) return;
      try {
        apply(await rgApi.heartbeat());
      } catch {
        /* the next heartbeat retries */
      }
    };
    void check();
    const id = window.setInterval(() => void beat(), 60_000);
    const onVis = () => void check();
    const opts = { passive: true, capture: true } as const;
    for (const ev of INPUT_EVENTS) window.addEventListener(ev, onInput, opts);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      window.clearInterval(id);
      window.clearTimeout(dueTimer);
      for (const ev of INPUT_EVENTS) window.removeEventListener(ev, onInput, opts);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, qc]);

  const choose = async (action: RealityCheckAction) => {
    setBusy(action);
    try {
      await rgApi.ack(action);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: rgKeys.all });
      if (action === 'history' && pathname !== '/history/transactions')
        router.push('/history/transactions');
      if (action === 'break') router.push(`${RG_BASE}/cooling-off`);
    } catch {
      toast({
        type: 'error',
        title: 'Could not record your choice',
        description: 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  };

  if (!enabled || !session) return null;
  const minutes = Math.round(session.durationSeconds / 60);
  const body = (
    <RealityCheckCard
      minutes={minutes}
      net={session.netSession}
      intervalMinutes={session.realityCheck.intervalMinutes}
      onChoose={(a) => void choose(a)}
      busy={busy}
      titleAs={desktop ? DialogTitle : SheetTitle}
      descriptionAs={desktop ? DialogDescription : SheetDescription}
    />
  );
  // No close icon, Escape and outside clicks do nothing: one of the three equal choices is required.
  const block = (e: Event) => e.preventDefault();
  // Focus the panel, not the first choice, so no option looks pre-selected (three EQUAL choices).
  const focusPanel = (e: Event) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement | null)?.focus();
  };
  return desktop ? (
    <Dialog open={open}>
      <DialogContent
        size="m"
        showClose={false}
        className="p-6"
        onOpenAutoFocus={focusPanel}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
      >
        {body}
      </DialogContent>
    </Dialog>
  ) : (
    <Sheet open={open}>
      <SheetContent
        side="bottom"
        showClose={false}
        className="px-4 pt-3 pb-8"
        onOpenAutoFocus={focusPanel}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}

// ── RG5 · Reality checks settings ─────────────────────────────────────────────────────────────

export function RgRealityChecks() {
  return (
    <RgPage
      href={`${RG_BASE}/reality-checks`}
      title="Reality checks"
      sub="A short reminder at regular intervals showing how long you have played and your net result, so you can decide whether to keep going."
      mobileSub="A short reminder with your time played and net result."
    >
      {(s) => (
        <RealityBody
          intervalMinutes={s.settings.realityCheckMinutes}
          pause={s.settings.realityCheckPause}
          push={s.settings.realityCheckPush}
          session={s.session}
        />
      )}
    </RgPage>
  );
}

function RealityBody({
  intervalMinutes,
  pause,
  push,
  session,
}: {
  intervalMinutes: number;
  pause: boolean;
  push: boolean;
  session: RgSessionView;
}) {
  const save = useRgMutation(rgApi.realityCheck);
  const history = useRgHistory('reality_checks', 5);
  const update = async (body: {
    intervalMinutes: number;
    pauseGame?: boolean;
    pushNotification?: boolean;
  }) => {
    try {
      await save.mutateAsync(body);
      toast({ type: 'success', title: 'Reminders updated' });
    } catch (e) {
      toast({
        type: 'error',
        title: 'Could not save',
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };
  return (
    <Columns
      main={
        <>
          <Card padding="l" className="gap-5">
            <CardHead
              icon={Bell}
              title="Remind me every"
              sub="Counted from the start of each session, on every device."
              aside={<Chip kind="on">On</Chip>}
            />
            <div role="radiogroup" aria-label="Reminder interval" className="flex flex-wrap gap-2">
              {REALITY_CHECK_INTERVALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={m === intervalMinutes}
                  disabled={save.isPending}
                  onClick={() => m !== intervalMinutes && void update({ intervalMinutes: m })}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full border px-4 text-label-m tablet:min-h-8',
                    m === intervalMinutes
                      ? 'border-brand bg-brand-tint text-text-brand'
                      : 'border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-md bg-surface-raised p-3">
              <Clock aria-hidden className="size-4 shrink-0 text-icon-muted" />
              <p className="flex-1 text-body-s text-text-secondary">
                {session.startedAt && session.realityCheck.nextAt
                  ? `Next reminder at ${formatTimeUTC(session.realityCheck.nextAt)} — this session started at ${formatTimeUTC(session.startedAt)} (${minutesLabel(Math.floor(session.durationSeconds / 60))} ago).`
                  : 'No session in progress. Your first reminder comes one interval after you start playing.'}
              </p>
              <DemoBadge size="xs" />
            </div>
          </Card>
          <Card padding="l" className="gap-5">
            <h2 className="text-h5">Each reminder shows</h2>
            <Bullet
              icon={Timer}
              title="Time played this session"
              body="Shown in hours and minutes, e.g. “60 minutes”."
            />
            <Bullet
              icon={Activity}
              title="Your net result this session"
              body="Winnings minus stakes, entry costs and platform fees, in USDT. Always shown — it cannot be hidden."
            />
            <Bullet
              icon={PauseCircle}
              title="Three equal choices"
              body="Continue playing, view your history, or take a break. No choice is highlighted over another."
            />
            <SwitchField
              checked={pause}
              disabled={save.isPending}
              onCheckedChange={(v) => void update({ intervalMinutes, pauseGame: v })}
              label="Pause the game until I respond"
              description="The round in progress finishes first. Nothing is placed for you while the reminder is open."
            />
            <SwitchField
              checked={push}
              disabled={save.isPending}
              onCheckedChange={(v) => void update({ intervalMinutes, pushNotification: v })}
              label="Also send a push notification"
              description="Only when the app is in the background on your phone."
            />
          </Card>
          <Card padding="l" className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h5">Preview</h2>
              <span className="text-body-s text-text-tertiary">
                This is what you will see over any game
              </span>
            </div>
            <div className="flex justify-center rounded-lg bg-bg-secondary p-4 tablet:p-8">
              <div className="w-full max-w-[448px] rounded-xl border border-border-subtle bg-surface-overlay p-5 shadow-elevation-4">
                <RealityCheckCard
                  preview
                  minutes={intervalMinutes}
                  net={session.netSession}
                  intervalMinutes={intervalMinutes}
                  titleAs="p"
                />
              </div>
            </div>
          </Card>
        </>
      }
      rail={
        <>
          <Card padding="l" className="gap-0">
            <div className="flex items-center gap-3 pb-2">
              <h2 className="flex-1 text-h5">Your recent reminders</h2>
              <DemoBadge size="s" />
            </div>
            {history.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : !history.data?.length ? (
              <p className="py-3 text-body-s text-text-secondary">No reminders answered yet.</p>
            ) : (
              history.data.map((h, i, arr) => (
                <KV
                  key={h.at}
                  label={`${shortDateTime(h.at)} · ${h.detail ?? ''}`}
                  value={h.label}
                  demo={false}
                  divider={i < arr.length - 1}
                />
              ))
            )}
          </Card>
          <HelpResources />
        </>
      }
    />
  );
}
