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
exports.RestrictionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** Admin-applied account restrictions (applied / lifted with reason + MFA; always audited). */
let RestrictionsService = class RestrictionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async active(userId, db = this.prisma) {
        const rows = await db.userRestriction.findMany({
            where: { userId, liftedAt: null },
            select: { type: true },
        });
        return [...new Set(rows.map((r) => r.type))];
    }
};
exports.RestrictionsService = RestrictionsService;
exports.RestrictionsService = RestrictionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestrictionsService);
//# sourceMappingURL=restrictions.service.js.map