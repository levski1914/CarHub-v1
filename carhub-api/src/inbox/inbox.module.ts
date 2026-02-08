import { Module } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [InboxService, PrismaService],
  controllers: [InboxController],
  exports: [InboxService],
})
export class InboxModule {}
