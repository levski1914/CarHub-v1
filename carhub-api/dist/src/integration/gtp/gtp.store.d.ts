import { BrowserContext, Page } from 'playwright';
export type GtpChallenge = {
    id: string;
    context: BrowserContext;
    page: Page;
    createdAt: number;
};
declare class GtpStore {
    private map;
    create(ch: GtpChallenge): void;
    get(id: string): GtpChallenge | undefined;
    delete(id: string): void;
    cleanup(ttlMs?: number): void;
}
export declare const gtpStore: GtpStore;
export {};
