/**
 * mousaCreditsService.ts
 * خدمة تكامل منصة خيال مع نظام credits الخاص بـ MOUSA.AI
 * وفق الوثيقة الرسمية v2.0 — 2026
 *
 * الـ endpoints المستخدمة:
 *   POST /api/platform/verify-token    — التحقق من JWT handoff token
 *   GET  /api/platform/check-balance   — فحص الرصيد قبل التوليد
 *   POST /api/platform/deduct-credits  — خصم الكريدتس بعد نجاح التوليد
 *
 * بيانات خيال في Mousa.ai:
 *   Platform ID: khayal
 *   API Key: khayal@mousa30
 *   URL: khayal.mousa.ai
 *   minCost: 10 | maxCost: 50
 */

import { randomUUID } from "crypto";

// يُقرأ في وقت الاستدعاء (ليس عند تحميل الـ module) لضمان قراءة env vars المُحقونة
function getMousaBaseUrl(): string {
  return process.env.MOUSA_BASE_URL ?? process.env.MOUSA_API_BASE ?? "https://www.mousa.ai";
}
function getMousaApiKey(): string {
  return process.env.PLATFORM_API_KEY ?? process.env.MOUSA_API_KEY ?? "";
}
function getMousaPlatformId(): string {
  return process.env.PLATFORM_ID ?? process.env.MOUSA_PLATFORM_ID ?? "khayal";
}
// للتوافق مع الكود القديم
const MOUSA_BASE_URL = getMousaBaseUrl();
const MOUSA_API_KEY = getMousaApiKey();
const MOUSA_PLATFORM_ID = getMousaPlatformId();

/**
 * التسعيرة المعتمدة — أبريل 2026
 * (كل كريدت = $0.01 | هامش ربح 40–90%)
 *
 * ══════════════════════════════════════════════════════════
 * الفئة الأولى — Standard (صور فقط، بدون Runway)
 * ══════════════════════════════════════════════════════════
 *   script_only:   10 كريدت = $0.10  (تكلفة فعلية $0.010 | هامش 90%)
 *   scene:         20 كريدت = $0.20  (تكلفة فعلية $0.130 | هامش 54%)
 *
 * ══════════════════════════════════════════════════════════
 * الفئة الثانية — Studio (استوديو التصاميم المعمارية)
 * ══════════════════════════════════════════════════════════
 *   design_floor_plan: 25 كريدت = $0.25  (مسقط أفقي)
 *   design_exterior:   35 كريدت = $0.35  (واجهة خارجية)
 *   design_interior:   35 كريدت = $0.35  (تصميم داخلي)
 *   design_refine:     20 كريدت = $0.20  (تعديل تصميم موجود)
 *
 * ══════════════════════════════════════════════════════════
 * الفئة الثالثة — Cinema (صور + Runway + ElevenLabs)
 * ══════════════════════════════════════════════════════════
 *   film_short:   350 كريدت = $3.50  (تكلفة فعلية $2.100 — 6 مشاهد  | هامش 40%)
 *   film_medium:  900 كريدت = $9.00  (تكلفة فعلية $5.400 — 15 مشهد | هامش 40%)
 *   film_long:   2500 كريدت = $25.00 (تكلفة فعلية $15.00 — 45 مشهد | هامش 40%)
 *   autonomous:   300 كريدت = $3.00  (تكلفة فعلية $1.800 — 5 مشاهد  | هامش 40%)
 *   surprise:     300 كريدت = $3.00  (تكلفة فعلية $1.800 — 5 مشاهد  | هامش 40%)
 */
export const SESSION_COSTS = {
  // Standard — صور سينمائية فقط
  scene:        20,    // مشهد واحد: 3–8 صور، بدون Runway
  script_only:  10,    // سيناريو نصي فقط، بدون صور أو فيديو

  // Studio — استوديو التصاميم المعمارية
  design_floor_plan: 25,  // مسقط أفقي معماري
  design_exterior:   35,  // واجهة خارجية
  design_interior:   35,  // تصميم داخلي
  design_refine:     20,  // تعديل تصميم موجود (+مرجع)

  // Cinema — إنتاج كامل بـ Runway + ElevenLabs
  film_short:  350,    // فيلم قصير: 15–60 ثانية (6 مشاهد)
  film_medium:  900,   // فيلم متوسط: 1–3 دقائق (15 مشهد)
  film_long:   2500,   // فيلم طويل: 3–10 دقائق (45 مشهد)
  autonomous:   300,   // خيال تقرر: 5 مشاهد تلقائية
  surprise:     300,   // فاجئني: 5 مشاهد تلقائية

  default:       20,   // افتراضي (مشهد واحد)
} as const;

