import { BrowserContext, Page } from 'playwright';
export type GoChallenge = {
    id: string;
    context: BrowserContext;
    page: Page;
    createdAt: number;
};
declare class GoStore {
    private map;
    create(ch: GoChallenge): void;
    get(id: string): GoChallenge | undefined;
    delete(id: string): void;
    cleanup(ttlMs?: number): void;
}
export declare const goStore: GoStore;
export {};
