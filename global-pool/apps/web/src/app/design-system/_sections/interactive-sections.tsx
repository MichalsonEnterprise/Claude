'use client';

import { DEMO_BALANCES, DEMO_CURRENT_ROUND } from '@gp/shared/demo';
import { add } from '@gp/shared/money';
import type { ChainKey } from '@gp/shared/chains';
import { Mail, MoreHorizontal, Pencil, Search, Trash2, User } from 'lucide-react';
import * as React from 'react';

import { AddressInput } from '@/components/domain/address-input';
import { AmountInput } from '@/components/domain/amount-input';
import { Countdown } from '@/components/domain/countdown';
import { JackpotMeter } from '@/components/domain/jackpot-meter';
import { NetworkSelect } from '@/components/domain/network-select';
import { Alert, type AlertType } from '@/components/ui/alert';
import { Button, IconButton } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Textarea } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInput } from '@/components/ui/password-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ToastCard, toast } from '@/components/ui/sonner';
import { SwitchField } from '@/components/ui/switch';
import {
  DefinitionTooltip,
  InfoTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { DsSection, Specimen } from './ds';

/** DEMO clock for countdowns: the demo sheet's "03:17:42 before the 20:00 UTC close". */
const DEMO_NOW = '2026-11-27T16:42:18Z';

// ── Inputs ─────────────────────────────────────────────────────────────────────────────────────

export function InputsSection() {
  const [email, setEmail] = React.useState('nova.k@example.com');
  const [pw, setPw] = React.useState('Aurora-27!pool');
  const [amount, setAmount] = React.useState('1500.00');
  const [over, setOver] = React.useState('12000');
  const [addr, setAddr] = React.useState('');
  const [addrValid] = React.useState('0x7c4e00000000000000000000000000000000a21d');
  const [otpEmpty, setOtpEmpty] = React.useState('');
  const [otpFill, setOtpFill] = React.useState('482');
  const [otpDone, setOtpDone] = React.useState('482913');
  const [otpErr, setOtpErr] = React.useState('000000');
  const [q, setQ] = React.useState('orbit');
  const [chain, setChain] = React.useState<ChainKey>('arbitrum');

  return (
    <DsSection
      id="inputs"
      title="Inputs"
      description="Field anatomy (label · control · helper / error / success). M 40 on desktop, L 48 on mobile. Errors are announced via aria-describedby."
    >
      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2 laptop:grid-cols-3">
        <Field label="Email" helper="We'll send a 6-digit code.">
          <Input type="email" placeholder="you@example.com" leadingIcon={<Mail />} />
        </Field>
        <Field label="Email (filled)">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon={<Mail />}
          />
        </Field>
        <Field label="Handle" error="This handle is taken. Try another one.">
          <Input defaultValue="nova.k" leadingIcon={<User />} />
        </Field>
        <Field label="Anti-phishing code" success="Saved — shown on every email we send.">
          <Input defaultValue="AURORA-27" state="success" />
        </Field>
        <Field label="Disabled" disabled>
          <Input defaultValue="GP-48213" />
        </Field>
        <Field label="Large (mobile)" helper="L = 48 px">
          <Input size="l" placeholder="Search…" leadingIcon={<Search />} />
        </Field>
        <Field label="Admin password" helper="12+ characters, mixed case, a number and a symbol.">
          <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} showStrength />
        </Field>
        <Field label="Password (empty)">
          <PasswordInput value="" onChange={() => undefined} showStrength />
        </Field>
        <Field label="Message" helper="0 / 500">
          <Textarea placeholder="Tell us what happened…" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 laptop:grid-cols-3">
        <AmountInput
          label="Withdrawal amount"
          value={amount}
          onChange={setAmount}
          available={DEMO_BALANCES.available}
          min="20.00"
          max="25000.00"
          limitsLabel="Min 20.00 · Max 25,000.00 per day"
          demo
        />
        <AmountInput
          label="Amount — over balance"
          value={over}
          onChange={setOver}
          available={DEMO_BALANCES.available}
          min="20.00"
          demo
        />
        <AmountInput
          label="Amount — disabled"
          value=""
          onChange={() => undefined}
          available="0.00"
          disabled
        />
      </div>

      <div className="grid grid-cols-1 gap-6 laptop:grid-cols-2">
        <AddressInput
          chain="arbitrum"
          value={addr}
          onChange={setAddr}
          onScanRequest={() =>
            toast({
              type: 'info',
              title: 'QR scanning needs camera access',
              description: 'Coming with the wallet screens.',
            })
          }
        />
        <AddressInput
          chain="arbitrum"
          value="0x12ab…9f3C"
          onChange={() => undefined}
          label="Invalid address"
        />
        <AddressInput
          chain="arbitrum"
          value={addrValid}
          onChange={() => undefined}
          label="Whitelisted address"
          addressStatus="whitelisted"
        />
        <AddressInput
          chain="arbitrum"
          value="0x3f9a00000000000000000000000000000000c47e"
          onChange={() => undefined}
          label="New address (cool-down)"
          addressStatus="new"
        />
        <AddressInput
          chain="solana"
          value="7Hq3ZtkPq5xQ8vGm4UoJcYr2NwBsLd9EaFhXk9P"
          onChange={() => undefined}
          label="Solana address"
        />
        <NetworkSelect
          value={chain}
          onValueChange={setChain}
          helper="Only Arbitrum Sepolia is live in this testnet build."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2 laptop:grid-cols-3">
        <Field label="OTP — empty">
          <OtpInput value={otpEmpty} onChange={setOtpEmpty} />
        </Field>
        <Field label="OTP — filling">
          <OtpInput value={otpFill} onChange={setOtpFill} />
        </Field>
        <Field label="OTP — complete">
          <OtpInput value={otpDone} onChange={setOtpDone} />
        </Field>
        <Field label="OTP — error" error="Incorrect code. 4 attempts left.">
          <OtpInput value={otpErr} onChange={setOtpErr} />
        </Field>
        <Field label="OTP — disabled" helper="Locked after 5 incorrect codes · unlocks 16:59 UTC">
          <OtpInput value="" onChange={() => undefined} disabled />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
        <Field label="Search M (⌘K)" hideLabel>
          <SearchInput shortcut={false} value="" onChange={() => undefined} />
        </Field>
        <Field label="Search S — filled" hideLabel>
          <SearchInput
            size="s"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onClear={() => setQ('')}
          />
        </Field>
      </div>
    </DsSection>
  );
}

