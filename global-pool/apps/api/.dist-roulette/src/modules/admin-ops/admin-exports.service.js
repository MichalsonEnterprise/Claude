"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminExportsService = exports.EXPORT_TTL_HOURS = void 0;
const common_1 = require("@nestjs/common");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_1 = require("../../common/money");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const admin_finance_service_1 = require("./admin-finance.service");
const csv_1 = require("./csv");
/** Exports are generated on request and offered for download once; the link the UI shows expires after this. */
exports.EXPORT_TTL_HOURS = 24;
/**
 * ADM-F9 CSV export: permission `reports.export` + written reason, personal data only with `users.pii.read`,
 * a row limit, a SHA-256 of the file and an audit row (hash-chained) — the file is watermarked in its first line.
 */
let AdminExportsService = class AdminExportsService {
    prisma;
    audit;
    finance;
    constructor(prisma, audit, finance) {
        this.prisma = prisma;
        this.audit = audit;
        this.finance = finance;
    }
    async export(admin, input, meta, now = new Date()) {
        if (!admin.permissions.includes('reports.export')) {
            throw new errors_1.AppError('FORBIDDEN', 'Your role does not allow this action', {
                missingPermissions: ['reports.export'],
            });
        }
        if (input.includePersonalData && !admin.permissions.includes('users.pii.read')) {
            throw new errors_1.AppError('FORBIDDEN', 'Including personal data needs the users.pii.read permission', {
                missingPermissions: ['users.pii.read'],
                field: 'includePersonalData',
            });
        }
        const range = {
            ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
            ...(input.to ? { lt: (0, time_1.addDays)(new Date(`${input.to}T00:00:00.000Z`), 1) } : {}),
        };
        const hasRange = Boolean(input.from || input.to);
        const pii = input.includePersonalData;
        const who = (h) => (pii ? ((0, admin_finance_service_1.atHandle)(h) ?? '') : (0, csv_1.maskHandle)(h));
        const addr = (a) => (pii ? (a ?? '') : (0, csv_1.maskAddress)(a));
        const rows = await this.countRows(input.dataset, hasRange ? range : undefined);
        if (rows > schemas_1.ADMIN_EXPORT_ROW_LIMIT) {
            throw new errors_1.AppError('BAD_REQUEST', `This export has ${rows.toLocaleString('en-US')} rows — the limit is ${schemas_1.ADMIN_EXPORT_ROW_LIMIT.toLocaleString('en-US')}. Narrow the date range.`, { reason: 'export_too_large', rows, limit: schemas_1.ADMIN_EXPORT_ROW_LIMIT });
        }
        let header = [];
        let data = [];
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
                    (0, money_1.usdt)(d.amount),
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
                    (0, money_1.usdt)(w.amount),
                    (0, money_1.usdt)(w.networkFee),
                    (0, money_1.usdt)(w.platformFee),
                    (0, money_1.usdt)(w.netAmount),
                    w.status,
                    w.riskLevel ?? '',
                    w.requiresFourEyes,
                    w.createdAt.toISOString(),
                    w.isDemo,
                ]);
                break;
            }
            case 'platform_fees': {
                const list = await this.prisma.$queryRaw `
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
                    (0, money_1.usdt)(r.amount),
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
                data = list.flatMap((p) => p.entries.map((e) => [
                    p.id,
                    p.kind,
                    p.reference ?? '',
                    p.createdAt.toISOString(),
                    e.account.type,
                    pii || !e.account.code.startsWith('user:')
                        ? e.account.code
                        : `user:•••:${e.account.code.split(':').at(-1)}`,
                    (0, money_1.usdt)(e.amount),
                    p.isDemo,
                ]));
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
                    (0, money_1.usdt)(t.amount),
                    t.status === 'pending' ? 'owed' : t.status === 'completed' ? 'claimed' : t.status,
                    t.createdAt.toISOString(),
                    t.completedAt?.toISOString() ?? '',
                    t.isDemo,
                ]);
                break;
            }
            case 'revenue': {
                const days = hasRange && input.from
                    ? Math.max(1, Math.ceil((now.getTime() - new Date(`${input.from}T00:00:00Z`).getTime()) / 86_400_000))
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
                    (0, money_1.usdt)(x.poolAmount),
                    (0, money_1.usdt)(x.platformFees),
                    x.isDemo,
                ]);
                break;
            }
        }
        const watermark = [
            `# GLOBAL POOL (DEMO / testnet) · ${schemas_1.ADMIN_EXPORT_DATASET_LABEL[input.dataset]} · exported by ${admin.name} · ${now.toISOString()} · personal data ${pii ? 'included' : 'masked'}`,
        ];
        const body = (0, csv_1.toCsv)(header, data);
        const csv = `${watermark.join('')}\r\n${body}`;
        const sha256 = (0, csv_1.sha256Hex)(csv);
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
            expiresAt: (0, time_1.addHours)(now, exports.EXPORT_TTL_HOURS).toISOString(),
            auditSeq: audit.seq,
            contentType: 'text/csv; charset=utf-8',
            csv,
        };
    }
    async countRows(dataset, range) {
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
};
exports.AdminExportsService = AdminExportsService;
exports.AdminExportsService = AdminExportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        admin_finance_service_1.AdminFinanceService])
], AdminExportsService);
//# sourceMappingURL=admin-exports.service.js.map