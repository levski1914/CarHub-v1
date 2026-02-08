import { PrismaService } from '../prisma.service';
import { EmailChannel } from './providers/email.channel';
import { SmsChannel } from './providers/sms.channel';
import { HistoryService } from 'src/history/history.service';
import { InboxService } from 'src/inbox/inbox.service';
export declare class NotificationsService {
    private prisma;
    private email;
    private sms;
    private history;
    private inbox;
    constructor(prisma: PrismaService, email: EmailChannel, sms: SmsChannel, history: HistoryService, inbox: InboxService);
    run(): Promise<void>;
    private processUser;
    private notifyOnce;
}
