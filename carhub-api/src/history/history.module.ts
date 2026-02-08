import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [HistoryService, PrismaService],
  controllers: [HistoryController],
})
export class HistoryModule {}
