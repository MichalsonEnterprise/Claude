import { Injectable } from '@nestjs/common';
import type { ChainKey } from '@gp/shared/chains';
import { toUSDTString } from '@gp/shared/money';
import { randomBytes } from 'node:crypto';

import { AppError, notFound } from '../../common/errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { DepositAddressService } from './deposit-address.service';
import { DepositsService } from './deposits.service';

const DEFAULT_STEP = 4;

/**
 * DEMO-only progressive deposits (wallet deposit flow QA): a simulated test-USDT transfer is recorded as DETECTED with
 * 0 confirmations (posting CHAIN_CLEARING → PENDING, exactly like the watcher), then simulated blocks are added until
 * the required confirmations are reached and it is credited (PENDING → AVAILABLE) with the regular credit path.
 * Never available outside DEMO mode (the controller is @DemoOnly()).
 */
@Injectable()
export class DemoDepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deposits: DepositsService,
    private readonly addresses: DepositAddressService,
    private readonly blockchain: BlockchainService,
    private readonly rg: ResponsibleGamingService,
    private readonly idempotency: IdempotencyService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async simulateDetected(
    userId: string,
    input: { network: ChainKey; amount: string; idempotencyKey: string; mode?: string },
  ) {
    await this.flags.assertEnabled('deposits.enabled', 'Deposits');
    return this.idempotency.run(
      { scope: 'deposit.simulate', ownerId: userId, key: input.idempotencyKey, request: input },
      async (tx) => {
        await this.rg.assertCanDeposit(userId, input.amount, tx);
        const address = await this.addresses.forUser(userId, input.network);
        const deposit = await this.deposits.recordDetected(tx, {
          network: input.network,
          userId,
          txHash: `0x${randomBytes(32).toString('hex')}`,
          logIndex: 0,
          blockNumber: null,
          from: null,
          to: address.address.toLowerCase(),
          tokenAddress: null,
          amount: toUSDTString(input.amount),
          isDemo: true,
        });
        return { ...this.deposits.view(deposit!), simulated: true, mode: 'progressive' as const };
      },
    );
  }

  /** Add simulated confirmations to the player's own DEMO deposit; credits it once the requirement is met. */
  async advance(userId: string, reference: string, step = DEFAULT_STEP) {
    const number = parseReference(reference);
    const result = await this.prisma.tx(async (tx) => {
      const found = await tx.deposit.findFirst({ where: { userId, number }, select: { id: true } });
      if (!found) throw notFound('Deposit');
      await tx.$queryRaw`SELECT id FROM deposits WHERE id = ${found.id}::uuid FOR UPDATE`;
      const d = await tx.deposit.findUniqueOrThrow({ where: { id: found.id } });
      if (!d.isDemo || d.blockNumber !== null)
        throw new AppError('CONFLICT', 'Only simulated DEMO deposits can be advanced');
      if (d.status !== 'detected' && d.status !== 'confirming')
        throw new AppError('CONFLICT', `Deposit is ${d.status}`);
      const next = Math.min(d.requiredConfirmations, d.confirmations + step);
      if (next >= d.requiredConfirmations) {
        await this.deposits.credit(tx, d, next);
      } else {
        await tx.deposit.update({ where: { id: d.id }, data: { confirmations: next } });
        await tx.transaction.updateMany({
          where: { depositId: d.id },
          data: { metadata: { statusDetail: `${next} / ${d.requiredConfirmations} confirmations` } },
        });
      }
      return tx.deposit.findUniqueOrThrow({ where: { id: d.id } });
    });
    return this.deposits.view(result);
  }

  /** One deposit by its public reference (DP-77412), for the pending / confirmation screens. */
  async byReference(userId: string, reference: string) {
    const d = await this.prisma.deposit.findFirst({
      where: { userId, number: parseReference(reference) },
    });
    if (!d) throw notFound('Deposit');
    return {
      ...this.deposits.view(d),
      requiredConfirmations: this.blockchain.requiredConfirmations(d.network),
    };
  }
}

function parseReference(reference: string): number {
  const match = /^DP-(\d{1,12})$/i.exec(reference.trim());
  if (!match) throw notFound('Deposit');
  return Number(match[1]);
}
