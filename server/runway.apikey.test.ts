/**
 * اختبار التحقق من صحة مفتاح Runway API
 * يتحقق من أن المفتاح صالح عبر استدعاء endpoint بسيط
 */
import { describe, it, expect } from "vitest";

describe("Runway API Key Validation", () => {
  it("should have RUNWAY_API_KEY set in environment", () => {
    const key = process.env.RUNWAY_API_KEY;
    expect(key).toBeTruthy();
    expect(key).toMatch(/^key_/);
    console.log(`[Runway] API key found: ${key?.substring(0, 20)}...`);
  });

  it("should be able to reach Runway API (lightweight check)", async () => {
    const key = process.env.RUNWAY_API_KEY;
    if (!key) {
      console.warn("[Runway] No API key — skipping connectivity test");
      return;
    }

    // استخدام endpoint خفيف لا يستهلك credits
    const resp = await fetch("https://api.dev.runwayml.com/v1/tasks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    // 200 أو 404 كلاهما يعني أن المفتاح صالح (404 = لا مهام سابقة)
    // 401 يعني مفتاح غير صالح
    console.log(`[Runway] API response status: ${resp.status}`);
    expect(resp.status).not.toBe(401);
    expect(resp.status).not.toBe(403);
  });
});
