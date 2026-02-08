import { InboxService } from './inbox.service';
export declare class InboxController {
    private inbox;
    constructor(inbox: InboxService);
    list(req: any, take?: string): Promise<{
        id: string;
        dedupeKey: string | null;
        userId: string;
        type: string;
        title: string;
        body: string | null;
        href: string | null;
        meta: import("@prisma/client/runtime/library").JsonValue | null;
        readAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
    }[]>;
    unread(req: any): Promise<{
        count: number;
    }>;
    read(req: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    readAll(req: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
    del(req: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    clear(req: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
