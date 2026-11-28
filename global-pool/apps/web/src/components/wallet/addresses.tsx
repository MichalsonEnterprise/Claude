'use client';

import { CHAINS, ENABLED_CHAINS, type ChainKey } from '@gp/shared/chains';
import { formatDateTimeUTC, formatDateUTC } from '@gp/shared/format';
import { zodResolver } from '@hookform/resolvers/zod';
import { whitelistAddressSchema } from '@gp/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { Clock, Plus, ShieldCheck, Star, Trash2, Wallet } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ChainMark } from '@/components/brand/chain-mark';
import { AddressChip } from '@/components/domain/address-chip';
import { AddressInput } from '@/components/domain/address-input';
import { NetworkSelect } from '@/components/domain/network-select';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth';
import {
  useInvalidateWallet,
  useLinkedWallets,
  walletApi,
  type LinkedWallet,
} from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { ResponsiveModal } from './responsive-modal';
import { stepUpError, TwoFactorField } from './two-factor';
import { QueryError, SectionTitle, WALLET_ROUTES, WalletPageHeader, WalletTabs } from './wallet-ui';

function remaining(iso: string, now: number): string {
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

/** Re-render once a minute for cool-down countdowns (derived from the server's absolute unlock time). */
function useMinuteClock(): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

// ── WAL-23 whitelist ──────────────────────────────────────────────────────────────────────────

/** WAL-23 Whitelisted addresses: list, add (24 h cool-down, step-up), remove (step-up). */
export function WhitelistPage() {
  const wallets = useLinkedWallets();
  const now = useMinuteClock();
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<LinkedWallet | null>(null);
  const list = (wallets.data ?? []).filter((w) => w.whitelisted);
  const justAdded = list.find((w) => w.inCooldown);

  return (
    <div className="flex flex-col gap-6">
      <WalletPageHeader
        title="Address whitelist"
        description="Withdrawals can go to addresses you have saved here. A new address unlocks after a 24 h cool-down — it protects your balance if someone else gets into your account."
        actions={
          <Button leadingIcon={<Plus />} onClick={() => setAdding(true)}>
            Add address
          </Button>
        }
      />
      <WalletTabs />

      {justAdded && justAdded.usableForWithdrawalsFrom && (
        <Alert
          type="info"
          title={`${justAdded.label ?? 'New address'} is cooling down`}
          actions={
            <Button variant="ghost" size="s" onClick={() => setRemoving(justAdded)}>
              Remove it
            </Button>
          }
        >
          {justAdded.address.slice(0, 6)}…{justAdded.address.slice(-4)} unlocks{' '}
          {formatDateTimeUTC(justAdded.usableForWithdrawalsFrom)}. We’ll notify you when it’s ready. Didn’t add
          it? Remove it now and secure your account.
        </Alert>
      )}

      <Card radius="xl" padding="l" className="gap-4">
        <SectionTitle demo>Saved withdrawal addresses</SectionTitle>
        {wallets.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : wallets.isError ? (
          <QueryError error={wallets.error} onRetry={() => void wallets.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            title="No whitelisted addresses yet"
            description="Add an address you own. You can withdraw to it 24 h after adding it."
            actions={
              <Button leadingIcon={<Plus />} onClick={() => setAdding(true)}>
                Add address
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((w) => (
              <li
                key={w.id}
                className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3 tablet:flex-row tablet:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <ChainMark chain={w.network} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-body-s-strong text-text-primary">
                      {w.label ?? CHAINS[w.network].name}
                      {w.inCooldown ? (
                        <StatusBadge status="pending" label={`Cooling down · ${remaining(w.usableForWithdrawalsFrom!, now)}`} />
                      ) : (
                        <StatusBadge status="approved" label="Ready" />
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
                      <AddressChip address={w.address} size="s" demo={w.isDemo} />
                      <span>
                        {CHAINS[w.network].name}
                        {w.whitelistedAt && ` · added ${formatDateUTC(w.whitelistedAt)}`}
                        {w.inCooldown && w.usableForWithdrawalsFrom && ` · unlocks ${formatDateTimeUTC(w.usableForWithdrawalsFrom)}`}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="s"
                  leadingIcon={<Trash2 />}
                  onClick={() => setRemoving(w)}
                  aria-label={`Remove ${w.label ?? w.address} from the whitelist`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="flex gap-2 text-caption text-text-tertiary">
          <ShieldCheck aria-hidden className="size-4 shrink-0" />
          Every change needs your authenticator code and is recorded in your security log. The 24 h cool-down
          applies to all players and support can’t skip it.
        </p>
      </Card>

      <AddAddressModal open={adding} onOpenChange={setAdding} />
      <RemoveAddressModal wallet={removing} onOpenChange={(o) => !o && setRemoving(null)} />
    </div>
  );
}

const addFormSchema = z.object({
  network: z.string(),
  address: z.string().trim().min(1, { error: 'Enter an address' }),
  label: z.string().trim().max(40, { error: 'Keep the label under 40 characters' }).optional(),
  owner: z.literal(true, { error: 'Confirm that you own this address' }),
});
type AddForm = z.infer<typeof addFormSchema>;

export function AddAddressModal({
  open,
  onOpenChange,
  defaultNetwork = 'arbitrum',
  defaultAddress = '',
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNetwork?: ChainKey;
  defaultAddress?: string;
  onAdded?: (w: LinkedWallet) => void;
}) {
  const invalidate = useInvalidateWallet();
  const [code, setCode] = React.useState('');
  const form = useForm<AddForm>({
    resolver: zodResolver(addFormSchema),
    defaultValues: { network: defaultNetwork, address: defaultAddress, label: '', owner: undefined as unknown as true },
    mode: 'onChange',
  });
  React.useEffect(() => {
    if (open) {
      form.reset({ network: defaultNetwork, address: defaultAddress, label: '', owner: undefined as unknown as true });
      setCode('');
    }
  }, [open, defaultNetwork, defaultAddress, form]);
  const add = useMutation({
    mutationFn: (v: AddForm & { totpCode: string }) =>
      walletApi.addWhitelist({
        network: v.network as ChainKey,
        address: v.address,
        label: v.label || undefined,
        totpCode: v.totpCode,
      }),
    onSuccess: (w) => {
      void invalidate();
      toast({
        type: 'success',
        title: 'Address saved — cooling down',
        description: w.usableForWithdrawalsFrom ? `Usable from ${formatDateTimeUTC(w.usableForWithdrawalsFrom)}.` : undefined,
      });
      onAdded?.(w);
      onOpenChange(false);
    },
    onError: () => setCode(''),
  });
  const network = form.watch('network') as ChainKey;
  const submit = form.handleSubmit((v) => {
    const parsed = whitelistAddressSchema.safeParse({ network: v.network, address: v.address, label: v.label || undefined });
    if (!parsed.success) {
      form.setError('address', { message: parsed.error.issues[0]?.message ?? 'Check the address' });
      return;
    }
    add.mutate({ ...v, totpCode: code });
  });
  const apiError = add.error && !stepUpError(add.error) ? add.error.message : undefined;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add a withdrawal address"
      description="Save an address you own. It can be used for withdrawals after a 24 h cool-down."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="wl-add"
            loading={add.isPending}
            disabled={code.length !== 6 || !form.formState.isValid}
          >
            Add to whitelist
          </Button>
        </>
      }
    >
      <form id="wl-add" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Controller
          control={form.control}
          name="network"
          render={({ field }) => (
            <NetworkSelect value={field.value as ChainKey} onValueChange={field.onChange} showFee={false} />
          )}
        />
        <Controller
          control={form.control}
          name="address"
          render={({ field, fieldState }) => (
            <AddressInput
              chain={network}
              value={field.value}
              onChange={field.onChange}
              label="Address"
              addressStatus="new"
              error={fieldState.error?.message ?? apiError}
            />
          )}
        />
        <Field label="Label (optional)" helper="Only you see it, e.g. “Cold wallet”." error={form.formState.errors.label?.message}>
          <Input {...form.register('label')} placeholder="Cold wallet" maxLength={40} autoComplete="off" />
        </Field>
        <Controller
          control={form.control}
          name="owner"
          render={({ field, fieldState }) => (
            <div>
              <CheckboxField
                checked={field.value === true}
                onCheckedChange={(c) => field.onChange(c === true ? true : undefined)}
                label="I own this address and I checked it character by character"
                description="Crypto sent to the wrong address can’t be recovered."
              />
              {fieldState.error && <p className="text-caption text-text-danger">{fieldState.error.message}</p>}
            </div>
          )}
        />
        <TwoFactorField value={code} onChange={setCode} error={add.error} />
      </form>
    </ResponsiveModal>
  );
}

function RemoveAddressModal({
  wallet,
  onOpenChange,
}: {
  wallet: LinkedWallet | null;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidateWallet();
  const [code, setCode] = React.useState('');
  React.useEffect(() => setCode(''), [wallet]);
  const remove = useMutation({
    mutationFn: (v: { id: string; totpCode: string }) => walletApi.removeWhitelist(v.id, { totpCode: v.totpCode }),
    onSuccess: () => {
      void invalidate();
      toast({ type: 'success', title: 'Address removed from your whitelist' });
      onOpenChange(false);
    },
    onError: () => setCode(''),
  });
  return (
    <ResponsiveModal
      open={Boolean(wallet)}
      onOpenChange={onOpenChange}
      size="s"
      title="Remove this address?"
      description={
        wallet
          ? `${wallet.label ?? CHAINS[wallet.network].name} · ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}. Adding it again starts a new 24 h cool-down.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep address
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            disabled={code.length !== 6}
            onClick={() => wallet && remove.mutate({ id: wallet.id, totpCode: code })}
          >
            Remove address
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-s text-text-secondary">
          Withdrawals already sent are not affected. Pending withdrawals to this address keep their place.
        </p>
        <TwoFactorField value={code} onChange={setCode} error={remove.error} />
        {remove.error && !stepUpError(remove.error) && (
          <Alert type="security">{remove.error.message}</Alert>
        )}
      </div>
    </ResponsiveModal>
  );
}

// ── WAL-02 connected wallets ─────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  privy_linked: 'Connected via sign-in',
  privy_embedded: 'Embedded wallet',
  manual: 'Saved address',
};

/** WAL-02 Connected wallets: linked wallets (Privy) with primary / verified / whitelist status. */
export function ConnectedWalletsPage() {
  const wallets = useLinkedWallets();
  const auth = useAuth();
  const [whitelistFor, setWhitelistFor] = React.useState<LinkedWallet | null>(null);
  const list = wallets.data ?? [];
  const canConnect = typeof auth.openAuth === 'function';

  return (
    <div className="flex flex-col gap-6">
      <WalletPageHeader
        title="Connected wallets"
        description="Wallets linked to your account. Linking a wallet never gives GLOBAL POOL access to its funds — deposits and withdrawals always go through your platform balance."
        actions={
          <Button
            leadingIcon={<Plus />}
            disabled={!canConnect}
            onClick={() => auth.openAuth?.('wallet')}
          >
            Connect a wallet
          </Button>
        }
      />
      <WalletTabs />
      <Card radius="xl" padding="l" className="gap-4">
        <SectionTitle demo>Your wallets</SectionTitle>
        {wallets.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : wallets.isError ? (
          <QueryError
            error={wallets.error}
            title="We couldn’t load your wallets"
            onRetry={() => void wallets.refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="No wallets connected"
            description="Connect a wallet to sign in with it, or save a withdrawal address in your whitelist."
            actions={
              <Button asChild variant="secondary">
                <Link href={WALLET_ROUTES.whitelist}>Open address whitelist</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((w) => (
              <li
                key={w.id}
                className={cn(
                  'flex flex-col gap-3 rounded-md border bg-bg-secondary p-4 tablet:flex-row tablet:items-center',
                  w.isPrimary ? 'border-border-brand' : 'border-border-subtle',
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <ChainMark chain={w.network} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-body-s-strong text-text-primary">
                      {CHAINS[w.network].name}
                      {w.isPrimary && <StatusBadge status="new" label="Primary" />}
                      {w.verified && <StatusBadge status="approved" label="Verified" />}
                      {w.whitelisted ? (
                        w.inCooldown ? (
                          <StatusBadge status="pending" label="Whitelist cooling down" />
                        ) : (
                          <StatusBadge status="confirmed" label="Whitelisted" />
                        )
                      ) : (
                        <StatusBadge status="neutral" label="Not whitelisted" />
                      )}
                      {!CHAINS[w.network].enabled && (
                        <span className="text-caption text-text-tertiary">· withdrawals on this network coming soon</span>
                      )}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
                      <AddressChip address={w.address} size="s" demo={w.isDemo} />
                      <span>{SOURCE_LABEL[w.source] ?? w.source}</span>
                      {w.label && <span>· {w.label}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!w.whitelisted && CHAINS[w.network].enabled && (
                    <Button variant="secondary" size="s" leadingIcon={<ShieldCheck />} onClick={() => setWhitelistFor(w)}>
                      Whitelist for withdrawals
                    </Button>
                  )}
                  {w.isPrimary && (
                    <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                      <Star aria-hidden className="size-3.5" /> Used for sign-in
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!canConnect && (
          <p className="flex gap-2 text-caption text-text-tertiary">
            <Clock aria-hidden className="size-4 shrink-0" />
            Connecting another wallet uses the sign-in wallet flow, which isn’t available in this build yet.
          </p>
        )}
      </Card>
      <Card radius="xl" padding="l" className="gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <p className="text-body-m-strong text-text-primary">Withdrawal addresses</p>
          <p className="text-body-s text-text-secondary">
            Withdrawals use your whitelist. Supported now: {ENABLED_CHAINS.map((c) => c.testnet.name).join(', ')}.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={WALLET_ROUTES.whitelist}>Manage whitelist</Link>
        </Button>
      </Card>
      <AddAddressModal
        open={Boolean(whitelistFor)}
        onOpenChange={(o) => !o && setWhitelistFor(null)}
        defaultNetwork={whitelistFor?.network ?? 'arbitrum'}
        defaultAddress={whitelistFor?.address ?? ''}
      />
      <DemoBadge size="m" className="self-start" />
    </div>
  );
}
