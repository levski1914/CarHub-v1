type GtpStartResponse = {
    status: 'needs_user';
    challengeId: string;
    captchaImageBase64: string;
    message: string;
} | {
    status: 'failed';
    message: string;
};
type GtpSolveResponse = {
    status: 'ok';
    validUntil: string;
} | {
    status: 'needs_user';
    challengeId: string;
    captchaImageBase64: string;
    message: string;
} | {
    status: 'not_found';
    message: string;
} | {
    status: 'failed';
    message: string;
};
export declare class GtpService {
    private readonly logger;
    private GTP_URL;
    private REG_INPUT;
    private CAPTCHA_IMG;
    private CAPTCHA_INPUT;
    private SUBMIT_BTN;
    private REFRESH_BTN;
    private CAPTCHA_ERROR;
    private RESULT_YES;
    private RESULT_NO;
    private NEXT_DATE;
    private getWorkingFrame;
    private waitUiReady;
    private screenshotCaptcha;
    private fillPlate;
    private fillCaptchaAndSubmit;
    private parseBgDateToIso;
    private pickLastBgDate;
    start(plate: string): Promise<GtpStartResponse>;
    solve(challengeId: string, code: string): Promise<GtpSolveResponse>;
    refresh(challengeId: string): Promise<{
        status: 'ok';
        captchaImageBase64: string;
    } | {
        status: 'failed';
        message: string;
    }>;
}
export {};
