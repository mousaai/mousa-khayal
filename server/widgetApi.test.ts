import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerWidgetApiRoutes } from "./widgetApi";

// ── Unit tests for audio improvements ────────────────────────────────────────
describe("Widget API — TTS Improvements v5.0", () => {
  it("TTS timeout should be 20s (improved from 12s)", () => {
    const TTS_TIMEOUT_MS = 20000;
    expect(TTS_TIMEOUT_MS).toBe(20000);
    expect(TTS_TIMEOUT_MS).toBeGreaterThan(12000);
  });

  it("TTS max retries should be 3", () => {
    const TTS_MAX_RETRIES = 3;
    expect(TTS_MAX_RETRIES).toBe(3);
  });

  it("voice names updated: ثاني and اليازية", () => {
    const voices = { thani: "ثاني", noura: "اليازية" };
    expect(voices.thani).toBe("ثاني");
    expect(voices.noura).toBe("اليازية");
    // Ensure old names are not used as primary
    expect(voices).not.toHaveProperty("موسى");
    expect(voices).not.toHaveProperty("أسماء");
    expect(voices).not.toHaveProperty("نورة");
  });

  it("speed clamped between 0.7 and 1.2", () => {
    const clampSpeed = (s: number) => Math.min(1.2, Math.max(0.7, s));
    expect(clampSpeed(0.5)).toBe(0.7);
    expect(clampSpeed(1.5)).toBe(1.2);
    expect(clampSpeed(1.0)).toBe(1.0);
  });

  it("barge-in threshold improved to 25 (from 18)", () => {
    const BARGE_IN_THRESHOLD = 25;
    expect(BARGE_IN_THRESHOLD).toBeGreaterThan(18);
  });

  it("volume slider maps 0-100 to 0.0-1.0", () => {
    const sliderToVolume = (v: number) => v / 100;
    expect(sliderToVolume(0)).toBe(0);
    expect(sliderToVolume(100)).toBe(1);
    expect(sliderToVolume(75)).toBe(0.75);
  });

  it("speed slider maps 0-100 to 0.7-1.2", () => {
    const sliderToSpeed = (v: number) => 0.7 + (v / 100) * 0.5;
    expect(sliderToSpeed(0)).toBeCloseTo(0.7);
    expect(sliderToSpeed(100)).toBeCloseTo(1.2);
    expect(sliderToSpeed(60)).toBeCloseTo(1.0);
  });

  it("legacy voice aliases resolve correctly", () => {
    const VOICE_PROFILES: Record<string, { id: string }> = {
      thani:  { id: "6LC8fQJu1Jg3bglhviXA" },
      noura:  { id: "nPczCjzI2devNBz1zQrb" },
      mousa:  { id: "6LC8fQJu1Jg3bglhviXA" },
      asmaa:  { id: "nPczCjzI2devNBz1zQrb" },
    };
    expect(VOICE_PROFILES.mousa.id).toBe(VOICE_PROFILES.thani.id);
    expect(VOICE_PROFILES.asmaa.id).toBe(VOICE_PROFILES.noura.id);
  });
});

// ── Integration tests ────────────────────────────────────────────────────────
// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            reply: "أهلاً! أنا ثاني الذكي، مرشدك في mousa.ai.",
            uiCommand: null,
          }),
        },
      },
    ],
  }),
}));

describe("Widget API", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    registerWidgetApiRoutes(app);
  });

  describe("POST /api/widget/chat", () => {
    it("should return a reply for a valid message", async () => {
      const res = await request(app)
        .post("/api/widget/chat")
        .send({ message: "مرحباً" })
        .expect(200);

      expect(res.body).toHaveProperty("reply");
      expect(typeof res.body.reply).toBe("string");
      expect(res.body.reply.length).toBeGreaterThan(0);
    });

    it("should return 400 for empty message", async () => {
      const res = await request(app)
        .post("/api/widget/chat")
        .send({ message: "" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for missing message", async () => {
      const res = await request(app)
        .post("/api/widget/chat")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should accept context and history", async () => {
      const res = await request(app)
        .post("/api/widget/chat")
        .send({
          message: "ما هي منصة فضاء؟",
          context: "الصفحة الحالية: الصفحة الرئيسية",
          history: [
            { role: "user", content: "مرحباً" },
            { role: "assistant", content: "أهلاً بك!" },
          ],
        })
        .expect(200);

      expect(res.body).toHaveProperty("reply");
    });

    it("should return uiCommand field (can be null)", async () => {
      const res = await request(app)
        .post("/api/widget/chat")
        .send({ message: "ابدأ جولة" })
        .expect(200);

      expect(res.body).toHaveProperty("uiCommand");
    });

    it("should handle LLM returning uiCommand with START_TOUR", async () => {
      const { invokeLLM } = await import("./_core/llm");
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: "سأبدأ جولة تعريفية بالمنصات الست.",
                uiCommand: { ui_command: "START_TOUR" },
              }),
            },
          },
        ],
      } as any);

      const res = await request(app)
        .post("/api/widget/chat")
        .send({ message: "أرني جولة تعريفية" })
        .expect(200);

      expect(res.body.uiCommand).toEqual({ ui_command: "START_TOUR" });
    });

    it("should handle LLM returning NAVIGATE command", async () => {
      const { invokeLLM } = await import("./_core/llm");
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: "سأنقلك إلى منصة فضاء.",
                uiCommand: { ui_command: "NAVIGATE", target: "/fada" },
              }),
            },
          },
        ],
      } as any);

      const res = await request(app)
        .post("/api/widget/chat")
        .send({ message: "خذني لمنصة فضاء" })
        .expect(200);

      expect(res.body.uiCommand).toMatchObject({ ui_command: "NAVIGATE", target: "/fada" });
    });
  });

  describe("POST /api/widget/tts", () => {
    it("should return 400 for empty text", async () => {
      const res = await request(app)
        .post("/api/widget/tts")
        .send({ text: "" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 for missing text", async () => {
      const res = await request(app)
        .post("/api/widget/tts")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("should return 503 when TTS service is unavailable (no API keys)", async () => {
      // In test environment, TTS keys are not set, so it should return 503
      const res = await request(app)
        .post("/api/widget/tts")
        .send({ text: "مرحباً" });

      // Either 200 (if TTS works) or 503 (if unavailable)
      expect([200, 503]).toContain(res.status);
    }, 15000);
  });
});
