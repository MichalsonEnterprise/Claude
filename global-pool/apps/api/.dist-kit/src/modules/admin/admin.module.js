"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const withdrawals_module_1 = require("../withdrawals/withdrawals.module");
const admin_auth_service_1 = require("./admin-auth.service");
const admin_console_controller_1 = require("./admin-console.controller");
const admin_console_service_1 = require("./admin-console.service");
const admin_security_service_1 = require("./admin-security.service");
const admin_controller_1 = require("./admin.controller");
const admin_guards_1 = require("./admin.guards");
const admin_service_1 = require("./admin.service");
const four_eyes_service_1 = require("./four-eyes.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({}), withdrawals_module_1.WithdrawalsModule],
        controllers: [admin_controller_1.AdminAuthController, admin_controller_1.AdminController, admin_console_controller_1.AdminConsoleController],
        providers: [
            admin_auth_service_1.AdminAuthService,
            admin_security_service_1.AdminSecurityService,
            admin_service_1.AdminService,
            admin_console_service_1.AdminConsoleService,
            four_eyes_service_1.FourEyesService,
            admin_guards_1.AdminAuthGuard,
            admin_guards_1.PermissionsGuard,
        ],
        // Exported so other back-office modules (e.g. admin-ops) can use the admin guards + MFA checks.
        exports: [admin_auth_service_1.AdminAuthService, admin_security_service_1.AdminSecurityService, admin_guards_1.AdminAuthGuard, admin_guards_1.PermissionsGuard],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map