"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositsModule = void 0;
const common_1 = require("@nestjs/common");
const demo_deposits_service_1 = require("./demo-deposits.service");
const deposit_chain_watcher_service_1 = require("./deposit-chain-watcher.service");
const deposit_address_service_1 = require("./deposit-address.service");
const deposit_watcher_processor_1 = require("./deposit-watcher.processor");
const deposits_controller_1 = require("./deposits.controller");
const deposits_service_1 = require("./deposits.service");
let DepositsModule = class DepositsModule {
};
exports.DepositsModule = DepositsModule;
exports.DepositsModule = DepositsModule = __decorate([
    (0, common_1.Module)({
        controllers: [deposits_controller_1.DepositsController, deposits_controller_1.DevDepositsController],
        providers: [
            deposit_address_service_1.DepositAddressService,
            deposits_service_1.DepositsService,
            deposit_chain_watcher_service_1.DepositChainWatcherService,
            deposit_watcher_processor_1.DepositWatcherProcessor,
            demo_deposits_service_1.DemoDepositsService,
        ],
        exports: [deposits_service_1.DepositsService, deposit_address_service_1.DepositAddressService, deposit_chain_watcher_service_1.DepositChainWatcherService],
    })
], DepositsModule);
//# sourceMappingURL=deposits.module.js.map