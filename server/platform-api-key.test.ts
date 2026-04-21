/**
 * platform-api-key.test.ts
 * يتحقق من أن PLATFORM_API_KEY صحيح ويعمل مع mousa.ai API
 */
import { describe, it, expect } from "vitest";

describe("PLATFORM_API_KEY validation", () => {
  it("should have PLATFORM_API_KEY configured", () => {
    const key = process.env.PLATFORM_API_KEY;
    expect(key, "PLATFORM_API_KEY must be set").toBeTruthy();
    expect(key!.length, "PLATFORM_API_KEY must be at least 10 chars").toBeGreaterThan(10);
  });

  it("should authenticate with mousa.ai API using PLATFORM_API_KEY", async () => {
    const key = process.env.PLATFORM_API_KEY;
    const base = "https://www.mousa.ai";
    const pid = process.env.PLATFORM_ID ?? "khayal";

    const res = await fetch(`${base}/api/platform/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Platform-ID": pid,
      },
      body: JSON.stringify({ token: "test_fake_token_vitest" }),
    });

    const data = await res.json() as { error?: string };

    // المفتاح صحيح إذا أعاد 401 مع رسالة "token غير صالح"
    // وليس 403 مع "مفتاح API غير صحيح"
    expect(res.status, "Should return 401 (invalid token), not 403 (invalid API key)").toBe(401);
    expect(data.error, "Error should mention token, not API key").toContain("token");
    expect(data.error, "Should NOT say API key is wrong").not.toContain("مفتاح API");
  }, 15000);
});
