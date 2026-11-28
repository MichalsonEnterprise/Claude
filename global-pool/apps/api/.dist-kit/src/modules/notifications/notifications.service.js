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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = exports.NOTIFICATION_CATEGORY_FILTERS = void 0;
exports.categoryOf = categoryOf;
const common_1 = require("@nestjs/common");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const email_service_1 = require("../email/email.service");
exports.NOTIFICATION_CATEGORY_FILTERS = [
    'security',
    'transactions',
    'rounds',
    'promotions',
    'account',
];
const CATEGORY_PREFIXES = {
    security: ['security.'],
    transactions: ['deposit.', 'withdrawal.'],
    rounds: ['round.'],
    promotions: ['promo.', 'vip.', 'reward.'],
    account: ['account.', 'kyc.'],
};
/** Category of a notification type (prefix before the first dot). */
function categoryOf(type) {
    for (const [cat, prefixes] of Object.entries(CATEGORY_PREFIXES)) {
        if (prefixes.some((p) => type.startsWith(p)))
            return cat;
    }
    return 'account';
}
function categoryWhere(category) {
    return { OR: CATEGORY_PREFIXES[category].map((p) => ({ type: { startsWith: p } })) };
}
let NotificationsService = class NotificationsService {
    prisma;
    email;
    constructor(prisma, email) {
        this.prisma = prisma;
        this.email = email;
    }
    /** In-app notification (inside the caller's DB transaction) + queued email for email-worthy types. */
    async notify(db, input) {
        const row = await db.notification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                body: input.body,
                data: input.data ?? {},
                isDemo: input.isDemo ?? false,
            },
        });
        // Never blocks or fails the business transaction; the worker retries until the row is committed.
        void this.email?.enqueueForNotification(row.id, row.type);
        return row;
    }
    async list(userId, query) {
        const where = {
            userId,
            ...(query.unread ? { readAt: null } : {}),
            ...(query.category ? categoryWhere(query.category) : {}),
        };
        const [rows, total, unread, counts] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { userId, readAt: null } }),
            this.categoryCounts(userId),
        ]);
        return {
            ...(0, schemas_1.paginate)(rows.map((n) => ({
                id: n.id,
                type: n.type,
                category: categoryOf(n.type),
                title: n.title,
                body: n.body,
                data: n.data,
                read: n.readAt !== null,
                createdAt: n.createdAt.toISOString(),
                isDemo: n.isDemo,
            })), total, query),
            unread,
            counts,
        };
    }
    /** Per-category totals for the USR-02 filter chips (All / Unread / Security / Transactions / Rounds / Promotions). */
    async categoryCounts(userId) {
        const rows = await this.prisma.notification.groupBy({
            by: ['type'],
            where: { userId },
            _count: { _all: true },
        });
        const counts = {
            all: 0,
            security: 0,
            transactions: 0,
            rounds: 0,
            promotions: 0,
            account: 0,
        };
        for (const r of rows) {
            counts.all += r._count._all;
            counts[categoryOf(r.type)] += r._count._all;
        }
        return counts;
    }
    async markRead(userId, id) {
        const res = await this.prisma.notification.updateMany({
            where: { id, userId, readAt: null },
            data: { readAt: new Date() },
        });
        if (res.count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId } }))) {
            throw (0, errors_1.notFound)('Notification');
        }
        return { read: true };
    }
    async markAllRead(userId) {
        const res = await this.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
        return { updated: res.count };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map