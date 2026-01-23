import { Body, Controller, Get, Put, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications/settings')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get(@Req() req: any) {
    const userId = req.user.id;
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  @Put()
  async update(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        emailEnabled: !!body.emailEnabled,
        smsEnabled: !!body.smsEnabled,
        email: body.email ?? null,
        phone: body.phone ?? null,
        daysBefore: Array.isArray(body.daysBefore)
          ? body.daysBefore
          : undefined,
      },
      create: {
        userId,
        emailEnabled: !!body.emailEnabled,
        smsEnabled: !!body.smsEnabled,
        email: body.email ?? null,
        phone: body.phone ?? null,
        daysBefore: Array.isArray(body.daysBefore)
          ? body.daysBefore
          : [1, 3, 7, 30],
      },
    });
  }
}
