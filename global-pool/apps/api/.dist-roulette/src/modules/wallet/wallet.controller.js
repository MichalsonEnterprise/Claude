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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const wallet_service_1 = require("./wallet.service");
class ClaimOwedDto extends (0, zod_2.createZodDto)(zod_1.z.object({ idempotencyKey: schemas_1.idempotencyKeySchema })) {
}
let WalletController = class WalletController {
    wallet;
    constructor(wallet) {
        this.wallet = wallet;
    }
    balances(user) {
        return this.wallet.balances(user.id);
    }
    status(user) {
        return this.wallet.status(user.id);
    }
    lifetime(user) {
        return this.wallet.lifetime(user.id);
    }
    async claim(user, body) {
        const { replayed, value } = await this.wallet.claimOwed(user.id, body.idempotencyKey);
        return { ...value, replayed };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('balances'),
    (0, swagger_1.ApiOperation)({
        summary: 'Available / Locked / Pending / Owed / Total — computed from the append-only double-entry ledger',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WalletController.prototype, "balances", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Deposits / withdrawals operational status + daily withdrawal limit usage (wallet banners and limit meters)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WalletController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('lifetime'),
    (0, swagger_1.ApiOperation)({ summary: 'Lifetime deposits, withdrawals, entries, platform fees paid, rewards' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WalletController.prototype, "lifetime", null);
__decorate([
    (0, common_1.Post)('owed/claim'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Claim everything owed (refunds, prizes, rewards) to Available (idempotent)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ClaimOwedDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "claim", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('wallet'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('wallet'),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map