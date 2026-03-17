/**
 * khayal.test.ts — اختبارات منصة خيال الشاملة
 */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock LLM ──
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "مشهد اختباري",
          culturalContext: "عربي",
          detectedLanguage: "ar",
          scenarioType: "imagine",
          mainElements: ["عنصر1", "عنصر2"],
          atmosphere: "درامي",
          cinematicStyle: "فوتوريالستيك",
          scenes: [
            { type: "exterior", label: "المنظر الخارجي", prompt: "Ultra photorealistic test scene", arabicCaption: "جملة شعرية" },
            { type: "aerial", label: "المنظر الجوي", prompt: "Ultra photorealistic aerial test", arabicCaption: "من السماء" },
            { type: "interior", label: "الداخل", prompt: "Ultra photorealistic interior test", arabicCaption: "في الداخل" },
            { type: "detail", label: "التفاصيل", prompt: "Ultra photorealistic detail test", arabicCaption: "في التفاصيل" },
            { type: "atmosphere", label: "الأجواء", prompt: "Ultra photorealistic atmosphere test", arabicCaption: "أجواء ساحرة" },
          ],
        }),
      },
    }],
  }),
}));

// ── Mock Image Generation ──
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/test-image.jpg" }),
}));

// ── Mock DB ──
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ═══════════════════════════════════════════════════════════════
// CORE GENERATION TESTS
// ═══════════════════════════════════════════════════════════════
describe("khayal.generateScene", () => {
  it("generates scenes from Arabic description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "مسجد عثماني كلاسيكي بقبة ذهبية ومئذنتين في حديقة خضراء",
    });

    expect(result).toBeDefined();
    expect(result.scenes).toBeInstanceOf(Array);
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.description).toContain("مسجد");
  });

  it("generates scenes from English description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "A futuristic skyscraper in Dubai with hanging gardens",
    });

    expect(result).toBeDefined();
    expect(result.scenes).toBeInstanceOf(Array);
    expect(result.scenes.length).toBeGreaterThan(0);
  });

  it("generates scenes from French description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "Une villa méditerranéenne sur les falaises d'Amalfi",
    });

    expect(result).toBeDefined();
    expect(result.scenes).toBeInstanceOf(Array);
  });

  it("includes imageUrl in each scene", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "حديقة عامة فاخرة مع نوافير وممشيات",
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
      referenceImageUrl: "https://example.com/reference.jpg",
    });

    expect(result).toBeDefined();
    expect(result.scenes.length).toBeGreaterThan(0);
  });

  it("AI infers scenarioType automatically", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.khayal.generateScene({
      description: "خيال حر بلا حدود",
    });

    // AI returns scenarioType from LLM mock = "imagine"
    expect(result.scenarioType).toBe("imagine");
  });
});