export type SessionType = keyof typeof SESSION_COSTS;

// يُبنى في وقت الاستدعاء لضمان قراءة PLATFORM_API_KEY المُحقون في الإنتاج
function getMousaHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getMousaApiKey()}`,
    "X-Platform-ID": getMousaPlatformId(),
    "Content-Type": "application/json",
  };
}
// للتوافق مع الكود القديم — لكن يُفضَّل استخدام getMousaHeaders() في الاستدعاءات الجديدة
const MOUSA_HEADERS = getMousaHeaders();

// ─── Types ────────────────────────────────────────────────────────────────────

/** نتيجة verify-token وفق v2.0 */
export interface MousaVerifyResult {
  valid: boolean;
  userId: number;
  openId: string;
  name: string;
  email: string;
  creditBalance: number;  // v2.0: creditBalance (لا platformCost أو sufficient)
  platform: string;
}

/** نتيجة verify-token عند الفشل */
export interface MousaVerifyError {
  error: string;
  code: "TOKEN_EXPIRED" | "INVALID_TOKEN" | string;
}

/** نتيجة check-balance وفق v2.0 */
export interface MousaBalanceResult {
  balance: number;
  upgradeUrl: string;
  // v2.0: لا sufficient ولا platformCost — نحسبها محلياً
}

/** نتيجة deduct-credits وفق v2.0 */
export interface MousaDeductResult {
  success: boolean;
  newBalance: number;
  deducted: number;
  platform: string;
  costBreakdown?: Record<string, number>;
  costRule?: string;
  // عند الفشل (402)
  error?: string;
  currentBalance?: number;
  required?: number;
  upgradeUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * isEnabled: يتحقق من توفر PLATFORM_API_KEY لتفعيل تكامل mousa.ai
 * إذا لم يكن المفتاح متاحاً → وضع مفتوح (fail-open) بدون خصم
 */
function isEnabled(): boolean {
  // يقرأ في وقت الاستدعاء لضمان قراءة PLATFORM_API_KEY المُحقون
  return Boolean(getMousaApiKey() && getMousaBaseUrl());
}

/** يحسب تكلفة الجلسة حسب نوعها */
export function getCostForSession(sessionType: SessionType = "default"): number {
  return SESSION_COSTS[sessionType] ?? SESSION_COSTS.default;
}

// ─── 1. Verify Handoff Token ──────────────────────────────────────────────────

/**
 * يتحقق من JWT handoff token القادم من mousa.ai في URL (?token=...)
 * يُستدعى عند أول وصول المستخدم لخيال من خلال رابط mousa.ai.
 *
 * v2.0: يعيد creditBalance مباشرة في الـ response
 * إذا كان TOKEN_EXPIRED → أعد توجيه المستخدم لـ https://www.mousa.ai/dashboard
 */
export async function verifyMousaToken(token: string): Promise<{
  result: MousaVerifyResult | null;
  error: MousaVerifyError | null;
}> {
  if (!isEnabled()) {
    console.warn('[MousaCredits] verify-token skipped: PLATFORM_API_KEY not configured');
    return { result: null, error: null };
  }

  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/verify-token`, {
      method: "POST",
      headers: getMousaHeaders(),
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error(`[MousaCredits] verify-token failed: ${res.status}`, data);
      return {
        result: null,
        error: {
          error: data.error ?? "Token verification failed",
          code: data.code ?? "INVALID_TOKEN",
        },
      };
    }

    return { result: data as MousaVerifyResult, error: null };
  } catch (err) {
    console.error("[MousaCredits] verify-token error:", err);
    return { result: null, error: null };
  }
}

// ─── 2. Check Balance ─────────────────────────────────────────────────────────

/**
 * يفحص رصيد المستخدم قبل تنفيذ عملية التوليد.
 * v2.0: يعيد balance فقط — نحسب sufficient محلياً بمقارنة balance مع تكلفة الجلسة.
 */
