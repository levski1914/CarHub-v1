import { BrowserContext, Page } from 'playwright';

export type GtpChallenge = {
  id: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
};

class GtpStore {
  private map = new Map<string, GtpChallenge>();

  create(ch: GtpChallenge) {
    this.map.set(ch.id, ch);
  }

  get(id: string) {
    return this.map.get(id);
  }

  delete(id: string) {
    this.map.delete(id);
  }

  cleanup(ttlMs = 5 * 60 * 1000) {
    const now = Date.now();
    for (const [id, ch] of this.map.entries()) {
      if (now - ch.createdAt > ttlMs) {
        ch.context.close().catch(() => {});
        this.map.delete(id);
      }
    }
  }
}

export const gtpStore = new GtpStore();
