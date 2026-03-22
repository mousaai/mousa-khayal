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

const MOUSA_BASE_URL = process.env.MOUSA_BASE_URL ?? "https://www.mousa.ai";
const MOUSA_API_KEY = process.env.MOUSA_API_KEY ?? "khayal@mousa30";
const MOUSA_PLATFORM_ID = process.env.MOUSA_PLATFORM_ID ?? "khayal";

/**
 * التسعيرة المعتمدة — مارس 2026
 * (كل كريدت = $0.01 | هامش ربح 25–40%)
 *
 * Standard (صور فقط، بدون Runway):
 *   scene:         30 كريدت = $0.30  (تكلفة فعلية $0.215)
 *   script_only:    5 كريدت = $0.05  (تكلفة فعلية $0.010)
 *
 * Cinema (صور + Runway + ElevenLabs):
 *   film_short:   450 كريدت = $4.50  (تكلفة فعلية $3.445 — 6 مشاهد)
 *   film_medium: 1100 كريدت = $11.00 (تكلفة فعلية $8.585 — 15 مشهد)
 *   film_long:   3200 كريدت = $32.00 (تكلفة فعلية $25.700 — 45 مشهد)
 *   autonomous:   400 كريدت = $4.00  (تكلفة فعلية $2.875 — 5 مشاهد)
 *   surprise:     400 كريدت = $4.00  (تكلفة فعلية $2.875 — 5 مشاهد)
 */
export const SESSION_COSTS = {
  // Standard — صور سينمائية فقط
  scene:        30,    // مشهد واحد: 3–8 صور، بدون Runway
  script_only:   5,    // سيناريو نصي فقط، بدون صور أو فيديو

  // Cinema — إنتاج كامل بـ Runway + ElevenLabs
  film_short:  450,    // فيلم قصير: 15–60 ثانية (6 مشاهد)
  film_medium: 1100,   // فيلم متوسط: 1–3 دقائق (15 مشهد)
  film_long:   3200,   // فيلم طويل: 3–10 دقائق (45 مشهد)
  autonomous:   400,   // خيال تقرر: 5 مشاهد تلقائية
  surprise:     400,   // فاجئني: 5 مشاهد تلقائية

  default:      30,    // افتراضي (مشهد واحد)
} as const;

export type SessionType = keyof typeof SESSION_COSTS;

const MOUSA_HEADERS = {
  Authorization: `Bearer ${MOUSA_API_KEY}`,
  "X-Platform-ID": MOUSA_PLATFORM_ID,
  "Content-Type": "application/json",
};

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

function isEnabled(): boolean {
  return Boolean(MOUSA_API_KEY && MOUSA_BASE_URL);
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
  if (!isEnabled()) return { result: null, error: null };

  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/verify-token`, {
      method: "POST",
      headers: MOUSA_HEADERS,
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
      { headers: MOUSA_HEADERS }
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

  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/deduct-credits`, {
      method: "POST",
      headers: MOUSA_HEADERS,
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
  { name: "scene",       cost: SESSION_COSTS.scene },
  { name: "script_only", cost: SESSION_COSTS.script_only },
  { name: "film_short",  cost: SESSION_COSTS.film_short },
  { name: "film_medium", cost: SESSION_COSTS.film_medium },
  { name: "film_long",   cost: SESSION_COSTS.film_long },
  { name: "autonomous",  cost: SESSION_COSTS.autonomous },
  { name: "surprise",    cost: SESSION_COSTS.surprise },
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
    minCost: SESSION_COSTS.script_only,   // 5 — أقل عملية ممكنة
    maxCost: SESSION_COSTS.film_long,     // 3200 — أعلى عملية ممكنة
    baseCost: SESSION_COSTS.scene,        // 30 — التكلفة الافتراضية
    description:
      "خيال — منصة الإنتاج السينمائي بالذكاء الاصطناعي. " +
      "سيناريو: 5 | مشهد: 30 | فيلم قصير: 450 | متوسط: 1100 | طويل: 3200 | تلقائي: 400",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: MOUSA_HEADERS,
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

export function getMousaPlatformId(): string {
  return MOUSA_PLATFORM_ID;
}

export function getMousaUpgradeUrl(): string {
  return `https://www.mousa.ai/pricing?ref=${MOUSA_PLATFORM_ID}`;
}
