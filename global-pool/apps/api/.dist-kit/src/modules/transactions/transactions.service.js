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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const format_1 = require("@gp/shared/format");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_1 = require("../../common/money");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** User-facing activity history. Balances never come from here — only from the ledger. */
let TransactionsService = class TransactionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(db, data) {
        return db.transaction.create({ data });
    }
    async list(userId, query) {
        const where = {
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
        return (0, schemas_1.paginate)(rows.map((r) => this.view(r)), total, query);
    }
    async get(userId, reference) {
        const row = await this.prisma.transaction.findFirst({
            where: { userId, OR: [{ reference }, ...(isUuid(reference) ? [{ id: reference }] : [])] },
            include: {
                withdrawal: { include: { events: { orderBy: { createdAt: 'asc' } } } },
                deposit: true,
            },
        });
        if (!row)
            throw (0, errors_1.notFound)('Transaction');
        const timeline = row.withdrawal
            ? row.withdrawal.events.map((e) => ({
                label: e.note ?? e.toStatus,
                status: e.toStatus,
                at: e.createdAt.toISOString(),
            }))
            : [{ label: row.description, status: row.status, at: row.createdAt.toISOString() }];
        return { ...this.view(row), timeline };
    }
    view(row) {
        const meta = (row.metadata ?? {});
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
            direction: row.direction,
            network: row.network,
            amount: (0, money_1.usdt)(row.amount),
            networkFee: (0, money_1.usdtOrNull)(row.networkFee),
            platformFee: (0, money_1.usdt)(row.platformFee),
            netAmount: (0, money_1.usdt)(row.netAmount),
            addressDisplay: address ? (0, format_1.truncateAddress)(address) : null,
            txHash: row.txHash,
            txHashDisplay: row.txHash ? (0, format_1.truncateAddress)(row.txHash) : null,
            confirmations,
            description: row.description,
            statusDetail: typeof meta.statusDetail === 'string' ? meta.statusDetail : null,
            roundId: row.roundId,
            createdAt: row.createdAt.toISOString(),
            completedAt: row.completedAt?.toISOString() ?? null,
            isDemo: row.isDemo,
        };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
function isUuid(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
//# sourceMappingURL=transactions.service.js.map