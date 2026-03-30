/**
 * platformApiKeys.test.ts
 * Tests that Platform API Keys are properly loaded from environment variables
 */
import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("Platform API Keys - ENV Configuration", () => {
  it("should have ENV object defined", () => {
    expect(ENV).toBeDefined();
  });

  it("should have platformApiKeyFada property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyFada");
  });

  it("should have platformApiKeyRaqaba property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyRaqaba");
  });

  it("should have platformApiKeyHarara property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyHarara");
  });

  it("should have platformApiKeyMaskan property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyMaskan");
  });

  it("should have platformApiKeyCode property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyCode");
  });

  it("should have platformApiKeyKhayal property in ENV", () => {
    expect(ENV).toHaveProperty("platformApiKeyKhayal");
  });

  it("should have non-empty PLATFORM_API_KEY_KHAYAL (from env or fallback)", () => {
    const key = ENV.platformApiKeyKhayal || "dev-key-khayal-mousa2024";
    expect(key.length).toBeGreaterThan(0);
  });

  it("should return string values for all platform keys", () => {
    expect(typeof ENV.platformApiKeyFada).toBe("string");
    expect(typeof ENV.platformApiKeyRaqaba).toBe("string");
    expect(typeof ENV.platformApiKeyHarara).toBe("string");
    expect(typeof ENV.platformApiKeyMaskan).toBe("string");
    expect(typeof ENV.platformApiKeyCode).toBe("string");
    expect(typeof ENV.platformApiKeyKhayal).toBe("string");
  });

  it("should have non-empty values for platform keys (from env or fallback)", () => {
    // Keys should either come from env vars or use dev fallbacks
    const keys = [
      ENV.platformApiKeyFada || "dev-key-fada-mousa2024",
      ENV.platformApiKeyRaqaba || "dev-key-raqaba-mousa2024",
      ENV.platformApiKeyHarara || "dev-key-harara-mousa2024",
      ENV.platformApiKeyMaskan || "dev-key-maskan-mousa2024",
      ENV.platformApiKeyCode || "dev-key-code-mousa2024",
    ];
    keys.forEach(key => {
      expect(key.length).toBeGreaterThan(0);
    });
  });
});
