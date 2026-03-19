/**
 * اختبارات prebuiltScripts.ts
 * يتحقق من صحة السيناريوهات الجاهزة ودوال البناء
 */
import { describe, it, expect } from "vitest";
import {
  PREBUILT_SCRIPTS,
  findBestScript,
  prebuiltToVideoScript,
  buildManualScript,
} from "./prebuiltScripts";

// ─── PREBUILT_SCRIPTS ───────────────────────────────────────────────────────

describe("PREBUILT_SCRIPTS", () => {
  it("should have at least 5 scripts", () => {
    expect(PREBUILT_SCRIPTS.length).toBeGreaterThanOrEqual(5);
  });

  it("each script should have required fields", () => {
    for (const s of PREBUILT_SCRIPTS) {
      expect(s.id).toBeTruthy();
      expect(s.titleAr).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.category).toBeTruthy();
      expect(s.emoji).toBeTruthy();
      expect(s.scenes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each scene should have imagePrompt and narration", () => {
    for (const s of PREBUILT_SCRIPTS) {
      for (const scene of s.scenes) {
        expect(scene.imagePrompt.length).toBeGreaterThan(10);
        expect(scene.narration.length).toBeGreaterThan(5);
        expect(scene.duration).toBeGreaterThanOrEqual(3);
        expect(scene.duration).toBeLessThanOrEqual(15);
      }
    }
  });

  it("all script IDs should be unique", () => {
    const ids = PREBUILT_SCRIPTS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("should include nature and city categories", () => {
    const categories = new Set(PREBUILT_SCRIPTS.map(s => s.category));
    expect(categories.has("nature")).toBe(true);
    expect(categories.has("city")).toBe(true);
  });
});

// ─── findBestScript ──────────────────────────────────────────────────────────

describe("findBestScript", () => {
  it("should return a script for any description", () => {
    const result = findBestScript("رحلة في البحر");
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
  });

  it("should prefer nature scripts for ocean description", () => {
    const result = findBestScript("بحر وأمواج وشاطئ");
    expect(result.category).toBe("nature");
  });

  it("should prefer city scripts for city description", () => {
    const result = findBestScript("مدينة وأبراج وشوارع");
    expect(result.category).toBe("city");
  });

  it("should filter by category when provided", () => {
    const result = findBestScript("أي شيء", "cinematic");
    expect(result.category).toBe("cinematic");
  });

  it("should handle empty description gracefully", () => {
    const result = findBestScript("");
    expect(result).toBeDefined();
  });
});

// ─── prebuiltToVideoScript ───────────────────────────────────────────────────

describe("prebuiltToVideoScript", () => {
  it("should convert prebuilt script to video script format", () => {
    const prebuilt = PREBUILT_SCRIPTS[0];
    const script = prebuiltToVideoScript(prebuilt);

    expect(script.title).toBeTruthy();
    expect(script.language).toBeTruthy();
    expect(script.voice).toBeTruthy();
    expect(Array.isArray(script.scenes)).toBe(true);
    expect(script.scenes.length).toBe(prebuilt.scenes.length);
  });

  it("should use customTitle when provided", () => {
    const prebuilt = PREBUILT_SCRIPTS[0];
    const script = prebuiltToVideoScript(prebuilt, "عنوان مخصص");
    expect(script.title).toBe("عنوان مخصص");
  });

  it("each scene should have required video fields", () => {
    const prebuilt = PREBUILT_SCRIPTS[0];
    const script = prebuiltToVideoScript(prebuilt);

    for (const scene of script.scenes) {
      expect(scene.imagePrompt).toBeTruthy();
      expect(scene.narration).toBeTruthy();
      expect(scene.duration).toBeGreaterThan(0);
    }
  });
});

// ─── buildManualScript ───────────────────────────────────────────────────────

describe("buildManualScript", () => {
  const sampleScenes = [
    { imagePrompt: "A beautiful sunset over the ocean", narration: "غروب الشمس فوق البحر", duration: 6 },
    { imagePrompt: "Mountains covered in snow", narration: "جبال مكسوة بالثلج", duration: 5 },
  ];

  it("should build a valid script from manual input", () => {
    const script = buildManualScript("فيديو تجريبي", "ar", "ar_male", sampleScenes);

    expect(script.title).toBe("فيديو تجريبي");
    expect(script.language).toBe("ar");
    expect(script.voice).toBe("ar_male");
    expect(script.scenes.length).toBe(2);
  });

  it("should preserve scene prompts and narrations", () => {
    const script = buildManualScript("اختبار", "ar", "ar_male", sampleScenes);

    expect(script.scenes[0].imagePrompt).toBe(sampleScenes[0].imagePrompt);
    expect(script.scenes[0].narration).toBe(sampleScenes[0].narration);
    expect(script.scenes[1].imagePrompt).toBe(sampleScenes[1].imagePrompt);
  });

  it("should handle single scene", () => {
    const script = buildManualScript("مشهد واحد", "ar", "ar_male", [sampleScenes[0]]);
    expect(script.scenes.length).toBe(1);
  });

  it("should work with English language", () => {
    const script = buildManualScript("Test Video", "en", "ar_male", sampleScenes);
    expect(script.language).toBe("en");
    expect(script.title).toBe("Test Video");
  });
});
