import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailChannel } from './providers/email.channel';
import { SmsChannel } from './providers/sms.channel';
import { reminderEmailHtml } from './templates/reminder.email';
import { HistoryService } from 'src/history/history.service';
import { InboxService } from 'src/inbox/inbox.service';

function isoDateOnly(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailChannel,
    private sms: SmsChannel,
    private history: HistoryService,
    private inbox: InboxService,
  ) {}

  // На всеки 10 мин. за MVP (лесно за тест).
  // После го правим 1 път дневно.
  @Cron('*/1 * * * *')
  async run() {
    // console.log('[notifications] cron tick', new Date().toISOString());
    // 1) взимаме всички настройки, които имат поне 1 канал активен

    const settings = await this.prisma.notificationSettings.findMany({
      where: {
        OR: [{ emailEnabled: true }, { smsEnabled: true }],
        user: {
          OR: [
            { emailVerified: true }, // за email
            {}, // sms може и без verified (ако искаш)
          ],
        },
      },
      include: { user: true },
    });
    // console.log('[notifications] settings count =', settings.length);

    for (const s of settings) {
      await this.processUser(s);
    }
  }

  private async processUser(s: any) {
    if (!s) return;

    const userId = s.userId;
    const emailVerified = !!s.user?.emailVerified;

    function dateKeyUTC(d: Date) {
      return d.toISOString().slice(0, 10);
    }
    function utcMidnightMs(key: string) {
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
          emailVerified, // ✅ добавено
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
          emailVerified, // ✅ добавено
          plate: o.vehicle.plate,
          dueDate: due,
          type: o.type,
        });
      }
    }
  }

  private async notifyOnce(input: {
    userId: string;
    vehicleId: string;
    obligationId: string;
    kind: 'before_due' | 'overdue';
    daysDiff: number;
    emailVerified: boolean;
    settings: any;
    plate: string;
    dueDate: Date;
    type: string;
  }) {
    const {
      userId,
      vehicleId,
      obligationId,
      kind,
      daysDiff,
      settings,
      plate,
      dueDate,
      type,
    } = input;

    const dateStr = dueDate.toLocaleDateString('bg-BG');
    const label =
      type === 'VIGNETTE'
        ? 'Винетка'
        : type === 'GO'
          ? 'Гражданска отговорност'
          : type === 'GTP'
            ? 'Технически преглед'
            : type === 'TAX'
              ? 'Данък'
              : type;

    const title =
      kind === 'overdue'
        ? `Просрочено: ${label} за ${plate}`
        : `Напомняне: ${label} за ${plate} след ${daysDiff} дни`;

    const text =
      kind === 'overdue'
        ? `${label} за ${plate} е ПРОСРОЧЕНО (валидно до ${dateStr}).`
        : `${label} за ${plate} изтича на ${dateStr} (след ${daysDiff} дни).`;

    // dedupe: еднакъв ключ за user+obligation+kind+date
    const dedupeKey = `${userId}:${obligationId}:${kind}:${isoDateOnly(dueDate)}`;

    // ако вече е пращано — skip
    const exists = await this.prisma.notificationLog.findUnique({
      where: { dedupeKey },
    });
    if (exists) return;

    // записваме queued преди пращане
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

    // пращане
    try {
      if (settings.emailEnabled && settings.email && input.emailVerified) {
        const html = reminderEmailHtml({
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
          href: `/vehicles/${vehicleId}`, // или към obligations tab
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
          .catch(() => {});
      }

      // update първия log
      await this.prisma.notificationLog.update({
        where: { dedupeKey },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (e: any) {
      await this.prisma.notificationLog.update({
        where: { dedupeKey },
        data: { status: 'failed', error: e?.message ?? 'send failed' },
      });
    }
  }
}
