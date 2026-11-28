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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const notifications_service_1 = require("./notifications.service");
class NotificationsQueryDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({
    unread: zod_1.z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
    category: zod_1.z.enum(notifications_service_1.NOTIFICATION_CATEGORY_FILTERS).optional(),
})) {
}
let NotificationsController = class NotificationsController {
    notifications;
    constructor(notifications) {
        this.notifications = notifications;
    }
    list(user, query) {
        return this.notifications.list(user.id, query);
    }
    read(user, id) {
        return this.notifications.markRead(user.id, id);
    }
    readAll(user) {
        return this.notifications.markAllRead(user.id);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Notifications (paginated, ?unread=true, ?category=security|transactions|rounds|promotions|account)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, NotificationsQueryDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "read", null);
__decorate([
    (0, common_1.Post)('read-all'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "readAll", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map