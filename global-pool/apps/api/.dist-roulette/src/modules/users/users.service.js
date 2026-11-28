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
exports.UsersService = void 0;
exports.maskEmail = maskEmail;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const limits_1 = require("@gp/shared/limits");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const geo_service_1 = require("../compliance/geo.service");
function maskEmail(email) {
    if (!email)
        return null;
    const [local, domain] = email.split('@');
    if (!local || !domain)
        return null;
    return `${local[0]}•••@${domain}`;
}
let UsersService = class UsersService {
    prisma;
    geo;
    constructor(prisma, geo) {
        this.prisma = prisma;
        this.geo = geo;
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                totpSecret: { select: { status: true } },
                kycRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const p = user.profile;
        const country = p?.country ?? null;
        const kycLevel = p?.kycLevel ?? 'none';
        const kycStatus = user.kycRecords[0]?.status ?? 'not_started';
        return {
            id: user.id,
            publicId: user.publicId,
            handle: user.handle,
            displayHandle: user.handle ? `@${user.handle}` : null,
            displayName: p?.displayName ?? null,
            email: user.email,
            emailMasked: maskEmail(user.email),
            emailVerified: user.emailVerified,
            status: user.status,
            onboarded: user.onboardedAt !== null,
            onboardingRequired: user.onboardedAt === null,
            onboardedAt: user.onboardedAt?.toISOString() ?? null,
            country: country
                ? {
                    code: country,
                    name: this.geo.countryName(country),
                    permitted: await this.geo.isPermitted(country),
                }
                : null,
            kyc: {
                level: kycLevel,
                status: kycStatus,
                label: kycLevel === 'none'
                    ? 'Not verified'
                    : `${enums_1.KYC_LEVEL_LABEL[kycLevel].split(' — ')[0]} — ${kycStatus === 'verified' ? 'Verified' : kycStatus}`,
            },
            vip: { tier: p?.vipTier ?? 'bronze', level: p?.vipLevel ?? 1, points: p?.vipPoints ?? 0 },
            security: {
                twoFactorEnabled: user.totpSecret?.status === 'active',
                twoFactorMethod: user.totpSecret?.status === 'active' ? 'authenticator_app' : null,
                antiPhishingCode: p?.antiPhishingCode ?? null,
            },
            consents: {
                ageConfirmedAt: p?.ageConfirmedAt?.toISOString() ?? null,
                jurisdictionConfirmedAt: p?.jurisdictionConfirmedAt?.toISOString() ?? null,
                termsAcceptedAt: p?.termsAcceptedAt?.toISOString() ?? null,
                termsVersion: p?.termsVersion ?? null,
                privacyAcceptedAt: p?.privacyAcceptedAt?.toISOString() ?? null,
                privacyVersion: p?.privacyVersion ?? null,
                marketingOptIn: p?.marketingOptIn ?? false,
            },
            isDemo: user.isDemo,
            createdAt: user.createdAt.toISOString(),
        };
    }
    async updateProfile(userId, input) {
        await this.prisma.userProfile.update({
            where: { userId },
            data: {
                ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
                ...(input.marketingOptIn !== undefined
                    ? {
                        marketingOptIn: input.marketingOptIn,
                        marketingOptInAt: input.marketingOptIn ? new Date() : null,
                    }
                    : {}),
            },
        });
        return this.me(userId);
    }
    async sessions(user) {
        const rows = await this.prisma.session.findMany({
            where: { userId: user.id, subject: 'user', revokedAt: null },
            orderBy: { lastSeenAt: 'desc' },
        });
        return rows.map((s) => ({
            id: s.id,
            device: s.deviceLabel ?? 'Unknown device',
            ip: s.ip,
            location: s.location,
            current: s.id === user.sessionId,
            flagged: s.flagged,
            flaggedReason: s.flaggedReason,
            lastSeenAt: s.lastSeenAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
            isDemo: s.isDemo,
        }));
    }
    async revokeSession(user, sessionId, reason = 'revoked_by_user') {
        const row = await this.prisma.session.findFirst({
            where: { id: sessionId, userId: user.id, revokedAt: null },
        });
        if (!row)
            throw (0, errors_1.notFound)('Session');
        await this.prisma.session.update({
            where: { id: row.id },
            data: { revokedAt: new Date(), revokedReason: reason },
        });
        return { revoked: true, current: row.id === user.sessionId };
    }
    async wallets(userId) {
        const rows = await this.prisma.userWallet.findMany({
            where: { userId, removedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        const now = new Date();
        return rows.map((w) => ({
            id: w.id,
            network: w.network,
            address: w.address,
            source: w.source,
            walletClient: w.walletClient,
            label: w.label,
            isPrimary: w.isPrimary,
            verified: w.verifiedAt !== null,
            whitelisted: w.whitelistedAt !== null,
            whitelistedAt: w.whitelistedAt?.toISOString() ?? null,
            usableForWithdrawalsFrom: w.whitelistAvailableAt?.toISOString() ?? null,
            inCooldown: Boolean(w.whitelistAvailableAt && w.whitelistAvailableAt > now),
            isDemo: w.isDemo,
        }));
    }
    /** Whitelist a withdrawal destination (step-up checked by the controller). New addresses cool down 24 h. */
    async whitelist(userId, input) {
        const address = (0, schemas_1.normalizeAddress)(input.network, input.address);
        const key = input.network === 'solana' ? address : address.toLowerCase();
        const now = new Date();
        const row = await this.prisma.userWallet.upsert({
            where: { userId_network_address: { userId, network: input.network, address: key } },
            create: {
                userId,
                network: input.network,
                address: key,
                source: 'manual',
                label: input.label ?? null,
                whitelistedAt: now,
                whitelistAvailableAt: (0, time_1.addHours)(now, limits_1.NEW_ADDRESS_COOLDOWN_HOURS),
            },
            update: {
                label: input.label ?? undefined,
                removedAt: null,
                whitelistedAt: now,
                whitelistAvailableAt: (0, time_1.addHours)(now, limits_1.NEW_ADDRESS_COOLDOWN_HOURS),
            },
        });
        return (await this.wallets(userId)).find((w) => w.id === row.id);
    }
    async removeFromWhitelist(userId, walletId) {
        const row = await this.prisma.userWallet.findFirst({ where: { id: walletId, userId } });
        if (!row)
            throw (0, errors_1.notFound)('Wallet');
        if (!row.whitelistedAt)
            throw new errors_1.AppError('BAD_REQUEST', 'This address is not whitelisted');
        await this.prisma.userWallet.update({
            where: { id: row.id },
            data: {
                whitelistedAt: null,
                whitelistAvailableAt: null,
                ...(row.source === 'manual' ? { removedAt: new Date() } : {}),
            },
        });
        return { removed: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geo_service_1.GeoService])
], UsersService);
//# sourceMappingURL=users.service.js.map