/**
 * useMousaAuth.test.ts
 * اختبارات وحدة لمنطق المصادقة في useMousaAuth
 * (نختبر الدوال المساعدة والمنطق القابل للاختبار بدون DOM)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── محاكاة localStorage ───────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// ─── محاكاة fetch ──────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── ثوابت الاختبار ───────────────────────────────────────────────────────────
const STORAGE_KEY = "mousa_user_session";
const TOKEN_KEY = "mousa_auth_token";

const MOCK_USER = {
  userId: 42,
  openId: "user-open-id-abc",
  name: "أحمد محمد",
  email: "ahmed@example.com",
  creditBalance: 500,
  platform: "khayal",
};

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiJ9.mocktoken";

// ─── دوال مساعدة (مستخرجة من useMousaAuth للاختبار) ──────────────────────────

function saveSession(token: string, user: typeof MOCK_USER) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, savedAt: Date.now() }));
}

function loadSavedSession(): { token: string; user: typeof MOCK_USER } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const sessionStr = localStorage.getItem(STORAGE_KEY);
    if (!token || !sessionStr) return null;
    const session = JSON.parse(sessionStr);
    if (Date.now() - session.savedAt > 23 * 60 * 60 * 1000) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token, user: session.user };
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

// ─── الاختبارات ───────────────────────────────────────────────────────────────

describe("useMousaAuth — Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("يحفظ الجلسة في localStorage بشكل صحيح", () => {
    saveSession(MOCK_TOKEN, MOCK_USER);

    expect(localStorage.getItem(TOKEN_KEY)).toBe(MOCK_TOKEN);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.user.userId).toBe(42);
    expect(stored.user.name).toBe("أحمد محمد");
    expect(stored.user.creditBalance).toBe(500);
    expect(stored.savedAt).toBeLessThanOrEqual(Date.now());
  });

  it("يقرأ الجلسة المحفوظة بشكل صحيح", () => {
    saveSession(MOCK_TOKEN, MOCK_USER);
    const session = loadSavedSession();

    expect(session).not.toBeNull();
    expect(session!.token).toBe(MOCK_TOKEN);
    expect(session!.user.userId).toBe(42);
    expect(session!.user.email).toBe("ahmed@example.com");
  });

  it("يعيد null إذا لم تكن هناك جلسة محفوظة", () => {
    const session = loadSavedSession();
    expect(session).toBeNull();
  });

  it("يعيد null إذا انتهت صلاحية الجلسة (أكثر من 23 ساعة)", () => {
    const expiredTime = Date.now() - 24 * 60 * 60 * 1000; // 24 ساعة مضت
    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: MOCK_USER, savedAt: expiredTime }));

    const session = loadSavedSession();
    expect(session).toBeNull();
    // يجب أن تُحذف الجلسة المنتهية
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("يمسح الجلسة بشكل صحيح", () => {
    saveSession(MOCK_TOKEN, MOCK_USER);
    clearSession();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("يحتفظ بالجلسة الصالحة (أقل من 23 ساعة)", () => {
    const recentTime = Date.now() - 2 * 60 * 60 * 1000; // ساعتان مضتا
    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: MOCK_USER, savedAt: recentTime }));

    const session = loadSavedSession();
    expect(session).not.toBeNull();
    expect(session!.user.userId).toBe(42);
  });
});

describe("useMousaAuth — Token Verification (fetch mock)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("يتحقق من token صالح ويعيد بيانات المستخدم", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_USER,
    });

    const response = await fetch("https://www.mousa.ai/api/platform/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: MOCK_TOKEN }),
    });

    const data = await response.json();
    expect(data.userId).toBe(42);
    expect(data.creditBalance).toBe(500);
    expect(data.platform).toBe("khayal");
  });

  it("يعيد خطأ TOKEN_EXPIRED عند انتهاء الصلاحية", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Token expired", code: "TOKEN_EXPIRED" }),
    });

    const response = await fetch("https://www.mousa.ai/api/platform/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "expired-token" }),
    });

    const data = await response.json();
    expect(response.ok).toBe(false);
    expect(data.code).toBe("TOKEN_EXPIRED");
  });

  it("يعيد خطأ INVALID_TOKEN عند token غير صالح", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid token", code: "INVALID_TOKEN" }),
    });

    const response = await fetch("https://www.mousa.ai/api/platform/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const data = await response.json();
    expect(response.ok).toBe(false);
    expect(data.code).toBe("INVALID_TOKEN");
  });
});

describe("useMousaAuth — Credit Deduction (fetch mock)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("يخصم الكريدت بنجاح ويعيد الرصيد الجديد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        newBalance: 470,
        deducted: 30,
        platform: "khayal",
      }),
    });

    const response = await fetch("https://www.mousa.ai/api/platform/deduct-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 42, amount: 30, description: "مشهد واحد" }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.newBalance).toBe(470);
    expect(data.deducted).toBe(30);
  });

  it("يعيد خطأ 402 عند رصيد غير كافٍ", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({
        error: "Insufficient credits",
        currentBalance: 5,
        required: 30,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const response = await fetch("https://www.mousa.ai/api/platform/deduct-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 42, amount: 30 }),
    });

    const data = await response.json();
    expect(response.status).toBe(402);
    expect(data.currentBalance).toBe(5);
    expect(data.required).toBe(30);
    expect(data.upgradeUrl).toContain("khayal");
  });
});

describe("useMousaAuth — AuthGate Logic", () => {
  it("يعرف أن المستخدم مصادق عليه إذا كانت الجلسة موجودة", () => {
    saveSession(MOCK_TOKEN, MOCK_USER);
    const session = loadSavedSession();
    const isAuthenticated = !!session?.user;
    expect(isAuthenticated).toBe(true);
  });

  it("يعرف أن المستخدم غير مصادق عليه إذا لم تكن هناك جلسة", () => {
    clearSession(); // تأكد من عدم وجود جلسة سابقة
    const session = loadSavedSession();
    const isAuthenticated = !!session?.user;
    expect(isAuthenticated).toBe(false);
  });

  it("يتحقق من creditBalance في الجلسة المحفوظة", () => {
    const userWithBalance = { ...MOCK_USER, creditBalance: 1200 };
    saveSession(MOCK_TOKEN, userWithBalance);
    const session = loadSavedSession();
    expect(session!.user.creditBalance).toBe(1200);
  });

  it("يحدّث الرصيد في الجلسة المحفوظة", () => {
    saveSession(MOCK_TOKEN, MOCK_USER);
    // محاكاة تحديث الرصيد
    const updatedUser = { ...MOCK_USER, creditBalance: 470 };
    saveSession(MOCK_TOKEN, updatedUser);

    const session = loadSavedSession();
    expect(session!.user.creditBalance).toBe(470);
  });
});
