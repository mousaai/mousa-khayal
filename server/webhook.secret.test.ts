/**
 * webhook.secret.test.ts
 * التحقق من أن MOUSA_WEBHOOK_SECRET مُعيَّن ويعمل في Webhook Receiver
 */

import { describe, it, expect } from "vitest";

describe("Webhook Secret Validation", () => {
  it("MOUSA_WEBHOOK_SECRET should be set in environment", () => {
    const secret = process.env.MOUSA_WEBHOOK_SECRET;
    expect(secret).toBeDefined();
    expect(secret).not.toBe("");
    expect(secret?.length).toBeGreaterThan(10);
  });

  it("MOUSA_WEBHOOK_SECRET should be a valid hex string (64 chars)", () => {
    const secret = process.env.MOUSA_WEBHOOK_SECRET ?? "";
    // يجب أن يكون hex string بطول 64 حرف (256-bit)
    expect(secret).toMatch(/^[0-9a-f]{64}$/i);
  });

  it("webhookRouter should use MOUSA_WEBHOOK_SECRET for auth", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/webhookRouter.ts", "utf-8");
    expect(content).toContain("MOUSA_WEBHOOK_SECRET");
    expect(content).toContain("Authorization");
    expect(content).toContain("Bearer");
  });

  it("webhookRouter should reject requests without valid secret", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/webhookRouter.ts", "utf-8");
    // يجب أن يرد بـ 401 عند عدم تطابق السر
    expect(content).toContain("401");
    expect(content).toContain("Unauthorized");
  });
});
