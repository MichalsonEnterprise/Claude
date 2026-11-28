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
exports.ComplianceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const limits_1 = require("@gp/shared/limits");
const geo_service_1 = require("./geo.service");
let ComplianceController = class ComplianceController {
    geo;
    constructor(geo) {
        this.geo = geo;
    }
    async region(req) {
        const check = await this.geo.checkRequest(req);
        return { ...check, minAge: limits_1.MIN_AGE };
    }
};
exports.ComplianceController = ComplianceController;
__decorate([
    (0, common_1.Get)('region'),
    (0, swagger_1.ApiOperation)({
        summary: 'Is the platform available from the current location? (no bypass hints, by design)',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "region", null);
exports.ComplianceController = ComplianceController = __decorate([
    (0, swagger_1.ApiTags)('compliance'),
    (0, common_1.Controller)('compliance'),
    __metadata("design:paramtypes", [geo_service_1.GeoService])
], ComplianceController);
//# sourceMappingURL=compliance.controller.js.map