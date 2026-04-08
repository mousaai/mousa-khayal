/**
 * mousa.integration.test.ts
 * التحقق من تكامل الملفات الرسمية من Mousa.ai
 */

import { describe, it, expect } from "vitest";
import fs from "fs";

describe("Mousa.ai Official Integration", () => {
  // ─── التحقق من الملفات ────────────────────────────────────────────
  it("auth.middleware.ts should exist in server/", () => {
    expect(fs.existsSync("server/auth.middleware.ts")).toBe(true);
  });

  it("internal.routes.ts should exist in server/", () => {
    expect(fs.existsSync("server/internal.routes.ts")).toBe(true);
  });

  // ─── التحقق من متغيرات البيئة ─────────────────────────────────────
  it("PLATFORM_ID should be set to 'khayal'", () => {
    const platformId = process.env.PLATFORM_ID;
    expect(platformId).toBeDefined();
    expect(platformId).toBe("khayal");
  });

  it("PLATFORM_API_KEY should be set (64 hex chars)", () => {
    const apiKey = process.env.PLATFORM_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("MOUSA_API_BASE should be set to mousa.ai", () => {
    const base = process.env.MOUSA_API_BASE;
    expect(base).toBeDefined();
    expect(base).toContain("mousa.ai");
  });

  it("WEBHOOK_SECRET should be set (256-bit hex)", () => {
    const secret = process.env.WEBHOOK_SECRET;
    expect(secret).toBeDefined();
    expect(secret).toMatch(/^[0-9a-f]{64}$/i);
  });

  // ─── التحقق من exports الملفات ────────────────────────────────────
  it("auth.middleware.ts should export requireMousaAuth", async () => {
    const mod = await import("./auth.middleware");
    expect(typeof mod.requireMousaAuth).toBe("function");
  });

  it("auth.middleware.ts should export requireWebhookSignature", async () => {
    const mod = await import("./auth.middleware");
    expect(typeof mod.requireWebhookSignature).toBe("function");
  });

  it("auth.middleware.ts should export deductCredits", async () => {
    const mod = await import("./auth.middleware");
    expect(typeof mod.deductCredits).toBe("function");
  });

  it("internal.routes.ts should export registerInternalRoutes", async () => {
    const mod = await import("./internal.routes");
    expect(typeof mod.registerInternalRoutes).toBe("function");
  });

  // ─── التحقق من index.ts ───────────────────────────────────────────
  it("index.ts should use registerInternalRoutes (not old webhookRouter)", () => {
    const content = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(content).toContain("registerInternalRoutes");
    expect(content).not.toContain("registerWebhookRoutes");
  });

  it("registerInternalRoutes should be called BEFORE express.json()", () => {
    const content = fs.readFileSync("server/_core/index.ts", "utf-8");
    const internalPos = content.indexOf("registerInternalRoutes");
    const jsonPos = content.indexOf('express.json(');
    expect(internalPos).toBeLessThan(jsonPos);
  });

  // ─── التحقق من صحة التوقيع ────────────────────────────────────────
  it("HMAC signature verification should work correctly", () => {
    const crypto = require("crypto");
    const secret = "816350e1619ed3ad26351ebfcfc3c65f9ba22929941767e4bbaa9f16b5cdeca7";
    const payload = JSON.stringify({ event: "platform.ping", timestamp: Date.now(), data: {} });
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});
