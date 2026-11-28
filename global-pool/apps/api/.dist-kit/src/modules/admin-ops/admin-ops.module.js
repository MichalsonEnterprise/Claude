"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOpsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_module_1 = require("../admin/admin.module");
const pool_module_1 = require("../pool/pool.module");
const withdrawals_module_1 = require("../withdrawals/withdrawals.module");
const admin_compliance_service_1 = require("./admin-compliance.service");
const admin_exports_service_1 = require("./admin-exports.service");
const admin_finance_service_1 = require("./admin-finance.service");
const admin_ops_controller_1 = require("./admin-ops.controller");
const admin_pool_service_1 = require("./admin-pool.service");
/**
 * Back-office module for Finance (ADM-F1…F9), Global Pool monitoring (ADM-P1…P10) and Compliance (ADM-C1, C2).
 * Uses the admin guards (bearer + RBAC) exported by AdminModule.
 */
let AdminOpsModule = class AdminOpsModule {
};
exports.AdminOpsModule = AdminOpsModule;
exports.AdminOpsModule = AdminOpsModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_module_1.AdminModule, withdrawals_module_1.WithdrawalsModule, pool_module_1.PoolModule],
        controllers: [admin_ops_controller_1.AdminFinanceController, admin_ops_controller_1.AdminPoolController, admin_ops_controller_1.AdminComplianceController],
        providers: [admin_finance_service_1.AdminFinanceService, admin_pool_service_1.AdminPoolService, admin_compliance_service_1.AdminComplianceService, admin_exports_service_1.AdminExportsService],
    })
], AdminOpsModule);
//# sourceMappingURL=admin-ops.module.js.map