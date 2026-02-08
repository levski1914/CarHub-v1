"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GtpService = void 0;
const common_1 = require("@nestjs/common");
const playwright_1 = require("playwright");
const crypto_1 = require("crypto");
const gtp_store_1 = require("./gtp.store");
let GtpService = GtpService_1 = class GtpService {
    logger = new common_1.Logger(GtpService_1.name);
    GTP_URL = 'https://rta.government.bg/services/check-inspection/index.html';
    REG_INPUT = 'input[data-bind*="registrationNumber"]';
    CAPTCHA_IMG = '.captchaWrp img';
    CAPTCHA_INPUT = 'input[data-bind*="textInput: captcha"]';
    SUBMIT_BTN = 'a.submit';
    REFRESH_BTN = 'a.recaptcha';
    CAPTCHA_ERROR = '.captchaInput.error';
    RESULT_YES = '.resultYes';
    RESULT_NO = '.resultNo';
    NEXT_DATE = 'span[data-bind*="nextInspectionDate"]';
    async getWorkingFrame(page) {
        const main = page.mainFrame();
        const mainCount = await main
            .locator(this.REG_INPUT)
            .first()
            .count()
            .catch(() => 0);
        if (mainCount > 0)
            return main;
        for (const fr of page.frames()) {
            if (fr === main)
                continue;
            const c = await fr
                .locator(this.REG_INPUT)
                .first()
                .count()
                .catch(() => 0);
            if (c > 0)
                return fr;
        }
        throw new Error('Не намерих registrationNumber input (възможно е сайтът да е променен).');
    }
    async waitUiReady(page) {
        await page.waitForSelector(this.REG_INPUT, { timeout: 15_000 });
        await page.waitForSelector(this.CAPTCHA_IMG, { timeout: 15_000 });
    }
    async screenshotCaptcha(frame) {
        const img = frame.locator(this.CAPTCHA_IMG).first();
        await img.waitFor({ state: 'visible', timeout: 15_000 });
        const buf = await img.screenshot();
        return `data:image/png;base64,${buf.toString('base64')}`;
    }
    async fillPlate(frame, plate) {
        const input = frame.locator(this.REG_INPUT).first();
        await input.waitFor({ state: 'visible', timeout: 15_000 });
        await input.click({ timeout: 5000 }).catch(() => { });
        await input.fill(plate);
        await input.dispatchEvent('input').catch(() => { });
        await input.dispatchEvent('change').catch(() => { });
    }
    async fillCaptchaAndSubmit(frame, code) {
        const codeInput = frame.locator(this.CAPTCHA_INPUT).first();
        await codeInput.waitFor({ state: 'visible', timeout: 15_000 });
        await codeInput.click().catch(() => { });
        await codeInput.fill(code);
        await codeInput.dispatchEvent('input').catch(() => { });
        await codeInput.dispatchEvent('change').catch(() => { });
        const valAfter = await codeInput.inputValue().catch(() => '');
        this.logger.log(`captcha input value AFTER fill = "${valAfter}"`);
        const submit = frame.locator(this.SUBMIT_BTN).first();
        await submit.waitFor({ state: 'visible', timeout: 15_000 });
        await submit.click({ timeout: 5000 }).catch(async () => {
            await submit.dispatchEvent('click');
        });
    }
    parseBgDateToIso(bg) {
        const m = bg.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (!m)
            return null;
        const [, dd, mm, yyyy] = m;
        return new Date(`${yyyy}-${mm}-${dd}T12:00:00`).toISOString();
    }
    pickLastBgDate(text) {
        const matches = [...text.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map((m) => m[1]);
        if (!matches.length)
            return null;
        return matches[matches.length - 1];
    }
    async start(plate) {
        try {
            gtp_store_1.gtpStore.cleanup();
            const browser = await playwright_1.chromium.launch({ headless: true });
            const context = await browser.newContext({ locale: 'bg-BG' });
            const page = await context.newPage();
            await page.goto(this.GTP_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            });
            await this.waitUiReady(page);
            const frame = await this.getWorkingFrame(page);
            await this.fillPlate(frame, plate.trim());
            const captchaImageBase64 = await this.screenshotCaptcha(frame);
            const challengeId = (0, crypto_1.randomUUID)();
            gtp_store_1.gtpStore.create({
                id: challengeId,
                context,
                page,
                createdAt: Date.now(),
            });
            return {
                status: 'needs_user',
                challengeId,
                captchaImageBase64,
                message: 'Въведи CAPTCHA кода от страницата на ГТП.',
            };
        }
        catch (e) {
            this.logger.error(`start() failed: ${e?.message}`, e?.stack);
            return {
                status: 'failed',
                message: e?.message ?? 'Грешка при GTP start',
            };
        }
    }
    async solve(challengeId, code) {
        const ch = gtp_store_1.gtpStore.get(challengeId);
        if (!ch)
            return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };
        const { context, page } = ch;
        let shouldClose = true;
        try {
            const frame = await this.getWorkingFrame(page);
            const beforeSrc = (await frame
                .locator(this.CAPTCHA_IMG)
                .getAttribute('src')
                .catch(() => null)) ?? '';
            await this.fillCaptchaAndSubmit(frame, code.trim());
            const outcome = await Promise.race([
                page
                    .waitForSelector(this.RESULT_YES, { timeout: 12_000 })
                    .then(() => 'YES')
                    .catch(() => null),
                page
                    .waitForSelector(this.RESULT_NO, { timeout: 12_000 })
                    .then(() => 'NO')
                    .catch(() => null),
                page
                    .waitForSelector(this.CAPTCHA_ERROR, { timeout: 12_000 })
                    .then(() => 'CAPTCHA_ERR')
                    .catch(() => null),
                (async () => {
                    for (let i = 0; i < 24; i++) {
                        await page.waitForTimeout(500);
                        const afterSrc = (await frame
                            .locator(this.CAPTCHA_IMG)
                            .getAttribute('src')
                            .catch(() => null)) ?? '';
                        if (beforeSrc && afterSrc && afterSrc !== beforeSrc)
                            return 'CAPTCHA_REFRESH';
                    }
                    return null;
                })(),
            ]);
            this.logger.log(`solve() outcome=${outcome}`);
            if (!outcome) {
                return {
                    status: 'failed',
                    message: 'Timeout: няма отговор от сайта (опитай пак).',
                };
            }
            if (outcome === 'CAPTCHA_ERR' || outcome === 'CAPTCHA_REFRESH') {
                shouldClose = false;
                const frame2 = await this.getWorkingFrame(page);
                const captchaImageBase64 = await this.screenshotCaptcha(frame2);
                return {
                    status: 'needs_user',
                    challengeId,
                    captchaImageBase64,
                    message: 'Грешна CAPTCHA. Въведи новия код.',
                };
            }
            if (outcome === 'NO') {
                return {
                    status: 'not_found',
                    message: 'Няма намерен валиден ГТП за този номер.',
                };
            }
            const yesText = (await page
                .locator(this.RESULT_YES)
                .first()
                .innerText()
                .catch(() => '')) ?? '';
            const picked = this.pickLastBgDate(yesText);
            if (!picked)
                return { status: 'failed', message: 'Има YES, но не намерих дата.' };
            const iso = this.parseBgDateToIso(picked);
            if (!iso)
                return {
                    status: 'failed',
                    message: `Не мога да parse-на дата "${picked}"`,
                };
            return { status: 'ok', validUntil: iso };
        }
        catch (e) {
            return {
                status: 'failed',
                message: e?.message ?? 'Грешка при GTP solve',
            };
        }
        finally {
            if (shouldClose) {
                gtp_store_1.gtpStore.delete(challengeId);
                await context.close().catch(() => { });
            }
        }
    }
    async refresh(challengeId) {
        const ch = gtp_store_1.gtpStore.get(challengeId);
        if (!ch)
            return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };
        try {
            const frame = await this.getWorkingFrame(ch.page);
            const captchaImageBase64 = await this.screenshotCaptcha(frame);
            return { status: 'ok', captchaImageBase64 };
        }
        catch (e) {
            return { status: 'failed', message: e?.message ?? 'Грешка при refresh' };
        }
    }
};
exports.GtpService = GtpService;
exports.GtpService = GtpService = GtpService_1 = __decorate([
    (0, common_1.Injectable)()
], GtpService);
//# sourceMappingURL=gtp.service.js.map