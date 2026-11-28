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
exports.DevKycController = exports.KycController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
const demo_only_guard_1 = require("../../common/demo-only.guard");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const kyc_service_1 = require("./kyc.service");
const levelSchema = zod_1.z.object({ level: zod_1.z.enum(['level_1', 'level_2', 'level_3']) });
class KycLevelDto extends (0, zod_2.createZodDto)(levelSchema) {
}
let KycController = class KycController {
    kyc;
    constructor(kyc) {
        this.kyc = kyc;
    }
    status(user) {
        return this.kyc.status(user.id);
    }
    start(user, body) {
        return this.kyc.start(user.id, body.level);
    }
};
exports.KycController = KycController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'KYC level, status and the resulting daily withdrawal limit' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KycController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Start verification for a level (provider interface; mock in dev)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycLevelDto]),
    __metadata("design:returntype", void 0)
], KycController.prototype, "start", null);
exports.KycController = KycController = __decorate([
    (0, swagger_1.ApiTags)('kyc'),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('kyc'),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycController);
let DevKycController = class DevKycController {
    kyc;
    constructor(kyc) {
        this.kyc = kyc;
    }
    approve(user, body) {
        return this.kyc.approve(user.id, body.level);
    }
};
exports.DevKycController = DevKycController;
__decorate([
    (0, common_1.Post)('approve'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'DEMO only: mock-provider approval of your KYC level' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycLevelDto]),
    __metadata("design:returntype", void 0)
], DevKycController.prototype, "approve", null);
exports.DevKycController = DevKycController = __decorate([
    (0, demo_only_guard_1.DemoOnly)(),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('dev/kyc'),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], DevKycController);
//# sourceMappingURL=kyc.controller.js.map