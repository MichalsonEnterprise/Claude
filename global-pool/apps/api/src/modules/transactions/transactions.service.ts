import { Injectable } from '@nestjs/common';
import type { Prisma, Transaction as TxRow, Withdrawal, Deposit } from '@prisma/client';
import { truncateAddress } from '@gp/shared/format';
import { paginate, type TransactionsQuery } from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import { usdt, usdtOrNull } from '../../common/money';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';

type Row = TxRow & { withdrawal?: Withdrawal | null; deposit?: Deposit | null };

/** User-facing activity history. Balances never come from here — only from the ledger. */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(db: Db, data: Prisma.TransactionUncheckedCreateInput) {
    return db.transaction.create({ data });
  }

  async list(userId: string, query: TransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.network ? { network: query.network } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { withdrawal: true, deposit: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return paginate(rows.map((r) => this.view(r)), total, query);
  }

  async get(userId: string, reference: string) {
    const row = await this.prisma.transaction.findFirst({
      where: { userId, OR: [{ reference }, ...(isUuid(reference) ? [{ id: reference }] : [])] },
      include: { withdrawal: { include: { events: { orderBy: { createdAt: 'asc' } } } }, deposit: true },
    });
    if (!row) throw notFound('Transaction');
    const timeline = row.withdrawal
      ? row.withdrawal.events.map((e) => ({ label: e.note ?? e.toStatus, status: e.toStatus, at: e.createdAt.toISOString() }))
      : [{ label: row.description, status: row.status, at: row.createdAt.toISOString() }];
    return { ...this.view(row), timeline };
  }

  view(row: Row) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const address = row.withdrawal?.toAddress ?? (typeof meta.address === 'string' ? meta.address : null);
    const confirmations = row.deposit
      ? { current: row.deposit.confirmations, required: row.deposit.requiredConfirmations }
      : null;
    return {
      id: row.reference,
      uuid: row.id,
      type: row.type,
      status: row.status,
      ...(row.withdrawal ? { withdrawalStatus: row.withdrawal.status } : {}),
      direction: row.direction as 'in' | 'out',
      network: row.network,
      amount: usdt(row.amount),
      networkFee: usdtOrNull(row.networkFee),
      platformFee: usdt(row.platformFee),
      netAmount: usdt(row.netAmount),
      addressDisplay: address ? truncateAddress(address) : null,
      txHash: row.txHash,
      txHashDisplay: row.txHash ? truncateAddress(row.txHash) : null,
      confirmations,
      description: row.description,
      statusDetail: typeof meta.statusDetail === 'string' ? meta.statusDetail : null,
      roundId: row.roundId,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      isDemo: row.isDemo,
    };
  }
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
