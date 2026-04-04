/**
 * mousaCreditsService.test.ts
 * اختبار التحقق من صحة بيانات تكامل MOUSA.AI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyMousaToken,
  checkMousaBalance,
  deductMousaCredits,
  guardMousaBalance,
  getCreditsPerSession,
  isMousaEnabled,
  notifyMousaPricing,
  SESSION_COSTS,
  KHAYAL_SERVICES,
} from "./mousaCreditsService";

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  // تعيين env vars للاختبار
  process.env.MOUSA_API_KEY = "khayal@mousa30";
  process.env.MOUSA_PLATFORM_ID = "khayal";
  process.env.MOUSA_BASE_URL = "https://www.mousa.ai";
  process.env.MOUSA_CREDITS_PER_SESSION = "30";  // v2.0
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mousaCreditsService — configuration", () => {
  it("يجب أن تكون الـ secrets محمّلة بشكل صحيح", () => {
    expect(process.env.MOUSA_API_KEY).toBe("khayal@mousa30");
    expect(process.env.MOUSA_PLATFORM_ID).toBe("khayal");
    expect(process.env.MOUSA_BASE_URL).toBe("https://www.mousa.ai");
     expect(process.env.MOUSA_CREDITS_PER_SESSION).toBeDefined();
  });
  it("getCreditsPerSession يجب أن يعيد 20 (أبريل 2026)", () => {
    expect(getCreditsPerSession()).toBe(20);
  });

  it("isMousaEnabled يجب أن يعيد true عند وجود API key", () => {
    expect(isMousaEnabled()).toBe(true);
  });
});

describe("verifyMousaToken", () => {
  it("يجب أن يُرسل طلب POST صحيح ويعيد بيانات المستخدم (v2.0)", async () => {
    const mockResponse = {
      valid: true,
      userId: 42,
      openId: "open_42",
      name: "أحمد",
      email: "ahmed@test.com",
      creditBalance: 200,  // v2.0: creditBalance
      platform: "khayal",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result, error } = await verifyMousaToken("test-token-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.mousa.ai/api/platform/verify-token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer khayal@mousa30",
          "X-Platform-ID": "khayal",
        }),
        body: JSON.stringify({ token: "test-token-123" }),
      })
    );

    expect(error).toBeNull();
    expect(result?.valid).toBe(true);
    expect(result?.userId).toBe(42);
    expect(result?.creditBalance).toBe(200);  // v2.0
  });

  it("يجب أن يعيد error عند فشل الطلب (v2.0)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid token", code: "INVALID_TOKEN" }),
    });
    const { result, error } = await verifyMousaToken("invalid-token");
    expect(result).toBeNull();
    expect(error?.code).toBe("INVALID_TOKEN");
  });

  it("يجب أن يعيد {result:null, error:null} عند خطأ الشبكة", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const { result, error } = await verifyMousaToken("token");
    expect(result).toBeNull();
    expect(error).toBeNull();
  });
});

describe("checkMousaBalance", () => {
  it("يجب أن يُرسل طلب GET صحيح ويعيد الرصيد", async () => {
    const mockBalance = {
      balance: 150,
      sufficient: true,
      platformCost: 25,
      upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBalance,
    });

    const result = await checkMousaBalance(42);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.mousa.ai/api/platform/check-balance?userId=42",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer khayal@mousa30",
          "X-Platform-ID": "khayal",
        }),
      })
    );

    expect(result?.balance).toBe(150);
    expect(result?.sufficient).toBe(true);
  });

  it("يجب أن يعيد sufficient=false عند نقص الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        balance: 5,
        sufficient: false,
        platformCost: 25,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await checkMousaBalance(42);
    expect(result?.sufficient).toBe(false);
    expect(result?.balance).toBe(5);
  });
});

describe("deductMousaCredits", () => {
  it("يجب أن يُرسل طلب POST صحيح ويخصم الكريدتس", async () => {
    const mockDeduct = {
      success: true,
      newBalance: 175,
      deducted: 25,
      platform: "khayal",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDeduct,
    });

    const result = await deductMousaCredits(42, "توليد مشهد سينمائي");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.mousa.ai/api/platform/deduct-credits",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: 42,
          description: "توليد مشهد سينمائي",
          amount: 20,  // أبريل 2026: default = 20
        }),
      })
    );

    expect(result?.success).toBe(true);
    expect(result?.deducted).toBe(25);
    expect(result?.newBalance).toBe(175);
  });

  it("يجب أن يعيد upgradeUrl عند نقص الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        currentBalance: 5,
        required: 30,  // v2.0
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await deductMousaCredits(42, "توليد مشهد");
    expect(result?.success).toBe(false);
    expect(result?.upgradeUrl).toContain("mousa.ai/pricing");
  });
});

describe("SESSION_COSTS — التسعيرة المعتمدة (أبريل 2026)", () => {
  it("يجب أن تكون تكلفة السيناريو 10 كريدت", () => {
    expect(SESSION_COSTS.script_only).toBe(10);
  });

  it("يجب أن تكون تكلفة المشهد 20 كريدت", () => {
    expect(SESSION_COSTS.scene).toBe(20);
  });

  it("يجب أن تكون تكلفة الفيلم القصير 350 كريدت", () => {
    expect(SESSION_COSTS.film_short).toBe(350);
  });

  it("يجب أن تكون تكلفة الفيلم المتوسط 900 كريدت", () => {
    expect(SESSION_COSTS.film_medium).toBe(900);
  });

  it("يجب أن تكون تكلفة الفيلم الطويل 2500 كريدت", () => {
    expect(SESSION_COSTS.film_long).toBe(2500);
  });

  it("يجب أن تكون تكلفة التلقائي 300 كريدت", () => {
    expect(SESSION_COSTS.autonomous).toBe(300);
    expect(SESSION_COSTS.surprise).toBe(300);
  });

  it("يجب أن تحتوي KHAYAL_SERVICES على 11 خدمة", () => {
    expect(KHAYAL_SERVICES).toHaveLength(11);
  });

  it("يجب أن تتطابق KHAYAL_SERVICES مع SESSION_COSTS", () => {
    const servicesMap = Object.fromEntries(
      KHAYAL_SERVICES.map((s) => [s.name, s.cost])
    );
    expect(servicesMap["scene"]).toBe(SESSION_COSTS.scene);
    expect(servicesMap["script_only"]).toBe(SESSION_COSTS.script_only);
    expect(servicesMap["film_short"]).toBe(SESSION_COSTS.film_short);
    expect(servicesMap["film_medium"]).toBe(SESSION_COSTS.film_medium);
    expect(servicesMap["film_long"]).toBe(SESSION_COSTS.film_long);
    expect(servicesMap["design_exterior"]).toBe(SESSION_COSTS.design_exterior);
    expect(servicesMap["design_interior"]).toBe(SESSION_COSTS.design_interior);
    expect(servicesMap["design_floor_plan"]).toBe(SESSION_COSTS.design_floor_plan);
  });
});

describe("notifyMousaPricing — pricing-webhook", () => {
  it("يجب أن يُرسل طلب POST صحيح مع بيانات التسعيرة", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        platform: "khayal",
        updated: {
          minCost: 5,
          maxCost: 3200,
          baseCost: 30,
          services: KHAYAL_SERVICES.map((s) => ({ name: s.name, cost: s.cost })),
        },
        updatedAt: "2026-03-23T12:00:00.000Z",
      }),
    });

    const result = await notifyMousaPricing();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.mousa.ai/api/platform/pricing-webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer khayal@mousa30",
          "X-Platform-ID": "khayal",
        }),
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.minCost).toBe(10);
    expect(callBody.maxCost).toBe(2500);
    expect(callBody.baseCost).toBe(20);
    expect(callBody.services).toHaveLength(11);

    expect(result.success).toBe(true);
    expect(result.platform).toBe("khayal");
    expect(result.updatedAt).toBe("2026-03-23T12:00:00.000Z");
  });

  it("يجب أن يعيد success:false عند فشل الخادم (401)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    const result = await notifyMousaPricing();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(result.status).toBe(401);
  });

  it("يجب أن يعيد success:false عند خطأ الشبكة (لا يرمي خطأ)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await notifyMousaPricing();
    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });
});

describe("guardMousaBalance", () => {
  it("يجب أن يسمح بالعملية عند كفاية الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        balance: 200,
        // v2.0: لا sufficient ولا platformCost — تُحسب محلياً
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await guardMousaBalance(42, "default");
    expect(result.allowed).toBe(true);
    expect(result.balance).toBe(200);
  });

  it("يجب أن يمنع العملية ويعيد upgradeUrl عند نقص الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        balance: 10,
        // v2.0: لا sufficient — تُحسب محلياً (10 < 30)
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await guardMousaBalance(42, "default");
    expect(result.allowed).toBe(false);
    expect(result.upgradeUrl).toContain("mousa.ai/pricing");
  });

  it("يجب أن يسمح بالعملية عند خطأ الشبكة (fail-open)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await guardMousaBalance(42);
    expect(result.allowed).toBe(true);
  });
});
