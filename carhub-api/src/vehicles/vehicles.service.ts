import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ObligationType } from '@prisma/client';
import { chromium } from 'playwright';
import { GtpService } from 'src/integration/gtp/gtp.service';
import { checkVignette } from 'src/integration/vignette/vignette.checker';
import { GoService } from 'src/integration/go/go.service';

type EnrichResponse = {
  vehicleId: string;
  results: {
    check: 'Винетка' | 'Гражданска отговорност' | 'Технически преглед';
    status: 'ok' | 'not_found' | 'needs_user' | 'failed' | 'cached';
    validUntil?: string; // ISO date
    message?: string;

    // ако needs_user:
    challengeId?: string;
    captchaImageBase64?: string;
  }[];
};

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private go: GoService,
    private gtp: GtpService,
  ) {}

  // ---------- helpers ----------
  private async requireVehicleOwned(userId: string, vehicleId: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  private statusFromDue(due?: Date) {
    if (!due) return 'ok' as const;
    const now = Date.now();
    const diffDays = Math.ceil((due.getTime() - now) / 86400000);
    if (diffDays < 0) return 'overdue' as const;
    if (diffDays <= 7) return 'soon' as const;
    return 'ok' as const;
  }

  // ---------- vehicles ----------
  async listVehicles(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { obligations: true },
    });

    return vehicles.map((v) => {
      const nextDue = v.obligations
        .map((o) => o.dueDate)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      return {
        id: v.id,
        plate: v.plate,
        make: v.make,
        model: v.model,
        status: this.statusFromDue(nextDue),
      };
    });
  }

  async createVehicle(
    userId: string,
    data: { plate: string; make: string; model: string },
  ) {
    const v = await this.prisma.vehicle.create({
      data: {
        userId,
        plate: data.plate.trim(),
        make: data.make.trim(),
        model: data.model.trim(),
      },
    });

    return {
      id: v.id,
      plate: v.plate,
      make: v.make,
      model: v.model,
      status: 'ok',
    };
  }

  async getVehicle(userId: string, id: string) {
    const v = await this.requireVehicleOwned(userId, id);
    return {
      id: v.id,
      plate: v.plate,
      make: v.make,
      model: v.model,
      status: 'ok',
    };
  }

  async updateVehicle(
    userId: string,
    id: string,
    data: { plate?: string; make?: string; model?: string },
  ) {
    await this.requireVehicleOwned(userId, id);

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        plate: data.plate?.trim() ?? undefined,
        make: data.make?.trim() ?? undefined,
        model: data.model?.trim() ?? undefined,
      },
    });

    return {
      id: updated.id,
      plate: updated.plate,
      make: updated.make,
      model: updated.model,
      status: 'ok',
    };
  }

  async deleteVehicle(userId: string, id: string) {
    await this.requireVehicleOwned(userId, id);
    await this.prisma.vehicle.delete({ where: { id } });
    return { status: 'ok' };
  }

  // ---------- obligations ----------
  async listObligations(userId: string, vehicleId: string) {
    await this.requireVehicleOwned(userId, vehicleId);

    const obs = await this.prisma.obligation.findMany({
      where: { vehicleId },
      orderBy: { dueDate: 'asc' },
    });

    return obs.map((o) => ({
      id: o.id,
      vehicleId: o.vehicleId,
      type: o.type,
      dueDate: o.dueDate.toISOString(),
      status: this.statusFromDue(o.dueDate),
    }));
  }

  async createObligation(
    userId: string,
    vehicleId: string,
    data: { type: ObligationType; dueDate: string },
  ) {
    await this.requireVehicleOwned(userId, vehicleId);

    const due = new Date(data.dueDate);
    const created = await this.prisma.obligation.create({
      data: { vehicleId, type: data.type, dueDate: due },
    });

    return {
      id: created.id,
      vehicleId: created.vehicleId,
      type: created.type,
      dueDate: created.dueDate.toISOString(),
      status: this.statusFromDue(created.dueDate),
    };
  }

  // ---------- enrich ----------
  async enrichVehicle(
    userId: string,
    vehicleId: string,
    input: {
      plate?: string;
      vin?: string;
      checks?: ('Винетка' | 'Гражданска отговорност' | 'Технически преглед')[];
    },
  ): Promise<EnrichResponse> {
    const vehicle = await this.requireVehicleOwned(userId, vehicleId);

    const plate = (input.plate ?? vehicle.plate).trim();
    const vin = input.vin?.trim();
    const checks = input.checks?.length
      ? input.checks
      : (['Винетка', 'Гражданска отговорност', 'Технически преглед'] as const);

    // ✅ кеш (24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.obligation.findMany({
      where: {
        vehicleId,
        source: 'integration',
        checkedAt: { gte: since },
      },
    });
    const cachedTypes = new Set(recent.map((o) => o.type));
    const results: EnrichResponse['results'] = [];

    const needsAny = checks.some((c) => {
      const t =
        c === 'Винетка'
          ? ObligationType.VIGNETTE
          : c === 'Гражданска отговорност'
            ? ObligationType.GO
            : ObligationType.GTP;
      return !cachedTypes.has(t);
    });

    if (!needsAny) {
      for (const c of checks) {
        // по-хубав cached: показваме дата ако имаме
        const t =
          c === 'Винетка'
            ? ObligationType.VIGNETTE
            : c === 'Гражданска отговорност'
              ? ObligationType.GO
              : ObligationType.GTP;

        const last = recent
          .filter((o) => o.type === t)
          .sort(
            (a, b) =>
              (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0),
          )[0];

        results.push({
          check: c,
          status: 'cached',
          validUntil: last?.dueDate?.toISOString(),
          message: last?.checkedAt
            ? `Проверено на ${last.checkedAt.toLocaleString('bg-BG')}`
            : 'Вече е проверено',
        });
      }
      return { vehicleId, results };
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: 'bg-BG',
      userAgent: 'CarHub-MVP (user initiated check)',
    });
    const page = await context.newPage();

    try {
      for (const c of checks) {
        const t =
          c === 'Винетка'
            ? ObligationType.VIGNETTE
            : c === 'Гражданска отговорност'
              ? ObligationType.GO
              : ObligationType.GTP;

        // cached
        if (cachedTypes.has(t)) {
          const last = recent
            .filter((o) => o.type === t)
            .sort(
              (a, b) =>
                (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0),
            )[0];

          results.push({
            check: c,
            status: 'cached',
            validUntil: last?.dueDate?.toISOString(),
            message: last?.checkedAt
              ? `Проверено на ${last.checkedAt.toLocaleString('bg-BG')}`
              : 'Вече е проверено',
          });
          continue;
        }

        if (c === 'Винетка') {
          const r = await this.checkVignette(page, plate);
          results.push({ ...r, check: 'Винетка' });

          if (r.status === 'ok' && r.validUntil) {
            await this.upsertIntegrationObligation(
              vehicleId,
              ObligationType.VIGNETTE,
              r.validUntil,
              { plate },
            );
          }

          // ако изисква user (рядко) – спираме
          if (r.status === 'needs_user') break;
          continue;
        }

        if (c === 'Гражданска отговорност') {
          const start = await this.go.start(plate, vin);

          if (start.status === 'needs_user') {
            results.push({
              check: 'Гражданска отговорност',
              status: 'needs_user',
              message: start.message,
              challengeId: start.challengeId,
              captchaImageBase64: start.captchaImageBase64,
            });
            // ✅ не break — продължаваме към ГТП
            continue;
          }

          results.push({
            check: 'Гражданска отговорност',
            status: 'failed',
            message: start.message,
          });
          continue;
        }

        if (c === 'Технически преглед') {
          const start = await this.gtp.start(plate);

          if (start.status === 'needs_user') {
            results.push({
              check: 'Технически преглед',
              status: 'needs_user',
              message: start.message,
              challengeId: start.challengeId,
              captchaImageBase64: start.captchaImageBase64,
            });
            break;
          }

          results.push({
            check: 'Технически преглед',
            status: 'failed',
            message: start.message,
          });
          continue;
        }
      }
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }

    return { vehicleId, results };
  }

  // ---------- integration obligation upsert ----------
  async upsertIntegrationObligation(
    vehicleId: string,
    type: ObligationType,
    validUntilISO: string,
    meta: any,
  ) {
    const dueDate = new Date(validUntilISO);

    // по-лесно и чисто от твоя upsert с fake id:
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
      return;
    }

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

  // ---------- checkers ----------
  private async checkVignette(page: any, plate: string) {
    return checkVignette(page, plate);
  }
}
