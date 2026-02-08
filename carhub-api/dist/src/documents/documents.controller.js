"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../prisma.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const history_service_1 = require("../history/history.service");
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR))
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
let DocumentsController = class DocumentsController {
    prisma;
    history;
    constructor(prisma, history) {
        this.prisma = prisma;
        this.history = history;
        ensureUploadDir();
    }
    async list(req) {
        const userId = req.user.userId;
        return this.prisma.document.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listByVehicle(req, vehicleId) {
        const userId = req.user.userId;
        return this.prisma.document.findMany({
            where: { userId, vehicleId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listByObligation(req, obligationId) {
        const userId = req.user.userId;
        return this.prisma.document.findMany({
            where: { userId, obligationId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async remove(req, id) {
        const userId = req.user.userId;
        const doc = await this.prisma.document.findFirst({ where: { id, userId } });
        if (!doc)
            throw new common_1.BadRequestException('Not found');
        const full = path.join(UPLOAD_DIR, doc.storageKey);
        if (fs.existsSync(full))
            fs.unlinkSync(full);
        await this.prisma.document.delete({ where: { id } });
        await this.history.log({
            userId,
            kind: 'doc_deleted',
            title: 'Изтрит документ',
            description: doc.name,
            vehicleId: doc.vehicleId ?? null,
            obligationId: doc.obligationId ?? null,
            documentId: doc.id,
            meta: { category: doc.category },
        });
        return { ok: true };
    }
    async upload(req, file) {
        const userId = req.user.userId;
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const vehicleId = req.body.vehicleId || null;
        const obligationId = req.body.obligationId || null;
        const category = req.body.category;
        if (!category) {
            throw new common_1.BadRequestException('Missing document category');
        }
        if (vehicleId) {
            const v = await this.prisma.vehicle.findFirst({
                where: { id: vehicleId, userId },
            });
            if (!v)
                throw new common_1.BadRequestException('Invalid vehicleId');
        }
        if (obligationId) {
            const o = await this.prisma.obligation.findFirst({
                where: { id: obligationId, vehicle: { userId } },
            });
            if (!o)
                throw new common_1.BadRequestException('Invalid obligationId');
        }
        const doc = await this.prisma.document.create({
            data: {
                userId,
                vehicleId,
                obligationId,
                category,
                name: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                storageKey: file.filename,
            },
        });
        await this.history.log({
            userId,
            kind: 'doc_uploaded',
            title: 'Качен документ',
            description: `${doc.name}`,
            vehicleId: doc.vehicleId,
            obligationId: doc.obligationId,
            documentId: doc.id,
            meta: { category: doc.category, sizeBytes: doc.sizeBytes },
        });
        return doc;
    }
    async download(req, id, res) {
        const userId = req.user.userId;
        const doc = await this.prisma.document.findFirst({ where: { id, userId } });
        if (!doc)
            throw new common_1.BadRequestException('Not found');
        const full = path.join(UPLOAD_DIR, doc.storageKey);
        if (!fs.existsSync(full))
            throw new common_1.BadRequestException('File missing on disk');
        res.setHeader('Content-Type', doc.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
        return res.sendFile(full);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('vehicle/:vehicleId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "listByVehicle", null);
__decorate([
    (0, common_1.Get)('obligation/:obligationId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('obligationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "listByObligation", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname || '');
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "download", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        history_service_1.HistoryService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map