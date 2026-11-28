import type { KycLevel } from '@gp/shared/enums';
import { randomUUID } from 'node:crypto';

export interface KycSession {
  provider: string;
  providerRef: string;
  /** Hosted verification URL (null for the mock provider). */
  redirectUrl: string | null;
}

/** KYC provider interface (Sumsub / Onfido / Veriff adapters plug in here). */
export interface KycProvider {
  readonly name: string;
  startVerification(input: { userId: string; level: KycLevel }): Promise<KycSession>;
}

/** Mock provider: creates a pending check; DEMO builds can approve it via POST /dev/kyc/approve. */
export class MockKycProvider implements KycProvider {
  readonly name = 'mock';

  startVerification(): Promise<KycSession> {
    return Promise.resolve({ provider: this.name, providerRef: `mock-kyc-${randomUUID()}`, redirectUrl: null });
  }
}
