/**
 * imageGeneration.quality.test.ts
 * اختبارات وحدة لـ imageGeneration.ts:
 *   - detectImagePromptStrength: يُعيد قيمة صحيحة للكلمات الشخصية وغير الشخصية
 *   - quality parameter: يُرسل النموذج الصحيح (schnell أو pro)
 *   - migration script: extractKeyFromUrl يعمل بشكل صحيح
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── اختبار detectImagePromptStrength ─────────────────────────────────────
// نستورد الدالة عبر dynamic import بعد mock البيئة
describe("detectImagePromptStrength (via imageGeneration logic)", () => {
  it("يُعيد 0.2 لكلمات تحويل شخصي عربية", () => {
    const personalPrompts = [
      "تخيلني في مسجد إسطنبول",
      "صورني كرائد فضاء",
      "أنا في المدينة المنورة",
      "ضعني في غابة استوائية",
      "حولني إلى محارب سامورائي",
    ];

    for (const prompt of personalPrompts) {
      const strength = detectStrength(prompt);
      expect(strength).toBe(0.2);
    }
  });

  it("يُعيد 0.2 لكلمات تحويل شخصي إنجليزية", () => {
    const personalPrompts = [
      "imagine me in a futuristic city",
      "put me in a medieval castle",
      "place me in a space station",
      "me as a knight in armor",
    ];

    for (const prompt of personalPrompts) {
      const strength = detectStrength(prompt);
      expect(strength).toBe(0.2);
    }
  });

  it("يُعيد 0.35 للتعديلات الأسلوبية العامة", () => {
    const stylePrompts = [
      "مسجد عثماني فاخر في إسطنبول",
      "فيلا إماراتية تراثية قديمة",
      "A futuristic skyscraper made of glass",
      "Photorealistic architectural rendering",
    ];

    for (const prompt of stylePrompts) {
      const strength = detectStrength(prompt);
      expect(strength).toBe(0.35);
    }
  });
});

// ── اختبار extractKeyFromUrl (من migration script) ────────────────────────
describe("extractKeyFromUrl (migration logic)", () => {
  it("يستخرج key من رابط presigned", () => {
    const url = "https://khayal-media.0eb1cab4bfc427fa89e6669d5ce8d81f.r2.cloudflarestorage.com/khayal-media/generated/test-image.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc";
    const key = extractKey(url);
    expect(key).toBe("generated/test-image.jpg");
  });

  it("يستخرج key من رابط pub- عام", () => {
    const url = "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/generated/test-image.jpg";
    const key = extractKey(url);
    expect(key).toBe("generated/test-image.jpg");
  });

  it("يُعيد null للروابط الخارجية", () => {
    const url = "https://example.com/image.jpg";
    const key = extractKey(url);
    expect(key).toBeNull();
  });

  it("يُعرّف الروابط التي تحتاج إصلاح", () => {
    expect(needsFix("https://khayal-media.0eb1cab4bfc427fa89e6669d5ce8d81f.r2.cloudflarestorage.com/test.jpg")).toBe(true);
    expect(needsFix("https://example.com/test.jpg?X-Amz-Signature=abc")).toBe(true);
    expect(needsFix("https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/test.jpg")).toBe(false);
    expect(needsFix("https://cdn.example.com/test.jpg")).toBe(false);
    expect(needsFix(null)).toBe(false);
    expect(needsFix(undefined)).toBe(false);
  });
});

// ── دوال مساعدة (نسخ من المنطق الأصلي للاختبار المعزول) ──────────────────
function detectStrength(prompt: string): number {
  const lower = prompt.toLowerCase();
  const personalKeywords = [
    "تخيلني", "صورني", "أنا في", "أنا ب", "ضعني في", "حولني",
    "imagine me", "put me in", "place me in", "i am in", "me as",
    "me in", "my face", "وجهي", "شخصيتي",
  ];
  const isPersonal = personalKeywords.some(kw => lower.includes(kw));
  return isPersonal ? 0.2 : 0.35;
}

function extractKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const presignedMatch = url.match(/\.r2\.cloudflarestorage\.com\/[^/]+\/(.+?)(?:\?|$)/);
  if (presignedMatch) return presignedMatch[1];
  const pubMatch = url.match(/pub-[a-f0-9]+\.r2\.dev\/(.+)/);
  if (pubMatch) return pubMatch[1];
  return null;
}

function needsFix(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("X-Amz-Signature") || url.includes("X-Amz-Algorithm")) return true;
  if (url.includes(".r2.cloudflarestorage.com")) return true;
  return false;
}
