"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVignette = checkVignette;
async function checkVignette(page, plate) {
    try {
        await page.goto('https://check.bgtoll.bg/', {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        if (await page
            .locator("iframe[src*='captcha'], text=CAPTCHA")
            .first()
            .isVisible()
            .catch(() => false)) {
            return {
                status: 'needs_user',
                message: 'Изисква се потвърждение (CAPTCHA)',
            };
        }
        await page.fill('input', plate);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
        if (await page
            .locator("iframe[src*='captcha']")
            .first()
            .isVisible()
            .catch(() => false)) {
            return {
                status: 'needs_user',
                message: 'Изисква се потвърждение след въвеждане',
            };
        }
        const text = await page.textContent('body');
        if (!text) {
            return { status: 'failed', message: 'Няма отговор от системата' };
        }
        const matches = [...text.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map((m) => m[1]);
        const picked = matches.length >= 2
            ? matches[1]
            : matches.length === 1
                ? matches[0]
                : null;
        if (picked) {
            const [day, month, year] = picked.split('.');
            const iso = new Date(`${year}-${month}-${day}T12:00:00`).toISOString();
            return { status: 'ok', validUntil: iso };
        }
        return { status: 'not_found' };
    }
    catch (err) {
        return {
            status: 'failed',
            message: err?.message ?? 'Грешка при проверка',
        };
    }
}
//# sourceMappingURL=vignette.checker.js.map