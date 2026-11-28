"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolEventsService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
/** In-process event bus for the live pool UI (the WebSocket gateway subscribes). */
let PoolEventsService = class PoolEventsService {
    events$ = new rxjs_1.Subject();
    emit(event) {
        this.events$.next(event);
    }
};
exports.PoolEventsService = PoolEventsService;
exports.PoolEventsService = PoolEventsService = __decorate([
    (0, common_1.Injectable)()
], PoolEventsService);
//# sourceMappingURL=pool-events.service.js.map