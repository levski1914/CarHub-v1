"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const prisma_service_1 = require("../prisma.service");
const sms_channel_1 = require("./providers/sms.channel");
const email_channel_1 = require("./providers/email.channel");
const notifications_controller_1 = require("./notifications.controller");
const history_service_1 = require("../history/history.service");
const inbox_service_1 = require("../inbox/inbox.service");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            notifications_service_1.NotificationsService,
            prisma_service_1.PrismaService,
            sms_channel_1.SmsChannel,
            email_channel_1.EmailChannel,
            history_service_1.HistoryService,
            inbox_service_1.InboxService,
        ],
        exports: [notifications_service_1.NotificationsService],
        controllers: [notifications_controller_1.NotificationsController],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map