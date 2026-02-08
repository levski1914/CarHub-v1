import { GtpService } from './gtp.service';
import { PrismaService } from '../../prisma.service';
export declare class GtpController {
    private readonly gtp;
    private readonly prisma;
    constructor(gtp: GtpService, prisma: PrismaService);
    start(body: {
        plate: string;
    }): Promise<{
        status: "needs_user";
        challengeId: string;
        captchaImageBase64: string;
        message: string;
    } | {
        status: "failed";
        message: string;
    }>;
    solve(body: {
        vehicleId: string;
        challengeId: string;
        code: string;
    }): Promise<{
        status: "ok";
        validUntil: string;
    } | {
        status: "needs_user";
        challengeId: string;
        captchaImageBase64: string;
        message: string;
    } | {
        status: "not_found";
        message: string;
    } | {
        status: "failed";
        message: string;
    }>;
    private upsertIntegrationObligation;
}
