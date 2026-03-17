/**
 * videoProducer.test.ts — اختبارات محرك الفيديو الاحترافي
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock invokeLLM ──
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "حياة النملة",
          language: "ar",
          voice: "ar_male",
          narration: "النملة حشرة اجتماعية تعيش في مستعمرات منظمة تحت الأرض.",
          domain: "educational",
          scenes: [
            {
              imagePrompt: "macro photography of an ant colony underground tunnel, photorealistic",
              subtitle: "المستعمرة تحت الأرض",
              narration: "تبني النملة أنفاقاً معقدة تحت الأرض.",
              duration: 6,
              zoom: "in",
            },
            {
              imagePrompt: "ants carrying food, macro photography, dramatic lighting",
              subtitle: "جمع الغذاء",
              narration: "تجمع النملة الغذاء لتخزينه للشتاء.",
              duration: 5,
              zoom: "pan_right",
            },
            {
              imagePrompt: "ant queen laying eggs in royal chamber, macro photography",
              subtitle: "الملكة والبيض",
              narration: "تضع الملكة آلاف البيض يومياً.",
              duration: 7,
              zoom: "out",
            },
          ],
        }),
      },
    }],
  }),
}));

// ── Mock imageGeneration ──
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: "https://example.com/test-image.jpg",
  }),
}));

// ── Mock storage ──
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/videos/test-video.mp4",
    key: "videos/test-video.mp4",
  }),
}));

// ── Mock env ──
vi.mock("./_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://api.example.com",
    forgeApiKey: "test-key-123",
  },
}));

// ── Mock fetch (for image download + TTS) ──
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes("/audio/speech")) {
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  }
  // Image download
  return Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  });
});

// ── Mock sharp ──
vi.mock("sharp", () => {
  const sharpMock = vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue({}),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
  });
  return { default: sharpMock };
});

// ── Mock fluent-ffmpeg ──
vi.mock("fluent-ffmpeg", () => {
  const instance = {
    input: vi.fn().mockReturnThis(),
    inputOptions: vi.fn().mockReturnThis(),
    videoFilter: vi.fn().mockReturnThis(),
    videoFilters: vi.fn().mockReturnThis(),
    fps: vi.fn().mockReturnThis(),
    videoCodec: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function(this: any, event: string, cb: Function) {
      if (event === "end") setTimeout(() => cb(), 10);
      return this;
    }),
    run: vi.fn(),
  };
  const ffmpegMock = vi.fn().mockReturnValue(instance);
  (ffmpegMock as any).setFfmpegPath = vi.fn();
  (ffmpegMock as any).setFfprobePath = vi.fn();
  return { default: ffmpegMock };
});

// ── Mock fs ──
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fake")),
    unlinkSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

// ══════════════════════════════════════════════════════════════
// الاختبارات
// ══════════════════════════════════════════════════════════════

describe("generateVideoScript", () => {
  it("يولد سيناريو بالعربي مع 3 مشاهد", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("حياة النملة", "ar", "ar_male", 3);

    expect(script.title).toBe("حياة النملة");
    expect(script.language).toBe("ar");
    expect(script.voice).toBe("ar_male");
    expect(script.domain).toBe("educational");
    expect(script.scenes).toHaveLength(3);
    expect(script.scenes[0].zoom).toMatch(/^(in|out|pan_left|pan_right)$/);
  });

  it("يحتوي كل مشهد على imagePrompt وsubtitle ومدة", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("رحلة إلى المريخ", "ar", "ar_male", 3);

    for (const scene of script.scenes) {
      expect(scene.imagePrompt).toBeTruthy();
      expect(scene.subtitle).toBeTruthy();
      expect(scene.duration).toBeGreaterThan(0);
    }
  });
});

describe("VideoProducer - CONFIG", () => {
  it("يستخدم دقة 1920×1080", () => {
    // التحقق من الثوابت مباشرة بدون fs mock
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("1920");
    expect(source).toContain("1080");
  });

  it("يستخدم 25 fps", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("fps: 25");
  });

  it("يدعم 4 أنواع حركة Ken Burns", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("pan_left");
    expect(source).toContain("pan_right");
    // zoom in / zoom out ممثلة بفلاتر zoompan
    expect(source).toContain("zoompan");
    expect(source).toContain("zoom-0.0008"); // zoom out
    expect(source).toContain("zoom+0.0008"); // zoom in
  });
});

describe("videoRouter - getJobStatus", () => {
  it("يعيد not_found لمهمة غير موجودة", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const status = await caller.video.getJobStatus({ jobId: "nonexistent_job_id" });
    expect(status.status).toBe("not_found");
    expect(status.progress).toBe(0);
  });
});

describe("videoRouter - generateScript", () => {
  it("يولد سيناريو من وصف نصي", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.video.generateScript({
      description: "حياة النملة تحت الأرض",
      language: "ar",
      voice: "ar_male",
      sceneCount: 3,
    });

    expect(result.script).toBeDefined();
    expect(result.script.title).toBeTruthy();
    expect(result.script.scenes.length).toBeGreaterThan(0);
  });
});

describe("videoRouter - startProduction", () => {
  it("يبدأ مهمة إنتاج ويعيد jobId", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.video.startProduction({
      script: {
        title: "اختبار",
        language: "ar",
        voice: "ar_male",
        narration: "هذا اختبار",
        domain: "educational",
        scenes: [
          {
            imagePrompt: "test scene",
            subtitle: "مشهد اختبار",
            duration: 5,
            zoom: "in",
          },
        ],
      },
    });

    expect(result.jobId).toBeTruthy();
    expect(result.jobId).toMatch(/^job_/);
  });

  it("يبدأ مهمة quickProduce ويعيد jobId", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.video.quickProduce({
      description: "حياة النملة",
      language: "ar",
      voice: "ar_male",
      sceneCount: 3,
    });

    expect(result.jobId).toBeTruthy();
    expect(result.jobId).toMatch(/^quick_/);
  });
});
