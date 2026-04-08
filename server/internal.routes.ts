/**
 * internal.routes.ts — mousa.ai Internal Webhook Routes
 *
 * يُضاف هذا الملف إلى كل منصة فرعية تحت: server/internal.routes.ts
 *
 * يوفر:
 *   POST /api/mousa/webhook  ← يستقبل أحداث من mousa.ai (credit updates, user events)
 *   GET  /api/mousa/health   ← health check للتحقق من اتصال المنصة بـ mousa.ai
 *
 * الأحداث المدعومة:
 *   - credits.deducted   : تم خصم كريدت
 *   - credits.granted    : تم منح كريدت
 *   - user.created       : مستخدم جديد
 *   - user.subscription  : تغيير الاشتراك
 *   - platform.ping      : فحص الاتصال
 *
 * التسجيل في server/_core/index.ts:
 *   import { registerInternalRoutes } from "../internal.routes";
 *   registerInternalRoutes(app);
 *
 * ⚠️ يجب تسجيل هذا قبل express.json() لأن webhook يحتاج raw body
 */

import type { Express, Request, Response } from "express";
import express from "express";
import { requireWebhookSignature } from "./auth.middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookEvent {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface CreditsDeductedData {
  userId: number;
  openId: string;
  platformId: string;
  amount: number;
  newBalance: number;
  sessionId?: string;
  description?: string;
}

export interface CreditsGrantedData {
  userId: number;
  openId: string;
  amount: number;
  newBalance: number;
  reason: string;
}

export interface UserCreatedData {
  userId: number;
  openId: string;
  name: string;
  email: string;
  welcomeCredits: number;
}

export interface UserSubscriptionData {
  userId: number;
  openId: string;
  plan: string;
  status: "active" | "cancelled" | "expired";
  expiresAt?: number;
}

// ─── Event Handlers ───────────────────────────────────────────────────────────
// يمكن تخصيص هذه الدوال في كل منصة حسب الحاجة

/**
 * معالجة حدث خصم الكريدت
 * يُستخدم لتحديث cache المحلي أو إرسال إشعار للمستخدم
 */
async function onCreditsDeducted(data: CreditsDeductedData): Promise<void> {
  console.log(
    `[Webhook] Credits deducted: user=${data.userId} amount=${data.amount} balance=${data.newBalance}`
  );
  // TODO: تحديث الـ cache المحلي إذا وُجد
  // TODO: إرسال إشعار WebSocket للمستخدم إذا كان متصلاً
}

/**
 * معالجة حدث منح الكريدت
 */
async function onCreditsGranted(data: CreditsGrantedData): Promise<void> {
  console.log(
    `[Webhook] Credits granted: user=${data.userId} amount=${data.amount} balance=${data.newBalance}`
  );
}

/**
 * معالجة حدث إنشاء مستخدم جديد
 */
async function onUserCreated(data: UserCreatedData): Promise<void> {
  console.log(`[Webhook] New user: ${data.name} (${data.openId})`);
  // TODO: إنشاء سجل محلي للمستخدم إذا لزم
}

/**
 * معالجة حدث تغيير الاشتراك
 */
async function onUserSubscription(data: UserSubscriptionData): Promise<void> {
  console.log(
    `[Webhook] Subscription: user=${data.userId} plan=${data.plan} status=${data.status}`
  );
  // TODO: تحديث صلاحيات المستخدم محلياً إذا لزم
}

// ─── Webhook Dispatcher ───────────────────────────────────────────────────────

async function dispatchWebhookEvent(event: WebhookEvent): Promise<void> {
  const { event: eventType, data } = event;

  switch (eventType) {
    case "credits.deducted":
      await onCreditsDeducted(data as unknown as CreditsDeductedData);
      break;
    case "credits.granted":
      await onCreditsGranted(data as unknown as CreditsGrantedData);
      break;
    case "user.created":
      await onUserCreated(data as unknown as UserCreatedData);
      break;
    case "user.subscription":
      await onUserSubscription(data as unknown as UserSubscriptionData);
      break;
    case "platform.ping":
      console.log("[Webhook] Ping received from mousa.ai ✓");
      break;
    default:
      console.log(`[Webhook] Unknown event type: ${eventType}`);
  }
}

// ─── Register Routes ──────────────────────────────────────────────────────────

export function registerInternalRoutes(app: Express): void {
  // ── POST /api/mousa/webhook ──────────────────────────────────────────────────
  // ⚠️ يجب تسجيل هذا قبل express.json() في index.ts
  app.post(
    "/api/mousa/webhook",
    express.raw({ type: "application/json" }),
    requireWebhookSignature,
    async (req: Request, res: Response) => {
      try {
        const event = req.body as WebhookEvent;

        if (!event.event || !event.timestamp || !event.data) {
          return res.status(400).json({ error: "Invalid webhook payload" });
        }

        // معالجة الحدث بشكل غير متزامن (لا نُعيق الرد)
        dispatchWebhookEvent(event).catch((err) =>
          console.error("[Webhook] Handler error:", err)
        );

        return res.json({
          received: true,
          event: event.event,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[Webhook] Error processing event:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ── GET /api/mousa/health ────────────────────────────────────────────────────
  // يُستخدم من mousa.ai للتحقق من أن المنصة تعمل وتستجيب
  app.get("/api/mousa/health", async (_req: Request, res: Response) => {
    const platformId = process.env.PLATFORM_ID || "unknown";
    const hasApiKey = !!(process.env.PLATFORM_API_KEY || process.env.MOUSA_PLATFORM_API_KEY);
    const hasWebhookSecret = !!process.env.WEBHOOK_SECRET;

    return res.json({
      status: "ok",
      platform: platformId,
      timestamp: Date.now(),
      config: {
        apiKey: hasApiKey ? "configured" : "MISSING",
        webhookSecret: hasWebhookSecret ? "configured" : "MISSING",
      },
    });
  });

  console.log("[InternalRoutes] Registered: POST /api/mousa/webhook, GET /api/mousa/health");
}
