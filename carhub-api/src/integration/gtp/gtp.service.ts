import { Injectable, Logger } from '@nestjs/common';
import { chromium, Frame, Page } from 'playwright';
import { randomUUID } from 'crypto';
import { gtpStore } from './gtp.store';

type GtpStartResponse =
  | {
      status: 'needs_user';
      challengeId: string;
      captchaImageBase64: string;
      message: string;
    }
  | { status: 'failed'; message: string };

type GtpSolveResponse =
  | { status: 'ok'; validUntil: string }
  | {
      status: 'needs_user';
      challengeId: string;
      captchaImageBase64: string;
      message: string;
    }
  | { status: 'not_found'; message: string }
  | { status: 'failed'; message: string };

@Injectable()
export class GtpService {
  private readonly logger = new Logger(GtpService.name);

  private GTP_URL =
    'https://rta.government.bg/services/check-inspection/index.html';

  // ----------------- selectors (по реалния DOM) -----------------
  // Рег. номер input (KO custom binding registrationNumber)
  private REG_INPUT = 'input[data-bind*="registrationNumber"]';

  // CAPTCHA
  private CAPTCHA_IMG = '.captchaWrp img';
  // Реален captcha input: data-bind="textInput: captcha"
  private CAPTCHA_INPUT = 'input[data-bind*="textInput: captcha"]';
  private SUBMIT_BTN = 'a.submit';
  private REFRESH_BTN = 'a.recaptcha';

  // Грешна captcha: wrapper .captchaInput става с клас error
  private CAPTCHA_ERROR = '.captchaInput.error';

  // Result container/sections
  private RESULT_YES = '.resultYes';
  private RESULT_NO = '.resultNo';

  // (ако все пак го има) дата по binding
  private NEXT_DATE = 'span[data-bind*="nextInspectionDate"]';

  // ----------------- helpers -----------------
  private async getWorkingFrame(page: Page): Promise<Frame> {
    const main = page.mainFrame();
    const mainCount = await main
      .locator(this.REG_INPUT)
      .first()
      .count()
      .catch(() => 0);
    if (mainCount > 0) return main;

    for (const fr of page.frames()) {
      if (fr === main) continue;
      const c = await fr
        .locator(this.REG_INPUT)
        .first()
        .count()
        .catch(() => 0);
      if (c > 0) return fr;
    }

    throw new Error(
      'Не намерих registrationNumber input (възможно е сайтът да е променен).',
    );
  }

  private async waitUiReady(page: Page) {
    // KO понякога “връзва” след domcontentloaded → чакаме ключовите елементи
    await page.waitForSelector(this.REG_INPUT, { timeout: 15_000 });
    await page.waitForSelector(this.CAPTCHA_IMG, { timeout: 15_000 });
  }

  private async screenshotCaptcha(frame: Frame): Promise<string> {
    const img = frame.locator(this.CAPTCHA_IMG).first();
    await img.waitFor({ state: 'visible', timeout: 15_000 });
    const buf = await img.screenshot();
    return `data:image/png;base64,${buf.toString('base64')}`;
  }

  private async fillPlate(frame: Frame, plate: string) {
    const input = frame.locator(this.REG_INPUT).first();
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.click({ timeout: 5000 }).catch(() => {});
    await input.fill(plate);
    // KO/старите страници понякога искат events
    await input.dispatchEvent('input').catch(() => {});
    await input.dispatchEvent('change').catch(() => {});
  }

  private async fillCaptchaAndSubmit(frame: Frame, code: string) {
    const codeInput = frame.locator(this.CAPTCHA_INPUT).first();
    await codeInput.waitFor({ state: 'visible', timeout: 15_000 });

    await codeInput.click().catch(() => {});
    await codeInput.fill(code);

    // KO textInput binding реагира на input event
    await codeInput.dispatchEvent('input').catch(() => {});
    await codeInput.dispatchEvent('change').catch(() => {});

    const valAfter = await codeInput.inputValue().catch(() => '');
    this.logger.log(`captcha input value AFTER fill = "${valAfter}"`);

    const submit = frame.locator(this.SUBMIT_BTN).first();
    await submit.waitFor({ state: 'visible', timeout: 15_000 });

    // click + fallback dispatch
    await submit.click({ timeout: 5000 }).catch(async () => {
      await submit.dispatchEvent('click');
    });
  }

