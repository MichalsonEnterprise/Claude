import type { AmlRiskLevel } from '@gp/shared/enums';
import type { ChainKey } from '@gp/shared/chains';
import { gte } from '@gp/shared/money';

export interface AmlScreeningInput {
  userId: string;
  network: ChainKey;
  address: string;
  amount: string;
  /** Not whitelisted, or never used for a completed withdrawal. */
  newDestination: boolean;
  whitelisted: boolean;
  withdrawalsLast24h: number;
  accountAgeDays: number;
}

export interface AmlCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface AmlScreeningResult {
  provider: string;
  riskLevel: AmlRiskLevel;
  /** approve → queued · review → manual review (four-eyes) · reject → rejected, funds returned */
  decision: 'approve' | 'review' | 'reject';
  flags: string[];
  checks: AmlCheck[];
  reason: string | null;
}

/** Screening provider interface (Chainalysis / TRM / Elliptic adapters plug in here). */
export interface AmlProvider {
  readonly name: string;
  screenWithdrawal(input: AmlScreeningInput): Promise<AmlScreeningResult>;
}

/** DEMO sanctions list — obviously fake addresses used to exercise the rejection path. */
export const DEMO_SANCTIONED_ADDRESSES = new Set([
  '0x000000000000000000000000000000000000dead',
  '0xa41c00000000000000000000000000000000d2e0',
]);

export const LARGE_WITHDRAWAL_REVIEW = '10000.00';

/**
 * Deterministic mock screening (6 checks, like the WD-20931 design): sanctions list, address format, destination
 * history, velocity, amount threshold, account age.
 */
export class MockAmlProvider implements AmlProvider {
  readonly name = 'mock';

  screenWithdrawal(input: AmlScreeningInput): Promise<AmlScreeningResult> {
    const sanctioned = DEMO_SANCTIONED_ADDRESSES.has(input.address.toLowerCase());
    const large = gte(input.amount, LARGE_WITHDRAWAL_REVIEW);
    const velocity = input.withdrawalsLast24h >= 5;
    const youngAccount = input.accountAgeDays < 1;
    const checks: AmlCheck[] = [
      { name: 'sanctions_screening', passed: !sanctioned },
      { name: 'address_format', passed: true },
      {
        name: 'destination_history',
        passed: !input.newDestination,
        detail: input.whitelisted ? 'whitelisted' : 'not whitelisted',
      },
      { name: 'velocity', passed: !velocity },
      { name: 'amount_threshold', passed: !large },
      { name: 'account_age', passed: !youngAccount },
    ];
    const flags = checks.filter((c) => !c.passed).map((c) => c.name);
    if (sanctioned) {
      return Promise.resolve({
        provider: this.name,
        riskLevel: 'critical',
        decision: 'reject',
        flags,
        checks,
        reason: 'Destination flagged by sanctions screening',
      });
    }
    const review = input.newDestination || large || velocity;
    return Promise.resolve({
      provider: this.name,
      riskLevel: large || velocity ? 'high' : review ? 'medium' : 'low',
      decision: review ? 'review' : 'approve',
      flags,
      checks,
      reason: review
        ? input.newDestination
          ? 'Routine AML screening for new destinations — usually under 4 h'
          : 'Manual review required'
        : null,
    });
  }
}
