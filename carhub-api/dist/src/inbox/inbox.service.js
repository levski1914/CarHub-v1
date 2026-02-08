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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let InboxService = class InboxService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        if (input.dedupeKey) {
            const exists = await this.prisma.inboxNotification.findUnique({
                where: { dedupeKey: input.dedupeKey },
            });
            if (exists)
                return exists;
        }
        return this.prisma.inboxNotification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                body: input.body ?? null,
                href: input.href ?? null,
                meta: input.meta ?? undefined,
                dedupeKey: input.dedupeKey ?? null,
            },
        });
    }
    async list(userId, take = 20) {
        return this.prisma.inboxNotification.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(take, 1), 100),
        });
    }
    async unreadCount(userId) {
        return this.prisma.inboxNotification.count({
            where: { userId, deletedAt: null, readAt: null },
        });
    }
    async markRead(userId, id) {
        return this.prisma.inboxNotification.updateMany({
            where: { id, userId, deletedAt: null },
            data: { readAt: new Date() },
        });
    }
    async markAllRead(userId) {
        return this.prisma.inboxNotification.updateMany({
            where: { userId, deletedAt: null, readAt: null },
            data: { readAt: new Date() },
        });
    }
    async remove(userId, id) {
        return this.prisma.inboxNotification.updateMany({
            where: { id, userId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }
    async clear(userId) {
        return this.prisma.inboxNotification.updateMany({
            where: { userId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }
};
exports.InboxService = InboxService;
exports.InboxService = InboxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InboxService);
//# sourceMappingURL=inbox.service.js.map