import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { InboxService } from 'src/inbox/inbox.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications/settings')
export class NotificationsController {
  constructor(
    private prisma: PrismaService,
    private inbox: InboxService,
  ) {}

  @Get()
  async get(@Req() req: any) {
    const userId = req.user.userId;
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: {},
      create: { userId, emailEnabled: true },
    });
  }

  @Put()
  async update(@Req() req: any, @Body() body: any) {
    const userId = req.user.userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, email: true },
    });

    const wantsEmail = !!body.emailEnabled;

    if (wantsEmail && !user?.emailVerified) {
      throw new BadRequestException('Email is not verified');
      // или вместо throw:
      // body.emailEnabled = false;
    }

    if (!wantsEmail) {
      await this.inbox.create({
        userId,
        type: 'system',
        title: 'Изключи имейл известията',
        body: 'Внимание: може да пропуснеш срок за ГО/ГТП/Винетка/Данък.',
        href: '/profile', // или /settings
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
}
