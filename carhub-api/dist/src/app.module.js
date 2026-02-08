"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./prisma.service");
const inbox_module_1 = require("./inbox/inbox.module");
const history_module_1 = require("./history/history.module");
const documents_module_1 = require("./documents/documents.module");
const notifications_module_1 = require("./notifications/notifications.module");
const vehicles_module_1 = require("./vehicles/vehicles.module");
const auth_module_1 = require("./auth/auth.module");
const gtp_controller_1 = require("./integration/gtp/gtp.controller");
const gtp_service_1 = require("./integration/gtp/gtp.service");
const schedule_1 = require("@nestjs/schedule");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            notifications_module_1.NotificationsModule,
            auth_module_1.AuthModule,
            vehicles_module_1.VehiclesModule,
            notifications_module_1.NotificationsModule,
            documents_module_1.DocumentsModule,
            history_module_1.HistoryModule,
            inbox_module_1.InboxModule,
        ],
        controllers: [app_controller_1.AppController, gtp_controller_1.GtpController],
        providers: [app_service_1.AppService, prisma_service_1.PrismaService, gtp_service_1.GtpService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map