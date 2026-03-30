/**
 * platform-keys.test.ts
 * يتحقق من أن مفاتيح API المنصات الفرعية محددة
 */
import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("Platform API Keys", () => {
  const keys = {
    fada:   ENV.platformApiKeyFada,
    raqaba: ENV.platformApiKeyRaqaba,
    harara: ENV.platformApiKeyHarara,
    maskan: ENV.platformApiKeyMaskan,
    code:   ENV.platformApiKeyCode,
    khayal: ENV.platformApiKeyKhayal,
  };

  it("should have all platform keys defined", () => {
    for (const [platform, key] of Object.entries(keys)) {
      expect(key, `${platform} key should be defined`).toBeTruthy();
    }
  });

  it("should have at least one non-empty platform key", () => {
    // In staging/dev, multiple platforms may share the same key value.
    // We only verify that at least one key is configured.
    const values = Object.values(keys).filter(Boolean);
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it("khayal cost should be 25 credits", async () => {
    // التحقق من تكلفة خيال في platformApi
    const { readFileSync } = await import("fs");
    const content = readFileSync("./server/platformApi.ts", "utf-8");
    expect(content).toContain("khayal: 25");
  });
});
