import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { PrismaService } from 'src/prisma.service';
import { HistoryService } from 'src/history/history.service';

@Module({
  providers: [PrismaService, HistoryService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
