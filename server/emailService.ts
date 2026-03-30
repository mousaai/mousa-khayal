/**
 * mousa.ai — Email Notification Service
 * Uses Resend to send transactional emails for subscription events.
 * Requires RESEND_API_KEY environment variable.
 */

import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured — email notifications disabled");
    return null;
  }
  if (!_resend) {
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const FROM_ADDRESS = "mousa.ai <noreply@mousa.ai>";
const SITE_URL = "https://www.mousa.ai";

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildSubscriptionWelcomeEmail(params: {
  userName: string;
  planNameAr: string;
  creditsGranted: number;
  periodEnd: Date;
}): { subject: string; html: string } {
  const { userName, planNameAr, creditsGranted, periodEnd } = params;
  const renewalDate = periodEnd.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `🎉 تم تفعيل اشتراكك في mousa.ai — ${planNameAr}`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد الاشتراك</title>
</head>
<body style="margin:0;padding:0;background:#080E1A;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0D1B2A;border-radius:16px;border:1px solid rgba(212,160,23,0.15);overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D1B2A 0%,#1a2a3a 100%);padding:32px;text-align:center;border-bottom:1px solid rgba(212,160,23,0.15);">
              <div style="font-size:28px;font-weight:900;color:#D4A017;letter-spacing:-1px;">mousa.ai</div>
              <div style="font-size:13px;color:#8899AA;margin-top:4px;letter-spacing:1px;">منظومة البناء والعمران الرقمية</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="color:#E8F0F8;font-size:22px;margin:0 0 8px 0;font-weight:700;">مرحباً، ${userName} 👋</h1>
              <p style="color:#8899AA;font-size:15px;line-height:1.7;margin:0 0 28px 0;">
                تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستفادة الكاملة من جميع منصات mousa.ai.
              </p>

              <!-- Plan Card -->
              <div style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.2);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div style="color:#D4A017;font-size:12px;font-weight:600;letter-spacing:1px;margin-bottom:12px;">تفاصيل الاشتراك</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#8899AA;font-size:14px;padding:6px 0;">الباقة</td>
                    <td style="color:#E8F0F8;font-size:14px;font-weight:600;text-align:left;">${planNameAr}</td>
                  </tr>
                  <tr>
                    <td style="color:#8899AA;font-size:14px;padding:6px 0;">الكريدتات المُضافة</td>
                    <td style="color:#D4A017;font-size:14px;font-weight:700;text-align:left;">⚡ ${creditsGranted.toLocaleString("en-US")} كريدت</td>
                  </tr>
                  <tr>
                    <td style="color:#8899AA;font-size:14px;padding:6px 0;">تاريخ التجديد</td>
                    <td style="color:#E8F0F8;font-size:14px;font-weight:600;text-align:left;">${renewalDate}</td>
                  </tr>
                </table>
              </div>

              <!-- Platforms -->
              <p style="color:#8899AA;font-size:14px;margin:0 0 16px 0;">المنصات المتاحة لك:</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;">
                ${["فضاء", "رقابة", "حرارة", "مسكن", "كود"].map(p => `
                <span style="display:inline-block;background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.2);color:#D4A017;font-size:13px;padding:4px 12px;border-radius:20px;margin:3px;">${p}</span>
                `).join("")}
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-top:32px;">
                <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#D4A017;color:#080E1A;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
                  ابدأ الاستخدام الآن ←
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(212,160,23,0.08);text-align:center;">
              <p style="color:#4A5568;font-size:12px;margin:0;">
                إذا لم تشترك في هذه الخدمة، يرجى تجاهل هذا البريد.
                <br/>
                <a href="${SITE_URL}" style="color:#D4A017;text-decoration:none;">mousa.ai</a> — جميع الحقوق محفوظة
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

function buildRenewalEmail(params: {
  userName: string;
  planNameAr: string;
  creditsGranted: number;
  periodEnd: Date;
}): { subject: string; html: string } {
  const { userName, planNameAr, creditsGranted, periodEnd } = params;
  const renewalDate = periodEnd.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `✅ تم تجديد اشتراكك في mousa.ai — ${creditsGranted.toLocaleString()} كريدت جديد`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#080E1A;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0D1B2A;border-radius:16px;border:1px solid rgba(212,160,23,0.15);overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:#0D1B2A;padding:32px;text-align:center;border-bottom:1px solid rgba(212,160,23,0.15);">
              <div style="font-size:28px;font-weight:900;color:#D4A017;">mousa.ai</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="color:#E8F0F8;font-size:22px;margin:0 0 8px 0;">تم تجديد اشتراكك ✅</h1>
              <p style="color:#8899AA;font-size:15px;line-height:1.7;margin:0 0 28px 0;">
                مرحباً ${userName}، تم تجديد اشتراكك في باقة <strong style="color:#D4A017;">${planNameAr}</strong> بنجاح وأُضيفت كريدتاتك الشهرية.
              </p>
              <div style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.2);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div style="color:#D4A017;font-size:24px;font-weight:800;text-align:center;">⚡ +${creditsGranted.toLocaleString("en-US")} كريدت</div>
                <div style="color:#8899AA;font-size:13px;text-align:center;margin-top:8px;">أُضيفت إلى رصيدك — التجديد القادم: ${renewalDate}</div>
              </div>
              <div style="text-align:center;">
                <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#D4A017;color:#080E1A;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
                  عرض رصيدي ←
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(212,160,23,0.08);text-align:center;">
              <p style="color:#4A5568;font-size:12px;margin:0;">
                <a href="${SITE_URL}" style="color:#D4A017;text-decoration:none;">mousa.ai</a> — جميع الحقوق محفوظة
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

function buildCancellationEmail(params: {
  userName: string;
  planNameAr: string;
  periodEnd: Date;
}): { subject: string; html: string } {
  const { userName, planNameAr, periodEnd } = params;
  const endDate = periodEnd.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `تم إلغاء اشتراكك في mousa.ai`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#080E1A;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0D1B2A;border-radius:16px;border:1px solid rgba(212,160,23,0.15);overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:#0D1B2A;padding:32px;text-align:center;border-bottom:1px solid rgba(212,160,23,0.15);">
              <div style="font-size:28px;font-weight:900;color:#D4A017;">mousa.ai</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="color:#E8F0F8;font-size:22px;margin:0 0 8px 0;">تم إلغاء اشتراكك</h1>
              <p style="color:#8899AA;font-size:15px;line-height:1.7;margin:0 0 28px 0;">
                مرحباً ${userName}، تم إلغاء اشتراكك في باقة <strong style="color:#D4A017;">${planNameAr}</strong>.
                يمكنك الاستمرار في استخدام الخدمة حتى <strong style="color:#E8F0F8;">${endDate}</strong>.
              </p>
              <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
                <div style="color:#FCA5A5;font-size:14px;">سينتهي وصولك في ${endDate}</div>
              </div>
              <p style="color:#8899AA;font-size:14px;line-height:1.7;margin:0 0 24px 0;">
                نأسف لمغادرتك. إذا كنت تواجه أي مشكلة أو لديك اقتراح، يسعدنا سماعك.
              </p>
              <div style="text-align:center;">
                <a href="${SITE_URL}/pricing" style="display:inline-block;background:#D4A017;color:#080E1A;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
                  إعادة الاشتراك ←
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(212,160,23,0.08);text-align:center;">
              <p style="color:#4A5568;font-size:12px;margin:0;">
                <a href="${SITE_URL}" style="color:#D4A017;text-decoration:none;">mousa.ai</a> — جميع الحقوق محفوظة
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendSubscriptionWelcomeEmail(params: {
  toEmail: string;
  userName: string;
  planNameAr: string;
  creditsGranted: number;
  periodEnd: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { subject, html } = buildSubscriptionWelcomeEmail(params);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.toEmail,
      subject,
      html,
    });
    if (error) {
      console.warn("[Email] Failed to send subscription welcome email:", error);
    } else {
      console.log(`[Email] Subscription welcome email sent to ${params.toEmail}`);
    }
  } catch (err) {
    console.warn("[Email] Error sending subscription welcome email:", err);
  }
}

