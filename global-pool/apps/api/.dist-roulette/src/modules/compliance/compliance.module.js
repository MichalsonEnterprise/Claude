"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceModule = void 0;
const common_1 = require("@nestjs/common");
const compliance_controller_1 = require("./compliance.controller");
const geo_service_1 = require("./geo.service");
const responsible_gaming_controller_1 = require("./responsible-gaming.controller");
const responsible_gaming_service_1 = require("./responsible-gaming.service");
const restrictions_service_1 = require("./restrictions.service");
let ComplianceModule = class ComplianceModule {
};
exports.ComplianceModule = ComplianceModule;
exports.ComplianceModule = ComplianceModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [compliance_controller_1.ComplianceController, responsible_gaming_controller_1.ResponsibleGamingController],
        providers: [geo_service_1.GeoService, restrictions_service_1.RestrictionsService, responsible_gaming_service_1.ResponsibleGamingService],
        exports: [geo_service_1.GeoService, restrictions_service_1.RestrictionsService, responsible_gaming_service_1.ResponsibleGamingService],
    })
], ComplianceModule);
//# sourceMappingURL=compliance.module.js.map