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
exports.DevWithdrawalsController = exports.WithdrawalsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const demo_only_guard_1 = require("../../common/demo-only.guard");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const step_up_service_1 = require("../security/step-up.service");
const withdrawal_precheck_service_1 = require("./withdrawal-precheck.service");
const withdrawals_service_1 = require("./withdrawals.service");
class WithdrawalRequestDto extends (0, zod_2.createZodDto)(schemas_1.withdrawalRequestSchema) {
}
class QuoteQueryDto extends (0, zod_2.createZodDto)(zod_1.z.object({ amount: schemas_1.positiveUsdtAmountSchema, network: schemas_1.enabledChainKeySchema })) {
}
class PaginationDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema) {
}
class PrecheckQueryDto extends (0, zod_2.createZodDto)(schemas_1.withdrawalPrecheckQuerySchema) {
}
let WithdrawalsController = class WithdrawalsController {
    withdrawals;
    audit;
    prechecks;
    constructor(withdrawals, audit, prechecks) {
        this.withdrawals = withdrawals;
        this.audit = audit;
        this.prechecks = prechecks;
    }
    quote(query) {
        return this.withdrawals.quote(query.amount, query.network);
    }
    precheck(user, query) {
        return this.prechecks.precheck(user, query);
    }
    byReference(user, reference) {
        return this.prechecks.byReference(user.id, reference);
    }
    async request(user, body, stepUpToken) {
        const result = await this.withdrawals.request(user, body, stepUpToken ?? null);
        if (!result.replayed) {
            await this.audit.record({
                actorType: 'user',
                actorId: user.id,
                actorLabel: user.handle,
                action: 'withdrawal.requested',
                targetType: 'withdrawal',
                targetId: result.id,
                metadata: {
                    reference: result.reference,
                    amount: result.amount,
                    network: result.network,
                    status: result.status,
                },
            });
        }
        return result;
    }
    list(user, query) {
        return this.withdrawals.list(user.id, query);
    }
    get(user, id) {
        return this.withdrawals.get(user.id, id);
    }
    cancel(user, id) {
        return this.withdrawals.cancel(user, id);
    }
};
exports.WithdrawalsController = WithdrawalsController;
__decorate([
    (0, common_1.Get)('quote'),
    (0, swagger_1.ApiOperation)({
        summary: 'Fee breakdown: network fee (deducted), platform fee 0.00, you receive',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QuoteQueryDto]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "quote", null);
__decorate([
    (0, common_1.Get)('precheck'),
    (0, swagger_1.ApiOperation)({
        summary: 'Read-only risk validation before 2FA: KYC, limits, balance, account security, AML preview, address risk, network',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PrecheckQueryDto]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "precheck", null);
__decorate([
    (0, common_1.Get)('ref/:reference'),
    (0, swagger_1.ApiOperation)({ summary: 'One withdrawal by its reference (WD-20931) with its screening checks' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "byReference", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiHeader)({
        name: step_up_service_1.STEP_UP_HEADER,
        required: false,
        description: 'Step-up token (purpose withdrawal) — or send totpCode',
    }),
    (0, swagger_1.ApiOperation)({
        summary: 'Request a withdrawal (idempotent): step-up 2FA, KYC daily limit, AVAILABLE → LOCKED, risk/AML screening',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WithdrawalRequestDto, String]),
    __metadata("design:returntype", Promise)
], WithdrawalsController.prototype, "request", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Your withdrawals' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PaginationDto]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel before sending — funds return to Available' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WithdrawalsController.prototype, "cancel", null);
exports.WithdrawalsController = WithdrawalsController = __decorate([
    (0, swagger_1.ApiTags)('withdrawals'),
    (0, guards_1.PlayerAuth)(guards_1.WITHDRAWAL_POLICY),
    (0, common_1.Controller)('withdrawals'),
    __metadata("design:paramtypes", [withdrawals_service_1.WithdrawalsService,
        audit_service_1.AuditService,
        withdrawal_precheck_service_1.WithdrawalPrecheckService])
], WithdrawalsController);
let DevWithdrawalsController = class DevWithdrawalsController {
    withdrawals;
    constructor(withdrawals) {
        this.withdrawals = withdrawals;
    }
    simulate(user, id) {
        return this.withdrawals.simulateConfirm(user.id, id);
    }
};
exports.DevWithdrawalsController = DevWithdrawalsController;
__decorate([
    (0, common_1.Post)(':id/simulate-confirm'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'DEMO only: simulate broadcast + on-chain confirmation of a QUEUED withdrawal',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DevWithdrawalsController.prototype, "simulate", null);
exports.DevWithdrawalsController = DevWithdrawalsController = __decorate([
    (0, demo_only_guard_1.DemoOnly)(),
    (0, guards_1.PlayerAuth)(guards_1.WITHDRAWAL_POLICY),
    (0, common_1.Controller)('dev/withdrawals'),
    __metadata("design:paramtypes", [withdrawals_service_1.WithdrawalsService])
], DevWithdrawalsController);
//# sourceMappingURL=withdrawals.controller.js.map