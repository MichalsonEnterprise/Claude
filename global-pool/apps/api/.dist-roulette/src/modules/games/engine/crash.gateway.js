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
var CrashGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const fair_1 = require("@gp/shared/fair");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../../common/errors");
const geo_service_1 = require("../../compliance/geo.service");
const restrictions_service_1 = require("../../compliance/restrictions.service");
const player_identity_service_1 = require("../../auth/player-identity.service");
const crash_service_1 = require("./crash.service");
/**
 * Orbit Rush live rounds — socket.io namespace `/crash`.
 * Server → client: `crash:snapshot` (on connect / `crash:subscribe`), `crash:phase` (betting / running), `crash:tick`
 * (every 100 ms frame: multiplier), `crash:bet`, `crash:cashout`, `crash:crashed` (crash point + revealed seed).
 * Client → server (authenticated with `auth.token` = player bearer token): `crash:bet` and `crash:cashout`, answered
 * through the ack callback with `{ ok: true, bet }` or `{ ok: false, error }` (shared error envelope). The same
 * policy as the REST routes applies (onboarding, restrictions, region, self-exclusion, RG limits, DEMO credits).
 * Auto cash-out runs on the server, so a dropped connection never loses an armed target.
 */
let CrashGateway = CrashGateway_1 = class CrashGateway {
    engine;
    identity;
    restrictions;
    geo;
    logger = new common_1.Logger(CrashGateway_1.name);
    subscription;
    server;
    constructor(engine, identity, restrictions, geo) {
        this.engine = engine;
        this.identity = identity;
        this.restrictions = restrictions;
        this.geo = geo;
    }
    afterInit() {
        this.subscription = this.engine.events$.subscribe((e) => {
            switch (e.type) {
                case 'phase':
                    this.server.emit('crash:phase', e.round);
                    break;
                case 'tick':
                    this.server.emit('crash:tick', e);
                    break;
                case 'bet':
                    this.server.emit('crash:bet', e);
                    break;
                case 'cashout':
                    this.server.emit('crash:cashout', e);
                    break;
                case 'crashed':
                    this.server.emit('crash:crashed', e.round);
                    break;
            }
        });
    }
    onModuleDestroy() {
        this.subscription?.unsubscribe();
    }
    async handleConnection(client) {
        const token = this.tokenOf(client);
        if (token) {
            try {
                const { user } = await this.identity.authenticate(token, {
                    ip: client.handshake.address ?? null,
                    userAgent: client.handshake.headers['user-agent'] ?? null,
                    requestId: null,
                });
                client.data.user = user;
            }
            catch {
                client.emit('crash:auth', { ok: false });
            }
        }
        try {
            client.emit('crash:snapshot', await this.engine.snapshot());
        }
        catch (err) {
            this.logger.warn(`snapshot failed: ${String(err)}`);
        }
    }
    async onSubscribe(client) {
        client.emit('crash:snapshot', await this.engine.snapshot());
        return { ok: true };
    }
    async onBet(client, body) {
        return this.run(client, async (user) => {
            const parsed = fair_1.crashBetSchema.safeParse(body);
            if (!parsed.success)
                throw new errors_1.AppError('VALIDATION_FAILED', 'Invalid bet');
            await this.assertPolicy(client, user, true);
            return { bet: await this.engine.placeBet(user, parsed.data) };
        });
    }
    async onCashOut(client, body) {
        return this.run(client, async (user) => {
            const b = (body ?? {});
            const parsed = fair_1.cashOutSchema.safeParse(body);
            if (!parsed.success || typeof b.betId !== 'string') {
                throw new errors_1.AppError('VALIDATION_FAILED', 'betId and idempotencyKey are required');
            }
            await this.assertPolicy(client, user, false);
            return { bet: await this.engine.cashOut(user, b.betId, parsed.data) };
        });
    }
    tokenOf(client) {
        const auth = client.handshake.auth;
        if (typeof auth?.token === 'string' && auth.token)
            return auth.token;
        const header = client.handshake.headers.authorization;
        return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
    }
    /** Same checks as GAMING_POLICY on the REST routes (cash-out of an existing bet only needs the account). */
    async assertPolicy(client, user, newStake) {
        if (!user.onboarded)
            throw new errors_1.AppError('ONBOARDING_REQUIRED', 'Finish setting up your account first');
        const active = await this.restrictions.active(user.id);
        const blocked = active.find((r) => r === 'account_suspended' || (newStake && r === 'gaming_blocked'));
        if (blocked) {
            throw new errors_1.AppError('FORBIDDEN', 'This action is restricted on your account — contact support', {
                restriction: blocked,
            });
        }
        if (newStake) {
            const headers = client.handshake.headers;
            const shim = {
                get: (name) => {
                    const v = headers[name.toLowerCase()];
                    return Array.isArray(v) ? v[0] : v;
                },
            };
            await this.geo.assertPermitted(shim, user.country);
        }
    }
    async run(client, fn) {
        const user = client.data.user;
        try {
            if (!user)
                throw new errors_1.AppError('UNAUTHENTICATED', 'Sign in to place bets');
            return { ok: true, ...(await fn(user)) };
        }
        catch (err) {
            if (err instanceof errors_1.AppError)
                return { ok: false, ...err.getResponse() };
            this.logger.error(`crash socket action failed: ${String(err)}`);
            return { ok: false, ...(0, schemas_1.makeErrorEnvelope)('INTERNAL_ERROR', 'Something went wrong') };
        }
    }
};
exports.CrashGateway = CrashGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], CrashGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('crash:subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], CrashGateway.prototype, "onSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('crash:bet'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], CrashGateway.prototype, "onBet", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('crash:cashout'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], CrashGateway.prototype, "onCashOut", null);
exports.CrashGateway = CrashGateway = CrashGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/crash', transports: ['websocket', 'polling'] }),
    __metadata("design:paramtypes", [crash_service_1.CrashEngineService,
        player_identity_service_1.PlayerIdentityService,
        restrictions_service_1.RestrictionsService,
        geo_service_1.GeoService])
], CrashGateway);
//# sourceMappingURL=crash.gateway.js.map