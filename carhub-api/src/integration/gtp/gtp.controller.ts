import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GtpService } from './gtp.service';
import { PrismaService } from '../../prisma.service';
import { ObligationType } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('integrations/gtp')
export class GtpController {
  constructor(
    private readonly gtp: GtpService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('start')
  start(@Body() body: { plate: string }) {
    return this.gtp.start(body.plate);
  }

  @Post('solve')
  async solve(
    @Body()
    body: {
      vehicleId: string;
      challengeId: string;
      code: string;
    },
  ) {
    const out = await this.gtp.solve(body.challengeId, body.code);

    if (out.status === 'ok') {
      await this.upsertIntegrationObligation(
        body.vehicleId,
        ObligationType.GTP,
        out.validUntil,
        { source: 'rta.government.bg' },
      );
    }

    return out;
  }

  private async upsertIntegrationObligation(
    vehicleId: string,
    type: ObligationType,
    validUntilISO: string,
    meta: any,
  ) {
    const dueDate = new Date(validUntilISO);

    await this.prisma.obligation
      .upsert({
        where: {
          id:
            (
              await this.prisma.obligation.findFirst({
                where: { vehicleId, type },
              })
            )?.id ?? '___new___',
        },
        update: {
          dueDate,
          source: 'integration',
          checkedAt: new Date(),
          meta,
        },
        create: {
          vehicleId,
          type,
          dueDate,
          source: 'integration',
          checkedAt: new Date(),
          meta,
        },
      })
      .catch(async () => {
        const existing = await this.prisma.obligation.findFirst({
          where: { vehicleId, type },
        });

        if (existing) {
          await this.prisma.obligation.update({
            where: { id: existing.id },
            data: {
              dueDate,
              source: 'integration',
              checkedAt: new Date(),
              meta,
            },
          });
        } else {
          await this.prisma.obligation.create({
            data: {
              vehicleId,
              type,
              dueDate,
              source: 'integration',
              checkedAt: new Date(),
              meta,
            },
          });
        }
      });
  }
}
