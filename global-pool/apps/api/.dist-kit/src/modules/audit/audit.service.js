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
exports.AuditService = void 0;
exports.redact = redact;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_hash_1 = require("./audit-hash");
/** Advisory-lock key that serialises appends to the audit hash chain. */
const AUDIT_CHAIN_LOCK = 7_262_001;
const REDACTED_KEYS = new Set([
    'password',
    'mfaCode',
    'totpCode',
    'code',
    'refreshToken',
    'secret',
]);
/** Drop secrets from metadata before it is hashed and stored. */
function redact(value) {
    if (Array.isArray(value))
        return value.map(redact);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            k,
            REDACTED_KEYS.has(k) ? '[redacted]' : redact(v),
        ]));
    }
    return value;
}
/**
 * Append-only, hash-chained audit log. Each row stores prev_hash and hash = sha256(prev_hash + row); appends are
 * serialised with a transaction-scoped advisory lock so the chain never forks. UPDATE/DELETE are blocked by DB
 * triggers. Call `record(entry, tx)` inside the business transaction so the audit row commits atomically with it.
 */
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(entry, tx) {
        if (!tx)
            return this.prisma.tx((t) => this.record(entry, t));
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK})`;
        const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' }, select: { hash: true } });
        const createdAt = new Date();
        const metadata = (redact(entry.metadata ?? {}) ?? {});
        const row = {
            prevHash: last?.hash ?? audit_hash_1.GENESIS_HASH,
            actorType: entry.actorType,
            actorId: entry.actorId ?? null,
            actorLabel: entry.actorLabel ?? null,
            action: entry.action,
            targetType: entry.targetType ?? null,
            targetId: entry.targetId ?? null,
            reason: entry.reason ?? null,
            outcome: entry.outcome ?? 'success',
            metadata,
            createdAt,
        };
        const hash = (0, audit_hash_1.auditHash)(row);
        const created = await tx.auditLog.create({
            data: {
                ...row,
                metadata: metadata,
                hash,
                ip: entry.ip ?? null,
                userAgent: entry.userAgent ?? null,
                requestId: entry.requestId ?? null,
            },
            select: { id: true, seq: true, hash: true },
        });
        return { id: created.id, seq: created.seq.toString(), hash: created.hash };
    }
    /** Re-compute the whole chain (batched). */
    async verify(batchSize = 1000) {
        let prev = audit_hash_1.GENESIS_HASH;
        let checked = 0;
        let cursor;
        for (;;) {
            const rows = await this.prisma.auditLog.findMany({
                where: cursor !== undefined ? { seq: { gt: cursor } } : {},
                orderBy: { seq: 'asc' },
                take: batchSize,
            });
            if (rows.length === 0)
                break;
            const result = (0, audit_hash_1.verifyChain)(rows, prev);
            if (!result.ok)
                return { ...result, checked: checked + result.checked, total: checked + rows.length };
            checked += rows.length;
            prev = result.headHash;
            cursor = rows[rows.length - 1].seq;
        }
        return {
            ok: true,
            checked,
            headHash: prev,
            firstBrokenSeq: null,
            problem: null,
            total: checked,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map