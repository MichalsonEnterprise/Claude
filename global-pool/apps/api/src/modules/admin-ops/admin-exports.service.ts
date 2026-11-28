import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ADMIN_EXPORT_DATASET_LABEL,
  ADMIN_EXPORT_ROW_LIMIT,
  type AdminExportRequest,
} from '@gp/shared/schemas';

import { AppError } from '../../common/errors';
import { usdt } from '../../common/money';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { addDays, addHours } from '../../common/time';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminFinanceService, atHandle } from './admin-finance.service';
import { maskAddress, maskHandle, sha256Hex, toCsv, type CsvValue } from './csv';

/** Exports are generated on request and offered for download once; the link the UI shows expires after this. */
export const EXPORT_TTL_HOURS = 24;

/**
 * ADM-F9 CSV export: permission `reports.export` + written reason, personal data only with `users.pii.read`,
 * a row limit, a SHA-256 of the file and an audit row (hash-chained) — the file is watermarked in its first line.
 */
@Injectable()
export class AdminExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: AdminFinanceService,
  ) {}

  async export(admin: AuthAdmin, input: AdminExportRequest, meta: RequestMeta, now = new Date()) {
    if (!admin.permissions.includes('reports.export')) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action', {
        missingPermissions: ['reports.export'],
      });
    }
    if (input.includePersonalData && !admin.permissions.includes('users.pii.read')) {
      throw new AppError(
        'FORBIDDEN',
        'Including personal data needs the users.pii.read permission',
        {
          missingPermissions: ['users.pii.read'],
          field: 'includePersonalData',
        },
      );
    }
    const range: Prisma.DateTimeFilter = {
      ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
      ...(input.to ? { lt: addDays(new Date(`${input.to}T00:00:00.000Z`), 1) } : {}),
    };
    const hasRange = Boolean(input.from || input.to);
    const pii = input.includePersonalData;
    const who = (h: string | null | undefined) => (pii ? (atHandle(h) ?? '') : maskHandle(h));
    const addr = (a: string | null | undefined) => (pii ? (a ?? '') : maskAddress(a));

    const rows = await this.countRows(input.dataset, hasRange ? range : undefined);
    if (rows > ADMIN_EXPORT_ROW_LIMIT) {
      throw new AppError(
        'BAD_REQUEST',
        `This export has ${rows.toLocaleString('en-US')} rows — the limit is ${ADMIN_EXPORT_ROW_LIMIT.toLocaleString('en-US')}. Narrow the date range.`,
        { reason: 'export_too_large', rows, limit: ADMIN_EXPORT_ROW_LIMIT },
      );
    }

    let header: string[] = [];
    let data: CsvValue[][] = [];
    const createdAt = hasRange ? { createdAt: range } : {};
    switch (input.dataset) {
      case 'deposits': {
        const list = await this.prisma.deposit.findMany({
          where: hasRange ? { detectedAt: range } : {},
          orderBy: { detectedAt: 'asc' },
          include: { user: { select: { handle: true, publicId: true } } },
        });
        header = [
          'reference',
          'player',
          'network',
          'amount_usdt',
          'status',
          'confirmations',
          'tx_hash',
          'detected_at',
          'credited_at',
          'demo',
        ];
        data = list.map((d) => [
          `DP-${d.number}`,
          who(d.user.handle),
          d.network,
          usdt(d.amount),
          d.status,
          `${d.confirmations}/${d.requiredConfirmations}`,
          d.txHash,
          d.detectedAt.toISOString(),
          d.creditedAt?.toISOString() ?? '',
          d.isDemo,
        ]);
        break;
      }
      case 'withdrawals': {
        const list = await this.prisma.withdrawal.findMany({
          where: createdAt,
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { handle: true } } },
        });
        header = [
          'reference',
          'player',
          'network',
          'to_address',
          'amount_usdt',
          'network_fee_usdt',
          'platform_fee_usdt',
          'net_usdt',
          'status',
          'risk_level',
          'four_eyes',
          'created_at',
          'demo',
        ];
        data = list.map((w) => [
          `WD-${w.number}`,
          who(w.user.handle),
          w.network,
          addr(w.toAddress),
          usdt(w.amount),
          usdt(w.networkFee),
          usdt(w.platformFee),
          usdt(w.netAmount),
          w.status,
          w.riskLevel ?? '',
          w.requiresFourEyes,
          w.createdAt.toISOString(),
          w.isDemo,
        ]);
        break;
      }
      case 'platform_fees': {
        const list = await this.prisma.$queryRaw<
          { day: Date; number: number | null; amount: string; entries: bigint }[]
        >`
          SELECT date_trunc('day', f.created_at) AS day, r.number, SUM(f.amount)::text AS amount, SUM(f.entry_count)::bigint AS entries
          FROM fee_ledger f LEFT JOIN rounds r ON r.id = f.round_id
          WHERE (${input.from ?? null}::date IS NULL OR f.created_at >= ${input.from ?? null}::date)
            AND (${input.to ?? null}::date IS NULL OR f.created_at < (${input.to ?? null}::date + 1))
          GROUP BY 1, 2 ORDER BY 1, 2`;
        header = ['day', 'round', 'qualifying_entries', 'platform_fees_usdt'];
        data = list.map((r) => [
          r.day.toISOString().slice(0, 10),
          r.number ?? '',
          Number(r.entries),
          usdt(r.amount),
        ]);
        break;
      }
      case 'ledger': {
        const list = await this.prisma.ledgerPosting.findMany({
          where: createdAt,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { entries: { include: { account: { select: { code: true, type: true } } } } },
        });
        header = [
          'posting_id',
          'kind',
          'reference',
          'created_at',
          'account_type',
          'account',
          'amount_usdt',
          'demo',
        ];
        data = list.flatMap((p) =>
          p.entries.map((e) => [
            p.id,
            p.kind,
            p.reference ?? '',
            p.createdAt.toISOString(),
            e.account.type,
            pii || !e.account.code.startsWith('user:')
              ? e.account.code
              : `user:•••:${e.account.code.split(':').at(-1)}`,
            usdt(e.amount),
            p.isDemo,
          ]),
        );
        break;
      }
      case 'refunds': {
        const list = await this.prisma.transaction.findMany({
          where: { type: 'refund', ...createdAt },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { handle: true } }, round: { select: { number: true } } },
        });
        header = [
          'reference',
          'round',
          'player',
          'amount_usdt',
          'status',
          'created_at',
          'completed_at',
          'demo',
        ];
        data = list.map((t) => [
          pii ? t.reference : t.reference.replace(/-[0-9a-f-]{36}$/i, '-•••'),
          t.round?.number ?? '',
          who(t.user.handle),
          usdt(t.amount),
          t.status === 'pending' ? 'owed' : t.status === 'completed' ? 'claimed' : t.status,
          t.createdAt.toISOString(),
          t.completedAt?.toISOString() ?? '',
          t.isDemo,
        ]);
        break;
      }
      case 'revenue': {
        const days =
          hasRange && input.from
            ? Math.max(
                1,
                Math.ceil(
                  (now.getTime() - new Date(`${input.from}T00:00:00Z`).getTime()) / 86_400_000,
                ),
              )
            : 30;
        const r = await this.finance.revenue(Math.min(days, 366), now);
        header = ['line', 'source', 'amount_usdt'];
        data = [
          ...r.statement.map((s) => [s.line, s.source, s.amount]),
          ...r.excluded.map((x) => [`Excluded: ${x.line}`, x.why, x.amount ?? '']),
        ];
        break;
      }
      case 'reconciliation': {
        const r = await this.finance.reconciliation(now);
        header = ['scope', 'expected', 'actual', 'difference', 'status', 'note'];
        data = r.scopes.map((s) => [s.scope, s.expected, s.actual, s.difference, s.status, s.note]);
        break;
      }
      case 'rounds': {
        const list = await this.prisma.round.findMany({
          where: createdAt,
          orderBy: { number: 'asc' },
        });
        header = [
          'round',
          'status',
          'closes_at',
          'participants',
          'entries',
          'pool_usdt',
          'platform_fees_usdt',
          'demo',
        ];
        data = list.map((x) => [
          x.number,
          x.status,
          x.closesAt.toISOString(),
          x.participantsCount,
          x.entriesCount,
          usdt(x.poolAmount),
          usdt(x.platformFees),
          x.isDemo,
        ]);
        break;
      }
    }

    const watermark = [
      `# GLOBAL POOL (DEMO / testnet) · ${ADMIN_EXPORT_DATASET_LABEL[input.dataset]} · exported by ${admin.name} · ${now.toISOString()} · personal data ${pii ? 'included' : 'masked'}`,
    ];
    const body = toCsv(header, data);
    const csv = `${watermark.join('')}\r\n${body}`;
    const sha256 = sha256Hex(csv);
    const fileName = `globalpool-${input.dataset.replace(/_/g, '-')}-${now.toISOString().slice(0, 10)}.csv`;
    const audit = await this.audit.record({
      actorType: 'admin',
      actorId: admin.id,
      actorLabel: admin.name,
      action: 'report.exported',
      targetType: 'report',
      targetId: input.dataset,
      reason: input.reason,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: {
        dataset: input.dataset,
        from: input.from ?? null,
        to: input.to ?? null,
        rows: data.length,
        includePersonalData: pii,
        reasonCategory: input.reasonCategory ?? null,
        sha256,
      },
    });
    return {
      fileName,
      dataset: input.dataset,
      rows: data.length,
      bytes: Buffer.byteLength(csv, 'utf8'),
      sha256,
      includePersonalData: pii,
      generatedAt: now.toISOString(),
      expiresAt: addHours(now, EXPORT_TTL_HOURS).toISOString(),
      auditSeq: audit.seq,
      contentType: 'text/csv; charset=utf-8',
      csv,
    };
  }

  private async countRows(dataset: AdminExportRequest['dataset'], range?: Prisma.DateTimeFilter) {
    const createdAt = range ? { createdAt: range } : {};
    switch (dataset) {
      case 'deposits':
        return this.prisma.deposit.count({ where: range ? { detectedAt: range } : {} });
      case 'withdrawals':
        return this.prisma.withdrawal.count({ where: createdAt });
      case 'ledger':
        return this.prisma.ledgerEntry.count({
          where: range ? { posting: { createdAt: range } } : {},
        });
      case 'refunds':
        return this.prisma.transaction.count({ where: { type: 'refund', ...createdAt } });
      case 'rounds':
        return this.prisma.round.count({ where: createdAt });
      case 'platform_fees':
      case 'reconciliation':
      case 'revenue':
        return 0; // aggregates: a handful of rows
    }
  }
}
