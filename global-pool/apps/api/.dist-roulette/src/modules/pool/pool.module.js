"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolModule = void 0;
const common_1 = require("@nestjs/common");
const entries_service_1 = require("./entries.service");
const entry_history_service_1 = require("./entry-history.service");
const pool_controller_1 = require("./pool.controller");
const pool_events_service_1 = require("./pool-events.service");
const pool_gateway_1 = require("./pool.gateway");
const round_lifecycle_service_1 = require("./round-lifecycle.service");
const rounds_processor_1 = require("./rounds.processor");
const rounds_service_1 = require("./rounds.service");
let PoolModule = class PoolModule {
};
exports.PoolModule = PoolModule;
exports.PoolModule = PoolModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [pool_controller_1.PoolController],
        providers: [
            pool_events_service_1.PoolEventsService,
            rounds_service_1.RoundsService,
            entries_service_1.EntriesService,
            entry_history_service_1.EntryHistoryService,
            round_lifecycle_service_1.RoundLifecycleService,
            pool_gateway_1.PoolGateway,
            rounds_processor_1.RoundsProcessor,
        ],
        exports: [rounds_service_1.RoundsService, entries_service_1.EntriesService, round_lifecycle_service_1.RoundLifecycleService, pool_events_service_1.PoolEventsService],
    })
], PoolModule);
//# sourceMappingURL=pool.module.js.map