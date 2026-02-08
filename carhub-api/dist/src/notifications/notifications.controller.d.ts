import { PrismaService } from '../prisma.service';
import { InboxService } from 'src/inbox/inbox.service';
export declare class NotificationsController {
    private prisma;
    private inbox;
    constructor(prisma: PrismaService, inbox: InboxService);
    get(req: any): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        emailEnabled: boolean;
        smsEnabled: boolean;
        email: string | null;
        phone: string | null;
        daysBefore: number[];
        sendHour: number;
        sendMinute: number;
        timezone: string;
        updatedAt: Date;
    }>;
    update(req: any, body: any): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        emailEnabled: boolean;
        smsEnabled: boolean;
        email: string | null;
        phone: string | null;
        daysBefore: number[];
        sendHour: number;
        sendMinute: number;
        timezone: string;
        updatedAt: Date;
    }>;
}
