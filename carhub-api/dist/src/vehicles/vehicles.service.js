"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
const playwright_1 = require("playwright");
const gtp_service_1 = require("../integration/gtp/gtp.service");
const vignette_checker_1 = require("../integration/vignette/vignette.checker");
const go_service_1 = require("../integration/go/go.service");
const history_service_1 = require("../history/history.service");
let VehiclesService = class VehiclesService {
    prisma;
    go;
    gtp;
    history;
    constructor(prisma, go, gtp, history) {
        this.prisma = prisma;
        this.go = go;
        this.gtp = gtp;
        this.history = history;
    }
    async requireVehicleOwned(userId, vehicleId) {
        const v = await this.prisma.vehicle.findFirst({
            where: { id: vehicleId, userId },
        });
        if (!v)
            throw new common_1.NotFoundException('Vehicle not found');
        return v;
    }
    statusFromDue(due) {
        if (!due)
            return 'ok';
        const now = Date.now();
        const diffDays = Math.ceil((due.getTime() - now) / 86400000);
        if (diffDays < 0)
            return 'overdue';
        if (diffDays <= 7)
            return 'soon';
        return 'ok';
    }
    async listVehicles(userId) {
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
    async createVehicle(userId, data) {
        const v = await this.prisma.vehicle.create({
            data: {
                userId,
                plate: data.plate.trim(),
                make: data.make.trim(),
                model: data.model.trim(),
            },
        });
        await this.history.log({
            userId,
            kind: 'vehicle_created',
            title: 'Добавен автомобил',
            description: `${v.plate} · ${v.make} ${v.model}`,
            vehicleId: v.id,
        });
        return {
            id: v.id,
            plate: v.plate,
            make: v.make,
            model: v.model,
            status: 'ok',
        };
    }
    async getVehicle(userId, id) {
        const v = await this.requireVehicleOwned(userId, id);
        return {
            id: v.id,
            plate: v.plate,
            make: v.make,
            model: v.model,
            status: 'ok',
        };
    }
    async updateVehicle(userId, id, data) {
        await this.requireVehicleOwned(userId, id);
        const updated = await this.prisma.vehicle.update({
            where: { id },
            data: {
                plate: data.plate?.trim() ?? undefined,
                make: data.make?.trim() ?? undefined,
                model: data.model?.trim() ?? undefined,
            },
        });
        await this.history.log({
            userId,
            kind: 'vehicle_updated',
            title: 'Редакция на автомобил',
            description: `${updated.plate} · ${updated.make} ${updated.model}`,
            vehicleId: updated.id,
        });
        return {
            id: updated.id,
            plate: updated.plate,
            make: updated.make,
            model: updated.model,
            status: 'ok',
        };
    }
    async deleteVehicle(userId, id) {
        const vehicle = await this.requireVehicleOwned(userId, id);
        await this.prisma.vehicle.delete({ where: { id } });
        await this.history.log({
            userId,
            kind: 'vehicle_deleted',
            title: 'Изтрит автомобил',
            description: `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`,
            vehicleId: vehicle.id,
        });
        return { status: 'ok' };
    }
    async listObligations(userId, vehicleId) {
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
    async upsertObligation(userId, vehicleId, type, dueDateISO) {
        await this.requireVehicleOwned(userId, vehicleId);
        const dueDate = new Date(dueDateISO);
        const obligation = await this.prisma.obligation.upsert({
            where: {
                vehicleId_type: { vehicleId, type },
            },
            update: {
                dueDate,
                source: 'manual',
            },
            create: {
                vehicleId,
                type,
                dueDate,
                source: 'manual',
            },
        });
        await this.history.log({
            userId,
            kind: 'obligation_updated',
            title: 'Промяна на задължение',
            description: `${type} до ${dueDate.toLocaleDateString('bg-BG')}`,
            vehicleId,
            obligationId: obligation.id,
            meta: { type, dueDate },
        });
        return {
            id: obligation.id,
            vehicleId: obligation.vehicleId,
            type: obligation.type,
            dueDate: obligation.dueDate.toISOString(),
            status: this.statusFromDue(obligation.dueDate),
        };
    }
    async createObligation(userId, vehicleId, data) {
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
    async enrichVehicle(userId, vehicleId, input) {
        const vehicle = await this.requireVehicleOwned(userId, vehicleId);
        const plate = (input.plate ?? vehicle.plate).trim();
        const vin = input.vin?.trim();
        const checks = input.checks?.length
            ? input.checks
            : ['Винетка', 'Гражданска отговорност', 'Технически преглед'];
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await this.prisma.obligation.findMany({
            where: {
                vehicleId,
                source: 'integration',
                checkedAt: { gte: since },
            },
        });
        const cachedTypes = new Set(recent.map((o) => o.type));
        const results = [];
        const needsAny = checks.some((c) => {
            const t = c === 'Винетка'
                ? client_1.ObligationType.VIGNETTE
                : c === 'Гражданска отговорност'
                    ? client_1.ObligationType.GO
                    : client_1.ObligationType.GTP;
            return !cachedTypes.has(t);
        });
        if (!needsAny) {
            for (const c of checks) {
                const t = c === 'Винетка'
                    ? client_1.ObligationType.VIGNETTE
                    : c === 'Гражданска отговорност'
                        ? client_1.ObligationType.GO
                        : client_1.ObligationType.GTP;
                const last = recent
                    .filter((o) => o.type === t)
                    .sort((a, b) => (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0))[0];
                results.push({
                    check: c,
                    status: 'cached',
                    validUntil: last?.dueDate?.toISOString(),
                    message: last?.checkedAt
                        ? `Проверено на ${last.checkedAt.toLocaleString('bg-BG')}`
                        : 'Вече е проверено',
                });
            }
            await this.history.log({
                userId,
                kind: 'enrich_checked',
                title: 'Автоматична проверка',
                description: `Проверени: ${checks.join(', ')}`,
                vehicleId,
                meta: {
                    results: results.map((r) => ({
                        check: r.check,
                        status: r.status,
                        validUntil: r.validUntil,
                    })),
                },
            });
            return { vehicleId, results };
        }
        const browser = await playwright_1.chromium.launch({ headless: true });
        const context = await browser.newContext({
            locale: 'bg-BG',
            userAgent: 'CarHub-MVP (user initiated check)',
        });
        const page = await context.newPage();
        try {
            for (const c of checks) {
                const t = c === 'Винетка'
                    ? client_1.ObligationType.VIGNETTE
                    : c === 'Гражданска отговорност'
                        ? client_1.ObligationType.GO
                        : client_1.ObligationType.GTP;
                if (cachedTypes.has(t)) {
                    const last = recent
                        .filter((o) => o.type === t)
                        .sort((a, b) => (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0))[0];
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
                        await this.upsertIntegrationObligation(vehicleId, client_1.ObligationType.VIGNETTE, r.validUntil, { plate });
                    }
                    if (r.status === 'needs_user')
                        break;
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
        }
        finally {
            await context.close().catch(() => { });
            await browser.close().catch(() => { });
        }
        return { vehicleId, results };
    }
    async upsertIntegrationObligation(vehicleId, type, validUntilISO, meta) {
        const dueDate = new Date(validUntilISO);
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
    async checkVignette(page, plate) {
        return (0, vignette_checker_1.checkVignette)(page, plate);
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        go_service_1.GoService,
        gtp_service_1.GtpService,
        history_service_1.HistoryService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map