export async function checkMousaBalance(
  userId: number
): Promise<MousaBalanceResult | null> {
  if (!isEnabled()) return null;

  try {
    const res = await fetch(
      `${MOUSA_BASE_URL}/api/platform/check-balance?userId=${userId}`,
      { headers: getMousaHeaders() }
    );

    if (!res.ok) {
      console.error(`[MousaCredits] check-balance failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data as MousaBalanceResult;
  } catch (err) {
    console.error("[MousaCredits] check-balance error:", err);
    return null;
  }
}

// ─── 3. Deduct Credits ────────────────────────────────────────────────────────

/**
 * يخصم الكريدتس من رصيد المستخدم بعد نجاح عملية التوليد.
 * يدعم usage_factors للتسعيرة الذكية المتدرجة.
 *
 * v2.0: يمكن إرسال amount مباشرة أو usage_factors للحساب الذكي
 */
export async function deductMousaCredits(
  userId: number,
  description: string,
  options: {
    amount?: number;
    sessionType?: SessionType;
    usageFactors?: {
      images?: number;
      text_length?: number;
      analysis_depth?: number;
    };
  } = {}
): Promise<MousaDeductResult | null> {
  if (!isEnabled()) return null;

  const { amount, sessionType = "default", usageFactors } = options;
  const finalAmount = amount ?? getCostForSession(sessionType);

  const body: Record<string, unknown> = {
    userId,
    description,
  };

  if (usageFactors) {
    body.usage_factors = usageFactors;
  } else {
    body.amount = finalAmount;
  }

  // Idempotency Key: يمنع تكرار الخصم عند إعادة المحاولة
  const idempotencyKey = `khayal_${randomUUID()}`;
  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/deduct-credits`, {
      method: "POST",
      headers: {
        ...getMousaHeaders(),
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.status === 402) {
      // رصيد غير كافٍ
      console.warn(`[MousaCredits] Insufficient balance for userId=${userId}`);
      return {
        success: false,
        newBalance: data.currentBalance ?? 0,
        deducted: 0,
        platform: MOUSA_PLATFORM_ID,
        error: data.error,
        currentBalance: data.currentBalance,
        required: data.required,
        upgradeUrl: data.upgradeUrl,
      };
    }

    if (!res.ok) {
      console.error(`[MousaCredits] deduct-credits failed: ${res.status}`, data);
      return null;
    }

    return data as MousaDeductResult;
  } catch (err) {
    // ❌ خطأ شبكة أو URL خاطئ — يجب رمي الخطأ لمنع السماح بالعملية بدون خصم
    console.error("[MousaCredits] deduct-credits network error:", err);
    throw new Error(
      `[MousaCredits] Failed to deduct credits for userId=${userId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

// ─── 4. Guard Balance (Pre-Check) ────────────────────────────────────────────

/**
 * يفحص الرصيد ويعيد upgradeUrl إذا كان غير كافٍ.
 * v2.0: يقارن balance محلياً مع minCost (10) أو تكلفة الجلسة المحددة.
 */
export async function guardMousaBalance(
  userId: number,
  sessionType: SessionType = "default"
): Promise<{
  allowed: boolean;
  balance?: number;
  upgradeUrl?: string;
}> {
  if (!isEnabled()) return { allowed: true }; // وضع التطوير: السماح دائماً

  const balanceData = await checkMousaBalance(userId);
  if (!balanceData) return { allowed: true }; // خطأ شبكة: fail-open

  const requiredCost = getCostForSession(sessionType);
  const sufficient = balanceData.balance >= requiredCost;

  if (!sufficient) {
    return {
      allowed: false,
      balance: balanceData.balance,
      upgradeUrl:
        balanceData.upgradeUrl ??
        `https://www.mousa.ai/pricing?ref=${MOUSA_PLATFORM_ID}`,
    };
  }

  return { allowed: true, balance: balanceData.balance };
}

// ─── 5. Notify Mousa.ai — Pricing Webhook ───────────────────────────────────

/**
 * قائمة خدمات خيال مع تكاليفها للإرسال لـ Mousa.ai
 * يجب تحديثها عند تغيير التسعيرة
 */
export const KHAYAL_SERVICES = [
  // Standard
  { name: "scene",              cost: SESSION_COSTS.scene },
  { name: "script_only",        cost: SESSION_COSTS.script_only },
  // Studio
  { name: "design_floor_plan",  cost: SESSION_COSTS.design_floor_plan },
  { name: "design_exterior",    cost: SESSION_COSTS.design_exterior },
  { name: "design_interior",    cost: SESSION_COSTS.design_interior },
  { name: "design_refine",      cost: SESSION_COSTS.design_refine },
  // Cinema
  { name: "film_short",         cost: SESSION_COSTS.film_short },
  { name: "film_medium",        cost: SESSION_COSTS.film_medium },
  { name: "film_long",          cost: SESSION_COSTS.film_long },
  { name: "autonomous",         cost: SESSION_COSTS.autonomous },
  { name: "surprise",           cost: SESSION_COSTS.surprise },
] as const;

/** نتيجة pricing-webhook */
export interface MousaPricingWebhookResult {
  success: boolean;
  platform?: string;
  updated?: {
    minCost: number;
    maxCost: number;
    baseCost: number;
    services: Array<{ name: string; cost: number }>;
  };
  updatedAt?: string;
  error?: string;
  status?: number;
}

/**
 * يُرسل التسعيرة المحدّثة لـ Mousa.ai عبر pricing-webhook.
 * استدعِه عند أي تغيير في SESSION_COSTS.
 *
 * POST https://www.mousa.ai/api/platform/pricing-webhook
 * Authorization: Bearer khayal@mousa30
 * X-Platform-ID: khayal
 */
export async function notifyMousaPricing(): Promise<MousaPricingWebhookResult> {
  const url = `${MOUSA_BASE_URL}/api/platform/pricing-webhook`;

  const body = {
    services: KHAYAL_SERVICES.map((s) => ({ name: s.name, cost: s.cost })),
    minCost: SESSION_COSTS.script_only,   // 10 — أقل عملية ممكنة
    maxCost: SESSION_COSTS.film_long,     // 2500 — أعلى عملية ممكنة
    baseCost: SESSION_COSTS.scene,        // 20 — التكلفة الافتراضية
    description:
      "خيال — منصة الإنتاج السينمائي والتصميم المعماري بالذكاء الاصطناعي. " +
      "سيناريو: 10 | مشهد: 20 | تصميم معماري: 25–35 | فيلم قصير: 350 | متوسط: 900 | طويل: 2500 | تلقائي: 300",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getMousaHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[MousaPricing] pricing-webhook failed: ${res.status}`, data);
      return {
        success: false,
        error: data.error ?? `HTTP ${res.status}`,
        status: res.status,
      };
    }

    console.log(`[MousaPricing] Pricing updated successfully at ${data.updatedAt}`);
    return data as MousaPricingWebhookResult;
  } catch (err) {
    console.error("[MousaPricing] pricing-webhook network error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── 6. Utility Exports ───────────────────────────────────────────────────────

export function getCreditsPerSession(): number {
  return SESSION_COSTS.default;
}

export function isMousaEnabled(): boolean {
  return isEnabled();
}

export function getMousaPlatformIdPublic(): string {
  return getMousaPlatformId();
}

export function getMousaUpgradeUrl(): string {
  return `https://www.mousa.ai/pricing?ref=${MOUSA_PLATFORM_ID}`;
}

/**
 * استخراج Mousa userId الحقيقي من openId المخزّن في قاعدة البيانات
 * openId المخزّن: "mousa_{mousaOpenId}" أو رقم مباشر
 * يُستخدم لتمرير userId الصحيح لـ checkMousaBalance و deductMousaCredits
 */
export function extractMousaUserIdFromOpenId(openId: string): number | null {
  if (!openId) return null;
  // إذا كان openId رقمياً مباشراً (من Mousa)
  const direct = parseInt(openId);
  if (!isNaN(direct)) return direct;
  // إذا كان بصيغة "mousa_{userId}"
  if (openId.startsWith('mousa_')) {
    const inner = openId.slice(6);
    const parsed = parseInt(inner);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

/**
 * استخراج Mousa userId من User object
 * يدعم كلا الحالتين: مستخدم موسى (openId = mousa_...) أو مستخدم Manus عادي
 */
export function getMousaUserIdFromUser(user: { id: number; openId: string } | null): number | null {
  if (!user) return null;
  if (user.openId.startsWith('mousa_')) {
    return extractMousaUserIdFromOpenId(user.openId.slice(6));
  }
  return null;
}
