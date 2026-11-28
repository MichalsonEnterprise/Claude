import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/** Interactive-transaction client (what `prisma.$transaction(async (tx) => …)` hands you). */
export type Tx = Prisma.TransactionClient;
/** Either the root client or a transaction client — services accept both so they compose inside one DB tx. */
export type Db = PrismaClient | Tx;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Run `fn` in a SERIALIZABLE-safe interactive transaction with sane defaults for financial writes.
   * (Isolation: READ COMMITTED + explicit row locks — see LedgerService.lockAccounts.)
   */
  tx<T>(fn: (tx: Tx) => Promise<T>, options: { timeoutMs?: number } = {}): Promise<T> {
    return this.$transaction(fn, {
      maxWait: 10_000,
      timeout: options.timeoutMs ?? 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }
}
