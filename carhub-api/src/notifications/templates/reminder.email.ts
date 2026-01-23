type ReminderEmailProps = {
  title: string;
  plate: string;
  label: string;
  dueDate: string;
  daysDiff?: number;
  kind: 'before_due' | 'overdue';
};

export function reminderEmailHtml({
  title,
  plate,
  label,
  dueDate,
  daysDiff,
  kind,
}: ReminderEmailProps) {
  const color =
    kind === 'overdue'
      ? '#dc2626'
      : daysDiff && daysDiff <= 3
        ? '#f59e0b'
        : '#16a34a';

  const badgeText =
    kind === 'overdue' ? 'ПРОСРОЧЕНО' : daysDiff ? `след ${daysDiff} дни` : '';

  return `
<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px;">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-size:20px;color:#111827;">
                🚗 CarHub
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px 0;color:#111827;">
                ${title}
              </h2>

              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;">
                <b>${label}</b> за автомобил с регистрационен номер
                <b>${plate}</b>
              </p>

              <p style="margin:0 0 20px 0;color:#374151;font-size:14px;">
                Валидно до: <b>${dueDate}</b>
              </p>

              <span style="
                display:inline-block;
                padding:6px 12px;
                border-radius:999px;
                background:${color};
                color:#ffffff;
                font-size:12px;
                font-weight:bold;
              ">
                ${badgeText}
              </span>

              <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px;">
                ⚠️ Моля, провери информацията за сигурност.
                Автоматичните данни може да съдържат неточности.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;">
              Това съобщение е изпратено автоматично от CarHub.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
