"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_module_1 = require("../users/users.module");
const account_status_controller_1 = require("./account-status.controller");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const guards_1 = require("./guards");
const player_identity_service_1 = require("./player-identity.service");
const privy_service_1 = require("./privy.service");
/** Player auth (Privy / DEV MOCK). Global so every feature module can use @PlayerAuth() guards. */
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({}), users_module_1.UsersModule],
        controllers: [auth_controller_1.AuthController, account_status_controller_1.AccountStatusController],
        providers: [privy_service_1.PrivyService, player_identity_service_1.PlayerIdentityService, auth_service_1.AuthService, guards_1.PrivyAuthGuard, guards_1.PlayerPolicyGuard],
        exports: [privy_service_1.PrivyService, player_identity_service_1.PlayerIdentityService, guards_1.PrivyAuthGuard, guards_1.PlayerPolicyGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map