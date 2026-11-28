"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsModule = void 0;
const common_1 = require("@nestjs/common");
const withdrawals_controller_1 = require("./withdrawals.controller");
const withdrawal_broadcaster_service_1 = require("./withdrawal-broadcaster.service");
const withdrawal_precheck_service_1 = require("./withdrawal-precheck.service");
const withdrawals_processor_1 = require("./withdrawals.processor");
const withdrawals_service_1 = require("./withdrawals.service");
let WithdrawalsModule = class WithdrawalsModule {
};
exports.WithdrawalsModule = WithdrawalsModule;
exports.WithdrawalsModule = WithdrawalsModule = __decorate([
    (0, common_1.Module)({
        controllers: [withdrawals_controller_1.WithdrawalsController, withdrawals_controller_1.DevWithdrawalsController],
        providers: [
            withdrawals_service_1.WithdrawalsService,
            withdrawal_broadcaster_service_1.WithdrawalBroadcasterService,
            withdrawals_processor_1.WithdrawalsProcessor,
            withdrawal_precheck_service_1.WithdrawalPrecheckService,
        ],
        exports: [withdrawals_service_1.WithdrawalsService, withdrawal_broadcaster_service_1.WithdrawalBroadcasterService],
    })
], WithdrawalsModule);
//# sourceMappingURL=withdrawals.module.js.map