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
var PoolGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const pool_events_service_1 = require("./pool-events.service");
const rounds_service_1 = require("./rounds.service");
/**
 * Live pool updates for the UI (socket.io namespace `/pool`):
 *  - `pool:snapshot` on connect / on `pool:subscribe` (current round summary)
 *  - `pool:update`   after every entry purchase (entries, participants, pool balance, platform fees)
 *  - `round:status`  on lifecycle changes (open, closed, drawing, settled, cancelled)
 * Read-only: clients cannot send anything that changes state.
 */
let PoolGateway = PoolGateway_1 = class PoolGateway {
    events;
    rounds;
    logger = new common_1.Logger(PoolGateway_1.name);
    subscription;
    server;
    constructor(events, rounds) {
        this.events = events;
        this.rounds = rounds;
    }
    afterInit() {
        this.subscription = this.events.events$.subscribe((event) => {
            if (event.type === 'pool.update')
                this.server.emit('pool:update', event);
            else
                this.server.emit('round:status', event);
        });
    }
    async handleConnection(client) {
        try {
            client.emit('pool:snapshot', await this.snapshot());
        }
        catch (err) {
            this.logger.warn(`snapshot failed: ${String(err)}`);
        }
    }
    async onSubscribe(client, _body) {
        client.emit('pool:snapshot', await this.snapshot());
        return { ok: true };
    }
    onModuleDestroy() {
        this.subscription?.unsubscribe();
    }
    async snapshot() {
        const round = await this.rounds.current();
        if (!round)
            return { round: null };
        const v = this.rounds.view(round);
        return {
            round: {
                id: v.id,
                number: v.number,
                status: v.status,
                closesAt: v.closesAt,
                entries: v.entries,
                participants: v.participants,
                poolBalance: v.poolBalance,
                platformFees: v.platformFees,
                isDemo: v.isDemo,
            },
        };
    }
};
exports.PoolGateway = PoolGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], PoolGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('pool:subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], PoolGateway.prototype, "onSubscribe", null);
exports.PoolGateway = PoolGateway = PoolGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/pool', transports: ['websocket', 'polling'] }),
    __metadata("design:paramtypes", [pool_events_service_1.PoolEventsService,
        rounds_service_1.RoundsService])
], PoolGateway);
//# sourceMappingURL=pool.gateway.js.map