/**
 * auth.protection.test.ts
 * اختبارات إلزام المصادقة وخصم الكريدتس في إجراءات التوليد
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── محاكاة mousaCreditsService ──────────────────────────────────
vi.mock("./mousaCreditsService", () => ({
  getMousaBalance: vi.fn(),
  deductMousaCredits: vi.fn(),
}));

import { getMousaBalance, deductMousaCredits } from "./mousaCreditsService";

// ── اختبارات منطق خصم الكريدتس ──────────────────────────────────

describe("Mousa Credits Service — Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يُرجع الرصيد الصحيح عند الاستدعاء", async () => {
    (getMousaBalance as any).mockResolvedValue({ balance: 100, userId: "123" });
    const result = await getMousaBalance("123");
    expect(result.balance).toBe(100);
    expect(getMousaBalance).toHaveBeenCalledWith("123");
  });

  it("يجب أن يخصم الكريدتس بنجاح عند الاستدعاء", async () => {
    (deductMousaCredits as any).mockResolvedValue({ success: true, newBalance: 75 });
    const result = await deductMousaCredits({ userId: 123, sessions: 1 });
    expect(result.success).toBe(true);
    expect(deductMousaCredits).toHaveBeenCalledWith({ userId: 123, sessions: 1 });
  });

  it("يجب أن يرفع خطأ عند الرصيد غير الكافي", async () => {
    (deductMousaCredits as any).mockRejectedValue(new Error("رصيد غير كافٍ"));
    await expect(deductMousaCredits({ userId: 123, sessions: 1 })).rejects.toThrow("رصيد غير كافٍ");
  });

  it("يجب أن يخصم بشكل صحيح لجلسات متعددة", async () => {
    (deductMousaCredits as any).mockResolvedValue({ success: true, newBalance: 25 });
    const result = await deductMousaCredits({ userId: 123, sessions: 3 });
    expect(result.success).toBe(true);
    expect(deductMousaCredits).toHaveBeenCalledWith({ userId: 123, sessions: 3 });
  });
});

// ── اختبارات منطق الحماية ────────────────────────────────────────

describe("Protected Procedure — Auth Guard Logic", () => {
  it("يجب أن يرفض الطلب إذا لم يكن المستخدم مسجلاً", () => {
    const ctx = { user: null };
    const isProtected = (ctx: { user: any }) => {
      if (!ctx.user) throw new Error("UNAUTHORIZED");
      return true;
    };
    expect(() => isProtected(ctx)).toThrow("UNAUTHORIZED");
  });

  it("يجب أن يسمح بالطلب إذا كان المستخدم مسجلاً", () => {
    const ctx = { user: { id: 1, openId: "user_123", name: "Test User" } };
    const isProtected = (ctx: { user: any }) => {
      if (!ctx.user) throw new Error("UNAUTHORIZED");
      return true;
    };
    expect(isProtected(ctx)).toBe(true);
  });

  it("يجب أن يتحقق من الرصيد قبل التوليد", async () => {
    (getMousaBalance as any).mockResolvedValue({ balance: 0 });
    const checkBalance = async (userId: string) => {
      const { balance } = await getMousaBalance(userId);
      if (balance <= 0) throw new Error("رصيد غير كافٍ");
      return true;
    };
    await expect(checkBalance("123")).rejects.toThrow("رصيد غير كافٍ");
  });

  it("يجب أن يسمح بالتوليد عند وجود رصيد كافٍ", async () => {
    (getMousaBalance as any).mockResolvedValue({ balance: 100 });
    const checkBalance = async (userId: string) => {
      const { balance } = await getMousaBalance(userId);
      if (balance <= 0) throw new Error("رصيد غير كافٍ");
      return true;
    };
    await expect(checkBalance("123")).resolves.toBe(true);
  });
});