// ── Selects & controls ─────────────────────────────────────────────────────────────────────────

export function SelectsSection() {
  const [rows, setRows] = React.useState('20');
  const [consent, setConsent] = React.useState(false);
  const [reminders, setReminders] = React.useState(false);
  return (
    <DsSection
      id="selects"
      title="Selects & controls"
      description="Select/Field, Control/Checkbox (consents never pre-checked), Control/Toggle (never default ON for spend settings)."
    >
      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-3">
        <Field label="Rows per page">
          <Select value={rows} onValueChange={setRows}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['10', '20', '50', '100'].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Country" error="Choose your country of residence.">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PT" description="Permitted">
                Portugal
              </SelectItem>
              <SelectItem value="US" description="Restricted region" disabled>
                United States
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Disabled" disabled>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Not available" />
            </SelectTrigger>
            <SelectContent />
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-3">
        <CheckboxField
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          label="I confirm I am 18+ and located in a permitted jurisdiction"
          description="Required before any gaming or financial action."
        />
        <CheckboxField
          checked="indeterminate"
          label="Indeterminate (select all — 3 of 10 selected)"
          onCheckedChange={() => undefined}
        />
        <CheckboxField disabled label="Disabled option" />
        <SwitchField
          checked={reminders}
          onCheckedChange={setReminders}
          label="Remind me 10 minutes before a round closes"
          description="Off by default. Reminders never enter a round for you."
        />
        <SwitchField disabled label="Disabled toggle" />
      </div>
    </DsSection>
  );
}

// ── Overlays ───────────────────────────────────────────────────────────────────────────────────

