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
var PrivyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivyService = exports.MOCK_AUDIENCE = exports.MOCK_ISSUER = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const server_auth_1 = require("@privy-io/server-auth");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
exports.MOCK_ISSUER = 'privy.io';
exports.MOCK_AUDIENCE = 'gp-dev-mock';
/**
 * Verifies player access tokens.
 * - `privy` mode: ES256 Privy access tokens via @privy-io/server-auth (PRIVY_APP_ID / PRIVY_APP_SECRET,
 *   optional PRIVY_VERIFICATION_KEY to verify offline without fetching the key).
 * - `mock` mode (PRIVY_MOCK=true or no app id, never in production): HS256 tokens signed locally with
 *   PRIVY_MOCK_SIGNING_SECRET, so dev and e2e run fully offline.
 */
let PrivyService = PrivyService_1 = class PrivyService {
    config;
    jwt;
    logger = new common_1.Logger(PrivyService_1.name);
    client = null;
    constructor(config, jwt) {
        this.config = config;
        this.jwt = jwt;
        const mode = config.playerAuthMode;
        if (mode === 'disabled') {
            this.logger.error('Player auth is DISABLED: PRIVY_APP_ID is not set (or PRIVY_MOCK=true) and the DEV MOCK is refused in production.');
        }
        else if (mode === 'mock') {
            this.logger.warn('Player auth runs in DEV MOCK mode (locally signed tokens) — never use in production.');
        }
    }
    get mode() {
        return this.config.playerAuthMode;
    }
    async verify(token) {
        switch (this.mode) {
            case 'disabled':
                throw new errors_1.AppError('SERVICE_UNAVAILABLE', 'Player sign-in is not configured');
            case 'mock':
                return this.verifyMock(token);
            case 'privy':
                return this.verifyPrivy(token);
        }
    }
    /** Linked email / wallets for a Privy user (real mode: Privy REST API; mock mode: from the token claims). */
    async linkedAccounts(verified) {
        if (verified.mock)
            return verified.mockLinked ?? null;
        try {
            const user = await this.privy().getUserById(verified.did);
            const email = user.linkedAccounts.find((a) => a.type === 'email');
            const wallets = user.linkedAccounts.filter((a) => a.type === 'wallet');
            return {
                email: email && 'address' in email ? email.address.toLowerCase() : null,
                emailVerified: Boolean(email),
                wallets: wallets.flatMap((w) => 'address' in w && (w.chainType === 'ethereum' || w.chainType === 'solana')
                    ? [
                        {
                            address: w.address,
                            chainType: w.chainType,
                            walletClient: w.walletClientType ?? null,
                            embedded: w.walletClientType === 'privy',
                        },
                    ]
                    : []),
            };
        }
        catch (err) {
            // Sync is best effort: never block login because the Privy API is slow / rate-limited.
            this.logger.warn(`Privy linked-account sync failed for ${verified.did}: ${String(err)}`);
            return null;
        }
    }
    /** Issue a DEV MOCK access token (mock mode only). */
    async issueMockToken(input) {
        if (this.mode !== 'mock')
            throw new errors_1.AppError('FORBIDDEN', 'Mock tokens are only available in DEV MOCK mode');
        const did = input.did ?? `did:privy:mock-${(0, node_crypto_1.randomUUID)()}`;
        const sessionId = input.sessionId ?? `mock-sid-${(0, node_crypto_1.randomUUID)()}`;
        const ttl = input.ttlSeconds ?? 3600;
        const claims = {
            sub: did,
            sid: sessionId,
            gp_mock: true,
            ...(input.email ? { email: input.email.toLowerCase() } : {}),
            ...(input.wallets?.length ? { wallets: input.wallets } : {}),
        };
        const token = await this.jwt.signAsync(claims, {
            secret: this.config.env.PRIVY_MOCK_SIGNING_SECRET,
            algorithm: 'HS256',
            issuer: exports.MOCK_ISSUER,
            audience: exports.MOCK_AUDIENCE,
            expiresIn: ttl,
        });
        return { token, did, sessionId, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
    }
    async verifyMock(token) {
        let claims;
        try {
            claims = await this.jwt.verifyAsync(token, {
                secret: this.config.env.PRIVY_MOCK_SIGNING_SECRET,
                algorithms: ['HS256'],
                issuer: exports.MOCK_ISSUER,
                audience: exports.MOCK_AUDIENCE,
            });
        }
        catch {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Invalid or expired session token');
        }
        if (!claims.sub?.startsWith('did:privy:') || !claims.sid || claims.gp_mock !== true) {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Invalid session token');
        }
        return {
            did: claims.sub,
            sessionId: claims.sid,
            issuedAt: new Date(claims.iat * 1000),
            expiresAt: new Date(claims.exp * 1000),
            mock: true,
            mockLinked: {
                email: claims.email ?? null,
                emailVerified: Boolean(claims.email),
                wallets: (claims.wallets ?? []).map((w) => ({
                    ...w,
                    walletClient: 'mock',
                    embedded: false,
                })),
            },
        };
    }
    async verifyPrivy(token) {
        try {
            const claims = await this.privy().verifyAuthToken(token, this.config.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, '\n'));
            if (claims.appId !== this.config.env.PRIVY_APP_ID)
                throw new Error('aud mismatch');
            return {
                did: claims.userId,
                sessionId: claims.sessionId,
                issuedAt: new Date(claims.issuedAt * 1000),
                expiresAt: new Date(claims.expiration * 1000),
                mock: false,
            };
        }
        catch {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Invalid or expired session token');
        }
    }
    privy() {
        if (!this.client) {
            const { PRIVY_APP_ID, PRIVY_APP_SECRET } = this.config.env;
            if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
                throw new errors_1.AppError('SERVICE_UNAVAILABLE', 'Privy is not configured (PRIVY_APP_ID / PRIVY_APP_SECRET)');
            }
            this.client = new server_auth_1.PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
        }
        return this.client;
    }
};
exports.PrivyService = PrivyService;
exports.PrivyService = PrivyService = PrivyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig,
        jwt_1.JwtService])
], PrivyService);
//# sourceMappingURL=privy.service.js.map