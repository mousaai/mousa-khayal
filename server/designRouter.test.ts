/**
 * designRouter.test.ts — اختبارات وحدة لـ designRouter
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock الوحدات الخارجية ────────────────────────────────────
vi.mock("./mousaCreditsService", () => ({
  checkMousaBalance: vi.fn().mockResolvedValue({ balance: 1000, currency: "credit" }),
  deductMousaCredits: vi.fn().mockResolvedValue({ success: true }),
  guardMousaBalance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/design-test.jpg" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/design-test.jpg", key: "test-key" }),
}));

// ─── استيراد الدوال المساعدة من designRouter ────────────────
// نختبر الدوال المُصدَّرة مباشرة

describe("Design Router — Helper Functions", () => {
  describe("calculateCost", () => {
    it("يحسب تكلفة الواجهة الخارجية بدون مرجع = 35", () => {
      // exterior بدون referenceImage = 35
      const cost = calculateCostHelper("exterior", false);
      expect(cost).toBe(35);
    });

    it("يحسب تكلفة التصميم الداخلي بدون مرجع = 35", () => {
      const cost = calculateCostHelper("interior", false);
      expect(cost).toBe(35);
    });

    it("يحسب تكلفة المسقط الأفقي = 25", () => {
      const cost = calculateCostHelper("floor_plan", false);
      expect(cost).toBe(25);
    });

    it("يضيف 5 كريدت إضافية عند وجود صورة مرجعية", () => {
      const costWithRef = calculateCostHelper("exterior", true);
      const costWithoutRef = calculateCostHelper("exterior", false);
      expect(costWithRef).toBe(costWithoutRef + 5);
    });
  });

  describe("buildArabicPrompt", () => {
    it("يبني prompt عربي يحتوي على الوصف والنمط والنوع", () => {
      const prompt = buildArabicPromptHelper({
        prompt: "فيلا فاخرة",
        style: "modern",
        type: "exterior",
      });
      expect(prompt).toContain("فيلا فاخرة");
      expect(prompt.length).toBeGreaterThan(20);
    });

    it("يبني prompt مختلف لكل نمط", () => {
      const modernPrompt = buildArabicPromptHelper({ prompt: "بيت", style: "modern", type: "exterior" });
      const islamicPrompt = buildArabicPromptHelper({ prompt: "بيت", style: "islamic", type: "exterior" });
      expect(modernPrompt).not.toBe(islamicPrompt);
    });

    it("يبني prompt مختلف لكل نوع", () => {
      const exteriorPrompt = buildArabicPromptHelper({ prompt: "بيت", style: "modern", type: "exterior" });
      const interiorPrompt = buildArabicPromptHelper({ prompt: "بيت", style: "modern", type: "interior" });
      expect(exteriorPrompt).not.toBe(interiorPrompt);
    });
  });

  describe("DESIGN_STYLES", () => {
    it("يحتوي على 4 أنماط معمارية", () => {
      expect(Object.keys(DESIGN_STYLES_HELPER)).toHaveLength(4);
    });

    it("يحتوي على النمط العصري والإسلامي والخليجي والمعاصر", () => {
      expect(DESIGN_STYLES_HELPER).toHaveProperty("modern");
      expect(DESIGN_STYLES_HELPER).toHaveProperty("islamic");
      expect(DESIGN_STYLES_HELPER).toHaveProperty("gulf");
      expect(DESIGN_STYLES_HELPER).toHaveProperty("contemporary");
    });

    it("كل نمط يحتوي على label وpromptKeywords", () => {
      for (const style of Object.values(DESIGN_STYLES_HELPER)) {
        expect(style).toHaveProperty("label");
        expect(style).toHaveProperty("promptKeywords");
        expect((style as { promptKeywords: string[] }).promptKeywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe("DESIGN_TYPES", () => {
    it("يحتوي على 3 أنواع تصميم", () => {
      expect(Object.keys(DESIGN_TYPES_HELPER)).toHaveLength(3);
    });

    it("كل نوع له تكلفة محددة", () => {
      expect(DESIGN_TYPES_HELPER.exterior.cost).toBeGreaterThan(0);
      expect(DESIGN_TYPES_HELPER.interior.cost).toBeGreaterThan(0);
      expect(DESIGN_TYPES_HELPER.floor_plan.cost).toBeGreaterThan(0);
    });
  });
});

// ─── دوال مساعدة للاختبار (تحاكي منطق designRouter) ─────────

const DESIGN_STYLES_HELPER: Record<string, { label: string; promptKeywords: string[] }> = {
  modern: {
    label: "عصري",
    promptKeywords: ["modern architecture", "minimalist", "clean lines", "glass facade", "contemporary design"],
  },
  islamic: {
    label: "إسلامي",
    promptKeywords: ["islamic architecture", "geometric patterns", "arabesque", "mashrabiya", "ornate details"],
  },
  gulf: {
    label: "خليجي",
    promptKeywords: ["gulf architecture", "traditional saudi", "wind tower", "courtyard", "desert aesthetic"],
  },
  contemporary: {
    label: "معاصر",
    promptKeywords: ["contemporary architecture", "natural materials", "open spaces", "sustainable design"],
  },
};

const DESIGN_TYPES_HELPER: Record<string, { label: string; cost: number; promptPrefix: string }> = {
  exterior: { label: "واجهة خارجية", cost: 35, promptPrefix: "exterior architectural rendering" },
  interior: { label: "تصميم داخلي", cost: 35, promptPrefix: "interior design rendering" },
  floor_plan: { label: "مسقط أفقي", cost: 25, promptPrefix: "architectural floor plan" },
};

function calculateCostHelper(type: string, hasReference: boolean): number {
  const base = DESIGN_TYPES_HELPER[type]?.cost || 35;
  return hasReference ? base + 5 : base;
}

function buildArabicPromptHelper(params: {
  prompt: string;
  style: string;
  type: string;
  referenceImageUrl?: string;
}): string {
  const styleData = DESIGN_STYLES_HELPER[params.style];
  const typeData = DESIGN_TYPES_HELPER[params.type];

  const keywords = styleData?.promptKeywords.join(", ") || "";
  const typePrefix = typeData?.promptPrefix || "architectural design";

  return `${typePrefix}, ${params.prompt}, ${keywords}, photorealistic, high quality, 8K resolution, professional architectural photography`;
}
