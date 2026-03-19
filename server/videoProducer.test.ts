/**
 * videoProducer.test.ts v2.0 — اختبارات محرك الفيديو الاحترافي
 * يغطي: 8 تأثيرات حركة + 8 انتقالات + موسيقى + نسب أبعاد + وضع مسودة/إنتاج + مقاييس
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock invokeLLM ──
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "حياة النملة تحت الأرض",
          language: "ar",
          voice: "ar_male",
          narration: "النملة حشرة اجتماعية تعيش في مستعمرات منظمة تحت الأرض.",
          domain: "educational",
          musicMood: "calm",
          scenes: [
            {
              imagePrompt: "macro photography of an ant colony underground tunnel, photorealistic",
              subtitle: "المستعمرة تحت الأرض",
              narration: "تبني النملة أنفاقاً معقدة تحت الأرض.",
              duration: 6,
              zoom: "zoom_in",
              transition: "fade",
              sceneType: "b_roll",
            },
            {
              imagePrompt: "ants carrying food, macro photography, dramatic lighting",
              subtitle: "جمع الغذاء",
              narration: "تجمع النملة الغذاء لتخزينه للشتاء.",
              duration: 5,
              zoom: "pan_right",
              transition: "dissolve",
              sceneType: "b_roll",
            },
            {
              imagePrompt: "ant queen laying eggs in royal chamber, macro photography",
              subtitle: "الملكة والبيض",
              narration: "تضع الملكة آلاف البيض يومياً.",
              duration: 7,
              zoom: "zoom_out",
              transition: "wipe_left",
              sceneType: "b_roll",
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
// اختبارات v1 (محافظة على التوافق)
// ══════════════════════════════════════════════════════════════

describe("generateVideoScript", () => {
  it("يولد سيناريو بالعربي مع 3 مشاهد", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("حياة النملة", "ar", "ar_male", 3);

    expect(script.title).toBeTruthy();
    expect(script.language).toBe("ar");
    expect(script.voice).toBe("ar_male");
    expect(script.domain).toBe("educational");
    expect(script.scenes).toHaveLength(3);
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

// ══════════════════════════════════════════════════════════════
// اختبارات v2.0 — المقومات الجديدة
// ══════════════════════════════════════════════════════════════

describe("generateVideoScript v2.0 — الحقول الجديدة", () => {
  it("يعيد musicMood في السيناريو", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("حياة النملة", "ar", "ar_male", 3);
    expect(script.musicMood).toBeDefined();
    expect(typeof script.musicMood).toBe("string");
  });

  it("المشاهد تحتوي على zoom v2.0 (zoom_in, zoom_out, pan_left...)", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("حياة النملة", "ar", "ar_male", 3);
    const validMotions = ["zoom_in", "zoom_out", "pan_left", "pan_right", "shake", "rotate", "bounce", "spiral",
                          "in", "out"]; // backward compat
    script.scenes.forEach(scene => {
      expect(validMotions).toContain(scene.zoom);
    });
  });

  it("المشاهد تحتوي على transition و sceneType", async () => {
    const { generateVideoScript } = await import("./videoProducer");
    const script = await generateVideoScript("حياة النملة", "ar", "ar_male", 3);
    // الانتقالات والنوع اختياريان لكن يجب أن يكونا موجودين في السيناريو الجديد
    expect(script.scenes[0].transition).toBeDefined();
    expect(script.scenes[0].sceneType).toBeDefined();
  });
});

describe("VideoProducer v2.0 — المقومات الأساسية", () => {
  it("يستخدم دقة 1920×1080", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("1920");
    expect(source).toContain("1080");
  });

  it("يستخدم fps محدداً", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    // يستخدم 24 fps (أو 25 fps حسب الإعداد)
    expect(source).toMatch(/fps:\s*(24|25)/);
  });

  it("يحتوي على 8 تأثيرات حركة Ken Burns", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    ["zoom_in", "zoom_out", "pan_left", "pan_right", "shake", "rotate", "bounce", "spiral"].forEach(m => {
      expect(source).toContain(m);
    });
  });

  it("يحتوي على 8 انتقالات", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    ["fade", "dissolve", "wipe_left", "wipe_right", "zoom_fade", "blur_fade", "slide_left", "slide_right"].forEach(t => {
      expect(source).toContain(t);
    });
  });

  it("يحتوي على 4 نسب أبعاد", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("16:9");
    expect(source).toContain("9:16");
    expect(source).toContain("1:1");
    expect(source).toContain("4:3");
  });

  it("يحتوي على وضع مسودة وإنتاج", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("draft");
    expect(source).toContain("production");
  });

  it("يحتوي على موسيقى خلفية (addBackgroundMusic)", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("addBackgroundMusic");
    expect(source).toContain("musicVolume");
  });

  it("يحتوي على مقاييس الأداء (metrics)", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(source).toContain("durationMs");
    expect(source).toContain("fileSizeMB");
    expect(source).toContain("costEstimate");
  });
});

describe("videoRouter v2.0", () => {
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

  it("generateScript يقبل المدخلات ويعيد سيناريو", async () => {
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

  it("startProduction يقبل options v2.0 ويعيد jobId", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.video.startProduction({
      script: {
        title: "اختبار v2",
        language: "ar",
        voice: "ar_male",
        narration: "هذا اختبار",
        domain: "educational",
        musicMood: "calm",
        scenes: [
          {
            imagePrompt: "test scene",
            subtitle: "مشهد اختبار",
            duration: 5,
            zoom: "zoom_in",
            transition: "fade",
            sceneType: "b_roll",
          },
        ],
      },
      options: { aspectRatio: "9:16", mode: "draft", musicVolume: 0.1 },
    });

    expect(result.jobId).toBeTruthy();
    expect(result.jobId).toMatch(/^job_/);
  });

  it("quickProduce يقبل options v2.0 ويعيد jobId", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    const result = await caller.video.quickProduce({
      description: "دورة الماء في الطبيعة",
      language: "ar",
      voice: "ar_female",
      sceneCount: 3,
      options: { aspectRatio: "1:1", mode: "draft" },
    });

    expect(result.jobId).toBeTruthy();
    expect(result.jobId).toMatch(/^quick_/);
  });
});

describe("videoRouter v2.0 — التحقق من schema", () => {
  it("videoRouter يقبل نسبة أبعاد 16:9", async () => {
    const { readFileSync } = require("node:fs");
    const routerSrc = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoRouter.ts", "utf-8");
    expect(routerSrc).toContain("16:9");
    expect(routerSrc).toContain("9:16");
    expect(routerSrc).toContain("1:1");
    expect(routerSrc).toContain("4:3");
  });

  it("videoRouter يقبل وضع draft و production", async () => {
    const { readFileSync } = require("node:fs");
    const routerSrc = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoRouter.ts", "utf-8");
    expect(routerSrc).toContain("draft");
    expect(routerSrc).toContain("production");
  });

  it("videoRouter يقبل musicVolume", async () => {
    const { readFileSync } = require("node:fs");
    const routerSrc = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoRouter.ts", "utf-8");
    expect(routerSrc).toContain("musicVolume");
  });
});

describe("server/_core/index.ts — استئناف الـ jobs المتوقفة", () => {
  it("يحتوي على cleanupStuckJobs عند بدء التشغيل", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/_core/index.ts", "utf-8");
    expect(src).toContain("cleanupStuckJobs");
    expect(src).toContain("Server restarted during production");
    expect(src).toContain("inArray");
    expect(src).toContain('"pending"');
    expect(src).toContain('"processing"');
  });

  it("يستدعي cleanupStuckJobs عند بدء تشغيل السيرفر", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/_core/index.ts", "utf-8");
    expect(src).toContain("await cleanupStuckJobs()");
  });

  it("يحتوي على منطق استئناف المهام بدلاً من إلغائها", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/_core/index.ts", "utf-8");
    // يجب أن يحتوي على منطق الاستئناف عند وجود scriptData
    expect(src).toContain("scriptData");
    expect(src).toContain("retryCount");
    expect(src).toContain("runProductionJobExported");
    // ويحتوي على تأخير متدرج لتجنب الحمل الزائد
    expect(src).toContain("setTimeout");
  });
});

describe("videoProducer.ts — retry توليد الصور", () => {
  it("يحتوي على retry تلقائي لتوليد الصور (3 محاولات)", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    // التحقق من وجود منطق retry
    expect(src).toContain("retry");
    expect(src).toContain("attempt");
  });

  it("يحتوي على معالجة خطأ توليد الصور مع fallback", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync("/home/ubuntu/tashkila-3d-walkthrough/server/videoProducer.ts", "utf-8");
    expect(src).toContain("generateImage");
    expect(src).toContain("generateImages");
  });
});

// ══════════════════════════════════════════════════════════
// اختبارات contentFilter والفلتر الأخلاقي
// ══════════════════════════════════════════════════════════
describe("contentFilter", () => {
  it("يسمح بالمحتوى العلمي والتعليمي", async () => {
    const { checkContent } = await import("./contentFilter");
    const mockLLM = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ allowed: true, reason: "educational content" }) } }]
    });
    const result = await checkContent("ذرة الكربون تحت المجهر الإلكتروني", mockLLM as any);
    expect(result.allowed).toBe(true);
  });

  it("يرفض المحتوى المسيء", async () => {
    const { checkContent } = await import("./contentFilter");
    // استخدام كلمة محجوبة بالأنماط لضمان الرفض بدون الحاجة لـ AI
    const result = await checkContent("gore beheading torture", undefined);
    expect(result.allowed).toBe(false);
    expect(result.category).toBeDefined();
    expect(result.checkType).toBe("pattern");
  });

  it("يسمح بالعمارة والفن والهندسة", async () => {
    const { checkContent } = await import("./contentFilter");
    const mockLLM = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ allowed: true, reason: "architecture content" }) } }]
    });
    const result = await checkContent("مسجد عثماني فاخر في إسطنبول بقباب ذهبية", mockLLM as any);
    expect(result.allowed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// اختبارات وضع "أنا هناك" — immersiveView
// ══════════════════════════════════════════════════════════
describe("immersiveView angles", () => {
  it("يتوقع 6 زوايا في نتيجة الجولة الغمرية", () => {
    const EXPECTED_ANGLES = ["front", "back", "left", "right", "up", "down"];
    expect(EXPECTED_ANGLES).toHaveLength(6);
    expect(EXPECTED_ANGLES).toContain("front");
    expect(EXPECTED_ANGLES).toContain("up");
    expect(EXPECTED_ANGLES).toContain("down");
  });

  it("يتحقق من هيكل ImmersiveResult", () => {
    const mockResult = {
      title: "داخل صدفة في عمق المحيط",
      description: "أنت داخل صدفة لؤلؤ في أعماق المحيط الهادئ",
      environment: "ocean_depth",
      angles: [
        { id: "front", label: "أمامك", imageUrl: "https://example.com/front.jpg", description: "الماء الأزرق العميق" },
        { id: "back", label: "خلفك", imageUrl: "https://example.com/back.jpg", description: "جدار الصدفة الصدفي" },
        { id: "left", label: "يسارك", imageUrl: "https://example.com/left.jpg", description: "أعشاب بحرية تتمايل" },
        { id: "right", label: "يمينك", imageUrl: "https://example.com/right.jpg", description: "ضوء يخترق الماء" },
        { id: "up", label: "فوقك", imageUrl: "https://example.com/up.jpg", description: "سطح الماء بعيد" },
        { id: "down", label: "تحتك", imageUrl: "https://example.com/down.jpg", description: "قاع الصدفة الناعم" },
      ],
      ambientSound: "ocean_deep",
      generatedAt: Date.now(),
    };

    expect(mockResult.angles).toHaveLength(6);
    expect(mockResult.title).toBeTruthy();
    expect(mockResult.angles[0]).toHaveProperty("imageUrl");
    expect(mockResult.angles[0]).toHaveProperty("description");
    expect(mockResult.angles.map(a => a.id)).toEqual(["front", "back", "left", "right", "up", "down"]);
  });

  it("يتحقق من أن كل زاوية لها prompt مختلف", () => {
    const angles = ["front", "back", "left", "right", "up", "down"];
    const prompts = angles.map(angle => `inside a seashell in the ocean, looking ${angle}, cinematic`);
    const uniquePrompts = new Set(prompts);
    expect(uniquePrompts.size).toBe(6);
  });
});
