import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { HistoryService } from 'src/history/history.service';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private prisma: PrismaService,
    private history: HistoryService,
  ) {
    ensureUploadDir();
  }

  @Get()
  async list(@Req() req: any) {
    const userId = req.user.userId;
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('vehicle/:vehicleId')
  async listByVehicle(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    const userId = req.user.userId;
    return this.prisma.document.findMany({
      where: { userId, vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('obligation/:obligationId')
  async listByObligation(
    @Req() req: any,
    @Param('obligationId') obligationId: string,
  ) {
    const userId = req.user.userId;
    return this.prisma.document.findMany({
      where: { userId, obligationId },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({ where: { id, userId } });
    if (!doc) throw new BadRequestException('Not found');

    // delete file from disk
    const full = path.join(UPLOAD_DIR, doc.storageKey);
    if (fs.existsSync(full)) fs.unlinkSync(full);

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '');
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.userId;
    if (!file) throw new BadRequestException('No file uploaded');

    // опционални връзки (ако ги пращаш)
    const vehicleId = req.body.vehicleId || null;
    const obligationId = req.body.obligationId || null;
    const category = req.body.category as any;
    if (!category) {
      throw new BadRequestException('Missing document category');
    }

    // basic ownership check (ако подадеш vehicleId/obligationId)
    if (vehicleId) {
      const v = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, userId },
      });
      if (!v) throw new BadRequestException('Invalid vehicleId');
    }
    if (obligationId) {
      const o = await this.prisma.obligation.findFirst({
        where: { id: obligationId, vehicle: { userId } },
      });
      if (!o) throw new BadRequestException('Invalid obligationId');
    }

    const doc = await this.prisma.document.create({
      data: {
        userId,
        vehicleId,
        obligationId,
        category, // ✅
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

  @Get(':id/download')
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({ where: { id, userId } });
    if (!doc) throw new BadRequestException('Not found');

    const full = path.join(UPLOAD_DIR, doc.storageKey);
    if (!fs.existsSync(full))
      throw new BadRequestException('File missing on disk');

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.name)}"`,
    );
    return res.sendFile(full);
  }
}
