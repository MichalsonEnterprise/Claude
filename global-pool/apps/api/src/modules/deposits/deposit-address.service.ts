import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AppError } from '../../common/errors';
import { AppConfig } from '../../config/app-config';
import { findApiRoot } from '../../config/load-env';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { deriveEvmAddress, generateDevXpub, parseXpub, xpubFingerprint } from './hd';

const INDEX_LOCK = 7_262_101;

@Injectable()
export class DepositAddressService implements OnModuleInit {
  private readonly logger = new Logger(DepositAddressService.name);
  private xpub!: string;
  private fingerprint!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const configured = this.config.env.DEPOSIT_XPUB;
    if (configured) {
      parseXpub(configured);
      this.xpub = configured;
    } else if (this.config.isProduction) {
      throw new Error('DEPOSIT_XPUB is required in production');
    } else {
      this.xpub = this.devXpub();
    }
    this.fingerprint = xpubFingerprint(this.xpub);
  }

  /** Persist the throwaway dev xpub (public key only) so addresses stay stable across restarts. */
  private devXpub(): string {
    if (this.config.isTest) return generateDevXpub();
    const file = resolve(findApiRoot(), '.dev', 'deposit-xpub.dev.json');
    try {
      if (existsSync(file)) {
        const saved = JSON.parse(readFileSync(file, 'utf8')) as { xpub?: string };
        if (saved.xpub) return saved.xpub;
      }
      const xpub = generateDevXpub();
      mkdirSync(resolve(file, '..'), { recursive: true });
      writeFileSync(
        file,
        JSON.stringify(
          { xpub, note: 'DEV ONLY throwaway testnet xpub (private seed discarded). Git-ignored.' },
          null,
          2,
        ),
      );
      this.logger.warn(`DEPOSIT_XPUB unset — generated a throwaway DEV xpub (${file})`);
      return xpub;
    } catch {
      return generateDevXpub();
    }
  }

  /** Get (or assign) the player's deposit address for an enabled network. */
  async forUser(userId: string, network: ChainKey) {
    const chain = CHAINS[network];
    if (!chain.enabled)
      throw new AppError('NETWORK_NOT_AVAILABLE', `${chain.name} deposits are coming soon`);
    if (chain.family !== 'evm')
      throw new AppError('NETWORK_NOT_AVAILABLE', `${chain.name} is not supported yet`);
    const existing = await this.prisma.depositAddress.findUnique({
      where: { userId_network: { userId, network } },
    });
    if (existing) return this.view(existing);
    const row = await this.prisma.tx(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INDEX_LOCK})`;
      const again = await tx.depositAddress.findUnique({
        where: { userId_network: { userId, network } },
      });
      if (again) return again;
      const last = await tx.depositAddress.findFirst({
        where: { network, xpubFingerprint: this.fingerprint },
        orderBy: { derivationIndex: 'desc' },
        select: { derivationIndex: true },
      });
      const derived = deriveEvmAddress(this.xpub, (last?.derivationIndex ?? -1) + 1);
      return tx.depositAddress.create({
        data: {
          userId,
          network,
          address: derived.address.toLowerCase(),
          addressChecksum: derived.address,
          derivationIndex: derived.index,
          derivationPath: derived.path,
          xpubFingerprint: this.fingerprint,
        },
      });
    });
    return this.view(row);
  }

  private view(row: {
    network: ChainKey;
    addressChecksum: string;
    derivationIndex: number;
    createdAt: Date;
  }) {
    const chain = CHAINS[row.network];
    return {
      network: row.network,
      networkName: chain.testnet.name,
      chainId: chain.testnet.chainId,
      token: chain.testnet.tokenLabel,
      tokenStandard: chain.usdtStandard,
      address: row.addressChecksum,
      minDeposit: chain.minDeposit,
      confirmations: this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM,
      derivationIndex: row.derivationIndex,
      testnet: true,
      warning: `Send only ${chain.testnet.tokenLabel} on ${chain.testnet.name}. TESTNET / DEMO — never send real funds.`,
    };
  }
}