export function OverlaysSection() {
  return (
    <DsSection
      id="overlays"
      title="Overlays & toasts"
      description="Dialog S/M/L, bottom sheet (mobile) and right drawer, tooltips, menus, popover and toasts. Focus is trapped and restored; Esc closes."
    >
      <Specimen label="Tooltip — info / definition">
        <span className="flex items-center gap-1.5 text-body-s">
          Platform fee 0.05 USDT
          <InfoTooltip label="What is the platform fee?">
            0.05 USDT per qualifying entry, shown as its own line. It never goes into the pool.
          </InfoTooltip>
        </span>
        <span className="text-body-s">
          Your{' '}
          <DefinitionTooltip
            term="Owed"
            definition="Refunds and rewards credited to Available automatically."
          />{' '}
          balance
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="s">
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Bottom placement</TooltipContent>
        </Tooltip>
      </Specimen>

      <Specimen label="Dialog S / M / L">
        {(['s', 'm', 'l'] as const).map((size) => (
          <Dialog key={size}>
            <DialogTrigger asChild>
              <Button variant="secondary">Open {size.toUpperCase()}</Button>
            </DialogTrigger>
            <DialogContent size={size}>
              <DialogHeader>
                <DialogTitle>Cancel withdrawal WD-20931?</DialogTitle>
                <DialogDescription>
                  1,500.00 USDT returns to your Available balance. No fee is charged.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="flex items-center justify-between rounded-md bg-bg-secondary p-4 text-body-s">
                  <span className="text-text-secondary">Amount</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    1,500.00 USDT <DemoBadge size="xs" />
                  </span>
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep withdrawal</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Cancel withdrawal</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Bottom sheet</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Choose network</SheetTitle>
              <SheetDescription>
                Only Arbitrum Sepolia is live in this testnet build.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <NetworkSelect value="arbitrum" size="l" />
            </SheetBody>
            <SheetFooter>
              <Button size="l" block>
                Continue
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Right drawer</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Withdrawal WD-20931</SheetTitle>
              <SheetDescription>Under review · AML screening · ETA &lt; 4 h</SheetDescription>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-40" />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Specimen>

      <Specimen label="Menu · popover">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="More actions" variant="secondary">
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Pencil aria-hidden /> Rename address
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Mail aria-hidden /> Email receipt (soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>
              <Trash2 aria-hidden /> Remove address
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Balance glossary</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px]">
            <p className="mb-2 text-label-m">Balances</p>
            <ul className="flex flex-col gap-2 text-body-s text-text-secondary">
              <li>
                <span className="text-balance-available">Available</span> — usable now
              </li>
              <li>
                <span className="text-balance-locked">Locked</span> — entries + pending withdrawals
              </li>
              <li>
                <span className="text-balance-pending">Pending</span> — deposits confirming
              </li>
              <li>
                <span className="text-balance-owed">Owed</span> — refunds & rewards due to you
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      </Specimen>

      <Specimen
        label="Toasts — live (top-right) · static cards"
        bodyClassName="flex-col items-start"
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="s"
            onClick={() =>
              toast({
                type: 'success',
                title: 'Deposit credited',
                description: 'DP-77380 · 2,500.00 USDT is now Available.',
              })
            }
          >
            Success
          </Button>
          <Button
            variant="secondary"
            size="s"
            onClick={() =>
              toast({
                type: 'error',
                title: 'Withdrawal rejected',
                description: 'WD-20850 — funds returned to Available.',
              })
            }
          >
            Error
          </Button>
          <Button
            variant="secondary"
            size="s"
            onClick={() =>
              toast({
                type: 'warning',
                title: 'Ethereum is congested',
                description: 'Fees are higher than usual (2.40 USDT).',
              })
            }
          >
            Warning
          </Button>
          <Button
            variant="secondary"
            size="s"
            onClick={() => toast({ type: 'info', title: 'Round #1,248 closes at 20:00 UTC' })}
          >
            Info
          </Button>
          <Button
            variant="secondary"
            size="s"
            onClick={() =>
              toast({
                type: 'tx',
                title: 'Deposit DP-77412 confirming',
                progress: { current: 7, total: 12, label: '7 / 12 confirmations · est. 2 min' },
                action: { label: 'View on explorer', href: 'https://sepolia.etherscan.io' },
              })
            }
          >
            Tx pending
          </Button>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 laptop:grid-cols-2">
          <ToastCard
            type="success"
            title="Deposit credited"
            description="DP-77380 · 2,500.00 USDT is now Available."
          />
          <ToastCard
            type="error"
            title="Withdrawal rejected"
            description="WD-20850 — destination flagged. Funds returned to Available."
          />
          <ToastCard
            type="warning"
            title="Ethereum is congested"
            description="Typical fee 2.40 USDT. Arbitrum is cheaper (0.08)."
          />
          <ToastCard
            type="info"
            title="Round #1,248 closes at 20:00 UTC"
            description="You hold 35 entries."
          />
          <ToastCard
            type="tx"
            title="Deposit DP-77412 confirming"
            progress={{ current: 7, total: 12, label: '7 / 12 confirmations · est. 2 min' }}
            action={{ label: 'View on explorer', href: 'https://sepolia.etherscan.io' }}
          />
        </div>
      </Specimen>
    </DsSection>
  );
}

// ── Feedback ───────────────────────────────────────────────────────────────────────────────────

const ALERTS: { type: AlertType; title: string; body: string; action?: string }[] = [
  {
    type: 'info',
    title: 'Round #1,248 closes at 20:00 UTC',
    body: 'Entries bought after the close join round #1,249.',
  },
  {
    type: 'warning',
    title: 'Ethereum is congested',
    body: 'Deposits may take longer than usual. Arbitrum is unaffected.',
    action: 'Switch network',
  },
  {
    type: 'security',
    title: 'New device sign-in — Windows · Edge · Madrid',
    body: 'If this wasn’t you, secure your account now.',
    action: 'Review',
  },
  {
    type: 'restricted',
    title: 'Not available in your region',
    body: 'GLOBAL POOL games are not available in your region (United States). You can still view your account and withdraw funds.',
    action: 'Withdraw funds',
  },
  {
    type: 'maintenance',
    title: 'Scheduled maintenance',
    body: '1 Dec 2026, 02:00–02:30 UTC. Withdrawals are queued, not lost.',
  },
  {
    type: 'regulatory',
    title: 'Licensed jurisdictions only',
    body: 'Real-money games require an applicable licence and are available only in permitted jurisdictions. 18+.',
  },
];

export function FeedbackSection() {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  return (
    <DsSection
      id="feedback"
      title="Alerts, skeletons & empty states"
      description="Alert/Banner types (security, regional restriction and regulatory notices cannot be dismissed — and never hint at VPNs)."
    >
      <div className="flex flex-col gap-3">
        {ALERTS.filter((a) => !dismissed.includes(a.type)).map((a) => (
          <Alert
            key={a.type}
            type={a.type}
            title={a.title}
            onDismiss={() => setDismissed((d) => [...d, a.type])}
            actions={
              a.action ? (
                <Button size="s" variant="secondary">
                  {a.action}
                </Button>
              ) : undefined
            }
          >
            {a.body}
          </Alert>
        ))}
      </div>
      <Specimen label="Full-width banner (pinned under the top bar)" bodyClassName="block">
        <Alert
          type="maintenance"
          layout="full"
          title="Scheduled maintenance · 1 Dec 2026, 02:00–02:30 UTC"
          onDismiss={() => undefined}
        >
          Games pause for 30 minutes. Balances and withdrawals are safe.
        </Alert>
      </Specimen>
      <Specimen
        label="Skeleton (shimmer; static under reduced motion)"
        bodyClassName="items-stretch grid w-full grid-cols-1 gap-3 tablet:grid-cols-3"
      >
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-default p-5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="aspect-[3/4] w-40 rounded-lg" />
      </Specimen>
      <div className="grid grid-cols-1 gap-4 laptop:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            title="No transactions yet"
            description="Deposits, withdrawals and entries will appear here."
            actions={
              <>
                <Button size="s">Make a deposit</Button>
                <Button size="s" variant="ghost">
                  How deposits work
                </Button>
              </>
            }
          />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            type="no-results"
            title="No results"
            description="No transactions match these filters."
            actions={
              <Button size="s" variant="secondary">
                Clear all filters
              </Button>
            }
          />
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            type="error"
            title="Couldn't load transactions"
            description="Your balances are safe. Please try again."
            reference="ERR-7F3A-2291"
            actions={
              <Button size="s" variant="secondary">
                Try again
              </Button>
            }
          />
        </div>
      </div>
    </DsSection>
  );
}

// ── Jackpot ────────────────────────────────────────────────────────────────────────────────────

export function JackpotSection() {
  const base = DEMO_CURRENT_ROUND.poolBalance ?? '0.00';
  const [pool, setPool] = React.useState(base);
  return (
    <DsSection
      id="jackpot"
      title="Jackpot meter & countdown"
      description="Rolling gold digits (1200 ms, instant under prefers-reduced-motion). Countdowns derive from the absolute close time — never fake timers. These use a DEMO clock anchored at 16:42:18 UTC."
    >
      <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-2">
        <div className="flex flex-col gap-4">
          <JackpotMeter
            amount={pool}
            size="xl"
            live
            demo
            caption="Platform fees (932.00 USDT) are not part of the pool."
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="s"
              variant="secondary"
              onClick={() => setPool(add(pool, '10.00').toFixed(2))}
            >
              +1 entry (10.00)
            </Button>
            <Button
              size="s"
              variant="secondary"
              onClick={() => setPool(add(pool, '350.00').toFixed(2))}
            >
              +35 entries
            </Button>
            <Button size="s" variant="ghost" onClick={() => setPool(base)}>
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 tablet:grid-cols-2">
            <JackpotMeter amount={pool} size="l" demo />
            <JackpotMeter amount={pool} size="m" bare caption={null} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Specimen
            label="Countdown L / M / S (to 27 Nov 2026, 20:00 UTC)"
            bodyClassName="flex-col items-stretch"
          >
            <Countdown closesAt={DEMO_CURRENT_ROUND.closesAt} demoNow={DEMO_NOW} size="l" />
            <Countdown closesAt={DEMO_CURRENT_ROUND.closesAt} demoNow={DEMO_NOW} size="m" />
            <Countdown
              closesAt={DEMO_CURRENT_ROUND.closesAt}
              demoNow={DEMO_NOW}
              size="s"
              caption={null}
              className="w-fit"
            />
          </Specimen>
          <Specimen
            label="Countdown — real clock (round already closed)"
            bodyClassName="flex-col items-stretch"
          >
            <Countdown closesAt={DEMO_CURRENT_ROUND.closesAt} size="m" />
          </Specimen>
        </div>
      </div>
    </DsSection>
  );
}
