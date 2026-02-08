"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoService = void 0;
const common_1 = require("@nestjs/common");
const playwright_1 = require("playwright");
const go_store_1 = require("./go.store");
const crypto_1 = require("crypto");
let GoService = class GoService {
    GO_URL = 'https://www.guaranteefund.org/bg/%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D0%BD-%D1%86%D0%B5%D0%BD%D1%82%D1%8A%D1%80-%D0%B8-%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B8/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8/%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0-%D0%B7%D0%B0-%D0%B2%D0%B0%D0%BB%D0%B8%D0%B4%D0%BD%D0%B0-%D0%B7%D0%B0%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B3%D1%80a%D0%B6%D0%B4a%D0%BD%D1%81%D0%BAa-%D0%BE%D1%82%D0%B3%D0%BE%D0%B2%D0%BE%D1%80%D0%BD%D0%BE%D1%81%D1%82-%D0%BD%D0%B0-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%82%D0%B5';
    async start(plate, vin) {
        try {
            go_store_1.goStore.cleanup();
            const browser = await playwright_1.chromium.launch({ headless: true });
            const context = await browser.newContext({ locale: 'bg-BG' });
            const page = await context.newPage();
            await page.goto(this.GO_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            });
            const captcha = page.locator('img').first();
            if (!(await captcha.isVisible().catch(() => false))) {
                await context.close().catch(() => { });
                await browser.close().catch(() => { });
                return {
                    status: 'failed',
                    message: 'Не намерих CAPTCHA поле/изображение.',
                };
            }
            const buf = await captcha.screenshot();
            const base64 = `data:image/png;base64,${buf.toString('base64')}`;
            const challengeId = (0, crypto_1.randomUUID)();
            go_store_1.goStore.create({ id: challengeId, context, page, createdAt: Date.now() });
            return {
                status: 'needs_user',
                challengeId,
                captchaImageBase64: base64,
                message: 'Въведи кода за сигурност, за да потвърдим валидността на ГО.',
            };
        }
        catch (e) {
            return { status: 'failed', message: e?.message ?? 'Грешка при start' };
        }
    }
    async solve(challengeId, code) {
        const ch = go_store_1.goStore.get(challengeId);
        if (!ch)
            return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };
        const { context, page } = ch;
        try {
            await page.waitForTimeout(1500);
            const bodyText = await page.textContent('body');
            if (!bodyText)
                return { status: 'failed', message: 'Няма отговор.' };
            const matches = [...bodyText.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map((m) => m[1]);
            if (matches.length === 0)
                return { status: 'not_found' };
            const picked = matches[matches.length - 1];
            const [day, month, year] = picked.split('.');
            const iso = new Date(`${year}-${month}-${day}T12:00:00`).toISOString();
            return { status: 'ok', validUntil: iso };
        }
        catch (e) {
            return { status: 'failed', message: e?.message ?? 'Грешка при solve' };
        }
        finally {
            go_store_1.goStore.delete(challengeId);
            await context.close().catch(() => { });
        }
    }
};
exports.GoService = GoService;
exports.GoService = GoService = __decorate([
    (0, common_1.Injectable)()
], GoService);
//# sourceMappingURL=go.service.js.map