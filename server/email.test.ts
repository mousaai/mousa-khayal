/**
 * mousa.ai — Email Service Tests
 * Validates RESEND_API_KEY is configured and can send emails.
 * Note: This key is "send-only" restricted — GET endpoints return 401,
 * but POST /emails works correctly.
 */
import { describe, it, expect } from "vitest";

describe("Email Service", () => {
  it("RESEND_API_KEY should be configured", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("re_")).toBe(true);
  });

  it("Resend API key should be able to send emails (POST /emails)", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("Skipping: RESEND_API_KEY not set");
      return;
    }

    // Send a test email — a valid key returns 200 with an email ID
    // An invalid key returns 401
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: "delivered@resend.dev", // Resend's test sink address — never bounces
        subject: "mousa.ai — Vitest Email Validation",
        html: "<p>This is an automated test from mousa.ai vitest suite.</p>",
      }),
    });

    const body = await response.json() as { id?: string; statusCode?: number; message?: string };
    console.log(`[Resend] Send test status: ${response.status}`, body);

    // 200 with an ID = success
    expect(response.status).toBe(200);
    expect(body.id).toBeDefined();
  }, 20000);
});
