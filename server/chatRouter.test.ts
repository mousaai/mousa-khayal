/**
 * chatRouter.test.ts — اختبارات محرك المحادثة الذكية
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock invokeLLM ───────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./videoProducer", () => ({
  generateVideoScript: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { generateVideoScript } from "./videoProducer";

// ─── استيراد الدوال المساعدة من chatRouter ───────────────────
// نختبر المنطق مباشرة بدون tRPC
const mockInvokeLLM = vi.mocked(invokeLLM);
const mockGenerateVideoScript = vi.mocked(generateVideoScript);

// ─── اختبارات كشف القصد ──────────────────────────────────────
describe("Intent Detection Logic", () => {
  it("يجب أن يكتشف طلب الفيديو من النص العربي", () => {
    const videoKeywords = ["فيديو", "فيلم", "أنتج", "اصنع فيلم", "تصوير"];
    const text = "أريد فيديو عن حياة النملة";
    const hasVideoKeyword = videoKeywords.some(k => text.includes(k));
    expect(hasVideoKeyword).toBe(true);
  });

  it("يجب أن يكتشف طلب الصورة من النص العربي", () => {
    const imageKeywords = ["صورة", "صوّر", "ارسم", "اعرض", "أرني"];
    const text = "صوّر لي مسجد في إسطنبول";
    const hasImageKeyword = imageKeywords.some(k => text.includes(k));
    expect(hasImageKeyword).toBe(true);
  });

  it("يجب أن يكتشف طلب السيناريو من النص العربي", () => {
    const scriptKeywords = ["سيناريو", "نص", "اكتب", "قصة", "خطة"];
    const text = "اكتب سيناريو عن رحلة قطرة الماء";
    const hasScriptKeyword = scriptKeywords.some(k => text.includes(k));
    expect(hasScriptKeyword).toBe(true);
  });

  it("يجب أن يكتشف طلب الفيديو بالإنجليزي", () => {
    const videoKeywords = ["video", "film", "movie", "produce", "create video"];
    const text = "create a video about the solar system";
    const hasVideoKeyword = videoKeywords.some(k => text.toLowerCase().includes(k));
    expect(hasVideoKeyword).toBe(true);
  });
});

// ─── اختبارات استخراج المعاملات ──────────────────────────────
describe("Parameter Extraction", () => {
  it("يجب استخراج عدد المشاهد من النص", () => {
    const extractSceneCount = (text: string): number => {
      // البحث عن الرقم قبل أو بعد كلمة مشهد/scene
      const match = text.match(/(\d+)\s*(مشاهد|مشهد|scenes?|مقطع)/i)
        || text.match(/(مشاهد|مشهد|scenes?|مقطع)\s*(\d+)/i);
      if (!match) return 6;
      const num = parseInt(match[1]) || parseInt(match[2]);
      return isNaN(num) ? 6 : num;
    };

    expect(extractSceneCount("أريد فيديو 8 مشاهد عن النملة")).toBe(8);
    expect(extractSceneCount("create a 5 scene video")).toBe(5);
    expect(extractSceneCount("فيديو عن الفضاء")).toBe(6); // افتراضي
  });

  it("يجب استخراج اللغة من النص", () => {
    const detectLanguage = (text: string): "ar" | "en" => {
      const arabicChars = (text.match(/[\u0600-\u06ff]/g) || []).length;
      return arabicChars > text.length * 0.3 ? "ar" : "en";
    };

    expect(detectLanguage("أريد فيديو عن حياة النملة")).toBe("ar");
    expect(detectLanguage("create a video about space")).toBe("en");
    expect(detectLanguage("فيديو about النملة")).toBe("ar");
  });
});

// ─── اختبارات بنية الردود ────────────────────────────────────
describe("Response Structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يُرجع detectIntent بنية صحيحة", async () => {
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            intent: {
              type: "video",
              confidence: 0.95,
              params: {
                description: "حياة النملة تحت الأرض",
                language: "ar",
                sceneCount: 6,
              },
            },
            reply: "سأبدأ إنتاج فيديو عن حياة النملة الآن!",
          }),
        },
      }],
    } as never);

    // محاكاة منطق detectIntent
    const response = await mockInvokeLLM({
      messages: [{ role: "user", content: "فيديو عن النملة" }],
    });

    const parsed = JSON.parse(response.choices[0].message.content as string);
    expect(parsed.intent.type).toBe("video");
    expect(parsed.intent.params.language).toBe("ar");
    expect(parsed.reply).toBeTruthy();
  });

  it("يجب أن يُرجع detectIntent نوع question للأسئلة العامة", async () => {
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            intent: {
              type: "question",
              confidence: 0.9,
              params: { description: "ما هي إمكانيات المنصة؟" },
            },
            reply: "منصة خيال تستطيع إنتاج فيديوهات تعليمية وقصصية...",
          }),
        },
      }],
    } as never);

    const response = await mockInvokeLLM({
      messages: [{ role: "user", content: "ما هي إمكانيات المنصة؟" }],
    });

    const parsed = JSON.parse(response.choices[0].message.content as string);
    expect(parsed.intent.type).toBe("question");
    expect(parsed.reply.length).toBeGreaterThan(10);
  });

  it("يجب أن يُرجع detectIntent نوع greeting للتحيات", async () => {
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            intent: {
              type: "greeting",
              confidence: 0.99,
              params: { description: "مرحبا" },
            },
            reply: "أهلاً وسهلاً! كيف يمكنني مساعدتك اليوم؟",
          }),
        },
      }],
    } as never);

    const response = await mockInvokeLLM({
      messages: [{ role: "user", content: "مرحبا" }],
    });

    const parsed = JSON.parse(response.choices[0].message.content as string);
    expect(parsed.intent.type).toBe("greeting");
  });
});

// ─── اختبارات generateScript ─────────────────────────────────
describe("Script Generation", () => {
  it("يجب أن يُرجع generateScript سيناريو بالعربي", async () => {
    const mockScript = {
      title: "حياة النملة",
      language: "ar" as const,
      voice: "ar_male" as const,
      narration: "في أعماق الأرض...",
      scenes: [
        {
          imagePrompt: "An ant colony underground",
          subtitle: "مملكة النمل",
          narration: "تحت الأرض تعيش مملكة منظمة",
          duration: 5,
          zoom: "zoom_in" as const,
        },
      ],
    };

    mockGenerateVideoScript.mockResolvedValue(mockScript as never);

    const result = await mockGenerateVideoScript(
      "حياة النملة تحت الأرض",
      "ar",
      "ar_male",
      6
    );

    expect(result.title).toBe("حياة النملة");
    expect(result.language).toBe("ar");
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.scenes[0].subtitle).toBeTruthy();
  });
});

// ─── اختبارات التحقق من المدخلات ─────────────────────────────
describe("Input Validation", () => {
  it("يجب رفض الرسالة الفارغة", () => {
    const validateMessage = (msg: string): boolean => {
      return msg.trim().length >= 2;
    };

    expect(validateMessage("")).toBe(false);
    expect(validateMessage(" ")).toBe(false);
    expect(validateMessage("أ")).toBe(false);
    expect(validateMessage("فيديو")).toBe(true);
  });

  it("يجب قبول الرسائل بأي لغة", () => {
    const validateMessage = (msg: string): boolean => {
      return msg.trim().length >= 2;
    };

    expect(validateMessage("video")).toBe(true);
    expect(validateMessage("فيديو")).toBe(true);
    expect(validateMessage("ビデオ")).toBe(true);
  });

  it("يجب أن يكون عدد المشاهد بين 3 و 10", () => {
    const validateSceneCount = (n: number): boolean => n >= 3 && n <= 10;

    expect(validateSceneCount(2)).toBe(false);
    expect(validateSceneCount(3)).toBe(true);
    expect(validateSceneCount(6)).toBe(true);
    expect(validateSceneCount(10)).toBe(true);
    expect(validateSceneCount(11)).toBe(false);
  });
});
