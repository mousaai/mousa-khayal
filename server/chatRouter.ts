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
  | "greeting"
  | "immersive"; // وضع "أنا هناك" — جولة غمر 360°

// وضع الإنتاج المُستنتج تلقائياً
export type OutputMode = "images" | "fast" | "pro" | "immersive";

export interface DetectedIntent {
  type: IntentType;
  confidence: number; // 0-1
  outputMode?: OutputMode; // الوضع المُستنتج تلقائياً
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

  const hasImage = conversationHistory.slice(-2).some(m => m.data?.attachedImageUrl);
  const hasBlueprint = conversationHistory.slice(-2).some(m => m.data?.attachedDocumentUrl);

  const systemPrompt = `أنت محلل قصد خبير لمنصة "خيال" — منصة تحويل أي فكرة إلى مرئيات سينمائية بلا حدود.

مبدأ أساسي: الخيال بلا حدود — أي وصف يُكتب يستحق إنتاجاً بصرياً. لا تطلب توضيحاً إلا إذا كان الطلب حرفياً كلمة واحدة لا معنى لها.

حلّل رسالة المستخدم وحدد:
1. القصد (type):
   - image: لحظة بصرية واحدة ثابتة، وصف قصير، تحويل شخصي/زمني بصورة مرفقة
   - video: فيه تسلسل زمني أو قصة أو مراحل أو حدث متطور أو "من...إلى" أو "ثم" أو "فجأة" أو "يحكي" أو "ينمو" أو "رحلة"
   - immersive: المستخدم يريد أن يكون داخل البيئة (أنا في / داخل / تخيل نفسي / لو كنت)
   - script: يريد سيناريو فقط بدون إنتاج
   - edit_scene: يريد تعديل مشهد موجود
   - question: سؤال عام
   - greeting: تحية
   - clarify: غامض جداً (نادراً جداً)

2. وضع الإنتاج (outputMode):
   - "images": صورة واحدة أو لحظة ثابتة أو تحويل شخصي (تخيلني شاباً / طفلاً)
   - "fast": فيديو قصير أو قصة بسيطة أو حدث واحد
   - "pro": تسلسل زمني طويل / مشروع معماري / وثائقي / تعليمي / "من الصفر إلى" / "كيف ينمو" / "رحلة الحديد"
   - "immersive": وضع "أنا هناك" — جولة 360° داخل بيئة

${hasImage ? 'ملاحظة: المستخدم رفع صورة. إذا طلب تحويلاً (تخيلني / بعد X سنة / كيف سيبدو) فهذا image-to-image.' : ''}
${hasBlueprint ? 'ملاحظة: المستخدم رفع مخططاً معمارياً. إذا طلب تصوراً (كيف سيبدو / بعد التشطيب) فهذا blueprint-to-visual.' : ''}

أمثلة شاملة:
- "نملة تطير" → image, images (لحظة خيالية ثابتة)
- "تخيل أنا أركب النملة كالخيل" → image, images (لحظة خيالية)
- "أنا أطير وتسقط الطيور من الصدمة" → video, fast (قصة بها حدث ونهاية)
- "الحديد يحكي دورة في المبنى" → video, pro (رحلة تسلسلية وثائقية)
- "أرني كيف المبنى ينمو من الصفر للتشطيب" → video, pro (مراحل تسلسلية)
- "صورة شارع + تخيل شكله بعد 50 سنة" → image, images (image-to-image تحويل زمني)
- "صورتي + تخيلني شاباً" → image, images (image-to-image تحويل شخصي)
- "مخطط بيتي + شكله بعد التشطيب" → image, pro (blueprint-to-visual)
- "أنا في جحر نملة" → immersive, immersive
- "تخيل نفسي داخل صدفة" → immersive, immersive
- "لو كنت ذرة كربون" → immersive, immersive
- "فيلم تسويقي عن المشروع" → video, pro
- "فيلم تعليمي عن الفيزياء" → video, pro

أجب بـ JSON فقط بهذا الشكل:
{
  "type": "video",
  "outputMode": "pro",
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
                  "immersive",
                  "script",
                  "edit_scene",
                  "question",
                  "greeting",
                  "clarify",
                ],
              },
              outputMode: {
                type: "string",
                enum: ["images", "fast", "pro", "immersive"],
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
            required: ["type", "confidence", "params", "outputMode"],
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

  // ── وضع "أنا هناك" — الغمر الكامل ──
  const immersiveKeywords = [
    "أنا في ", "أنا داخل", "أنا بداخل", "أتخيل نفسي", "تخيل نفسي",
    "لو كنت", "لو كنت في", "داخل ", "بداخل ", "من داخل",
    "أشعر أنني في", "كأنني في", "أريد أن أكون في",
    "i am inside", "imagine myself in", "if i were",
  ];
  if (immersiveKeywords.some((k) => arabic.toLowerCase().includes(k.toLowerCase()))) {
    return {
      type: "immersive",
      outputMode: "immersive",
      confidence: 0.95,
      params: { description: msg },
      suggestedReply: "سأضعك داخل هذه البيئة من 6 زوايا مختلفة...",
    };
  }

  // ── كشف التسلسل الزمني والقصة المتطورة → فيديو ──
  // "الحديد يحكي" / "مبنى ينمو" / "أنا أطير وتسقط" / "من الصفر للتشطيب"
  const sequencePatterns = [
    /ينمو|يتطور|يتحول|يتغير|ينهار|يُبنى|يُشيَّد/,
    /من الصفر|من البداية|من الأساس/,
    /إلى التشطيب|إلى النهاية|إلى الاكتمال/,
    /يحكي|يروي|يسرد|قصة|رحلة/,
    /مراحل|خطوات|دورة حياة/,
    /ثم.{0,30}(يسقط|يتحول|يتغير|يصل)/,
    /فجأة.{0,30}(يسقط|يتحول|يصطدم)/,
    /وبعدين|وبعد ذلك|ثم بعد/,
    /من المنجم|من الأرض|من الطبيعة/,
    /time.?lapse|timelapse|time lapse/i,
    /before.{0,10}after|قبل.{0,10}بعد/i,
  ];
  const hasSequence = sequencePatterns.some(p => p.test(arabic));

  // كشف الفيديو الصريح
  const videoKeywords = ["فيديو", "فلم", "فيلم", "مقطع", "video", "movie", "film", "أنتج", "اصنع فيديو", "اعمل فيديو", "مشاهد"];
  const hasVideoKeyword = videoKeywords.some((k) => arabic.includes(k));

  // محتوى pro: مشاريع كبيرة وتسلسلية
  const isProContent = [
    "مشروع", "معماري", "وثائقي", "تسويقي", "تعليمي", "علمي", "صحي", "تاريخي",
    "documentary", "marketing", "educational", "scientific",
    "من الصفر", "دورة حياة", "مراحل البناء", "رحلة",
  ].some(k => arabic.includes(k));

  if (hasVideoKeyword || hasSequence) {
    const sceneMatch = arabic.match(/(\d+)\s*(مشهد|مشاهد|scenes?)/i);
    const langMatch = lower.includes("english") || lower.includes("إنجليزي") ? "en" : "ar";
    return {
      type: "video",
      outputMode: (isProContent || hasSequence) ? "pro" : "fast",
      confidence: hasVideoKeyword ? 0.92 : 0.85,
      params: {
        description: msg,
        language: langMatch,
        sceneCount: sceneMatch ? parseInt(sceneMatch[1]) : 6,
      },
    };
  }

  // ── كشف تحويل الهوية الشخصية (image-to-image) ──
  // "تخيلني شاباً" / "تخيلني طفلاً" / "حوّلني" / "كيف أكون بعد 30 سنة"
  const personalTransformPatterns = [
    /تخيلني|تخيل\s*لي|تخيل\s*نفسي/,
    /حوّلني|حولني|اجعلني/,
    /كيف\s*(أكون|سأكون|أبدو|سأبدو)/,
    /لو\s*كنت\s*(شاب|طفل|صغير|كبير|رياضي|فنان|ملك)/,
    /بعد\s*\d+\s*سن/,
    /imagine me|transform me|make me look/i,
  ];
  if (personalTransformPatterns.some(p => p.test(arabic))) {
    return {
      type: "image",
      outputMode: "images",
      confidence: 0.9,
      params: { description: msg },
      suggestedReply: "🪄 سأحوّل الصورة وفق طلبك...",
    };
  }

  // ── صورة صريحة ──
  const imageKeywords = ["صورة", "صوّر", "ارسم", "image", "picture", "draw", "generate image", "مشهد واحد"];
  if (imageKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "image",
      outputMode: "images",
      confidence: 0.9,
      params: { description: msg },
    };
  }

  // ── سيناريو ──
  const scriptKeywords = ["سيناريو", "script", "اكتب", "بدون إنتاج", "فقط الكتابة"];
  if (scriptKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "script",
      outputMode: "fast",
      confidence: 0.88,
      params: { description: msg },
    };
  }

  // ── تعديل ──
  const editKeywords = ["عدّل", "غيّر", "بدّل", "أضف", "احذف", "edit", "change", "modify", "المشهد", "scene"];
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

  // ── سؤال — لكن "كيف" + وصف بصري ليس سؤالاً! ──
  // "كيف شكله بعد 50 سنة" → صورة، ليس سؤالاً
  const visualHowPatterns = [
    /كيف\s*(شكل|يبدو|سيبدو|يكون|سيكون)/,
    /how\s*(does|will|would|it look)/i,
  ];
  if (visualHowPatterns.some(p => p.test(arabic))) {
    // هذا طلب بصري وليس سؤالاً
    return {
      type: "image",
      outputMode: isProContent ? "pro" : "images",
      confidence: 0.82,
      params: { description: msg },
    };
  }

  const questionKeywords = ["ما هو", "لماذا", "متى", "أين", "هل", "what", "how", "why", "when", "?", "؟"];
  if (questionKeywords.some((k) => arabic.includes(k))) {
    return {
      type: "question",
      confidence: 0.8,
      params: { question: msg },
    };
  }

  // ── طلبات التخيل والخيال الإبداعي ──
  const imagineKeywords = ["تخيل", "تصوّر", "imagine", "picture this", "envision"];
  if (imagineKeywords.some(k => arabic.includes(k))) {
    return {
      type: "image",
      outputMode: "images",
      confidence: 0.82,
      params: { description: msg },
    };
  }

  // ── افتراضي ذكي: أي وصف = إنتاج فوري ──
  if (msg.length > 0) {
    if (msg.length <= 30) {
      return {
        type: "image",
        outputMode: "images",
        confidence: 0.7,
        params: { description: msg },
      };
    }
    return {
      type: "video",
      outputMode: isProContent ? "pro" : "fast",
      confidence: 0.65,
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
   * محادثة ذكية مع وعي بحالة الإنتاج
   * تُستخدم أثناء الإنتاج وبعده للإجابة على الأسئلة وتنفيذ التعديلات
   */
  chatWithContext: publicProcedure
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
        // سياق الإنتاج الحالي
        productionContext: z
          .object({
            status: z.enum(["idle", "producing", "done", "failed"]).optional(),
            progress: z.number().optional(),
            currentStep: z.string().optional(),
            jobId: z.string().optional(),
            outputType: z.enum(["video", "image", "script"]).optional(),
            description: z.string().optional(),
            sceneCount: z.number().optional(),
            estimatedMinutes: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const ctx = input.productionContext;
      const msg = input.message.toLowerCase();

      // ─── ردود سريعة لأسئلة الوقت والحالة ───
      const timeKeywords = ["كم يستغرق", "كم الوقت", "متى ينتهي", "كم باقي", "وقت", "how long", "when"];
      const statusKeywords = ["ما المرحلة", "وين وصل", "كم نسبة", "كم بالمية", "progress", "status"];
      const stopKeywords = ["أوقف", "إلغاء", "stop", "cancel", "وقف"];
      const editKeywords = ["عدّل", "غيّر", "أضف", "احذف", "بدّل", "edit", "change", "modify"];

      if (ctx?.status === "producing") {
        if (timeKeywords.some((k) => msg.includes(k))) {
          const remaining = ctx.estimatedMinutes
            ? Math.max(1, Math.round(ctx.estimatedMinutes * (1 - (ctx.progress || 0) / 100)))
            : null;
          const reply = remaining
            ? `⏱️ الإنتاج في مرحلة **${ctx.currentStep || "المعالجة"}** — اكتمل **${ctx.progress || 0}%**\n\nالوقت المتبقي تقريباً: **${remaining} دقيقة${remaining === 1 ? "" : ""}`
            : `⏱️ الإنتاج جارٍ في مرحلة **${ctx.currentStep || "المعالجة"}** — اكتمل **${ctx.progress || 0}%**\n\nسيظهر الفيديو هنا عند الانتهاء.`;
          return { reply, action: null };
        }

        if (statusKeywords.some((k) => msg.includes(k))) {
          const reply = `📊 الحالة الآن:\n• المرحلة: **${ctx.currentStep || "جاري الإنتاج"}**\n• التقدم: **${ctx.progress || 0}%**\n• نوع الإخراج: **${ctx.outputType === "video" ? "فيديو" : ctx.outputType === "image" ? "صورة" : "سيناريو"}**`;
          return { reply, action: null };
        }

        if (stopKeywords.some((k) => msg.includes(k))) {
          return {
            reply: "⚠️ لا يمكن إيقاف الإنتاج بعد بدئه — لكن يمكنك بدء إنتاج جديد بعد الانتهاء. هل تريد تعديل الوصف للمرة القادمة؟",
            action: null,
          };
        }
      }

      if (ctx?.status === "done") {
        if (editKeywords.some((k) => msg.includes(k))) {
          // تحليل طلب التعديل
          const sceneMatch = input.message.match(/المشهد\s*(\d+)|scene\s*(\d+)/i);
          const sceneIndex = sceneMatch ? parseInt(sceneMatch[1] || sceneMatch[2]) - 1 : null;

          return {
            reply: sceneIndex !== null
              ? `✏️ فهمت — تريد تعديل **المشهد ${sceneIndex + 1}**. سأُعيد إنتاج هذا المشهد بالتعديلات المطلوبة.`
              : `✏️ فهمت طلب التعديل. هل تريد:\n1. إعادة إنتاج الفيديو كاملاً بالتعديلات\n2. تعديل مشهد محدد فقط\n\nأخبرني برقم المشهد أو قل "أعد الإنتاج كاملاً".`,
            action: sceneIndex !== null ? { type: "edit_scene", sceneIndex } : { type: "ask_edit_scope" },
          };
        }

        if (["أعد", "redo", "restart", "من جديد", "مرة ثانية"].some((k) => msg.includes(k))) {
          return {
            reply: "🔄 حسناً! سأُعيد الإنتاج. هل تريد نفس الوصف أم تعديله؟",
            action: { type: "restart_production", description: ctx.description },
          };
        }
      }

      // ─── رد ذكي عام بالسياق الكامل ───
      const contextSummary = ctx
        ? `
سياق الإنتاج الحالي:
- الحالة: ${ctx.status === "producing" ? "جاري الإنتاج" : ctx.status === "done" ? "مكتمل" : ctx.status === "failed" ? "فشل" : "لا يوجد إنتاج"}
- التقدم: ${ctx.progress || 0}%
- المرحلة: ${ctx.currentStep || "غير محدد"}
- النوع: ${ctx.outputType || "غير محدد"}
- الوصف: ${ctx.description || "غير محدد"}
`
        : "";

      const historyForLLM = input.history.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت مساعد منصة "خيال" الذكي — منصة تحويل الأفكار إلى مرئيات سينمائية.

أنت تتحدث مع المستخدم أثناء أو بعد إنتاج محتوى. كن ودوداً، موجزاً، ومفيداً.
${contextSummary}
إذا سأل عن الوقت أو التقدم، أجب بناءً على السياق. إذا طلب تعديلاً، اسأل عن التفاصيل.
أجب بالعربية دائماً ما لم يكتب بالإنجليزية.`,
          },
          ...historyForLLM,
          { role: "user" as const, content: input.message },
        ],
      });

      const rawMsg = response.choices?.[0]?.message?.content;
      const reply = (typeof rawMsg === "string" ? rawMsg : null) || "كيف يمكنني مساعدتك؟";
      return { reply, action: null };
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
