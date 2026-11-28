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
exports.DevKycFlowController = exports.KycFlowController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const demo_only_guard_1 = require("../../common/demo-only.guard");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const kyc_flow_service_1 = require("./kyc-flow.service");
class KycStartDto extends (0, zod_1.createZodDto)(schemas_1.kycStartSchema) {
}
class KycDetailsDto extends (0, zod_1.createZodDto)(schemas_1.kycDetailsSchema) {
}
class KycDocumentDto extends (0, zod_1.createZodDto)(schemas_1.kycDocumentUploadSchema) {
}
class KycLivenessDto extends (0, zod_1.createZodDto)(schemas_1.kycLivenessSchema) {
}
class KycSubmitDto extends (0, zod_1.createZodDto)(schemas_1.kycSubmitSchema) {
}
class KycDevRejectDto extends (0, zod_1.createZodDto)(schemas_1.kycDevRejectSchema) {
}
/**
 * KYC flow (AUTH-11…17, A4/A5) through the provider interface — mock provider in dev. Documents are sent to the
 * provider; the API keeps metadata and check results only.
 */
let KycFlowController = class KycFlowController {
    flow;
    constructor(flow) {
        this.flow = flow;
    }
    view(user) {
        return this.flow.view(user.id);
    }
    start(user, body) {
        return this.flow.start(user.id, body.level);
    }
    details(user, body) {
        return this.flow.saveDetails(user.id, body);
    }
    document(user, body) {
        return this.flow.addDocument(user.id, body);
    }
    liveness(user, body) {
        return this.flow.liveness(user.id, body);
    }
    submit(user, _body) {
        return this.flow.submit(user.id, user.handle);
    }
    documents(user) {
        return this.flow.documents(user.id);
    }
};
exports.KycFlowController = KycFlowController;
__decorate([
    (0, common_1.Get)('application'),
    (0, swagger_1.ApiOperation)({
        summary: 'Your open (or latest) verification with requirements and the next step',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "view", null);
__decorate([
    (0, common_1.Post)('application'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Start or resume verification for a level (AUTH-11)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycStartDto]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "start", null);
__decorate([
    (0, common_1.Put)('application/details'),
    (0, swagger_1.ApiOperation)({
        summary: 'AUTH-12: personal details exactly as on the ID (18+, permitted country)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycDetailsDto]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "details", null);
__decorate([
    (0, common_1.Post)('application/documents'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'AUTH-13: add one document side (metadata + SHA-256; mock quality check)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycDocumentDto]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "document", null);
__decorate([
    (0, common_1.Post)('application/liveness'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'AUTH-14: liveness result (mock) — 3 attempts, then a manual review' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycLivenessDto]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "liveness", null);
__decorate([
    (0, common_1.Post)('application/submit'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'AUTH-15: submit for review (Level 1 is approved instantly)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycSubmitDto]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, swagger_1.ApiOperation)({ summary: 'A5: documents shared for identity checks (metadata only)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KycFlowController.prototype, "documents", null);
exports.KycFlowController = KycFlowController = __decorate([
    (0, swagger_1.ApiTags)('kyc'),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('kyc'),
    __metadata("design:paramtypes", [kyc_flow_service_1.KycFlowService])
], KycFlowController);
let DevKycFlowController = class DevKycFlowController {
    flow;
    constructor(flow) {
        this.flow = flow;
    }
    reject(user, body) {
        return this.flow.devReject(user.id, body.level, body.reasons);
    }
};
exports.DevKycFlowController = DevKycFlowController;
__decorate([
    (0, common_1.Post)('reject'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'DEMO only: mock-provider rejection of your submitted verification (resubmission required)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycDevRejectDto]),
    __metadata("design:returntype", void 0)
], DevKycFlowController.prototype, "reject", null);
exports.DevKycFlowController = DevKycFlowController = __decorate([
    (0, demo_only_guard_1.DemoOnly)(),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('dev/kyc'),
    __metadata("design:paramtypes", [kyc_flow_service_1.KycFlowService])
], DevKycFlowController);
//# sourceMappingURL=kyc-flow.controller.js.map