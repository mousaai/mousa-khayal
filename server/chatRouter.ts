/**
 * chatRouter.ts — محرك المحادثة الذكية لمنصة خيال
 *
 * يفهم القصد الطبيعي للمستخدم ويوجّه الإنتاج تلقائياً:
 * - image: توليد صورة سينمائية
 * - video: إنتاج فيديو كامل
 * - script: كتابة سيناريو فقط
 * - edit_scene: تعديل مشهد في سيناريو موجود
 * - question: سؤال عام يُجاب عليه مباشرة
 * - clarify: المنصة تطرح سؤالاً توضيحياً
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateVideoScript } from "./videoProducer";
import { analyzeDomain } from "./domainEngine";
import type { Message } from "./_core/llm";

// ─── أنواع القصد ───────────────────────────────────────────────

export type IntentType =
  | "image"
  | "video"
  | "script"
  | "edit_scene"
  | "question"
  | "clarify"
  | "greeting";

export interface DetectedIntent {
  type: IntentType;
  confidence: number; // 0-1
  params: {
    description?: string;
    language?: "ar" | "en";
    sceneCount?: number;
    sceneIndex?: number; // للتعديل
    editInstruction?: string;
    question?: string;
    clarifyQuestion?: string;
  };
  domain?: string;
  suggestedReply?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image" | "video" | "script" | "thinking";
  data?: Record<string, unknown>;
  timestamp?: number;
}

// ─── كشف القصد بالذكاء الاصطناعي ──────────────────────────────

export async function detectIntent(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<DetectedIntent> {
  // كشف سريع بالكلمات المفتاحية أولاً
  const quick = quickIntentDetect(userMessage);
  if (quick.confidence >= 0.9) return quick;

  // كشف بالذكاء الاصطناعي للحالات الغامضة
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "المستخدم" : "خيال"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `أنت محلل قصد لمنصة "خيال" — منصة تحويل الأفكار إلى مرئيات سينمائية.

حلّل رسالة المستخدم وحدد القصد من بين:
- image: يريد توليد صورة سينمائية واحدة
- video: يريد إنتاج فيديو كامل (متعدد المشاهد)
- script: يريد كتابة سيناريو فقط بدون إنتاج
- edit_scene: يريد تعديل مشهد في سيناريو موجود
- question: سؤال عام عن المنصة أو موضوع ما
- greeting: تحية أو كلام عام
- clarify: الرسالة غامضة وتحتاج توضيح

أجب بـ JSON فقط بهذا الشكل:
{
  "type": "video",
  "confidence": 0.95,
  "params": {
    "description": "النص الكامل للوصف",
    "language": "ar",
    "sceneCount": 6
  },
  "domain": "educational",
  "suggestedReply": "رسالة قصيرة للمستخدم"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        ...(historyText
          ? [
              {
                role: "user" as const,
                content: `سياق المحادثة:\n${historyText}`,
              },
            ]
          : []),
        { role: "user", content: `رسالة المستخدم: "${userMessage}"` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_detection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "image",
                  "video",
                  "script",
                  "edit_scene",
                  "question",
                  "greeting",
                  "clarify",
                ],
              },
              confidence: { type: "number" },
              params: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  language: { type: "string", enum: ["ar", "en"] },
                  sceneCount: { type: "number" },
                  sceneIndex: { type: "number" },
                  editInstruction: { type: "string" },
                  question: { type: "string" },
                  clarifyQuestion: { type: "string" },
                },
                required: [],
                additionalProperties: false,
              },
              domain: { type: "string" },
              suggestedReply: { type: "string" },
            },
            required: ["type", "confidence", "params"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (content) {
      const parsed = JSON.parse(content) as DetectedIntent;
      return parsed;
    }
  } catch {
    // fallback to quick detection
  }

  return quick;
}

// ─── كشف سريع بالكلمات المفتاحية ──────────────────────────────

function quickIntentDetect(msg: string): DetectedIntent {
  const lower = msg.toLowerCase();
  const arabic = msg;

  // تحية
  const greetings = ["مرحبا", "السلام", "هلا", "أهلا", "hello", "hi", "hey", "مساء", "صباح"];
  if (greetings.some((g) => arabic.includes(g)) && msg.length < 30) {
    return {
      type: "greeting",
      confidence: 0.95,
      params: {},
      suggestedReply:
        "أهلاً! أنا خيال 🌟 — أحوّل أي فكرة إلى مرئيات سينمائية.\n\nيمكنك أن تطلب مني:\n• **فيديو** تعليمي أو قصصي أو وثائقي\n• **صورة** سينمائية لأي مشهد\n• **سيناريو** كامل لفيلمك\n\nما الذي تريد تخيّله اليوم؟",
    };
  }

  // فيديو
  const videoKeywords = [
    "فيديو",
    "فلم",
    "فيلم",
    "مقطع",
    "video",
    "movie",
    "film",
    "أنتج",
    "اصنع فيديو",
    "اعمل فيديو",
    "مشاهد",
  ];
  if (videoKeywords.some((k) => arabic.includes(k))) {
    const sceneMatch = arabic.match(/(\d+)\s*(مشهد|مشاهد|scenes?)/i);
    const langMatch = lower.includes("english") || lower.includes("إنجليزي") ? "en" : "ar";
    return {
      type: "video",
      confidence: 0.92,
      params: {
        description: msg,
        language: langMatch,
        sceneCount: sceneMatch ? parseInt(sceneMatch[1]) : 6,
      },
    };
  }

  // صورة
  const imageKeywords = [
    "صورة",
    "صوّر",
    "ارسم",
    "image",
    "picture",
    "draw",
    "generate image",
    "مشهد واحد",
  ];
  if (imageKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "image",
      confidence: 0.9,
      params: { description: msg },
    };
  }

  // سيناريو
  const scriptKeywords = [
    "سيناريو",
    "script",
    "اكتب",
    "خطة",
    "مخطط",
    "بدون إنتاج",
    "فقط الكتابة",
  ];
  if (scriptKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "script",
      confidence: 0.88,
      params: { description: msg },
    };
  }

  // تعديل
  const editKeywords = [
    "عدّل",
    "غيّر",
    "بدّل",
    "أضف",
    "احذف",
    "edit",
    "change",
    "modify",
    "المشهد",
    "scene",
  ];
  if (editKeywords.some((k) => arabic.includes(k))) {
    const sceneMatch = arabic.match(/المشهد\s*(\d+)|scene\s*(\d+)/i);
    return {
      type: "edit_scene",
      confidence: 0.85,
      params: {
        sceneIndex: sceneMatch ? parseInt(sceneMatch[1] || sceneMatch[2]) - 1 : undefined,
        editInstruction: msg,
      },
    };
  }

  // سؤال
  const questionKeywords = ["ما هو", "كيف", "لماذا", "متى", "أين", "هل", "what", "how", "why", "when", "?", "؟"];
  if (questionKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "question",
      confidence: 0.8,
      params: { question: msg },
    };
  }

  // افتراضي: فيديو إذا كان النص طويلاً
  if (msg.length > 20) {
    return {
      type: "video",
      confidence: 0.6,
      params: { description: msg, language: "ar", sceneCount: 6 },
    };
  }

  return {
    type: "clarify",
    confidence: 0.7,
    params: {
      clarifyQuestion: "ما الذي تريد إنتاجه؟ فيديو، صورة، أم سيناريو؟",
    },
  };
}

// ─── توليد رد المساعد ──────────────────────────────────────────

export async function generateAssistantReply(
  intent: DetectedIntent,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  if (intent.suggestedReply) return intent.suggestedReply;

  if (intent.type === "greeting") {
    return "أهلاً! أنا خيال 🌟 — أحوّل أي فكرة إلى مرئيات سينمائية. ما الذي تريد تخيّله اليوم؟";
  }

  if (intent.type === "clarify") {
    return intent.params.clarifyQuestion || "ما الذي تريد إنتاجه بالضبط؟";
  }

  if (intent.type === "question") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            'أنت مساعد منصة "خيال" — منصة تحويل الأفكار إلى مرئيات سينمائية. أجب بإيجاز وبالعربية.',
        },
        { role: "user", content: userMessage },
      ],
    });
    const rawReply = response.choices?.[0]?.message?.content;
    return (typeof rawReply === "string" ? rawReply : null) || "سأحاول مساعدتك. ما سؤالك بالتفصيل؟";
  }

  if (intent.type === "video") {
    const domain = intent.domain || (await analyzeDomain(userMessage).then((d) => d.primaryDomain).catch(() => "general"));
    const domainEmojis: Record<string, string> = {
      educational: "📚",
      story: "📖",
      documentary: "🎬",
      scientific: "🔬",
      historical: "🏛️",
      nature: "🌿",
      space: "🚀",
      architectural: "🏗️",
      general: "✨",
    };
    const emoji = domainEmojis[domain] || "✨";
    return `${emoji} ممتاز! اكتشفت أن هذا محتوى **${domain}**.\n\nجاري كتابة السيناريو وبدء الإنتاج... سيظهر الفيديو هنا عند الانتهاء.`;
  }

  if (intent.type === "script") {
    return "📝 جاري كتابة السيناريو الكامل... سيظهر هنا بعد لحظات.";
  }

  if (intent.type === "image") {
    return "🖼️ جاري توليد الصورة السينمائية...";
  }

  if (intent.type === "edit_scene") {
    return "✏️ جاري تعديل المشهد وفق طلبك...";
  }

  return "جاري المعالجة...";
}

// ─── Router ────────────────────────────────────────────────────

export const chatRouter = router({
  /**
   * كشف القصد من رسالة المستخدم
   */
  detectIntent: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      const intent = await detectIntent(input.message, input.history as ChatMessage[]);
      const reply = await generateAssistantReply(intent, input.message, input.history as ChatMessage[]);
      return { intent, reply };
    }),

  /**
   * رد مباشر على سؤال عام
   */
  ask: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      const messages = [
        {
          role: "system" as const,
          content:
            'أنت مساعد منصة "خيال" — منصة تحويل الأفكار إلى مرئيات سينمائية. أجب بالعربية بشكل طبيعي وودود.',
        },
        ...input.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        })),
        { role: "user" as const, content: input.message },
      ];

      const response = await invokeLLM({ messages });
      const rawMsg = response.choices?.[0]?.message?.content;
      const reply = (typeof rawMsg === "string" ? rawMsg : null) || "عذراً، لم أفهم. هل يمكنك إعادة الصياغة؟";
      return { reply };
    }),

  /**
   * توليد سيناريو من رسالة طبيعية
   */
  generateScript: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        language: z.enum(["ar", "en"]).optional().default("ar"),
        sceneCount: z.number().min(3).max(10).optional().default(6),
      })
    )
    .mutation(async ({ input }) => {
      const script = await generateVideoScript(
        input.message,
        input.language,
        input.language === "ar" ? "ar_male" : "en_male",
        input.sceneCount
      );
      return { script };
    }),
});
