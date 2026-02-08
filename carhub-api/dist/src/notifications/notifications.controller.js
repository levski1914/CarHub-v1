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
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../prisma.service");
const inbox_service_1 = require("../inbox/inbox.service");
let NotificationsController = class NotificationsController {
    prisma;
    inbox;
    constructor(prisma, inbox) {
        this.prisma = prisma;
        this.inbox = inbox;
    }
    async get(req) {
        const userId = req.user.userId;
        return this.prisma.notificationSettings.upsert({
            where: { userId },
            update: {},
            create: { userId, emailEnabled: true },
        });
    }
    async update(req, body) {
        const userId = req.user.userId;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true, email: true },
        });
        const wantsEmail = !!body.emailEnabled;
        if (wantsEmail && !user?.emailVerified) {
            throw new common_1.BadRequestException('Email is not verified');
        }
        if (!wantsEmail) {
            await this.inbox.create({
                userId,
                type: 'system',
                title: 'Изключи имейл известията',
                body: 'Внимание: може да пропуснеш срок за ГО/ГТП/Винетка/Данък.',
                href: '/profile',
                dedupeKey: `${userId}:system:email_notifications_off`,
                meta: { kind: 'email_notifications_off' },
            });
        }
        return this.prisma.notificationSettings.upsert({
            where: { userId },
            update: {
                emailEnabled: !!body.emailEnabled,
                smsEnabled: !!body.smsEnabled,
                email: body.email ?? user?.email ?? null,
                phone: body.phone ?? null,
                daysBefore: Array.isArray(body.daysBefore)
                    ? body.daysBefore
                    : undefined,
            },
            create: {
                userId,
                emailEnabled: !!body.emailEnabled,
                smsEnabled: !!body.smsEnabled,
                email: body.email ?? user?.email ?? null,
                phone: body.phone ?? null,
                daysBefore: Array.isArray(body.daysBefore)
                    ? body.daysBefore
                    : [7, 3, 1],
            },
        });
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "update", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('notifications/settings'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inbox_service_1.InboxService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map