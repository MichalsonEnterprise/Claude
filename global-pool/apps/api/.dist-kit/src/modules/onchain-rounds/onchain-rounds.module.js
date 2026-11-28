"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnchainRoundsModule = void 0;
const common_1 = require("@nestjs/common");
const round_chain_controller_1 = require("./round-chain.controller");
const round_mirror_service_1 = require("./round-mirror.service");
/** On-chain mirroring of Global Pool rounds on GlobalPoolRounds (TESTNET ONLY; off unless POOL_ONCHAIN_MIRROR=true). */
let OnchainRoundsModule = class OnchainRoundsModule {
};
exports.OnchainRoundsModule = OnchainRoundsModule;
exports.OnchainRoundsModule = OnchainRoundsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [round_chain_controller_1.RoundChainController],
        providers: [round_mirror_service_1.RoundMirrorService],
        exports: [round_mirror_service_1.RoundMirrorService],
    })
], OnchainRoundsModule);
//# sourceMappingURL=onchain-rounds.module.js.map