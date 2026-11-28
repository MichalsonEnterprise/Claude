import { describe, expect, it } from 'vitest';

import { INTEGRITY_TRIGGERS, checkIntegrityTriggers } from './admin-finance.service';

const allEnabled = INTEGRITY_TRIGGERS.map((t) => ({
  tgname: t.name,
  tablename: t.table,
  tgenabled: 'O',
}));

describe('ledger integrity triggers (R25)', () => {
  it('covers append-only, no-truncate and the balanced-posting check, incl. the on-chain mirror tables', () => {
    const names = INTEGRITY_TRIGGERS.map((t) => t.name);
    for (const n of [
      'ledger_entries_append_only',
      'ledger_entries_no_truncate',
      'ledger_entries_balanced',
      'audit_logs_no_truncate',
      'entry_commitments_append_only',
      'round_payouts_no_truncate',
    ]) {
      expect(names).toContain(n);
    }
  });

  it('is OK only when every trigger exists on its table and fires', () => {
    expect(checkIntegrityTriggers(allEnabled).ok).toBe(true);
    expect(
      checkIntegrityTriggers(allEnabled.map((t) => ({ ...t, tgenabled: 'A' }))).ok,
    ).toBe(true);
  });

  it('reports a DISABLED trigger as not OK even though its pg_trigger row is still present', () => {
    const rows = allEnabled.map((t) =>
      t.tgname === 'ledger_entries_append_only' ? { ...t, tgenabled: 'D' } : t,
    );
    const res = checkIntegrityTriggers(rows);
    expect(res.ok).toBe(false);
    expect(res.triggers.find((t) => t.name === 'ledger_entries_append_only')).toMatchObject({
      present: true,
      enabled: false,
    });
    // replica-only triggers do not fire for normal sessions either
    expect(
      checkIntegrityTriggers(
        allEnabled.map((t) => (t.tgname === 'fee_ledger_append_only' ? { ...t, tgenabled: 'R' } : t)),
      ).ok,
    ).toBe(false);
  });

  it('fails for a missing trigger or one attached to another table', () => {
    expect(checkIntegrityTriggers(allEnabled.filter((t) => t.tgname !== 'round_payouts_append_only')).ok).toBe(false);
    expect(
      checkIntegrityTriggers(
        allEnabled.map((t) =>
          t.tgname === 'audit_logs_append_only' ? { ...t, tablename: 'audit_logs_shadow' } : t,
        ),
      ).ok,
    ).toBe(false);
  });
});