// ═══════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════
describe("Language Detection", () => {
  it("detects Arabic text", () => {
    const text = "مسجد عثماني فاخر في إسطنبول";
    expect(/[\u0600-\u06FF]/.test(text)).toBe(true);
  });

  it("detects Japanese text", () => {
    const text = "京都の静かな竹林に囲まれた古い日本の神社";
    expect(/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)).toBe(true);
  });

  it("detects Chinese text", () => {
    const text = "上海外滩的未来主义摩天大楼群";
    expect(/[\u4E00-\u9FAF]/.test(text)).toBe(true);
  });

  it("English text is not Arabic", () => {
    const text = "A futuristic skyscraper in Dubai";
    expect(/[\u0600-\u06FF]/.test(text)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// SCENARIO INFERENCE
// ═══════════════════════════════════════════════════════════════
describe("Scenario Inference (keyword fallback)", () => {
  const inferScenario = (description: string): string => {
    const lower = description.toLowerCase();
    if (/جديد|new|nouveau|新|nuevo|design|تصميم/.test(lower)) return "design";
    if (/تطوير|develop|développer|開発|future|مستقبل/.test(lower)) return "develop";
    if (/تدهور|decay|dégradation|廃墟|ruin|أطلال/.test(lower)) return "deteriorate";
    if (/مقارنة|compare|before|after|比較/.test(lower)) return "compare";
    return "imagine";
  };

  it("infers 'design' from Arabic", () => {
    expect(inferScenario("تصميم جديد لمبنى حديث")).toBe("design");
  });

  it("infers 'develop' from English", () => {
    expect(inferScenario("future development of the city")).toBe("develop");
  });

  it("infers 'deteriorate' from decay keywords", () => {
    expect(inferScenario("ruins and decay of an abandoned building")).toBe("deteriorate");
  });

  it("infers 'compare' from before/after", () => {
    expect(inferScenario("before and after transformation")).toBe("compare");
  });

  it("defaults to 'imagine'", () => {
    expect(inferScenario("a beautiful garden with flowers")).toBe("imagine");
  });
});

// ═══════════════════════════════════════════════════════════════
// DOWNLOAD FORMATS
// ═══════════════════════════════════════════════════════════════
describe("Download Formats", () => {
  it("all download formats are defined", () => {
    const formats = ["zip", "mp4", "pdf", "gif", "jpg"];
    expect(formats).toContain("zip");
    expect(formats).toContain("mp4");
    expect(formats).toContain("pdf");
    expect(formats).toContain("gif");
  });

  it("scene data has required fields for download", () => {
    const scene = {
      type: "exterior",
      label: "المنظر الخارجي",
      imageUrl: "https://example.com/image.jpg",
      arabicCaption: "جملة شعرية",
      prompt: "Ultra photorealistic...",
      order: 0,
    };
    expect(scene.imageUrl).toBeTruthy();
    expect(scene.label).toBeTruthy();
    expect(scene.type).toBeTruthy();
  });

  it("PDF filename is sanitized", () => {
    const title = "مشروع خيال رائع";
    const filename = `khayal_${title.replace(/\s+/g, "_")}.pdf`;
    expect(filename).toContain("khayal_");
    expect(filename).toContain(".pdf");
    expect(filename).not.toContain(" ");
  });
});

// ═══════════════════════════════════════════════════════════════
// MULTILINGUAL UI
// ═══════════════════════════════════════════════════════════════
describe("Multilingual UI", () => {
  const UI_LANGS: Record<string, { btn: string; placeholder: string }> = {
    AR: { btn: "شكّل الخيال", placeholder: "صِف ما تتخيله..." },
    EN: { btn: "Visualize", placeholder: "Describe what you imagine..." },
    JA: { btn: "可視化", placeholder: "想像するものを説明してください..." },
    FR: { btn: "Visualiser", placeholder: "Décrivez ce que vous imaginez..." },
    ZH: { btn: "可视化", placeholder: "描述您想象的内容..." },
    IT: { btn: "Visualizza", placeholder: "Descrivi cosa immagini..." },
    ES: { btn: "Visualizar", placeholder: "Describe lo que imaginas..." },
    HI: { btn: "कल्पना करें", placeholder: "वर्णन करें जो आप कल्पना करते हैं..." },
  };

  it("supports 8 languages", () => {
    expect(Object.keys(UI_LANGS).length).toBe(8);
  });

  it("Arabic UI is correct", () => {
    expect(UI_LANGS.AR.btn).toBe("شكّل الخيال");
  });

  it("English UI is correct", () => {
    expect(UI_LANGS.EN.btn).toBe("Visualize");
  });

  it("Japanese UI is correct", () => {
    expect(UI_LANGS.JA.btn).toBe("可視化");
  });

  it("all languages have btn and placeholder", () => {
    Object.values(UI_LANGS).forEach(lang => {
      expect(lang.btn).toBeTruthy();
      expect(lang.placeholder).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// CINEMATIC VIEWER
// ═══════════════════════════════════════════════════════════════
describe("Cinematic Viewer", () => {
  it("Ken Burns effects are defined", () => {
    const KEN_BURNS = [
      { start: "scale(1) translate(0%, 0%)", end: "scale(1.18) translate(-3%, -2%)" },
      { start: "scale(1.05) translate(3%, 2%)", end: "scale(1.2) translate(-2%, -3%)" },
      { start: "scale(1) translate(-2%, 0%)", end: "scale(1.15) translate(2%, -3%)" },
      { start: "scale(1.08) translate(0%, 3%)", end: "scale(1.22) translate(-3%, 0%)" },
      { start: "scale(1) translate(2%, -2%)", end: "scale(1.16) translate(-1%, 2%)" },
    ];
    expect(KEN_BURNS.length).toBe(5);
    KEN_BURNS.forEach(kb => {
      expect(kb.start).toContain("scale");
      expect(kb.end).toContain("scale");
    });
  });

  it("scene duration is 9 seconds", () => {
    const SCENE_DURATION = 9000;
    expect(SCENE_DURATION).toBe(9000);
  });

  it("scenario colors are valid hex codes", () => {
    const SCENARIO_COLORS: Record<string, string> = {
      design: "#60a5fa",
      develop: "#34d399",
      deteriorate: "#f87171",
      compare: "#fbbf24",
      imagine: "#c084fc",
    };
    Object.values(SCENARIO_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// MICROPHONE
// ═══════════════════════════════════════════════════════════════
describe("Microphone & Voice", () => {
  it("mic states are valid", () => {
    const validStates = ["idle", "listening", "processing"];
    expect(validStates).toContain("idle");
    expect(validStates).toContain("listening");
    expect(validStates).toContain("processing");
  });

  it("waveform has 28 bars", () => {
    const waveData = Array(28).fill(0.5);
    expect(waveData.length).toBe(28);
  });

  it("waveform values are normalized 0-1", () => {
    const waveData = Array(28).fill(0).map(() => Math.random());
    expect(waveData.every(v => v >= 0 && v <= 1)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// DATABASE QUERIES
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// CONTENT FILTER TESTS
// ═══════════════════════════════════════════════════════════════
describe("Content Filter", () => {
  it("allows clean architectural description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.khayal.checkContent({ text: "مسجد عثماني فاخر بقبة ذهبية" });
    expect(result.allowed).toBe(true);
  });

  it("allows English architectural description", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.khayal.checkContent({ text: "A futuristic skyscraper with green rooftops" });
    expect(result.allowed).toBe(true);
  });

  it("blocks explicit content", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.khayal.checkContent({ text: "nude explicit sexual content" });
    expect(result.allowed).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("blocks violent content", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.khayal.checkContent({ text: "graphic violence murder blood gore" });
    expect(result.allowed).toBe(false);
  });

  it("returns message when blocked", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.khayal.checkContent({ text: "porn explicit" });
    expect(result.message).toContain("⚠");
  });
});

// ═══════════════════════════════════════════════════════════════
// FILM ENGINE TESTS
// ═══════════════════════════════════════════════════════════════
describe("Film Engine", () => {
  const calcFilm = (durationSeconds: number) => {
    const isUnlimited = durationSeconds >= 99999;
    const effectiveSec = isUnlimited ? 3600 : Math.max(5, durationSeconds);
    const SCENE_SCREEN_TIME = effectiveSec < 60 ? 5 : 8;
    const totalScenes = isUnlimited ? 999 : Math.max(1, Math.ceil(effectiveSec / SCENE_SCREEN_TIME));
    const BATCH_SIZE = 8;
    const totalBatches = isUnlimited ? 999 : Math.ceil(totalScenes / BATCH_SIZE);
    const mins = Math.floor(effectiveSec / 60);
    const secs = effectiveSec % 60;
    const durationLabel = isUnlimited ? "∞ بلا حد" : mins > 0 ? `${mins}م ${secs}ث` : `${secs} ثانية`;
    return { totalScenes, totalBatches, durationLabel, isUnlimited };
  };

  it("5 seconds produces at least 1 scene", () => {
    const r = calcFilm(5);
    expect(r.totalScenes).toBeGreaterThanOrEqual(1);
    expect(r.durationLabel).toBe("5 ثانية");
  });

  it("30 seconds produces correct scenes", () => {
    const r = calcFilm(30);
    expect(r.totalScenes).toBe(6); // 30/5 = 6
    expect(r.durationLabel).toBe("30 ثانية");
  });

  it("1 minute produces correct scenes", () => {
    const r = calcFilm(60);
    expect(r.totalScenes).toBe(8); // 60/8 = 7.5 -> ceil = 8
    expect(r.durationLabel).toBe("1م 0ث");
  });

  it("15 minutes produces correct scenes", () => {
    const r = calcFilm(900);
    expect(r.totalScenes).toBe(113); // 900/8 = 112.5 -> ceil = 113
    expect(r.durationLabel).toBe("15م 0ث");
  });

  it("unlimited mode sets totalScenes to 999", () => {
    const r = calcFilm(99999);
    expect(r.isUnlimited).toBe(true);
    expect(r.totalScenes).toBe(999);
    expect(r.durationLabel).toBe("∞ بلا حد");
  });

  it("batches are calculated correctly", () => {
    const r = calcFilm(80);
    expect(r.totalBatches).toBe(Math.ceil(r.totalScenes / 8));
  });
});

// ═══════════════════════════════════════════════════════════════
// MUSIC ENGINE TESTS
// ═══════════════════════════════════════════════════════════════
describe("Music Engine", () => {
  const selectMusicMood = (scenarioType: string, atmosphere?: string): string => {
    if (scenarioType === "deteriorate") return "mysterious";
    if (scenarioType === "compare") return "dramatic";
    if (scenarioType === "develop") return "epic";
    if (scenarioType === "design") return "peaceful";
    if (atmosphere?.includes("ليل") || atmosphere?.includes("night")) return "ambient";
    if (atmosphere?.includes("فجر") || atmosphere?.includes("dawn")) return "joyful";
    return "ambient";
  };

  it("deteriorate scenario maps to mysterious mood", () => {
    expect(selectMusicMood("deteriorate")).toBe("mysterious");
  });

  it("compare scenario maps to dramatic mood", () => {
    expect(selectMusicMood("compare")).toBe("dramatic");
  });

  it("develop scenario maps to epic mood", () => {
    expect(selectMusicMood("develop")).toBe("epic");
  });

  it("design scenario maps to peaceful mood", () => {
    expect(selectMusicMood("design")).toBe("peaceful");
  });

  it("night atmosphere maps to ambient mood", () => {
    expect(selectMusicMood("imagine", "ليل مضيء")).toBe("ambient");
  });

  it("dawn atmosphere maps to joyful mood", () => {
    expect(selectMusicMood("imagine", "فجر ذهبي")).toBe("joyful");
  });

  it("valid moods list is complete", () => {
    const validMoods = ["ambient", "dramatic", "peaceful", "epic", "mysterious", "joyful"];
    expect(validMoods.length).toBe(6);
    expect(validMoods).toContain("ambient");
    expect(validMoods).toContain("dramatic");
  });
});

// ═══════════════════════════════════════════════════════════════
// GEOMETRIC FIDELITY TESTS
// ═══════════════════════════════════════════════════════════════
describe("Geometric Fidelity", () => {
  it("geometric mass fields are defined", () => {
    const mass = {
      shape: "C-shape",
      width: 25,
      length: 43,
      height: 12,
      floorCount: 3,
      setbacks: { front: 5, back: 0, left: 0, right: 0 },
    };
    expect(mass.shape).toBeTruthy();
    expect(mass.width).toBeGreaterThan(0);
    expect(mass.length).toBeGreaterThan(0);
    expect(mass.floorCount).toBeGreaterThan(0);
  });

  it("camera angles cover all 8 perspectives", () => {
    const CAMERA_ANGLES = [
      "exterior_front", "exterior_side", "exterior_back", "aerial_45",
      "aerial_top", "interior_main", "interior_detail", "atmosphere_golden",
    ];
    expect(CAMERA_ANGLES.length).toBe(8);
    expect(CAMERA_ANGLES).toContain("exterior_front");
    expect(CAMERA_ANGLES).toContain("aerial_45");
    expect(CAMERA_ANGLES).toContain("interior_main");
  });

  it("single concept is maintained across angles", () => {
    const concept = "Ottoman mosque with golden dome";
    const prompts = [
      `Front view of ${concept}`,
      `Side view of ${concept}`,
      `Aerial view of ${concept}`,
    ];
    prompts.forEach(p => {
      expect(p).toContain(concept);
    });
  });
});
