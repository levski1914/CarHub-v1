import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
// import { PrismaService } from './prisma/prisma.service';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AuthModule } from './auth/auth.module';
import { GtpController } from './integration/gtp/gtp.controller';
import { GtpService } from './integration/gtp/gtp.service';
import { ScheduleModule } from '@nestjs/schedule';
// import { PrismaController } from './prisma/prisma.controller';
// import { PrismaModule } from './prisma/prisma.module';
// import { PrismaModule } from './prisma/prisma.module';
// import { PrismaService } from './prima.service';
// import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    AuthModule,
    VehiclesModule,
    NotificationsModule,
    DocumentsModule,
  ],
  controllers: [AppController, GtpController],
  providers: [AppService, PrismaService, GtpService],
})
export class AppModule {}
