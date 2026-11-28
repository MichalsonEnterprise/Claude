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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("./env");
/**
 * Typed, validated configuration (inject `AppConfig`). Built once from process.env at boot.
 */
let AppConfig = class AppConfig {
    env;
    constructor(env) {
        this.env = env ?? (0, env_1.parseEnv)();
    }
    get isProduction() {
        return this.env.NODE_ENV === 'production';
    }
    get isTest() {
        return this.env.NODE_ENV === 'test';
    }
    /** DEMO-only endpoints (simulated deposits, dev tokens…) — never with real money, never in production. */
    get demoEndpointsEnabled() {
        return this.env.DEMO_MODE && !this.env.REAL_MONEY_ENABLED && !this.isProduction;
    }
    /**
     * Player auth: real Privy verification when PRIVY_APP_ID is set and PRIVY_MOCK is off; otherwise the offline
     * DEV MOCK (locally signed tokens) — which is refused in production.
     */
    get playerAuthMode() {
        const { PRIVY_APP_ID, PRIVY_MOCK } = this.env;
        if (PRIVY_APP_ID && !PRIVY_MOCK)
            return 'privy';
        return this.isProduction ? 'disabled' : 'mock';
    }
    get totpKey() {
        return Buffer.from(this.env.TOTP_ENCRYPTION_KEY, 'base64');
    }
};
exports.AppConfig = AppConfig;
exports.AppConfig = AppConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], AppConfig);
//# sourceMappingURL=app-config.js.map