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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma.service");
const email_channel_1 = require("./providers/email.channel");
const sms_channel_1 = require("./providers/sms.channel");
const reminder_email_1 = require("./templates/reminder.email");
const history_service_1 = require("../history/history.service");
const inbox_service_1 = require("../inbox/inbox.service");
function isoDateOnly(d) {
    return d.toISOString().slice(0, 10);
}
let NotificationsService = class NotificationsService {
    prisma;
    email;
    sms;
    history;
    inbox;
    constructor(prisma, email, sms, history, inbox) {
        this.prisma = prisma;
        this.email = email;
        this.sms = sms;
        this.history = history;
        this.inbox = inbox;
    }
    async run() {
        const settings = await this.prisma.notificationSettings.findMany({
            where: {
                OR: [{ emailEnabled: true }, { smsEnabled: true }],
                user: {
                    OR: [
                        { emailVerified: true },
                        {},
                    ],
                },
            },
            include: { user: true },
        });
        for (const s of settings) {
            await this.processUser(s);
        }
    }
    async processUser(s) {
        if (!s)
            return;
        const userId = s.userId;
        const emailVerified = !!s.user?.emailVerified;
        function dateKeyUTC(d) {
            return d.toISOString().slice(0, 10);
        }
        function utcMidnightMs(key) {
            return new Date(key + 'T00:00:00.000Z').getTime();
        }
        const obligations = await this.prisma.obligation.findMany({
            where: { vehicle: { userId } },
            include: { vehicle: true },
        });
        const todayKey = dateKeyUTC(new Date());
        const todayMs = utcMidnightMs(todayKey);
        for (const o of obligations) {
            const due = o.dueDate;
            const dueKey = dateKeyUTC(due);
            const dueMs = utcMidnightMs(dueKey);
            const daysDiff = Math.round((dueMs - todayMs) / 86400000);
            if (daysDiff < 0) {
                await this.notifyOnce({
                    userId,
                    vehicleId: o.vehicleId,
                    obligationId: o.id,
                    kind: 'overdue',
                    daysDiff,
                    settings: s,
                    emailVerified,
                    plate: o.vehicle.plate,
                    dueDate: due,
                    type: o.type,
                });
                continue;
            }
            if (s.daysBefore.includes(daysDiff)) {
                await this.notifyOnce({
                    userId,
                    vehicleId: o.vehicleId,
                    obligationId: o.id,
                    kind: 'before_due',
                    daysDiff,
                    settings: s,
                    emailVerified,
                    plate: o.vehicle.plate,
                    dueDate: due,
                    type: o.type,
                });
            }
        }
    }
    async notifyOnce(input) {
        const { userId, vehicleId, obligationId, kind, daysDiff, settings, plate, dueDate, type, } = input;
        const dateStr = dueDate.toLocaleDateString('bg-BG');
        const label = type === 'VIGNETTE'
            ? 'Винетка'
            : type === 'GO'
                ? 'Гражданска отговорност'
                : type === 'GTP'
                    ? 'Технически преглед'
                    : type === 'TAX'
                        ? 'Данък'
                        : type;
        const title = kind === 'overdue'
            ? `Просрочено: ${label} за ${plate}`
            : `Напомняне: ${label} за ${plate} след ${daysDiff} дни`;
        const text = kind === 'overdue'
            ? `${label} за ${plate} е ПРОСРОЧЕНО (валидно до ${dateStr}).`
            : `${label} за ${plate} изтича на ${dateStr} (след ${daysDiff} дни).`;
        const dedupeKey = `${userId}:${obligationId}:${kind}:${isoDateOnly(dueDate)}`;
        const exists = await this.prisma.notificationLog.findUnique({
            where: { dedupeKey },
        });
        if (exists)
            return;
        await this.prisma.notificationLog.create({
            data: {
                userId,
                vehicleId,
                obligationId,
                channel: 'multi',
                kind,
                scheduledFor: new Date(),
                status: 'queued',
                dedupeKey,
            },
        });
        try {
            if (settings.emailEnabled && settings.email && input.emailVerified) {
                const html = (0, reminder_email_1.reminderEmailHtml)({
                    title,
                    plate,
                    label,
                    dueDate: dateStr,
                    daysDiff,
                    kind,
                });
                await this.email.sendHtml(settings.email, title, html);
                await this.inbox.create({
                    userId,
                    type: 'reminder',
                    title,
                    body: text,
                    href: `/vehicles/${vehicleId}`,
                    meta: { obligationId, kind, daysDiff, channel: 'email' },
                });
                await this.history.log({
                    userId,
                    kind: 'notification_sent',
                    title: 'Изпратено известие',
                    description: `${label} за ${plate} (${kind})`,
                    vehicleId,
                    obligationId,
                    meta: { channel: 'email', kind, daysDiff },
                });
                await this.prisma.notificationLog.create({
                    data: {
                        userId,
                        vehicleId,
                        obligationId,
                        channel: 'email',
                        kind,
                        scheduledFor: new Date(),
                        sentAt: new Date(),
                        status: 'sent',
                        dedupeKey: `${dedupeKey}:email`,
                    },
                });
            }
            if (settings.smsEnabled && settings.phone) {
                await this.sms.send(settings.phone, `${title}\n${text}`);
                await this.prisma.notificationLog
                    .create({
                    data: {
                        userId,
                        vehicleId,
                        obligationId,
                        channel: 'sms',
                        kind,
                        scheduledFor: new Date(),
                        sentAt: new Date(),
                        status: 'sent',
                        dedupeKey: `${dedupeKey}:sms`,
                    },
                })
                    .catch(() => { });
            }
            await this.prisma.notificationLog.update({
                where: { dedupeKey },
                data: { status: 'sent', sentAt: new Date() },
            });
        }
        catch (e) {
            await this.prisma.notificationLog.update({
                where: { dedupeKey },
                data: { status: 'failed', error: e?.message ?? 'send failed' },
            });
        }
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, schedule_1.Cron)('*/1 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "run", null);
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_channel_1.EmailChannel,
        sms_channel_1.SmsChannel,
        history_service_1.HistoryService,
        inbox_service_1.InboxService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map