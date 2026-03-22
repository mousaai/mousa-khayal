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

// التسعيرة المتدرجة حسب نوع الجلسة (وفق minCost=10, maxCost=50)
export const SESSION_COSTS = {
  scene: 30,        // مشهد واحد: 3–8 صور
  film_short: 40,   // فيلم قصير: 15–60 ثانية
  film_long: 50,    // فيلم طويل: 1–5 دقائق
  film_epic: 50,    // فيلم ملحمي: 5–30 دقيقة (maxCost)
  default: 30,      // افتراضي
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

// ─── 5. Utility Exports ───────────────────────────────────────────────────────

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
