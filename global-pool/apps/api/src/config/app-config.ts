import { Injectable } from '@nestjs/common';

import { parseEnv, type Env } from './env';

export type PlayerAuthMode = 'privy' | 'mock' | 'disabled';

/**
 * Typed, validated configuration (inject `AppConfig`). Built once from process.env at boot.
 */
@Injectable()
export class AppConfig {
  readonly env: Env;

  constructor(env?: Env) {
    this.env = env ?? parseEnv();
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  /** DEMO-only endpoints (simulated deposits, dev tokens…) — never with real money, never in production. */
  get demoEndpointsEnabled(): boolean {
    return this.env.DEMO_MODE && !this.env.REAL_MONEY_ENABLED && !this.isProduction;
  }

  /**
   * Player auth: real Privy verification when PRIVY_APP_ID is set and PRIVY_MOCK is off; otherwise the offline
   * DEV MOCK (locally signed tokens) — which is refused in production.
   */
  get playerAuthMode(): PlayerAuthMode {
    const { PRIVY_APP_ID, PRIVY_MOCK } = this.env;
    if (PRIVY_APP_ID && !PRIVY_MOCK) return 'privy';
    return this.isProduction ? 'disabled' : 'mock';
  }

  get totpKey(): Buffer {
    return Buffer.from(this.env.TOTP_ENCRYPTION_KEY, 'base64');
  }
}
