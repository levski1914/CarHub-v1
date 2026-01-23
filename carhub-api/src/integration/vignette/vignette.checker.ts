import { Page } from 'playwright';

type VignetteResult =
  | { status: 'ok'; validUntil: string }
  | { status: 'not_found' }
  | { status: 'needs_user'; message: string }
  | { status: 'failed'; message: string };

export async function checkVignette(
  page: Page,
  plate: string,
): Promise<VignetteResult> {
  try {
    // 1) отиваме на страницата за проверка
    await page.goto('https://check.bgtoll.bg/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // 2) basic bot detection – ако ни искат captcha директно
    if (
      await page
        .locator("iframe[src*='captcha'], text=CAPTCHA")
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return {
        status: 'needs_user',
        message: 'Изисква се потвърждение (CAPTCHA)',
      };
    }

    // 3) попълване на регистрационен номер
    await page.fill('input', plate); // ⚠️ selector ще се донастрои при тест
    await page.keyboard.press('Enter');

    // 4) чакаме резултат
    await page.waitForTimeout(1500);

    // 5) отново проверка за CAPTCHA след submit
    if (
      await page
        .locator("iframe[src*='captcha']")
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return {
        status: 'needs_user',
        message: 'Изисква се потвърждение след въвеждане',
      };
    }

    // 6) опит да извадим дата
    const text = await page.textContent('body');

    if (!text) {
      return { status: 'failed', message: 'Няма отговор от системата' };
    }

    // 7) търсим дата (примерен regex, ще се донастрои)
    const matches = [...text.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)].map(
      (m) => m[1],
    );

    // BG Toll показва поне 2 дати: начало и край.
    // Вземаме ВТОРАТА (крайната). Ако има повече, взимаме последната.
    const picked =
      matches.length >= 2
        ? matches[1]
        : matches.length === 1
          ? matches[0]
          : null;

    if (picked) {
      const [day, month, year] = picked.split('.');
      const iso = new Date(`${year}-${month}-${day}T12:00:00`).toISOString();
      return { status: 'ok', validUntil: iso };
    }

    // 8) ако няма дата → няма валидна винетка
    return { status: 'not_found' };
  } catch (err: any) {
    return {
      status: 'failed',
      message: err?.message ?? 'Грешка при проверка',
    };
  }
}
