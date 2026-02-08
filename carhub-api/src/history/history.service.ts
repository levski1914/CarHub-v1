import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type HistoryKind =
  | 'doc_uploaded'
  | 'doc_deleted'
  | 'obligation_updated'
  | 'enrich_checked'
  | 'vehicle_created'
  | 'vehicle_updated'
  | 'vehicle_deleted'
  | 'notification_sent';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async log(input: {
    userId: string;
    kind: HistoryKind;
    title: string;
    description?: string | null;
    vehicleId?: string | null;
    obligationId?: string | null;
    documentId?: string | null;
    meta?: any;
  }) {
    return this.prisma.historyEvent.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        vehicleId: input.vehicleId ?? null,
        obligationId: input.obligationId ?? null,
        documentId: input.documentId ?? null,
        meta: input.meta ?? undefined,
      },
    });
  }

  async list(
    userId: string,
    q?: {
      vehicleId?: string;
      kind?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(Number(q?.take ?? 200), 1), 500);

    return this.prisma.historyEvent.findMany({
      where: {
        userId,
        ...(q?.vehicleId && q.vehicleId !== 'all'
          ? { vehicleId: q.vehicleId }
          : {}),
        ...(q?.kind && q.kind !== 'all' ? { kind: q.kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
