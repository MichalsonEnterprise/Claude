import type { SubNavItem } from './primitives';

/** Finance module (ADM-F1…F8; F9 export is a modal on these pages). */
export const FINANCE_NAV: SubNavItem[] = [
  { href: '/admin/finance/deposits', label: 'Deposits' },
  { href: '/admin/finance/withdrawals', label: 'Withdrawals', prefix: true },
  { href: '/admin/finance/fees', label: 'Platform fees' },
  { href: '/admin/finance/pool-accounting', label: 'Pool accounting' },
  { href: '/admin/finance/ledger', label: 'Ledger' },
  { href: '/admin/finance/reconciliation', label: 'Reconciliation' },
  { href: '/admin/finance/refunds', label: 'Refunds' },
  { href: '/admin/finance/reports', label: 'Reports' },
];

/** Global Pool management (ADM-P1…P10). */
export const POOL_NAV: SubNavItem[] = [
  { href: '/admin/pool', label: 'Overview' },
  { href: '/admin/pool/balance', label: 'Balance' },
  { href: '/admin/pool/active', label: 'Active round' },
  { href: '/admin/pool/rounds', label: 'History' },
  { href: '/admin/pool/participants', label: 'Participants' },
  { href: '/admin/pool/prizes', label: 'Prizes' },
  { href: '/admin/pool/vrf', label: 'VRF' },
  { href: '/admin/pool/settlement', label: 'Settlement' },
  { href: '/admin/pool/refunds', label: 'Refunds' },
  { href: '/admin/pool/policy', label: 'Policy & breaker' },
];

/** Compliance (ADM-C1 KYC, ADM-C2 AML). */
export const COMPLIANCE_NAV: SubNavItem[] = [
  { href: '/admin/compliance/kyc', label: 'KYC queue', prefix: true },
  { href: '/admin/compliance/aml', label: 'AML alerts' },
];
