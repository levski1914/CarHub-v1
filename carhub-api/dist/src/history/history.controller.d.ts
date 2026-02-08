import { HistoryService } from './history.service';
export declare class HistoryController {
    private history;
    constructor(history: HistoryService);
    list(req: any, vehicleId?: string, kind?: string, take?: string): Promise<{
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
