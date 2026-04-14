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

export interface UserSuspendedData {
  userId: string; // openId أو userId القادم من mousa.ai
  timestamp: number;
  reason?: string;
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
  try {
    const { getDb } = await import("./db");
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.update(users)
      .set({ mousaBalance: data.newBalance, mousaLastSync: new Date() })
      .where(eq(users.mousaUserId, data.userId));
    console.log(`[Webhook] ✅ Balance updated for mousaUserId=${data.userId} → ${data.newBalance}`);
  } catch (err) {
    console.error("[Webhook] Failed to update local balance:", err);
  }
}

/**
 * معالجة حدث منح الكريدت
 */
async function onCreditsGranted(data: CreditsGrantedData): Promise<void> {
  console.log(
    `[Webhook] Credits granted: user=${data.userId} amount=${data.amount} balance=${data.newBalance}`
  );
  try {
    const { getDb } = await import("./db");
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.update(users)
      .set({ mousaBalance: data.newBalance, mousaLastSync: new Date() })
      .where(eq(users.mousaUserId, data.userId));
    console.log(`[Webhook] ✅ Balance updated for mousaUserId=${data.userId} → ${data.newBalance}`);
  } catch (err) {
    console.error("[Webhook] Failed to update local balance:", err);
  }
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

/**
 * معالجة حدث تعليق المستخدم من mousa.ai
 * يحذف الجلسة فوراً ويخطر المتصفح عبر BroadcastChannel
 */
async function onUserSuspended(data: UserSuspendedData): Promise<void> {
  const userId = data.userId;
  console.log(`[Webhook] ⚠️ User suspended: userId=${userId} reason=${data.reason || 'N/A'}`);

  // 1. حفظ في suspended_users لمنع الجلسات المستقبلية
  try {
    const { getDb } = await import("./db");
    const { suspendedUsers } = await import("../drizzle/schema");
    const db = await getDb();
    await db.insert(suspendedUsers).values({
      userId: String(userId),
      suspendedAt: data.timestamp || Date.now(),
      reason: data.reason || null,
    }).onDuplicateKeyUpdate({ set: { suspendedAt: data.timestamp || Date.now(), reason: data.reason || null } });
    console.log(`[Webhook] ✅ User ${userId} added to suspended_users`);
  } catch (dbErr) {
    console.error(`[Webhook] ❌ Failed to save suspension to DB:`, dbErr);
  }

  // 2. لا يمكن حذف JWT cookie من السيرفر مباشرةً لأن لا نعرف أي session مفتوحة
  // الحل: auth.middleware.ts يتحقق من suspended_users في كل طلب قادم
  // ويرفض الطلبات بـ 403 فوراً

  // 3. إخطار المتصفح عبر Server-Sent Events (SSE) إذا كان متصلاً
  // useMousaAuth.ts يستمع لهذا ويعيد التوجيه فوراً
  // ملاحظة: BroadcastChannel لا يعمل عبر السيرفر، لكن suspended_users check يضمن الحماية
  console.log(`[Webhook] ℹ️ Suspension recorded. Next request from user ${userId} will be rejected (403).`);
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
    case "user.suspended":
      await onUserSuspended(data as unknown as UserSuspendedData);
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

  // ── POST /api/internal/events (alias) ──────────────────────────────────────
  // Alias رسمي مطلوب من mousa.ai — يشير لنفس handler الـ Webhook
  app.post(
    "/api/internal/events",
    express.raw({ type: "application/json" }),
    requireWebhookSignature,
    async (req: Request, res: Response) => {
      try {
        const event = req.body as WebhookEvent;

        if (!event.event || !event.timestamp || !event.data) {
          return res.status(400).json({ error: "Invalid webhook payload" });
        }

        dispatchWebhookEvent(event).catch((err) =>
          console.error("[Webhook/internal] Handler error:", err)
        );

        return res.json({
          received: true,
          event: event.event,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[Webhook/internal] Error processing event:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  console.log("[InternalRoutes] Registered: POST /api/mousa/webhook, POST /api/internal/events (alias), GET /api/mousa/health");
}
