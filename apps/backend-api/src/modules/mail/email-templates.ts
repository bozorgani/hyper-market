/**
 * Email templates for OTP and password reset.
 * All templates are RTL Persian with inline styles (no external CSS dependency).
 */

const baseStyles = `
  <style>
    body { font-family: Tahoma, Arial, sans-serif; direction: rtl; text-align: right; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 900; }
    .body { padding: 32px 24px; }
    .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; direction: ltr; }
    .code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace; }
    .note { color: #64748b; font-size: 13px; line-height: 1.8; margin-top: 16px; }
    .footer { padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; }
  </style>
`;

function wrap(content: string): string {
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${baseStyles}</head><body><div class="container">${content}</div></body></html>`;
}

export function otpEmailHtml(code: string, expiresMinutes: number): string {
  return wrap(`
    <div class="header">
      <h1>🛒 هایپرمارکت</h1>
    </div>
    <div class="body">
      <p style="font-size:15px;color:#334155;margin:0 0 8px;">کد تأیید شما:</p>
      <div class="code-box">
        <span class="code">${code}</span>
      </div>
      <p class="note">
        این کد برای تأیید هویت شما ارسال شده است.<br>
        کد تأیید شما <strong>${expiresMinutes} دقیقه</strong> اعتبار دارد.<br>
        اگر شما درخواستی ارسال نکرده‌اید، این ایمیل را نادیده بگیرید.
      </p>
    </div>
    <div class="footer">
      هایپرمارکت — فروشگاه آنلاین &bull; این ایمیل خودکار است، لطفاً پاسخ ندهید.
    </div>
  `);
}

export function passwordResetEmailHtml(code: string, expiresMinutes: number): string {
  return wrap(`
    <div class="header">
      <h1>🔐 بازنشانی رمز عبور</h1>
    </div>
    <div class="body">
      <p style="font-size:15px;color:#334155;margin:0 0 8px;">کد بازنشانی رمز عبور شما:</p>
      <div class="code-box">
        <span class="code">${code}</span>
      </div>
      <p class="note">
        با این کد می‌توانید رمز عبور خود را تغییر دهید.<br>
        این کد <strong>${expiresMinutes} دقیقه</strong> اعتبار دارد.<br>
        اگر شما درخواست بازنشانی نکرده‌اید، رمز عبور شما امن است و نیازی به اقدام نیست.
      </p>
    </div>
    <div class="footer">
      هایپرمارکت — فروشگاه آنلاین &bull; این ایمیل خودکار است، لطفاً پاسخ ندهید.
    </div>
  `);
}
