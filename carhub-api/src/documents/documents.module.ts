import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [PrismaService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
