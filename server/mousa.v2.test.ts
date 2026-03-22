/**
 * mousa.v2.test.ts
 * اختبارات التكامل مع Mousa.ai v2.0
 * يختبر: Token Handoff، check-balance، deduct-credits، SESSION_COSTS
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCostForSession,
  SESSION_COSTS,
  getCreditsPerSession,
  getMousaUpgradeUrl,
  getMousaPlatformId,
  isMousaEnabled,
  type SessionType,
} from "./mousaCreditsService";

// ─── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── 1. SESSION_COSTS ─────────────────────────────────────────────────────────
describe("SESSION_COSTS — التسعيرة المتدرجة", () => {
  it("scene = 30 كريدت", () => {
    expect(SESSION_COSTS.scene).toBe(30);
  });

  it("film_short = 40 كريدت", () => {
    expect(SESSION_COSTS.film_short).toBe(40);
  });

  it("film_long = 50 كريدت (maxCost)", () => {
    expect(SESSION_COSTS.film_long).toBe(50);
  });

  it("film_epic = 50 كريدت (maxCost)", () => {
    expect(SESSION_COSTS.film_epic).toBe(50);
  });

  it("default = 30 كريدت", () => {
    expect(SESSION_COSTS.default).toBe(30);
  });

  it("getCostForSession يعيد التكلفة الصحيحة لكل نوع", () => {
    const types: SessionType[] = ["scene", "film_short", "film_long", "film_epic", "default"];
    for (const t of types) {
      expect(getCostForSession(t)).toBe(SESSION_COSTS[t]);
    }
  });

  it("getCostForSession بدون معامل يعيد default", () => {
    expect(getCostForSession()).toBe(SESSION_COSTS.default);
  });
});

// ─── 2. Utility Functions ─────────────────────────────────────────────────────
describe("Utility Functions", () => {
  it("getCreditsPerSession يعيد 30", () => {
    expect(getCreditsPerSession()).toBe(30);
  });

  it("getMousaPlatformId يعيد khayal", () => {
    expect(getMousaPlatformId()).toBe("khayal");
  });

  it("getMousaUpgradeUrl يحتوي على ref=khayal", () => {
    const url = getMousaUpgradeUrl();
    expect(url).toContain("ref=khayal");
    expect(url).toContain("mousa.ai");
  });
});

// ─── 3. verifyMousaToken ──────────────────────────────────────────────────────
describe("verifyMousaToken — Token Handoff v2.0", () => {
  it("يعيد result عند نجاح التحقق", async () => {
    const mockUser = {
      valid: true,
      userId: 42,
      openId: "open_42",
      name: "أحمد",
      email: "ahmed@test.com",
      creditBalance: 150,
      platform: "khayal",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockUser,
    });

    const { verifyMousaToken } = await import("./mousaCreditsService");
    const { result, error } = await verifyMousaToken("valid_jwt_token");

    expect(error).toBeNull();
    expect(result).not.toBeNull();
    expect(result?.valid).toBe(true);
    expect(result?.creditBalance).toBe(150);
    expect(result?.userId).toBe(42);
  });

  it("يعيد error.code=TOKEN_EXPIRED عند انتهاء الصلاحية", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Token has expired", code: "TOKEN_EXPIRED" }),
    });

    const { verifyMousaToken } = await import("./mousaCreditsService");
    const { result, error } = await verifyMousaToken("expired_token");

    expect(result).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.code).toBe("TOKEN_EXPIRED");
  });

  it("يعيد error.code=INVALID_TOKEN عند توكن غير صالح", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid token", code: "INVALID_TOKEN" }),
    });

    const { verifyMousaToken } = await import("./mousaCreditsService");
    const { result, error } = await verifyMousaToken("bad_token");

    expect(result).toBeNull();
    expect(error?.code).toBe("INVALID_TOKEN");
  });
});

// ─── 4. checkMousaBalance ─────────────────────────────────────────────────────
describe("checkMousaBalance — v2.0 (balance فقط)", () => {
  it("يعيد balance صحيح من API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        balance: 120,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const { checkMousaBalance } = await import("./mousaCreditsService");
    const result = await checkMousaBalance(42);

    expect(result).not.toBeNull();
    expect(result?.balance).toBe(120);
    expect(result?.upgradeUrl).toContain("khayal");
  });

  it("يعيد null عند فشل API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { checkMousaBalance } = await import("./mousaCreditsService");
    const result = await checkMousaBalance(42);
    expect(result).toBeNull();
  });
});

// ─── 5. deductMousaCredits ────────────────────────────────────────────────────
describe("deductMousaCredits — v2.0 (amount + usage_factors)", () => {
  it("يخصم بـ amount محدد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        newBalance: 90,
        deducted: 30,
        platform: "khayal",
      }),
    });

    const { deductMousaCredits } = await import("./mousaCreditsService");
    const result = await deductMousaCredits(42, "مشهد سينمائي", { amount: 30 });

    expect(result?.success).toBe(true);
    expect(result?.deducted).toBe(30);
    expect(result?.newBalance).toBe(90);
  });

  it("يعيد success=false ورصيد حالي عند 402 (رصيد غير كافٍ)", async () => {
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

    const { deductMousaCredits } = await import("./mousaCreditsService");
    const result = await deductMousaCredits(42, "مشهد سينمائي", { amount: 30 });

    expect(result?.success).toBe(false);
    expect(result?.currentBalance).toBe(5);
    expect(result?.required).toBe(30);
    expect(result?.upgradeUrl).toContain("khayal");
  });

  it("يدعم usage_factors في الطلب", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        newBalance: 60,
        deducted: 40,
        platform: "khayal",
        costBreakdown: { images: 30, text_length: 10 },
        costRule: "dynamic",
      }),
    });

    const { deductMousaCredits } = await import("./mousaCreditsService");
    const result = await deductMousaCredits(42, "فيلم قصير", {
      usageFactors: { images: 8, text_length: 500 },
    });

    expect(result?.success).toBe(true);
    expect(result?.deducted).toBe(40);
    expect(result?.costBreakdown).toBeDefined();
  });

  it("يرمي Error عند خطأ الشبكة أو URL خاطئ (لا يعيد null أو success:true)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { deductMousaCredits } = await import("./mousaCreditsService");
    await expect(
      deductMousaCredits(42, "مشهد سينمائي", { amount: 30 })
    ).rejects.toThrow("Failed to deduct credits for userId=42");
  });

  it("يرمي Error عند URL خاطئ (fetch rejection)", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { deductMousaCredits } = await import("./mousaCreditsService");
    await expect(
      deductMousaCredits(99, "فيلم قصير", { sessionType: "film_short" })
    ).rejects.toThrow("Failed to deduct credits for userId=99");
  });
});

// ─── 6. guardMousaBalance ─────────────────────────────────────────────────────
describe("guardMousaBalance — فحص مسبق قبل التوليد", () => {
  it("يسمح عند رصيد كافٍ", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        balance: 100,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const { guardMousaBalance } = await import("./mousaCreditsService");
    const result = await guardMousaBalance(42, "scene");

    expect(result.allowed).toBe(true);
    expect(result.balance).toBe(100);
  });

  it("يمنع عند رصيد غير كافٍ ويعيد upgradeUrl", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        balance: 5,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const { guardMousaBalance } = await import("./mousaCreditsService");
    const result = await guardMousaBalance(42, "scene"); // scene = 30 كريدت

    expect(result.allowed).toBe(false);
    expect(result.balance).toBe(5);
    expect(result.upgradeUrl).toContain("khayal");
  });
});
