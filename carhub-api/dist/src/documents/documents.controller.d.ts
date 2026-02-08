import { PrismaService } from '../prisma.service';
import type { Response } from 'express';
import { HistoryService } from 'src/history/history.service';
export declare class DocumentsController {
    private prisma;
    private history;
    constructor(prisma: PrismaService, history: HistoryService);
    list(req: any): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        name: string;
        vehicleId: string | null;
        obligationId: string | null;
        mimeType: string;
        sizeBytes: number;
        storageKey: string;
        category: import("@prisma/client").$Enums.DocumentCategory;
    }[]>;
    listByVehicle(req: any, vehicleId: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        name: string;
        vehicleId: string | null;
        obligationId: string | null;
        mimeType: string;
        sizeBytes: number;
        storageKey: string;
        category: import("@prisma/client").$Enums.DocumentCategory;
    }[]>;
    listByObligation(req: any, obligationId: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        name: string;
        vehicleId: string | null;
        obligationId: string | null;
        mimeType: string;
        sizeBytes: number;
        storageKey: string;
        category: import("@prisma/client").$Enums.DocumentCategory;
    }[]>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
    upload(req: any, file: Express.Multer.File): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        name: string;
        vehicleId: string | null;
        obligationId: string | null;
        mimeType: string;
        sizeBytes: number;
        storageKey: string;
        category: import("@prisma/client").$Enums.DocumentCategory;
    }>;
    download(req: any, id: string, res: Response): Promise<void>;
}
