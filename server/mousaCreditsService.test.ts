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
  process.env.MOUSA_CREDITS_PER_SESSION = "25";
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mousaCreditsService — configuration", () => {
  it("يجب أن تكون الـ secrets محمّلة بشكل صحيح", () => {
    expect(process.env.MOUSA_API_KEY).toBe("khayal@mousa30");
    expect(process.env.MOUSA_PLATFORM_ID).toBe("khayal");
    expect(process.env.MOUSA_BASE_URL).toBe("https://www.mousa.ai");
    expect(process.env.MOUSA_CREDITS_PER_SESSION).toBe("25");
  });

  it("getCreditsPerSession يجب أن يعيد 25", () => {
    expect(getCreditsPerSession()).toBe(25);
  });

  it("isMousaEnabled يجب أن يعيد true عند وجود API key", () => {
    expect(isMousaEnabled()).toBe(true);
  });
});

describe("verifyMousaToken", () => {
  it("يجب أن يُرسل طلب POST صحيح ويعيد بيانات المستخدم", async () => {
    const mockResponse = {
      valid: true,
      userId: 42,
      userName: "أحمد",
      balance: 200,
      platformCost: 25,
      sufficient: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await verifyMousaToken("test-token-123");

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

    expect(result).toEqual(mockResponse);
    expect(result?.valid).toBe(true);
    expect(result?.userId).toBe(42);
    expect(result?.sufficient).toBe(true);
  });

  it("يجب أن يعيد null عند فشل الطلب", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await verifyMousaToken("invalid-token");
    expect(result).toBeNull();
  });

  it("يجب أن يعيد null عند خطأ الشبكة", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await verifyMousaToken("token");
    expect(result).toBeNull();
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
          amount: 25,
          description: "توليد مشهد سينمائي",
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
        required: 25,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await deductMousaCredits(42, "توليد مشهد");
    expect(result?.success).toBe(false);
    expect(result?.upgradeUrl).toContain("mousa.ai/pricing");
  });
});

describe("guardMousaBalance", () => {
  it("يجب أن يسمح بالعملية عند كفاية الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        balance: 200,
        sufficient: true,
        platformCost: 25,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await guardMousaBalance(42);
    expect(result.allowed).toBe(true);
    expect(result.balance).toBe(200);
  });

  it("يجب أن يمنع العملية ويعيد upgradeUrl عند نقص الرصيد", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        balance: 10,
        sufficient: false,
        platformCost: 25,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      }),
    });

    const result = await guardMousaBalance(42);
    expect(result.allowed).toBe(false);
    expect(result.upgradeUrl).toContain("mousa.ai/pricing");
  });

  it("يجب أن يسمح بالعملية عند خطأ الشبكة (fail-open)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await guardMousaBalance(42);
    expect(result.allowed).toBe(true);
  });
});
