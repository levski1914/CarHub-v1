import { PrismaService } from '../prisma.service';
export declare class InboxService {
    private prisma;
    constructor(prisma: PrismaService);
    create(input: {
        userId: string;
        type: 'reminder' | 'system' | 'activity';
        title: string;
        body?: string | null;
        href?: string | null;
        meta?: any;
        dedupeKey?: string | null;
    }): Promise<{
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
    }>;
    list(userId: string, take?: number): Promise<{
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
    unreadCount(userId: string): Promise<number>;
    markRead(userId: string, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    remove(userId: string, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    clear(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
