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
exports.DemoOnly = exports.DemoOnlyGuard = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_config_1 = require("../config/app-config");
const errors_1 = require("./errors");
/**
 * DEMO-only routes (simulated deposits, mock KYC approval…): 404 unless DEMO_MODE=true, REAL_MONEY_ENABLED=false
 * and NODE_ENV != production. They post the same ledger entries as the real flows and flag records isDemo.
 */
let DemoOnlyGuard = class DemoOnlyGuard {
    config;
    constructor(config) {
        this.config = config;
    }
    canActivate() {
        if (!this.config.demoEndpointsEnabled)
            throw new errors_1.AppError('NOT_FOUND', 'Not found');
        return true;
    }
};
exports.DemoOnlyGuard = DemoOnlyGuard;
exports.DemoOnlyGuard = DemoOnlyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], DemoOnlyGuard);
const DemoOnly = () => (0, common_1.applyDecorators)((0, common_1.UseGuards)(DemoOnlyGuard), (0, swagger_1.ApiTags)('dev (DEMO only)'));
exports.DemoOnly = DemoOnly;
//# sourceMappingURL=demo-only.guard.js.map