import { PrismaService } from '../prisma.service';
export type HistoryKind = 'doc_uploaded' | 'doc_deleted' | 'obligation_updated' | 'enrich_checked' | 'vehicle_created' | 'vehicle_updated' | 'vehicle_deleted' | 'notification_sent';
export declare class HistoryService {
    private prisma;
    constructor(prisma: PrismaService);
    log(input: {
        userId: string;
        kind: HistoryKind;
        title: string;
        description?: string | null;
        vehicleId?: string | null;
        obligationId?: string | null;
        documentId?: string | null;
        meta?: any;
    }): Promise<{
        id: string;
        userId: string;
        title: string;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        kind: string;
        description: string | null;
        vehicleId: string | null;
        obligationId: string | null;
        documentId: string | null;
    }>;
    list(userId: string, q?: {
        vehicleId?: string;
        kind?: string;
        take?: number;
    }): Promise<{
        id: string;
        userId: string;
        title: string;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        kind: string;
        description: string | null;
        vehicleId: string | null;
        obligationId: string | null;
        documentId: string | null;
    }[]>;
}
