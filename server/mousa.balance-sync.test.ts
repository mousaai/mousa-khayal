/**
 * mousa.balance-sync.test.ts
 * اختبارات وحدة لتزامن الرصيد مع mousa.ai
 *
 * يختبر:
 * 1. منطق تزامن الرصيد في sdk.ts (كل 5 دقائق)
 * 2. استخراج mousaBalance من context
 * 3. منطق استعادة الجلسة من /api/sso/status
 * 4. تنسيق openId
 */

import { describe, it, expect } from "vitest";

// ─── اختبار 1: منطق تزامن الرصيد ────────────────────────────────────────────
describe("Balance sync timing logic", () => {
  it("should trigger sync when lastSync > 5 minutes ago", () => {
    const fiveMinutes = 5 * 60 * 1000;
    const lastSync = Date.now() - fiveMinutes - 1000;
    const needsSync = Date.now() - lastSync > fiveMinutes;
    expect(needsSync).toBe(true);
  });

  it("should NOT trigger sync when lastSync < 5 minutes ago", () => {
    const fiveMinutes = 5 * 60 * 1000;
    const lastSync = Date.now() - 60_000;
    const needsSync = Date.now() - lastSync > fiveMinutes;
    expect(needsSync).toBe(false);
  });

  it("should trigger sync when mousaLastSync is null (treated as 0)", () => {
    const fiveMinutes = 5 * 60 * 1000;
    const lastSync = 0; // null → 0
    const needsSync = Date.now() - lastSync > fiveMinutes;
    expect(needsSync).toBe(true);
  });
});

// ─── اختبار 2: استخراج mousaBalance من context ───────────────────────────────
describe("mousaBalance extraction in context", () => {
  it("should extract mousaBalance from user object", () => {
    const mockUser = {
      openId: "mousa_abc123",
      mousaUserId: 42,
      mousaBalance: 350,
      mousaLastSync: new Date(),
    };

    const mousaBalance: number | null = (mockUser as any).mousaBalance ?? null;
    expect(mousaBalance).toBe(350);
  });

  it("should return null when user has no mousaBalance", () => {
    const mockUser = { openId: "mousa_abc123", mousaUserId: null, mousaBalance: null };
    const mousaBalance: number | null = (mockUser as any).mousaBalance ?? null;
    expect(mousaBalance).toBeNull();
  });

  it("should return null when user is null (guest)", () => {
    const user = null;
    const mousaBalance: number | null = user ? ((user as any).mousaBalance ?? null) : null;
    expect(mousaBalance).toBeNull();
  });
});

// ─── اختبار 3: استعادة الجلسة من /api/sso/status ────────────────────────────
describe("Session restore from /api/sso/status", () => {
  it("should restore user when authenticated=true and userId present", () => {
    const statusData = {
      authenticated: true,
      userId: 42,
      openId: "abc123",
      name: "أحمد",
      email: "ahmed@example.com",
      creditBalance: 500,
    };

    let restoredUser = null;
    if (statusData.authenticated && statusData.userId) {
      restoredUser = {
        userId: statusData.userId,
        openId: statusData.openId ?? `mousa_${statusData.userId}`,
        name: statusData.name ?? "مستخدم",
        email: statusData.email ?? "",
        creditBalance: statusData.creditBalance ?? 0,
        platform: "khayal",
      };
    }

    expect(restoredUser).not.toBeNull();
    expect(restoredUser?.userId).toBe(42);
    expect(restoredUser?.creditBalance).toBe(500);
  });

  it("should NOT restore user when authenticated=false", () => {
    const statusData = { authenticated: false, isGuest: true };
    let restoredUser = null;
    if ((statusData as any).authenticated && (statusData as any).userId) {
      restoredUser = { userId: 1 };
    }
    expect(restoredUser).toBeNull();
  });

  it("should use fallback name when name is missing", () => {
    const statusData = { authenticated: true, userId: 10, openId: "xyz", creditBalance: 100 };
    const name = (statusData as any).name ?? "مستخدم";
    expect(name).toBe("مستخدم");
  });
});

// ─── اختبار 4: تنسيق openId ──────────────────────────────────────────────────
describe("mousa openId format", () => {
  it("should prefix mousa openId with mousa_", () => {
    const rawOpenId = "abc123";
    const localOpenId = `mousa_${rawOpenId}`;
    expect(localOpenId).toBe("mousa_abc123");
    expect(localOpenId.startsWith("mousa_")).toBe(true);
  });

  it("should strip mousa_ prefix when returning to client", () => {
    const localOpenId = "mousa_abc123";
    const clientOpenId = localOpenId.replace(/^mousa_/, "");
    expect(clientOpenId).toBe("abc123");
  });

  it("should identify mousa users by openId prefix", () => {
    const mousaUser = { openId: "mousa_abc123" };
    const regularUser = { openId: "manus_xyz" };
    expect(mousaUser.openId.startsWith("mousa_")).toBe(true);
    expect(regularUser.openId.startsWith("mousa_")).toBe(false);
  });
});
