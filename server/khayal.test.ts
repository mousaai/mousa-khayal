import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock image generation and LLM
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/test-image.jpg" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          scenes: [
            { type: "exterior", label: "المنظر الخارجي", prompt: "Photorealistic render of a building exterior" },
            { type: "aerial", label: "المنظر الجوي", prompt: "Aerial drone view of the building" },
            { type: "interior", label: "الفضاء الداخلي", prompt: "Interior render of the building" },
            { type: "detail", label: "التفاصيل", prompt: "Close-up architectural detail" },
            { type: "atmosphere", label: "الأجواء", prompt: "Atmospheric cinematic scene" },
          ]
        })
      }
    }]
  }),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null), // no DB in tests
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("khayal.generateScene", () => {
  it("generates scenes from a text description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "مسجد عثماني كلاسيكي بقبة ذهبية ومئذنتين في حديقة خضراء",
      scenarioType: "design",
    });

    expect(result).toBeDefined();
    expect(result.scenes).toBeInstanceOf(Array);
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.description).toContain("مسجد");
    expect(result.scenarioType).toBe("design");
  });

  it("accepts all scenario types", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const scenarios = ["design", "develop", "deteriorate", "compare", "imagine"] as const;

    for (const scenario of scenarios) {
      const result = await caller.khayal.generateScene({
        description: "وصف تجريبي للاختبار",
        scenarioType: scenario,
      });
      expect(result.scenarioType).toBe(scenario);
    }
  });

  it("includes imageUrl in each scene", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "حديقة عامة فاخرة مع نوافير وممشيات",
      scenarioType: "imagine",
    });

    for (const scene of result.scenes) {
      expect(scene.imageUrl).toBeTruthy();
      expect(scene.label).toBeTruthy();
      expect(scene.type).toBeTruthy();
    }
  });

  it("accepts optional referenceImageUrl", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "تطوير هذا المكان",
      scenarioType: "develop",
      referenceImageUrl: "https://example.com/reference.jpg",
    });

    expect(result).toBeDefined();
    expect(result.scenes.length).toBeGreaterThan(0);
  });
});

describe("khayal.getProjects", () => {
  it("returns empty array when DB is not available", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.khayal.getProjects();
    expect(projects).toBeInstanceOf(Array);
  });
});

describe("khayal.getProjectScenes", () => {
  it("returns empty array when DB is not available", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const scenes = await caller.khayal.getProjectScenes({ projectId: 1 });
    expect(scenes).toBeInstanceOf(Array);
  });
});
