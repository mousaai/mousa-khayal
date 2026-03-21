/**
 * mousaCreditsService.ts
 * خدمة تكامل منصة خيال مع نظام credits الخاص بـ MOUSA.AI
 *
 * الـ endpoints المستخدمة:
 *   POST /api/platform/verify-token    — التحقق من توكن المستخدم
 *   GET  /api/platform/check-balance   — فحص الرصيد قبل التوليد
 *   POST /api/platform/deduct-credits  — خصم الكريدتس بعد نجاح التوليد
 */

const MOUSA_BASE_URL = process.env.MOUSA_BASE_URL ?? "https://www.mousa.ai";
const MOUSA_API_KEY = process.env.MOUSA_API_KEY ?? "";
const MOUSA_PLATFORM_ID = process.env.MOUSA_PLATFORM_ID ?? "khayal";
const MOUSA_CREDITS_PER_SESSION = parseInt(
  process.env.MOUSA_CREDITS_PER_SESSION ?? "25",
  10
);

const MOUSA_HEADERS = {
  Authorization: `Bearer ${MOUSA_API_KEY}`,
  "X-Platform-ID": MOUSA_PLATFORM_ID,
  "Content-Type": "application/json",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MousaVerifyResult {
  valid: boolean;
  userId: number;
  userName: string;
  balance: number;
  platformCost: number;
  sufficient: boolean;
  upgradeUrl?: string;
}

export interface MousaBalanceResult {
  balance: number;
  sufficient: boolean;
  platformCost: number;
  upgradeUrl: string;
}

export interface MousaDeductResult {
  success: boolean;
  newBalance: number;
  deducted: number;
  platform: string;
  // returned when insufficient
  currentBalance?: number;
  required?: number;
  upgradeUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return Boolean(MOUSA_API_KEY && MOUSA_BASE_URL);
}

// ─── 1. Verify Token ──────────────────────────────────────────────────────────

/**
 * يتحقق من توكن المستخدم القادم من mousa.ai ويعيد بيانات المستخدم ورصيده.
 * يُستدعى عند أول وصول المستخدم لخيال من خلال رابط mousa.ai.
 */
export async function verifyMousaToken(
  token: string
): Promise<MousaVerifyResult | null> {
  if (!isEnabled()) return null;

  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/verify-token`, {
      method: "POST",
      headers: MOUSA_HEADERS,
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      console.error(`[MousaCredits] verify-token failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data as MousaVerifyResult;
  } catch (err) {
    console.error("[MousaCredits] verify-token error:", err);
    return null;
  }
}

// ─── 2. Check Balance ─────────────────────────────────────────────────────────

/**
 * يفحص رصيد المستخدم قبل تنفيذ عملية التوليد.
 * يجب استدعاؤه قبل كل عملية مدفوعة.
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
 * يجب استدعاؤه فقط بعد التأكد من نجاح العملية.
 */
export async function deductMousaCredits(
  userId: number,
  description: string,
  amount: number = MOUSA_CREDITS_PER_SESSION
): Promise<MousaDeductResult | null> {
  if (!isEnabled()) return null;

  try {
    const res = await fetch(`${MOUSA_BASE_URL}/api/platform/deduct-credits`, {
      method: "POST",
      headers: MOUSA_HEADERS,
      body: JSON.stringify({ userId, amount, description }),
    });

    if (!res.ok) {
      console.error(`[MousaCredits] deduct-credits failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data as MousaDeductResult;
  } catch (err) {
    console.error("[MousaCredits] deduct-credits error:", err);
    return null;
  }
}

// ─── 4. Full Pre-Check (check + guard) ───────────────────────────────────────

/**
 * يفحص الرصيد ويعيد upgradeUrl إذا كان غير كافٍ.
 * الاستخدام: قبل كل عملية توليد مدفوعة.
 * يعيد null إذا كان التكامل غير مفعّل (وضع التطوير).
 */
export async function guardMousaBalance(userId: number): Promise<{
  allowed: boolean;
  balance?: number;
  upgradeUrl?: string;
}> {
  if (!isEnabled()) return { allowed: true }; // في وضع التطوير: السماح دائماً

  const balance = await checkMousaBalance(userId);
  if (!balance) return { allowed: true }; // في حالة خطأ الشبكة: السماح (fail-open)

  if (!balance.sufficient) {
    return {
      allowed: false,
      balance: balance.balance,
      upgradeUrl: balance.upgradeUrl,
    };
  }

  return { allowed: true, balance: balance.balance };
}

// ─── 5. Credits Per Session ───────────────────────────────────────────────────

export function getCreditsPerSession(): number {
  return MOUSA_CREDITS_PER_SESSION;
}

export function isMousaEnabled(): boolean {
  return isEnabled();
}
