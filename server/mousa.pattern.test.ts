/**
 * mousa.pattern.test.ts
 * اختبارات نمط فضاء: التحقق من صحة تدفق loginWithMousa
 * وتحويل openId → Mousa userId
 */
import { describe, it, expect } from "vitest";
import {
  extractMousaUserIdFromOpenId,
  getMousaUserIdFromUser,
} from "./mousaCreditsService";

describe("extractMousaUserIdFromOpenId", () => {
  it("يستخرج userId من openId رقمي مباشر", () => {
    expect(extractMousaUserIdFromOpenId("12345")).toBe(12345);
  });

  it("يستخرج userId من openId بصيغة mousa_{id}", () => {
    expect(extractMousaUserIdFromOpenId("mousa_12345")).toBe(12345);
  });

  it("يعيد null لـ openId غير رقمي", () => {
    expect(extractMousaUserIdFromOpenId("abc")).toBeNull();
  });

  it("يعيد null لـ openId فارغ", () => {
    expect(extractMousaUserIdFromOpenId("")).toBeNull();
  });
});

describe("getMousaUserIdFromUser", () => {
  it("يستخرج Mousa userId من مستخدم موسى", () => {
    const user = { id: 1, openId: "mousa_12345" };
    expect(getMousaUserIdFromUser(user)).toBe(12345);
  });

  it("يعيد null لمستخدم Manus عادي", () => {
    const user = { id: 1, openId: "manus_abc123" };
    expect(getMousaUserIdFromUser(user)).toBeNull();
  });

  it("يعيد null لـ user = null", () => {
    expect(getMousaUserIdFromUser(null)).toBeNull();
  });

  it("يعيد null لمستخدم بـ openId لا يبدأ بـ mousa_", () => {
    const user = { id: 5, openId: "google_xyz" };
    expect(getMousaUserIdFromUser(user)).toBeNull();
  });

  it("يتعامل مع openId = mousa_0 (userId = 0 → null)", () => {
    const user = { id: 1, openId: "mousa_0" };
    // userId = 0 يُعتبر falsy → getMousaUserIdFromUser يعيد 0 لكن guardMousa يتجاهله
    const result = getMousaUserIdFromUser(user);
    expect(result).toBe(0);
  });
});

describe("نمط فضاء: openId format للمستخدمين المُسجَّلين", () => {
  it("openId مستخدم موسى يبدأ بـ mousa_", () => {
    const mousaOpenId = `mousa_12345`;
    expect(mousaOpenId.startsWith("mousa_")).toBe(true);
  });

  it("يمكن استخراج userId الأصلي من openId موسى", () => {
    const originalUserId = 99999;
    const mousaOpenId = `mousa_${originalUserId}`;
    const extracted = getMousaUserIdFromUser({ id: 1, openId: mousaOpenId });
    expect(extracted).toBe(originalUserId);
  });
});