  private parseBgDateToIso(bg: string): string | null {
    const m = bg.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    return new Date(`${yyyy}-${mm}-${dd}T12:00:00`).toISOString();
  }

  private pickLastBgDate(text: string): string | null {
    const matches = [...text.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map(
      (m) => m[1],
    );
    if (!matches.length) return null;
    return matches[matches.length - 1];
  }

  // ----------------- public API -----------------
  async start(plate: string): Promise<GtpStartResponse> {
    try {
      gtpStore.cleanup();

      const browser = await chromium.launch({ headless: true });
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

      const challengeId = randomUUID();
      gtpStore.create({
        id: challengeId,
        context,
        page,
        createdAt: Date.now(),
      } as any);

      return {
        status: 'needs_user',
        challengeId,
        captchaImageBase64,
        message: 'Въведи CAPTCHA кода от страницата на ГТП.',
      };
    } catch (e: any) {
      this.logger.error(`start() failed: ${e?.message}`, e?.stack);
      return {
        status: 'failed',
        message: e?.message ?? 'Грешка при GTP start',
      };
    }
  }

  async solve(challengeId: string, code: string): Promise<GtpSolveResponse> {
    const ch = gtpStore.get(challengeId);
    if (!ch)
      return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };

    const { context, page } = ch;
    let shouldClose = true;

    try {
      const frame = await this.getWorkingFrame(page);

      const beforeSrc =
        (await frame
          .locator(this.CAPTCHA_IMG)
          .getAttribute('src')
          .catch(() => null)) ?? '';

      await this.fillCaptchaAndSubmit(frame, code.trim());

      const outcome = await Promise.race([
        page
          .waitForSelector(this.RESULT_YES, { timeout: 12_000 })
          .then(() => 'YES' as const)
          .catch(() => null),
        page
          .waitForSelector(this.RESULT_NO, { timeout: 12_000 })
          .then(() => 'NO' as const)
          .catch(() => null),
        page
          .waitForSelector(this.CAPTCHA_ERROR, { timeout: 12_000 })
          .then(() => 'CAPTCHA_ERR' as const)
          .catch(() => null),
        (async () => {
          for (let i = 0; i < 24; i++) {
            await page.waitForTimeout(500);
            const afterSrc =
              (await frame
                .locator(this.CAPTCHA_IMG)
                .getAttribute('src')
                .catch(() => null)) ?? '';
            if (beforeSrc && afterSrc && afterSrc !== beforeSrc)
              return 'CAPTCHA_REFRESH' as const;
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
        shouldClose = false; // НЕ затваряме сесията → user да пробва пак
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

      // YES → извличане на дата (твоята логика)
      const yesText =
        (await page
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
    } catch (e: any) {
      return {
        status: 'failed',
        message: e?.message ?? 'Грешка при GTP solve',
      };
    } finally {
      if (shouldClose) {
        gtpStore.delete(challengeId);
        await context.close().catch(() => {});
      }
    }
  }

  // (по желание) ако ще правиш endpoint /gtp/refresh
  async refresh(
    challengeId: string,
  ): Promise<
    | { status: 'ok'; captchaImageBase64: string }
    | { status: 'failed'; message: string }
  > {
    const ch = gtpStore.get(challengeId);
    if (!ch)
      return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };

    try {
      const frame = await this.getWorkingFrame(ch.page);
      const captchaImageBase64 = await this.screenshotCaptcha(frame);
      return { status: 'ok', captchaImageBase64 };
    } catch (e: any) {
      return { status: 'failed', message: e?.message ?? 'Грешка при refresh' };
    }
  }
}
