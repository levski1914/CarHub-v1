type GoStartResponse = {
    status: 'needs_user';
    challengeId: string;
    captchaImageBase64: string;
    message: string;
} | {
    status: 'failed';
    message: string;
};
type GoSolveResponse = {
    status: 'ok';
    validUntil: string;
} | {
    status: 'not_found';
} | {
    status: 'failed';
    message: string;
};
export declare class GoService {
    private GO_URL;
    start(plate: string, vin?: string): Promise<GoStartResponse>;
    solve(challengeId: string, code: string): Promise<GoSolveResponse>;
}
export {};
