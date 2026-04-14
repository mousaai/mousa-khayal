/**
 * mousa-api.ts — تكامل mousa.ai الكامل وفق دليل فضاء v2.0
 * المصدر: فضاء (fada.mousa.ai) — أبريل 2026
 */

const MOUSA_BASE_URL = process.env.MOUSA_API_BASE || process.env.MOUSA_BASE_URL || "https://www.mousa.ai";
const PLATFORM_ID = process.env.PLATFORM_ID || "khayal";

// === مساعد: رأس الطلبات ===
function getHeaders() {
  const apiKey = process.env.PLATFORM_API_KEY || process.env.MOUSA_API_KEY;
  if (!apiKey) throw new Error("PLATFORM_API_KEY is not set!");
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Platform-ID": PLATFORM_ID,
    "Content-Type": "application/json",
  };
}

// === مساعد: مفتاح idempotency لمنع الخصم المزدوج ===
function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ============================================================
// [1] SSO — التحقق من token
// ============================================================
export async function verifyMousaToken(token: string) {
  const res = await fetch(`${MOUSA_BASE_URL}/api/platform/verify-token`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if ((error as any)?.code === "TOKEN_EXPIRED") throw new Error("TOKEN_EXPIRED");
    throw new Error(`verify-token failed (${res.status}): ${JSON.stringify(error)}`);
  }
  // يُعيد: { userId, openId, name, email, creditBalance, plan }
  return res.json() as Promise<{
    userId: number;
    openId: string;
    name: string;
    email?: string;
    creditBalance: number;
    plan?: string;
  }>;
}

// ============================================================
// [2] جلب بيانات المستخدم بـ openId
// ============================================================
export async function getMousaUserByOpenId(openId: string) {
  try {
    const res = await fetch(
      `${MOUSA_BASE_URL}/api/platform/user-by-openid?openId=${encodeURIComponent(openId)}`,
      { headers: getHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data?.userId) {
      return {
        userId: data.userId as number,
        balance: (data.creditBalance ?? data.balance ?? 0) as number,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// [3] فحص الرصيد
// ============================================================
export async function checkMousaBalance(userId: number) {
  const res = await fetch(
    `${MOUSA_BASE_URL}/api/platform/check-balance?userId=${userId}`,
    { headers: getHeaders() }
  );
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`check-balance failed (${res.status}): ${JSON.stringify(error)}`);
  }
  // يُعيد: { balance, plan, upgradeUrl }
  return res.json() as Promise<{
    balance: number;
    plan?: string;
    upgradeUrl?: string;
  }>;
}

// ============================================================
// [4] خصم الكريدت
// ============================================================
export async function deductMousaCredits(
  userId: number,
  amount: number,
  description: string,
  idempotencyKey?: string
) {
  const key = idempotencyKey ?? generateIdempotencyKey();
  const res = await fetch(`${MOUSA_BASE_URL}/api/platform/deduct-credits`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "X-Idempotency-Key": key, // يمنع الخصم المزدوج عند إعادة المحاولة
    },
    body: JSON.stringify({ userId, amount, description }),
  });
  const data = await res.json() as any;
  // 402 = رصيد غير كافٍ (ليس خطأ، بل حالة عادية)
  if (res.status === 402) {
    return data as {
      error: string;
      currentBalance: number;
      required: number;
      upgradeUrl: string;
    };
  }
  if (!res.ok) {
    throw new Error(`deduct-credits failed (${res.status}): ${JSON.stringify(data)}`);
  }
  // يُعيد: { newBalance, deducted, transactionId }
  return data as {
    newBalance: number;
    deducted: number;
    transactionId: string;
  };
}
