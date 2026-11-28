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
exports.RoundChainController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const round_mirror_service_1 = require("./round-mirror.service");
class ManifestQueryDto extends (0, zod_2.createZodDto)(zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(5000).default(1000),
})) {
}
/** Provable-fairness data of the on-chain mirror (GlobalPoolRounds). Read-only: nothing here changes a round. */
let RoundChainController = class RoundChainController {
    mirror;
    constructor(mirror) {
        this.mirror = mirror;
    }
    status(number) {
        return this.mirror.status(number);
    }
    manifest(number, query) {
        return this.mirror.manifest(number, query.page, query.pageSize);
    }
    payouts(number) {
        return this.mirror.payouts(number);
    }
    myProofs(user, number) {
        return this.mirror.myProofs(user.id, number);
    }
};
exports.RoundChainController = RoundChainController;
__decorate([
    (0, common_1.Get)('chain'),
    (0, swagger_1.ApiOperation)({
        summary: 'On-chain mirror status: contract, steps (open / commit / draw / settle) with tx links, rules hash and roots',
    }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RoundChainController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('manifest'),
    (0, swagger_1.ApiOperation)({
        summary: 'Committed entry leaves in index order (anyone can rebuild the on-chain entries root)',
    }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, ManifestQueryDto]),
    __metadata("design:returntype", void 0)
], RoundChainController.prototype, "manifest", null);
__decorate([
    (0, common_1.Get)('payouts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Payout leaves + Merkle proofs (check each with verifyPayout on-chain)',
    }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RoundChainController.prototype, "payouts", null);
__decorate([
    (0, common_1.Get)('my-proofs'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Your entry receipts: index, entry id, secret salt, commitment and Merkle proof (verifyEntry on-chain)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], RoundChainController.prototype, "myProofs", null);
exports.RoundChainController = RoundChainController = __decorate([
    (0, swagger_1.ApiTags)('pool'),
    (0, common_1.Controller)('pool/rounds/:number'),
    __metadata("design:paramtypes", [round_mirror_service_1.RoundMirrorService])
], RoundChainController);
//# sourceMappingURL=round-chain.controller.js.map