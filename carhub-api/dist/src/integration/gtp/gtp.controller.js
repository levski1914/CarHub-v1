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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GtpController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const gtp_service_1 = require("./gtp.service");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
let GtpController = class GtpController {
    gtp;
    prisma;
    constructor(gtp, prisma) {
        this.gtp = gtp;
        this.prisma = prisma;
    }
    start(body) {
        return this.gtp.start(body.plate);
    }
    async solve(body) {
        const out = await this.gtp.solve(body.challengeId, body.code);
        if (out.status === 'ok') {
            await this.upsertIntegrationObligation(body.vehicleId, client_1.ObligationType.GTP, out.validUntil, { source: 'rta.government.bg' });
        }
        return out;
    }
    async upsertIntegrationObligation(vehicleId, type, validUntilISO, meta) {
        const dueDate = new Date(validUntilISO);
        await this.prisma.obligation
            .upsert({
            where: {
                id: (await this.prisma.obligation.findFirst({
                    where: { vehicleId, type },
                }))?.id ?? '___new___',
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
            }
            else {
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
};
exports.GtpController = GtpController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GtpController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('solve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GtpController.prototype, "solve", null);
exports.GtpController = GtpController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('integrations/gtp'),
    __metadata("design:paramtypes", [gtp_service_1.GtpService,
        prisma_service_1.PrismaService])
], GtpController);
//# sourceMappingURL=gtp.controller.js.map