export async function sendRenewalEmail(params: {
  toEmail: string;
  userName: string;
  planNameAr: string;
  creditsGranted: number;
  periodEnd: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { subject, html } = buildRenewalEmail(params);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.toEmail,
      subject,
      html,
    });
    if (error) {
      console.warn("[Email] Failed to send renewal email:", error);
    } else {
      console.log(`[Email] Renewal email sent to ${params.toEmail}`);
    }
  } catch (err) {
    console.warn("[Email] Error sending renewal email:", err);
  }
}

export async function sendCancellationEmail(params: {
  toEmail: string;
  userName: string;
  planNameAr: string;
  periodEnd: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { subject, html } = buildCancellationEmail(params);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.toEmail,
      subject,
      html,
    });
    if (error) {
      console.warn("[Email] Failed to send cancellation email:", error);
    } else {
      console.log(`[Email] Cancellation email sent to ${params.toEmail}`);
    }
  } catch (err) {
    console.warn("[Email] Error sending cancellation email:", err);
  }
}

// ─── Feedback Reply Email ─────────────────────────────────────────────────────────────────────────────────────
function buildFeedbackReplyEmail(p: {
  userName: string; platform: string; originalComment: string; adminReply: string; rating: number;
}): { subject: string; html: string } {
  const labels: Record<string, string> = {
    fada: 'فضاء', raqaba: 'رقابة', harara: 'حرارة',
    maskan: 'مسكن', code: 'كود', khayal: 'خيال', general: 'عام',
  };
  const pName = labels[p.platform] ?? p.platform;
  const stars = '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating);
  const subject = `رد على ملاحظتك — منصة ${pName} | mousa.ai`;
  const html = `<html dir="rtl"><body style="background:#080E1A;font-family:Arial,sans-serif;direction:rtl;margin:0;padding:40px 20px;"><div style="max-width:600px;margin:auto;background:#0D1B2A;border-radius:16px;padding:40px;border:1px solid rgba(212,160,23,0.15);"><h2 style="color:#d4a017;margin:0 0 24px;">mousa.ai</h2><p style="color:#94a3b8;">مرحباً <strong style="color:#e2e8f0;">${p.userName}</strong>،</p><p style="color:#94a3b8;">شكراً لمشاركتك رأيك حول منصة <strong style="color:#d4a017;">${pName}</strong>.</p><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin:20px 0;"><p style="color:#64748b;font-size:12px;margin:0 0 8px;">ملاحظتك</p><p style="color:#94a3b8;margin:0 0 8px;">${p.originalComment || '(بدون تعليق)'}</p><p style="color:#d4a017;font-size:18px;margin:0;">${stars}</p></div><div style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.2);border-radius:12px;padding:20px;"><p style="color:#d4a017;font-size:12px;font-weight:600;margin:0 0 8px;">رد فريق mousa.ai</p><p style="color:#e2e8f0;margin:0;line-height:1.7;">${p.adminReply}</p></div><p style="color:#475569;font-size:12px;margin-top:32px;text-align:center;">mousa.ai — <a href="https://www.mousa.ai" style="color:#475569;">www.mousa.ai</a></p></div></body></html>`;
  return { subject, html };
}

export async function sendFeedbackReplyEmail(params: {
  toEmail: string; userName: string; platform: string;
  originalComment: string; adminReply: string; rating: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const { subject, html } = buildFeedbackReplyEmail(params);
  try {
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to: params.toEmail, subject, html });
    if (error) console.warn('[Email] Failed to send feedback reply email:', error);
    else console.log(`[Email] Feedback reply email sent to ${params.toEmail}`);
  } catch (err) { console.warn('[Email] Error sending feedback reply email:', err); }
}
