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
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("../../common/crypto");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
class ReplayRace extends Error {
}
/**
 * Idempotency for financial writes. The key row is inserted INSIDE the business transaction
 * (`INSERT … ON CONFLICT DO NOTHING`), so a concurrent duplicate blocks on the unique index until the first commits
 * and then replays the stored response. A key reused with a different request body is rejected (409).
 */
let IdempotencyService = class IdempotencyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async run(params, fn) {
        const requestHash = (0, crypto_1.sha256Hex)((0, crypto_1.canonicalJson)(params.request));
        const existing = await this.find(params);
        if (existing)
            return this.replay(existing, requestHash);
        try {
            const value = await this.prisma.tx(async (tx) => {
                const inserted = await tx.$queryRaw `
          INSERT INTO idempotency_keys (id, scope, owner_id, key, request_hash, created_at, updated_at)
          VALUES (gen_random_uuid(), ${params.scope}, ${params.ownerId}, ${params.key}, ${requestHash}, now(), now())
          ON CONFLICT (scope, owner_id, key) DO NOTHING
          RETURNING id::text AS id`;
                const row = inserted[0];
                if (!row)
                    throw new ReplayRace();
                const result = await fn(tx);
                await tx.idempotencyKey.update({
                    where: { id: row.id },
                    data: { response: result, statusCode: 200, completedAt: new Date() },
                });
                return result;
            });
            return { replayed: false, value };
        }
        catch (err) {
            if (!(err instanceof ReplayRace))
                throw err;
            const row = await this.find(params);
            if (!row)
                throw new errors_1.AppError('CONFLICT', 'Concurrent request with the same idempotency key');
            return this.replay(row, requestHash);
        }
    }
    find(params) {
        return this.prisma.idempotencyKey.findUnique({
            where: {
                scope_ownerId_key: { scope: params.scope, ownerId: params.ownerId, key: params.key },
            },
        });
    }
    replay(row, requestHash) {
        if (row.requestHash !== requestHash) {
            throw new errors_1.AppError('IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different request');
        }
        if (!row.completedAt || row.response === null) {
            throw new errors_1.AppError('CONFLICT', 'A request with this idempotency key is still being processed');
        }
        return { replayed: true, value: row.response };
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map