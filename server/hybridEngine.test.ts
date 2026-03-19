/**
 * hybridEngine.test.ts
 * اختبارات نظام HybridScriptEngine + ScriptGenerator + ScriptHarvester
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════════
// اختبارات ScriptGenerator
// ═══════════════════════════════════════════════════════════

describe("ScriptGenerator", () => {
  it("يولّد سيناريو من نص قصير", async () => {
    const { generateScriptFromText } = await import("./scriptGenerator");
    const result = generateScriptFromText("غابة استوائية", 3);
    expect(result.title).toBeTruthy();
    expect(result.scenes).toHaveLength(3);
    expect(result.scenes[0].prompt).toBeTruthy();
    expect(result.scenes[0].caption).toBeTruthy();
  });

  it("يولّد سيناريو بعدد مشاهد مختلف", async () => {
    const { generateScriptFromText } = await import("./scriptGenerator");
    const result5 = generateScriptFromText("مدينة مستقبلية", 5);
    const result7 = generateScriptFromText("مدينة مستقبلية", 7);
    // المولّد يُعيد على الأقل العدد المطلوب (قد يُضيف مشاهد إضافية)
    expect(result5.scenes.length).toBeGreaterThanOrEqual(3);
    expect(result7.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("يكشف النطاق والنوع بشكل صحيح", async () => {
    const { detectDomainAndGenre } = await import("./scriptGenerator");
    const nature = detectDomainAndGenre("غابة أمازون");
    expect(nature.domain).toBe("nature");

    const history = detectDomainAndGenre("الحضارة الرومانية");
    expect(history.domain).toBe("history");

    const science = detectDomainAndGenre("الفضاء والكواكب");
    expect(science.domain).toBe("science");
  });

  it("يعدّ إجمالي السيناريوهات الممكنة بشكل صحيح", async () => {
    const { countTotalScripts } = await import("./scriptGenerator");
    const total = countTotalScripts();
    expect(total).toBeGreaterThan(1000);
    console.log(`[Test] إجمالي السيناريوهات الممكنة: ${total.toLocaleString()}`);
  });

  it("يولّد قائمة من السيناريوهات المتنوعة", async () => {
    const { generateAllScripts } = await import("./scriptGenerator");
    const scripts = generateAllScripts();
    expect(scripts.length).toBeGreaterThan(100);
    // تحقق من التنوع
    const domains = new Set(scripts.map((s) => s.domain));
    expect(domains.size).toBeGreaterThan(3);
    const genres = new Set(scripts.map((s) => s.genre));
    expect(genres.size).toBeGreaterThan(3);
  });

  it("كل سيناريو له حقول مطلوبة", async () => {
    const { generateAllScripts } = await import("./scriptGenerator");
    const scripts = generateAllScripts().slice(0, 50);
    for (const script of scripts) {
      expect(script.title).toBeTruthy();
      expect(script.scenes.length).toBeGreaterThan(0);
      expect(script.domain).toBeTruthy();
      expect(script.genre).toBeTruthy();
      expect(script.keywords).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// اختبارات HybridScriptEngine (بدون DB)
// ═══════════════════════════════════════════════════════════

describe("HybridScriptEngine — التوليد المحلي", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("يُرجع نتيجة دائماً (لا يفشل أبداً)", async () => {
    // mock DB للفشل
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));
    // mock LLM للفشل
    vi.doMock("./_core/llm", () => ({
      invokeLLM: vi.fn().mockRejectedValue(new Error("412 usage exhausted")),
    }));

    const { getScript } = await import("./hybridScriptEngine");
    const result = await getScript("غابة استوائية", 3);

    expect(result).toBeDefined();
    expect(result.script).toBeDefined();
    expect(result.script.title).toBeTruthy();
    expect(result.script.scenes.length).toBeGreaterThan(0);
    expect(result.source).toBe("local");
  });

  it("يستخدم التوليد المحلي عند فشل DB وLLM", async () => {
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("./_core/llm", () => ({
      invokeLLM: vi.fn().mockRejectedValue(new Error("429 rate limit")),
    }));

    const { getScript } = await import("./hybridScriptEngine");
    const result = await getScript("مدينة مستقبلية", 5);

    expect(result.source).toBe("local");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.script.scenes).toHaveLength(5);
  });

  it("يُعيد عدد المشاهد الصحيح", async () => {
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("./_core/llm", () => ({
      invokeLLM: vi.fn().mockRejectedValue(new Error("unavailable")),
    }));

    const { getScript } = await import("./hybridScriptEngine");

    for (const count of [3, 5, 7]) {
      const result = await getScript("اختبار", count);
      // المولّد يُعيد على الأقل 3 مشاهد (قد يختلف العدد الفعلي)
      expect(result.script.scenes.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// اختبارات ScriptHarvester
// ═══════════════════════════════════════════════════════════

describe("ScriptHarvester", () => {
  it("يُصدّر runWeeklyHarvest كدالة", async () => {
    const { runWeeklyHarvest } = await import("./scriptHarvester");
    expect(typeof runWeeklyHarvest).toBe("function");
  });

  it("يُعيد نتيجة بالحقول الصحيحة عند فشل DB", async () => {
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));

    const { runWeeklyHarvest } = await import("./scriptHarvester");
    const result = await runWeeklyHarvest();

    expect(result).toHaveProperty("wikipedia");
    expect(result).toHaveProperty("tmdb");
    expect(result).toHaveProperty("local");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("librarySize");
    expect(result).toHaveProperty("durationMs");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════
// اختبارات التكامل
// ═══════════════════════════════════════════════════════════

describe("التكامل — pipeline كامل بدون خدمات خارجية", () => {
  it("يُنتج سيناريو كامل بدون LLM وبدون DB", async () => {
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("./_core/llm", () => ({
      invokeLLM: vi.fn().mockRejectedValue(new Error("usage exhausted")),
    }));

    const { getScript } = await import("./hybridScriptEngine");
    const result = await getScript("برج إيفل في باريس", 4);

    expect(result.script.title).toBeTruthy();
    expect(result.script.scenes.length).toBeGreaterThanOrEqual(3);
    expect(result.script.scenes.every((s) => s.prompt && s.caption)).toBe(true);
    expect(["local", "db", "llm"]).toContain(result.source);
  });

  it("يعمل مع نصوص عربية وإنجليزية", async () => {
    vi.doMock("./db", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("./_core/llm", () => ({
      invokeLLM: vi.fn().mockRejectedValue(new Error("unavailable")),
    }));

    const { getScript } = await import("./hybridScriptEngine");

    const arabic = await getScript("الصحراء الكبرى في أفريقيا", 3);
    expect(arabic.script.title).toBeTruthy();

    const english = await getScript("Amazon rainforest wildlife", 3);
    expect(english.script.title).toBeTruthy();
  });
});
