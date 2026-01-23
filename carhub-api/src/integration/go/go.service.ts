import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { goStore } from './go.store';
import { randomUUID } from 'crypto';

type GoStartResponse =
  | {
      status: 'needs_user';
      challengeId: string;
      captchaImageBase64: string;
      message: string;
    }
  | { status: 'failed'; message: string };

type GoSolveResponse =
  | { status: 'ok'; validUntil: string }
  | { status: 'not_found' }
  | { status: 'failed'; message: string };

@Injectable()
export class GoService {
  // TODO: сложи реалния URL на публичната проверка на Гаранционен фонд
  private GO_URL =
    'https://www.guaranteefund.org/bg/%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D0%BD-%D1%86%D0%B5%D0%BD%D1%82%D1%8A%D1%80-%D0%B8-%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B8/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8/%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0-%D0%B7%D0%B0-%D0%B2%D0%B0%D0%BB%D0%B8%D0%B4%D0%BD%D0%B0-%D0%B7%D0%B0%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B3%D1%80a%D0%B6%D0%B4a%D0%BD%D1%81%D0%BAa-%D0%BE%D1%82%D0%B3%D0%BE%D0%B2%D0%BE%D1%80%D0%BD%D0%BE%D1%81%D1%82-%D0%BD%D0%B0-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%82%D0%B5'; // <-- смени

  async start(plate: string, vin?: string): Promise<GoStartResponse> {
    try {
      goStore.cleanup();

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ locale: 'bg-BG' });
      const page = await context.newPage();

      await page.goto(this.GO_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // TODO: selectors (попълване на номер + vin)
      // await page.fill('input[name="plate"]', plate);
      // if (vin) await page.fill('input[name="vin"]', vin);

      // Тук обикновено има captcha image. Намираме елемента и го screenshot-ваме.
      // TODO: смени selector-а да сочи captcha img
      const captcha = page.locator('img').first();

      if (!(await captcha.isVisible().catch(() => false))) {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
        return {
          status: 'failed',
          message: 'Не намерих CAPTCHA поле/изображение.',
        };
      }

      const buf = await captcha.screenshot();
      const base64 = `data:image/png;base64,${buf.toString('base64')}`;

      const challengeId = randomUUID();
      goStore.create({ id: challengeId, context, page, createdAt: Date.now() });

      // НЕ затваряме browser-а — държим context/page живи до solve.
      return {
        status: 'needs_user',
        challengeId,
        captchaImageBase64: base64,
        message: 'Въведи кода за сигурност, за да потвърдим валидността на ГО.',
      };
    } catch (e: any) {
      return { status: 'failed', message: e?.message ?? 'Грешка при start' };
    }
  }

  async solve(challengeId: string, code: string): Promise<GoSolveResponse> {
    const ch = goStore.get(challengeId);
    if (!ch)
      return { status: 'failed', message: 'Сесията е изтекла. Опитай пак.' };

    const { context, page } = ch;

    try {
      // TODO: fill captcha code + submit
      // await page.fill('input[name="captcha"]', code);
      // await page.click('button:has-text("Провери")');

      await page.waitForTimeout(1500);

      // TODO: парсни резултата и вземи валидност (до дата)
      const bodyText = await page.textContent('body');

      if (!bodyText) return { status: 'failed', message: 'Няма отговор.' };

      // MVP: търсим дата и взимаме последната срещната (често е 'валидна до')
      const matches = [...bodyText.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map(
        (m) => m[1],
      );
      if (matches.length === 0) return { status: 'not_found' };

      const picked = matches[matches.length - 1];
      const [day, month, year] = picked.split('.');
      const iso = new Date(`${year}-${month}-${day}T12:00:00`).toISOString();

      return { status: 'ok', validUntil: iso };
    } catch (e: any) {
      return { status: 'failed', message: e?.message ?? 'Грешка при solve' };
    } finally {
      // затваряме и чистим
      goStore.delete(challengeId);
      await context.close().catch(() => {});
      // browser-а е част от context-а и ще се затвори; ако държиш browser отделно — затвори и него.
    }
  }
}
