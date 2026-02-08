import { Page } from 'playwright';
type VignetteResult = {
    status: 'ok';
    validUntil: string;
} | {
    status: 'not_found';
} | {
    status: 'needs_user';
    message: string;
} | {
    status: 'failed';
    message: string;
};
export declare function checkVignette(page: Page, plate: string): Promise<VignetteResult>;
export {};
