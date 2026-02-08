import { GoService } from './go.service';
export declare class GoController {
    private go;
    constructor(go: GoService);
    start(body: {
        plate: string;
        vin?: string;
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
        challengeId: string;
        code: string;
    }): Promise<{
        status: "ok";
        validUntil: string;
    } | {
        status: "not_found";
    } | {
        status: "failed";
        message: string;
    }>;
}
