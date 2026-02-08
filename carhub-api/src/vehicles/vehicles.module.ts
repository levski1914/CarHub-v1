import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { PrismaService } from 'src/prisma.service';
import { GoService } from 'src/integration/go/go.service';
import { GtpService } from 'src/integration/gtp/gtp.service';
import { HistoryService } from 'src/history/history.service';

@Module({
  providers: [
    VehiclesService,
    PrismaService,
    GoService,
    GtpService,
    HistoryService,
  ],
  controllers: [VehiclesController],
})
export class VehiclesModule {}
