/**
 * autonomousDirector.test.ts — اختبارات المخرج الذاتي
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { directAutonomously, decisionToProductionParams } from "./autonomousDirector";

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          productionType: "fast_video",
          genre: "cinematic",
          genreLabel: "سينمائي",
          genreEmoji: "🎬",
          voice: "arabic_male_1",
          sceneCount: 5,
          aspectRatio: "16:9",
          pace: "medium",
          filmTitle: "رحلة في الفضاء",
          filmSynopsis: "رحلة ملحمية عبر النجوم",
          language: "ar",
          understanding: "أفهم أنك تريد فيديو سينمائي عن الفضاء",
          reasoning: {
            productionType: "فيديو سريع لأن الوصف قصير",
            genre: "سينمائي لأن الفضاء يتطلب أسلوباً ملحمياً",
            voice: "صوت عربي ذكوري للراوي",
            sceneCount: "5 مشاهد كافية لقصة قصيرة",
          },
        }),
      },
    }],
  }),
}));

describe("AutonomousDirector", () => {
  it("يُنتج قراراً كاملاً من وصف قصير", async () => {
    const steps: any[] = [];
    const decision = await directAutonomously("رحلة في الفضاء", async (step) => {
      steps.push(step);
    });

    expect(decision).toBeDefined();
    expect(["fast_video", "pro_video", "image", "immersive"]).toContain(decision.productionType);
    expect(decision.genre).toBeTruthy();
    expect(decision.sceneCount).toBeGreaterThan(0);
    expect(decision.filmTitle).toBeTruthy();
    expect(decision.thinkingSteps.length).toBeGreaterThan(0);
  });

  it("يُولّد خطوات تفكير مرئية", async () => {
    const steps: any[] = [];
    await directAutonomously("مسجد عثماني فاخر في إسطنبول", async (step) => {
      steps.push(step);
    });

    expect(steps.length).toBeGreaterThan(0);
    steps.forEach(step => {
      expect(step.icon).toBeTruthy();
      expect(step.label).toBeTruthy();
      expect(step.detail).toBeTruthy();
    });
  });

  it("يُحوّل القرار إلى معاملات إنتاج صحيحة", async () => {
    const steps: any[] = [];
    const decision = await directAutonomously("تخيّل ذرة الكربون", async (step) => {
      steps.push(step);
    });

    const params = decisionToProductionParams(decision);
    expect(params.description).toBeTruthy();
    expect(params.voice).toBeTruthy();
    expect(params.sceneCount).toBeGreaterThan(0);
    expect(params.language).toMatch(/^(ar|en)$/);
  });

  it("يتعامل مع وصف إنجليزي", async () => {
    const steps: any[] = [];
    const decision = await directAutonomously("A futuristic city in the clouds", async (step) => {
      steps.push(step);
    });

    expect(decision).toBeDefined();
    expect(decision.productionType).toBeTruthy();
  });
});
