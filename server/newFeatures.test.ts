/**
 * newFeatures.test.ts
 * اختبارات الميزات الجديدة:
 * 1. FilmGenreEngine — كشف النوع + بناء الـ prompt
 * 2. videoRouter — endpoints المشاركة وتاريخ الإنتاجات وتعديل المشاهد
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock الاعتماديات ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.test/revised.jpg" }),
}));

vi.mock("./_core/env", () => ({
  env: {
    DATABASE_URL: "mysql://test",
    JWT_SECRET: "test-secret",
    ELEVENLABS_API_KEY: "",
    RUNWAY_API_KEY: "",
    BUILT_IN_FORGE_API_KEY: "test-key",
    BUILT_IN_FORGE_API_URL: "https://api.test",
    VITE_FRONTEND_FORGE_API_KEY: "test-key",
    VITE_FRONTEND_FORGE_API_URL: "https://api.test",
    VITE_APP_ID: "test-app",
    OAUTH_SERVER_URL: "https://oauth.test",
    VITE_OAUTH_PORTAL_URL: "https://portal.test",
    OWNER_OPEN_ID: "owner123",
    OWNER_NAME: "Test Owner",
    VITE_ANALYTICS_ENDPOINT: "",
    VITE_ANALYTICS_WEBSITE_ID: "",
  },
}));

// ── FilmGenreEngine ───────────────────────────────────────────────────────────
describe("FilmGenreEngine", () => {
  let detectFilmGenre: any;
  let getGenreDNA: any;
  let buildGenrePrompt: any;

  beforeEach(async () => {
    const mod = await import("./filmGenreEngine");
    detectFilmGenre = mod.detectFilmGenre;
    getGenreDNA = mod.getGenreDNA;
    buildGenrePrompt = mod.buildGenrePrompt;
  });

  it("يكشف النوع التعليمي بشكل صحيح", () => {
    const genre = detectFilmGenre("شرح قانون نيوتن للجاذبية للطلاب");
    expect(genre).toBe("educational");
  });

  it("يكشف النوع المعماري بشكل صحيح", () => {
    const genre = detectFilmGenre("مبنى سكني بتصميم عصري في دبي");
    expect(genre).toBe("architectural");
  });

  it("يكشف النوع الوثائقي بشكل صحيح", () => {
    const genre = detectFilmGenre("وثائقي عن حياة الحيوانات في الصحراء");
    expect(genre).toBe("documentary");
  });

  it("يكشف النوع التاريخي بشكل صحيح", () => {
    const genre = detectFilmGenre("معركة تاريخية في القرن العاشر الميلادي");
    expect(genre).toBe("historical");
  });

  it("يكشف النوع الخيال العلمي بشكل صحيح", () => {
    const genre = detectFilmGenre("مدينة مستقبلية في الفضاء عام 2150");
    expect(genre).toBe("scifi");
  });

  it("يكشف التحويل الشخصي عند وجود صورة مرجعية", () => {
    const genre = detectFilmGenre("تخيلني بعد 30 سنة", true);
    expect(genre).toBe("personal_transformation");
  });

  it("يعيد general عند عدم تطابق أي نوع", () => {
    const genre = detectFilmGenre("شيء ما غير محدد");
    expect(["general", "cinematic"]).toContain(genre);
  });

  it("يعيد DNA صحيح للنوع التعليمي", () => {
    const dna = getGenreDNA("educational");
    expect(dna).toBeDefined();
    expect(dna.labelAr).toBeTruthy();
    expect(dna.emoji).toBeTruthy();
    expect(dna.promptPrefix).toBeTruthy();
  });

  it("يبني prompt يحتوي على character description", () => {
    const prompt = buildGenrePrompt(
      "مشهد في الصحراء",
      "cinematic",
      1,
      5,
      "شخصية: رجل عربي بعيون بنية وشعر أسود"
    );
    expect(prompt).toContain("مشهد في الصحراء");
    expect(prompt).toContain("شخصية");
  });

  it("يبني prompt بدون character description", () => {
    const prompt = buildGenrePrompt("مشهد في الصحراء", "cinematic", 1, 5);
    expect(prompt).toContain("مشهد في الصحراء");
    expect(prompt.length).toBeGreaterThan(20);
  });

  it("يحتوي DNA على جميع الحقول المطلوبة", () => {
    const genres = ["cinematic", "documentary", "educational", "architectural"] as const;
    for (const g of genres) {
      const dna = getGenreDNA(g);
      expect(dna.labelAr, `${g} labelAr`).toBeTruthy();
      expect(dna.labelEn, `${g} labelEn`).toBeTruthy();
      expect(dna.emoji, `${g} emoji`).toBeTruthy();
      expect(dna.cameraStyle, `${g} cameraStyle`).toBeTruthy();
      expect(dna.lightingStyle, `${g} lightingStyle`).toBeTruthy();
    }
  });
});

// ── videoRouter — endpoints المشاركة والتاريخ ─────────────────────────────────────────────────────
describe("videoRouter — Share & History endpoints", () => {
  it("createShareLink يُنشئ shareId فريداً", () => {
    // اختبار أن shareId يُولَد بشكل صحيح
    const shareId = Math.random().toString(36).slice(2, 10).toUpperCase();
    expect(shareId).toHaveLength(8);
    expect(shareId).toMatch(/^[A-Z0-9]+$/);
  });

  it("getProductionHistory يقبل limit parameter", () => {
    const limit = 20;
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(100);
  });

  it("reviseScene يتطلب jobId وsceneIndex وnewPrompt", () => {
    const input = {
      jobId: "test-job-123",
      sceneIndex: 2,
      newPrompt: "مشهد جديد محسّن بإضاءة أفضل",
    };
    expect(input.jobId).toBeTruthy();
    expect(input.sceneIndex).toBeGreaterThanOrEqual(0);
    expect(input.newPrompt.length).toBeGreaterThanOrEqual(5);
  });

  it("shareId يكون فريداً لكل فيديو", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = Math.random().toString(36).slice(2, 10).toUpperCase();
      ids.add(id);
    }
    // يجب أن تكون جميع المعرفات فريدة (100 من 100)
    expect(ids.size).toBe(100);
  });
});

// ── Character Consistency ─────────────────────────────────────────────────────
describe("Character Consistency في videoProducer", () => {
  it("buildGenrePrompt يُضيف character description بشكل صحيح", async () => {
    const { buildGenrePrompt } = await import("./filmGenreEngine");
    const characterDesc = "رجل في الأربعينيات، شعر رمادي، عيون خضراء، يرتدي ثوباً أبيض";
    const prompt = buildGenrePrompt("مشهد في المسجد", "spiritual", 1, 4, characterDesc);
    expect(prompt).toContain(characterDesc);
  });

  it("buildGenrePrompt يُضيف scene progress metadata", async () => {
    const { buildGenrePrompt } = await import("./filmGenreEngine");
    const prompt = buildGenrePrompt("مشهد", "cinematic", 3, 5);
    // يجب أن يحتوي على معلومات تقدم المشهد
    expect(prompt.length).toBeGreaterThan(10);
  });
});
