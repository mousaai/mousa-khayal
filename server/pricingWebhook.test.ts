/**
 * pricingWebhook.test.ts
 * اختبارات Pricing Webhook — POST /api/platform/pricing-webhook
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock db and notification
vi.mock("./db", () => ({
  upsertPricingRule: vi.fn().mockResolvedValue(undefined),
  getAllPricingRules: vi.fn().mockResolvedValue([]),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/env", () => ({
  ENV: {
    platformApiKeyFada:   "USAA",
    platformApiKeyRaqaba: "USAA",
    platformApiKeyHarara: "USAA",
    platformApiKeyMaskan: "USAA",
    platformApiKeyCode:   "USAA",
    platformApiKeyKhayal: "khayal@mousa30",
    cookieSecret: "test-secret",
  },
}));

// Import after mocks
const { registerPlatformApiRoutes } = await import("./platformApi");

function buildApp() {
  const app = express();
  app.use(express.json());
  registerPlatformApiRoutes(app);
  return app;
}

const VALID_BODY = {
  services: [
    { name: "sessionStart", cost: 35 },
    { name: "aiAnalysis",   cost: 35 },
  ],
  minCost: 35,
  maxCost: 70,
};

describe("POST /api/platform/pricing-webhook", () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  it("يقبل تحديث صحيح من منصة رقابة", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "raqaba")
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.platform).toBe("raqaba");
    expect(res.body.updated.minCost).toBe(35);
    expect(res.body.updated.maxCost).toBe(70);
    expect(res.body.updatedAt).toBeDefined();
  });

  it("يقبل تحديث صحيح من منصة خيال بمفتاحها الخاص", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer khayal@mousa30")
      .set("X-Platform-ID", "khayal")
      .send({ services: [{ name: "session3D", cost: 50 }], minCost: 30, maxCost: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.platform).toBe("khayal");
  });

  it("يرفض بدون Authorization header", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("X-Platform-ID", "raqaba")
      .send(VALID_BODY);

    expect(res.status).toBe(401);
  });

  it("يرفض بدون X-Platform-ID header", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .send(VALID_BODY);

    expect(res.status).toBe(401);
  });

  it("يرفض مفتاح API خاطئ", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer WRONG_KEY")
      .set("X-Platform-ID", "raqaba")
      .send(VALID_BODY);

    expect(res.status).toBe(403);
  });

  it("يرفض منصة غير معروفة", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "unknown-platform")
      .send(VALID_BODY);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("غير معروفة");
  });

  it("يرفض عند غياب minCost أو maxCost", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "harara")
      .send({ services: [{ name: "test", cost: 10 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("minCost");
  });

  it("يرفض عندما minCost > maxCost", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "harara")
      .send({ services: [{ name: "test", cost: 10 }], minCost: 100, maxCost: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("minCost");
  });

  it("يرفض services فارغة", async () => {
    const res = await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "harara")
      .send({ services: [], minCost: 10, maxCost: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("services");
  });

  it("يستدعي upsertPricingRule بالبيانات الصحيحة", async () => {
    const { upsertPricingRule } = await import("./db");

    await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "maskan")
      .send({ services: [{ name: "analysis", cost: 20 }], minCost: 10, maxCost: 30 });

    expect(upsertPricingRule).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "maskan",
        minCost: 10,
        maxCost: 30,
        isActive: true,
      })
    );
  });

  it("يستدعي notifyOwner بعد التحديث", async () => {
    const { notifyOwner } = await import("./_core/notification");

    await request(app)
      .post("/api/platform/pricing-webhook")
      .set("Authorization", "Bearer USAA")
      .set("X-Platform-ID", "fada")
      .send(VALID_BODY);

    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("فضاء"),
      })
    );
  });
});
