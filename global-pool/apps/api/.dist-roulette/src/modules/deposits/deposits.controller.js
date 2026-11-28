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
exports.DevDepositsController = exports.DepositsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const demo_only_guard_1 = require("../../common/demo-only.guard");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const demo_deposits_service_1 = require("./demo-deposits.service");
const deposit_address_service_1 = require("./deposit-address.service");
const deposits_service_1 = require("./deposits.service");
class DepositAddressQueryDto extends (0, zod_1.createZodDto)(schemas_1.depositAddressRequestSchema) {
}
class PaginationDto extends (0, zod_1.createZodDto)(schemas_1.paginationQuerySchema) {
}
class SimulateDepositDto extends (0, zod_1.createZodDto)(schemas_1.demoDepositSimulationSchema) {
}
class AdvanceDepositDto extends (0, zod_1.createZodDto)(schemas_1.demoDepositAdvanceSchema) {
}
/**
 * Only NEW deposits (the address, the DEMO simulation) need the deposit policy (region, not self-excluded, no
 * `deposits_blocked`). History and tracking of deposits already sent stay available during a break, abroad or under
 * a deposit block, like withdrawals (API.md: "withdrawals and history stay available").
 */
let DepositsController = class DepositsController {
    addresses;
    deposits;
    demo;
    constructor(addresses, deposits, demo) {
        this.addresses = addresses;
        this.deposits = deposits;
        this.demo = demo;
    }
    address(user, query) {
        return this.addresses.forUser(user.id, query.network);
    }
    list(user, query) {
        return this.deposits.list(user.id, query);
    }
    byReference(user, reference) {
        return this.demo.byReference(user.id, reference);
    }
};
exports.DepositsController = DepositsController;
__decorate([
    (0, common_1.Get)('address'),
    (0, guards_1.PlayerPolicy)(guards_1.DEPOSIT_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Your per-user deposit address (HD-derived, Arbitrum Sepolia test-USDT)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, DepositAddressQueryDto]),
    __metadata("design:returntype", void 0)
], DepositsController.prototype, "address", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Your deposits with confirmation progress' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PaginationDto]),
    __metadata("design:returntype", void 0)
], DepositsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('ref/:reference'),
    (0, swagger_1.ApiOperation)({ summary: 'One deposit by its reference (DP-77412) with confirmation progress' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DepositsController.prototype, "byReference", null);
exports.DepositsController = DepositsController = __decorate([
    (0, swagger_1.ApiTags)('deposits'),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('deposits'),
    __metadata("design:paramtypes", [deposit_address_service_1.DepositAddressService,
        deposits_service_1.DepositsService,
        demo_deposits_service_1.DemoDepositsService])
], DepositsController);
let DevDepositsController = class DevDepositsController {
    deposits;
    demo;
    constructor(deposits, demo) {
        this.deposits = deposits;
        this.demo = demo;
    }
    async simulate(user, body) {
        if (body.mode === 'progressive') {
            const { replayed, value } = await this.demo.simulateDetected(user.id, body);
            return { ...value, replayed };
        }
        const { replayed, value } = await this.deposits.simulate(user.id, body);
        return { ...value, replayed };
    }
    advance(user, reference, body) {
        return this.demo.advance(user.id, reference, body.confirmations);
    }
};
exports.DevDepositsController = DevDepositsController;
__decorate([
    (0, common_1.Post)('simulate'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerPolicy)(guards_1.DEPOSIT_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'DEMO only: simulate a confirmed test-USDT deposit (same ledger postings as a real one; idempotent)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SimulateDepositDto]),
    __metadata("design:returntype", Promise)
], DevDepositsController.prototype, "simulate", null);
__decorate([
    (0, common_1.Post)(':reference/confirmations'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'DEMO only: add simulated confirmations to a progressive DEMO deposit (credited once the requirement is met)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reference')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, AdvanceDepositDto]),
    __metadata("design:returntype", void 0)
], DevDepositsController.prototype, "advance", null);
exports.DevDepositsController = DevDepositsController = __decorate([
    (0, demo_only_guard_1.DemoOnly)(),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('dev/deposits'),
    __metadata("design:paramtypes", [deposits_service_1.DepositsService,
        demo_deposits_service_1.DemoDepositsService])
], DevDepositsController);
//# sourceMappingURL=deposits.controller.js.map