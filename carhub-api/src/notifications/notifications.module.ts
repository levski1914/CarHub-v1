import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma.service';
import { SmsChannel } from './providers/sms.channel';
import { EmailChannel } from './providers/email.channel';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsService, PrismaService, SmsChannel, EmailChannel],
  exports: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
