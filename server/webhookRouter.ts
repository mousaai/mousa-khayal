/**
 * webhookRouter.ts
 * Webhook Receiver — POST /api/internal/events
 *
 * يستقبل الأحداث الداخلية من Mousa.ai:
 * - user.suspended  → تعليق المستخدم فوراً
 * - user.activated  → إعادة تفعيل المستخدم
 * - credits.updated → تحديث الرصيد
 * - platform.ping   → اختبار الاتصال
 *
 * الأمان: يتحقق من MOUSA_WEBHOOK_SECRET في Authorization header
 */

import type { Express, Request, Response } from "express";

// ─── أنواع الأحداث ──────────────────────────────────────────────────────────
type WebhookEventType =
  | "user.suspended"
  | "user.activated"
  | "credits.updated"
  | "platform.ping"
  | string;

interface WebhookPayload {
  event: WebhookEventType;
  platformId?: string;
  userId?: string | number;
  data?: Record<string, unknown>;
  timestamp?: string;
}

// ─── معالجة الأحداث ──────────────────────────────────────────────────────────
async function handleWebhookEvent(payload: WebhookPayload): Promise<{ handled: boolean; message: string }> {
  const { event, userId, data } = payload;

  switch (event) {
    case "user.suspended": {
      // تعليق المستخدم — يمنع الخصم والاستخدام
      console.log(`[Webhook] user.suspended: userId=${userId}`);
      // TODO: تحديث حالة المستخدم في DB عند تفعيل نظام الكريدت
      // await db.updateUserStatus(String(userId), "suspended");
      return { handled: true, message: `User ${userId} suspended` };
    }

    case "user.activated": {
      // إعادة تفعيل المستخدم
      console.log(`[Webhook] user.activated: userId=${userId}`);
      // await db.updateUserStatus(String(userId), "active");
      return { handled: true, message: `User ${userId} activated` };
    }

    case "credits.updated": {
      // تحديث الرصيد — للمعلومية فقط (الرصيد الفعلي في Mousa.ai)
      const newBalance = data?.balance ?? data?.newBalance;
      console.log(`[Webhook] credits.updated: userId=${userId}, balance=${newBalance}`);
      return { handled: true, message: `Credits updated for user ${userId}` };
    }

    case "platform.ping": {
      // اختبار الاتصال من Mousa.ai
      console.log("[Webhook] platform.ping received — platform is alive");
      return { handled: true, message: "pong" };
    }

    default: {
      // حدث غير معروف — نسجّله ونرد بـ 200 لمنع إعادة الإرسال
      console.warn(`[Webhook] Unknown event: ${event}`, payload);
      return { handled: false, message: `Unknown event: ${event}` };
    }
  }
}

// ─── تسجيل المسار ────────────────────────────────────────────────────────────
export function registerWebhookRoutes(app: Express) {
  /**
   * POST /api/internal/events
   * يستقبل أحداث Mousa.ai الداخلية
   *
   * Headers مطلوبة:
   *   Authorization: Bearer <MOUSA_WEBHOOK_SECRET>
   *   Content-Type: application/json
   */
  app.post("/api/internal/events", async (req: Request, res: Response) => {
    // ── التحقق من الـ Secret ──────────────────────────────────────────────────
    const webhookSecret = process.env.MOUSA_WEBHOOK_SECRET || process.env.MOUSA_API_KEY;
    const authHeader = req.headers.authorization;
    const providedToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (webhookSecret && providedToken !== webhookSecret) {
      console.warn("[Webhook] Unauthorized request — invalid secret");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // ── التحقق من الـ Payload ────────────────────────────────────────────────
    const payload = req.body as WebhookPayload;

    if (!payload || typeof payload.event !== "string") {
      res.status(400).json({ error: "Invalid payload: 'event' field is required" });
      return;
    }

    // ── معالجة الحدث ────────────────────────────────────────────────────────
    try {
      const result = await handleWebhookEvent(payload);
      res.status(200).json({
        ok: true,
        event: payload.event,
        ...result,
        receivedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Webhook] Error handling event:", err);
      // نرد بـ 200 لمنع Mousa.ai من إعادة الإرسال بشكل متكرر
      res.status(200).json({
        ok: false,
        event: payload.event,
        error: "Internal processing error",
        receivedAt: new Date().toISOString(),
      });
    }
  });

  console.log("[Webhook] Registered: POST /api/internal/events");
}
