"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goStore = void 0;
class GoStore {
    map = new Map();
    create(ch) {
        this.map.set(ch.id, ch);
    }
    get(id) {
        return this.map.get(id);
    }
    delete(id) {
        this.map.delete(id);
    }
    cleanup(ttlMs = 5 * 60 * 1000) {
        const now = Date.now();
        for (const [id, ch] of this.map.entries()) {
            if (now - ch.createdAt > ttlMs) {
                ch.context.close().catch(() => { });
                this.map.delete(id);
            }
        }
    }
}
exports.goStore = new GoStore();
//# sourceMappingURL=go.store.js.map