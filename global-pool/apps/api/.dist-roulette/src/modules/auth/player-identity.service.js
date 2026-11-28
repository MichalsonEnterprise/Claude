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
var PlayerIdentityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerIdentityService = exports.NEW_DEVICE_ALERT_WINDOW_DAYS = exports.NEW_DEVICE_REASON = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const privy_service_1 = require("./privy.service");
const LAST_SEEN_RESOLUTION_MS = 5 * 60_000;
/** Session flag for AUTH-21: a sign-in from a device label this player has never used before. */
exports.NEW_DEVICE_REASON = 'new_device';
/** New-device alerts are shown on the player's other devices for this many days. */
exports.NEW_DEVICE_ALERT_WINDOW_DAYS = 14;
/**
 * Maps a verified Privy token to our user + session rows: upsert by `privy_user_id` (Privy DID), sync linked email
 * and wallets, track the Privy session (`sid`) as a device session that the player can revoke.
 */
let PlayerIdentityService = PlayerIdentityService_1 = class PlayerIdentityService {
    prisma;
    privy;
    logger = new common_1.Logger(PlayerIdentityService_1.name);
    constructor(prisma, privy) {
        this.prisma = prisma;
        this.privy = privy;
    }
    async authenticate(token, meta, options = {}) {
        const verified = await this.privy.verify(token);
        let user = await this.prisma.user.findUnique({
            where: { privyUserId: verified.did },
            include: { profile: { select: { country: true } } },
        });
        let created = false;
        if (!user) {
            user = await this.createUser(verified);
            created = true;
        }
        if (user.status === 'closed')
            throw new errors_1.AppError('UNAUTHENTICATED', 'This account is closed');
        if (created || options.forceSync) {
            const linked = await this.privy.linkedAccounts(verified);
            if (linked)
                await this.syncLinkedAccounts(user, linked);
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
                include: { profile: { select: { country: true } } },
            });
        }
        const session = await this.touchSession(user.id, verified, meta);
        return {
            created,
            user: {
                id: user.id,
                privyUserId: verified.did,
                publicId: user.publicId,
                handle: user.handle,
                email: user.email,
                status: user.status,
                onboarded: user.onboardedAt !== null,
                country: user.profile?.country ?? null,
                sessionId: session.id,
                privySessionId: verified.sessionId,
                isDemo: user.isDemo,
            },
        };
    }
    async createUser(verified) {
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                return await this.prisma.user.create({
                    data: {
                        privyUserId: verified.did,
                        publicId: `GP-${(0, node_crypto_1.randomInt)(100_000, 1_000_000)}`,
                        profile: { create: {} },
                    },
                    include: { profile: { select: { country: true } } },
                });
            }
            catch (err) {
                if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    const existing = await this.prisma.user.findUnique({
                        where: { privyUserId: verified.did },
                        include: { profile: { select: { country: true } } },
                    });
                    if (existing)
                        return existing; // concurrent first login
                    continue; // public id collision → retry
                }
                throw err;
            }
        }
        throw new errors_1.AppError('INTERNAL_ERROR', 'Could not allocate a user id');
    }
    /** Sync linked email + wallets from Privy (wallets are upserted, never deleted here). */
    async syncLinkedAccounts(user, linked) {
        if (linked.email && linked.email !== user.email) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { email: linked.email, emailVerified: linked.emailVerified },
            });
        }
        for (const w of linked.wallets) {
            const network = w.chainType === 'solana' ? 'solana' : 'arbitrum';
            const address = w.chainType === 'solana' ? w.address : w.address.toLowerCase();
            await this.prisma.userWallet.upsert({
                where: { userId_network_address: { userId: user.id, network, address } },
                create: {
                    userId: user.id,
                    network,
                    address,
                    source: w.embedded ? 'privy_embedded' : 'privy_linked',
                    walletClient: w.walletClient,
                    verifiedAt: new Date(),
                },
                update: { walletClient: w.walletClient, removedAt: null },
            });
        }
    }
    async touchSession(userId, verified, meta) {
        const existing = await this.prisma.session.findUnique({
            where: { userId_privySessionId: { userId, privySessionId: verified.sessionId } },
        });
        if (existing) {
            if (existing.revokedAt)
                throw new errors_1.AppError('UNAUTHENTICATED', 'This session was signed out');
            if (Date.now() - existing.lastSeenAt.getTime() > LAST_SEEN_RESOLUTION_MS) {
                await this.prisma.session.update({
                    where: { id: existing.id },
                    data: { lastSeenAt: new Date(), ip: meta.ip },
                });
            }
            return existing;
        }
        const label = (0, request_1.deviceLabel)(meta.userAgent);
        // AUTH-21: flag a sign-in from a device this player has never used (not their very first session).
        const [sessionCount, sameDevice] = await Promise.all([
            this.prisma.session.count({ where: { userId, subject: 'user' } }),
            this.prisma.session.count({ where: { userId, subject: 'user', deviceLabel: label } }),
        ]);
        const newDevice = sessionCount > 0 && sameDevice === 0;
        try {
            return await this.prisma.session.create({
                data: {
                    subject: 'user',
                    userId,
                    privySessionId: verified.sessionId,
                    expiresAt: verified.expiresAt,
                    deviceLabel: label,
                    userAgent: meta.userAgent?.slice(0, 512) ?? null,
                    ip: meta.ip,
                    ...(newDevice ? { flagged: true, flaggedReason: exports.NEW_DEVICE_REASON } : {}),
                },
            });
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                const row = await this.prisma.session.findUnique({
                    where: { userId_privySessionId: { userId, privySessionId: verified.sessionId } },
                });
                if (row)
                    return row;
            }
            this.logger.error(`Session create failed: ${String(err)}`);
            throw err;
        }
    }
};
exports.PlayerIdentityService = PlayerIdentityService;
exports.PlayerIdentityService = PlayerIdentityService = PlayerIdentityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        privy_service_1.PrivyService])
], PlayerIdentityService);
//# sourceMappingURL=player-identity.service.js.map