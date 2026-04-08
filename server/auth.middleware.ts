/**
 * auth.middleware.ts — mousa.ai Platform Auth Middleware
 *
 * يُضاف هذا الملف إلى كل منصة فرعية تحت: server/auth.middleware.ts
 *
 * يوفر:
 *   1. التحقق من Handoff Token القادم من mousa.ai (verify-token)
 *   2. التحقق من Webhook Signature القادم من mousa.ai (X-Mousa-Signature)
 *   3. Middleware جاهز للاستخدام في Express routes
 *
 * الاستخدام:
 *   import { requireMousaAuth, requireWebhookSignature } from "./auth.middleware";
 *
 *   // حماية route يحتاج مستخدم مسجّل
 *   app.post("/api/analyze", requireMousaAuth, async (req, res) => {
 *     const { userId, openId, credits } = req.mousaUser!;
 *     // ...
 *   });
 *
 *   // استقبال webhook من mousa.ai
 *   app.post("/api/mousa/webhook", requireWebhookSignature, async (req, res) => {
 *     const event = req.body;
 *     // ...
 *   });
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MousaUser {
  userId: number;
  openId: string;
  name: string;
  email: string;
  credits: number;
  role: "user" | "admin";
  iat: number;
  exp: number;
}

// Extend Express Request to include mousaUser
declare global {
  namespace Express {
    interface Request {
      mousaUser?: MousaUser;
    }
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MOUSA_API_BASE = process.env.MOUSA_API_BASE || "https://www.mousa.ai";
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY || process.env.MOUSA_PLATFORM_API_KEY || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

if (!PLATFORM_API_KEY) {
  console.warn("[MousaAuth] ⚠️  PLATFORM_API_KEY is not set! Auth will fail.");
}
if (!WEBHOOK_SECRET) {
  console.warn("[MousaAuth] ⚠️  WEBHOOK_SECRET is not set! Webhook verification will fail.");
}

// ─── Token Verification ───────────────────────────────────────────────────────

/**
 * يتحقق من Handoff Token عبر mousa.ai API
 * يُعيد بيانات المستخدم إذا كان التوكن صالحاً
 */
async function verifyHandoffToken(token: string): Promise<MousaUser | null> {
  try {
    const response = await fetch(`${MOUSA_API_BASE}/api/platform/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PLATFORM_API_KEY}`,
      },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      console.error("[MousaAuth] verify-token failed:", response.status, error);
      return null;
    }

    const data = await response.json() as { user?: MousaUser };
    return data.user || null;
  } catch (err) {
    console.error("[MousaAuth] verify-token error:", err);
    return null;
  }
}

// ─── Middleware: requireMousaAuth ─────────────────────────────────────────────

/**
 * Middleware يتحقق من Handoff Token في query string أو Authorization header
 *
 * يبحث عن التوكن في:
 *   1. ?token=... في query string
 *   2. Authorization: Bearer <token> في headers
 *
 * عند النجاح: يُضيف req.mousaUser ويستمر
 * عند الفشل: يُعيد 401
 */
export async function requireMousaAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // استخراج التوكن من query أو header
  const token =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "مطلوب تسجيل الدخول عبر mousa.ai",
    });
    return;
  }

  const user = await verifyHandoffToken(token);

  if (!user) {
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "التوكن غير صالح أو منتهي الصلاحية",
    });
    return;
  }

  req.mousaUser = user;
  next();
}

/**
 * نسخة اختيارية — تُضيف المستخدم إذا وُجد التوكن لكن لا تمنع الوصول
 * مفيد للصفحات التي تعمل مع وبدون تسجيل دخول
 */
export async function optionalMousaAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const user = await verifyHandoffToken(token);
    if (user) req.mousaUser = user;
  }

  next();
}

// ─── Middleware: requireWebhookSignature ──────────────────────────────────────

/**
 * Middleware يتحقق من توقيع Webhook القادم من mousa.ai
 *
 * يتحقق من header: X-Mousa-Signature: sha256=<hmac>
 *
 * ⚠️ يجب تسجيل هذا الـ route قبل express.json() لأنه يحتاج raw body
 *
 * مثال:
 *   app.post("/api/mousa/webhook",
 *     express.raw({ type: "application/json" }),
 *     requireWebhookSignature,
 *     handleWebhook
 *   );
 */
export function requireWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!WEBHOOK_SECRET) {
    console.error("[MousaWebhook] WEBHOOK_SECRET not configured!");
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  const signature = req.headers["x-mousa-signature"] as string;
  if (!signature || !signature.startsWith("sha256=")) {
    res.status(401).json({
      error: "MISSING_SIGNATURE",
      message: "X-Mousa-Signature header مفقود",
    });
    return;
  }

  // الـ body يجب أن يكون Buffer (عند استخدام express.raw())
  const rawBody = req.body instanceof Buffer
    ? req.body
    : Buffer.from(JSON.stringify(req.body));

  const expectedSig = "sha256=" + crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  // مقارنة آمنة ضد timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn("[MousaWebhook] Invalid signature from:", req.ip);
    res.status(401).json({
      error: "INVALID_SIGNATURE",
      message: "توقيع Webhook غير صالح",
    });
    return;
  }

  // تحويل raw body إلى JSON object
  if (req.body instanceof Buffer) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  next();
}

// ─── Helper: Credit Deduction ─────────────────────────────────────────────────

/**
 * يخصم كريدت من حساب المستخدم عبر mousa.ai API
 * يدعم X-Idempotency-Key لمنع الخصم المزدوج
 *
 * @param userId - معرّف المستخدم
 * @param platformId - معرّف المنصة (fada, raqaba, harara, maskan, code, khayal)
 * @param amount - عدد الكريدت المراد خصمها
 * @param description - وصف العملية (اختياري)
 * @param idempotencyKey - مفتاح فريد لمنع التكرار (اختياري)
 */
export async function deductCredits(params: {
  userId: number;
  platformId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PLATFORM_API_KEY}`,
    };

    if (params.idempotencyKey) {
      headers["X-Idempotency-Key"] = params.idempotencyKey;
    }

    const response = await fetch(`${MOUSA_API_BASE}/api/platform/deduct-credits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: params.userId,
        platformId: params.platformId,
        amount: params.amount,
        description: params.description || `استخدام ${params.platformId}`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: (data.error as string) || "فشل خصم الكريدت",
      };
    }

    return {
      success: true,
      newBalance: data.newBalance as number,
    };
  } catch (err) {
    console.error("[MousaAuth] deductCredits error:", err);
    return { success: false, error: "خطأ في الاتصال بـ mousa.ai" };
  }
}
