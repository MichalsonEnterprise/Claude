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
exports.AuthService = exports.PRIVACY_VERSION = exports.TERMS_VERSION = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const geo_service_1 = require("../compliance/geo.service");
/** Versions of the legal documents accepted during onboarding (placeholder DEMO documents). */
exports.TERMS_VERSION = '2026-11-demo';
exports.PRIVACY_VERSION = '2026-11-demo';
let AuthService = class AuthService {
    prisma;
    geo;
    audit;
    constructor(prisma, geo, audit) {
        this.prisma = prisma;
        this.geo = geo;
        this.audit = audit;
    }
    /**
     * First-login onboarding: explicit consents (18+, permitted jurisdiction, terms, privacy — never pre-checked;
     * marketing separate) + country of residence + public handle. Required before any gaming or financial action.
     */
    async onboard(user, input, req) {
        if (user.onboarded)
            throw new errors_1.AppError('CONFLICT', 'Onboarding is already complete');
        if (!(await this.geo.isPermitted(input.country))) {
            throw new errors_1.AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your country of residence', {
                country: input.country,
            });
        }
        const region = await this.geo.checkRequest(req);
        if (!region.permitted) {
            throw new errors_1.AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your region', {
                country: region.country,
            });
        }
        const now = new Date();
        try {
            await this.prisma.tx(async (tx) => {
                await tx.user.update({
                    where: { id: user.id },
                    data: { handle: input.handle, onboardedAt: now },
                });
                await tx.userProfile.update({
                    where: { userId: user.id },
                    data: {
                        country: input.country,
                        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null,
                        ageConfirmedAt: now,
                        jurisdictionConfirmedAt: now,
                        termsAcceptedAt: now,
                        termsVersion: exports.TERMS_VERSION,
                        privacyAcceptedAt: now,
                        privacyVersion: exports.PRIVACY_VERSION,
                        marketingOptIn: input.consents.marketingOptIn,
                        marketingOptInAt: input.consents.marketingOptIn ? now : null,
                    },
                });
                await this.audit.record({
                    actorType: 'user',
                    actorId: user.id,
                    actorLabel: input.handle,
                    action: 'user.onboarding.completed',
                    targetType: 'user',
                    targetId: user.id,
                    metadata: {
                        country: input.country,
                        termsVersion: exports.TERMS_VERSION,
                        privacyVersion: exports.PRIVACY_VERSION,
                        consents: input.consents,
                    },
                }, tx);
            });
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new errors_1.AppError('CONFLICT', 'This handle is already taken', { field: 'handle' });
            }
            throw err;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geo_service_1.GeoService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map