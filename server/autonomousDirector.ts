/**
 * autonomousDirector.ts — المخرج الذاتي لـ خيال
 * ═══════════════════════════════════════════════════════════════
 *
 * مثل Manus تماماً: يحلل → يخطط → يقرر → يُنفّذ بلا تدخل بشري.
 *
 * المبدأ الجوهري:
 *   المستخدم يصف فكرة. خيال تفكر وتقرر كل شيء:
 *   - نوع الإنتاج (صورة / فيديو سريع / فيديو احترافي / غامر)
 *   - نوع الفيلم (سينمائي / وثائقي / تعليمي / أكشن / دراما...)
 *   - الصوت المناسب (ذكر / أنثى / عربي / إنجليزي / راوٍ وثائقي)
 *   - عدد المشاهد المثالي (3-8)
 *   - اللغة (من الوصف)
 *   - الأسلوب البصري (ماكرو / جوي / داخلي / سينمائي...)
 *   - نسبة الأبعاد (16:9 / 9:16 / 1:1)
 *   - إيقاع الحركة (بطيء / متوسط / سريع)
 *
 * خطوات التفكير (تُبثّ للواجهة في الوقت الحقيقي):
 *   1. أفهم الفكرة
 *   2. أحدد المجال والجمهور
 *   3. أختار نوع الفيلم
 *   4. أكتب خطة الإنتاج
 *   5. أختار الأدوات
 *   6. أبدأ الإنتاج
 */

import { invokeLLM } from "./_core/llm";
import { detectFilmGenre, getGenreDNA, type FilmGenre } from "./filmGenreEngine";
import { selectVoiceForDomain, type ElevenLabsVoiceId } from "./elevenLabsEngine";
import type { VoiceId } from "./videoProducer";

// ══════════════════════════════════════════════════════════════
// أنواع القرارات
// ══════════════════════════════════════════════════════════════

export type ProductionType = "image" | "fast_video" | "pro_video" | "immersive";
export type AspectRatioDecision = "16:9" | "9:16" | "1:1";
export type PaceDecision = "slow" | "medium" | "fast";

export interface DirectorDecision {
  // ما فهمته خيال
  understanding: string;          // "أفهم أنك تريد..."
  language: "ar" | "en";
  // قرارات الإنتاج
  productionType: ProductionType;
  genre: FilmGenre;
  genreLabel: string;
  genreEmoji: string;
  voice: VoiceId;
  sceneCount: number;
  aspectRatio: AspectRatioDecision;
  pace: PaceDecision;
  // خطة الفيلم
  filmTitle: string;
  filmSynopsis: string;
  // تفسير القرارات (لعرضها في الواجهة)
  reasoning: {
    productionType: string;
    genre: string;
    voice: string;
    sceneCount: string;
  };
  // خطوات التفكير (تُبثّ للواجهة)
  thinkingSteps: ThinkingStep[];
}

export interface ThinkingStep {
  id: string;
  icon: string;
  label: string;
  detail: string;
  status: "thinking" | "done" | "pending";
  timestamp: number;
}

// ══════════════════════════════════════════════════════════════
// كشف سريع بالكلمات المفتاحية (بدون LLM — أسرع)
// ══════════════════════════════════════════════════════════════

function quickAnalyze(description: string): Partial<DirectorDecision> {
  const text = description.toLowerCase();

  // اللغة
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const language: "ar" | "en" = arabicChars > text.length * 0.2 ? "ar" : "en";

  // نوع الإنتاج
  let productionType: ProductionType = "fast_video";
  if (
    text.includes("صورة") || text.includes("image") || text.includes("photo") ||
    text.includes("لحظة") || text.includes("portrait") || text.includes("رسم")
  ) {
    productionType = "image";
  } else if (
    text.includes("أنا في") || text.includes("داخل") || text.includes("inside") ||
    text.includes("immersive") || text.includes("360") || text.includes("تخيل نفسي")
  ) {
    productionType = "immersive";
  } else if (
    text.includes("وثائقي") || text.includes("documentary") ||
    text.includes("تاريخ") || text.includes("history") ||
    text.includes("كيف ينمو") || text.includes("رحلة") || text.includes("journey") ||
    text.includes("من الصفر") || text.includes("مراحل") || text.includes("stages") ||
    text.length > 120
  ) {
    productionType = "pro_video";
  } else {
    productionType = "fast_video";
  }

  // نسبة الأبعاد
  let aspectRatio: AspectRatioDecision = "16:9";
  if (
    text.includes("ريلز") || text.includes("reels") || text.includes("9:16") ||
    text.includes("انستغرام") || text.includes("instagram") || text.includes("تيك توك") ||
    text.includes("tiktok") || text.includes("شاشة الموبايل")
  ) {
    aspectRatio = "9:16";
  } else if (
    text.includes("مربع") || text.includes("square") || text.includes("1:1")
  ) {
    aspectRatio = "1:1";
  }

  // الإيقاع
  let pace: PaceDecision = "medium";
  if (
    text.includes("هادئ") || text.includes("بطيء") || text.includes("slow") ||
    text.includes("تأملي") || text.includes("peaceful") || text.includes("serene")
  ) {
    pace = "slow";
  } else if (
    text.includes("سريع") || text.includes("fast") || text.includes("أكشن") ||
    text.includes("action") || text.includes("مثير") || text.includes("exciting")
  ) {
    pace = "fast";
  }

  return { language, productionType, aspectRatio, pace };
}

// ══════════════════════════════════════════════════════════════
// المخرج الذاتي الرئيسي
// ══════════════════════════════════════════════════════════════

export async function directAutonomously(
  description: string,
  onStep?: (step: ThinkingStep) => void
): Promise<DirectorDecision> {
  const steps: ThinkingStep[] = [];
  const addStep = (step: Omit<ThinkingStep, "timestamp" | "status">, status: ThinkingStep["status"] = "done") => {
    const s: ThinkingStep = { ...step, status, timestamp: Date.now() };
    steps.push(s);
    onStep?.(s);
    return s;
  };

  // ── الخطوة 1: فهم الفكرة ──────────────────────────────────
  addStep({ id: "understand", icon: "🧠", label: "أفهم الفكرة", detail: `"${description.slice(0, 60)}${description.length > 60 ? '...' : ''}"` }, "thinking");

  // تحليل سريع بدون LLM
  const quick = quickAnalyze(description);
  const language = quick.language ?? "ar";

  // ── الخطوة 2: تحديد المجال ────────────────────────────────
  addStep({ id: "domain", icon: "🔍", label: "أحدد المجال والجمهور", detail: "أحلل نوع المحتوى..." }, "thinking");

  // كشف النوع السينمائي
  const genre = detectFilmGenre(description, false);
  const dna = getGenreDNA(genre);

  addStep({ id: "domain", icon: "🔍", label: "حددت المجال", detail: `${dna.emoji} ${dna.labelAr} — ${dna.narratorTone}` });

  // ── الخطوة 3: قرار نوع الإنتاج ───────────────────────────
  addStep({ id: "production_type", icon: "🎬", label: "أقرر نوع الإنتاج", detail: "أحلل عمق الفكرة..." }, "thinking");

  let productionType = quick.productionType ?? "fast_video";
  let productionTypeReason = "";

  // تحسين قرار نوع الإنتاج بناءً على النوع السينمائي
  if (genre === "documentary" || genre === "educational" || genre === "historical") {
    productionType = "pro_video";
    productionTypeReason = `النوع ${dna.labelAr} يستحق إنتاجاً احترافياً بمشاهد متعددة`;
  } else if (genre === "marketing") {
    productionType = description.includes("9:16") || description.includes("ريلز") ? "fast_video" : "pro_video";
    productionTypeReason = "المحتوى التسويقي يحتاج إنتاجاً احترافياً";
  } else if (productionType === "image") {
    productionTypeReason = "الوصف يطلب لحظة بصرية واحدة";
  } else if (productionType === "fast_video") {
    productionTypeReason = "فكرة واضحة ومحددة — فيديو سريع مثالي";
  } else if (productionType === "pro_video") {
    productionTypeReason = "الفكرة غنية وتستحق إنتاجاً احترافياً";
  }

  const productionLabels: Record<ProductionType, string> = {
    image: "🎨 صورة سينمائية",
    fast_video: "⚡ فيديو سريع",
    pro_video: "✨ فيديو احترافي",
    immersive: "🌍 جولة غامرة",
  };
  addStep({ id: "production_type", icon: "🎬", label: "قررت نوع الإنتاج", detail: productionLabels[productionType] });

  // ── الخطوة 4: اختيار الصوت ────────────────────────────────
  addStep({ id: "voice", icon: "🎙️", label: "أختار الصوت المناسب", detail: "أحلل نبرة المحتوى..." }, "thinking");

  const voiceId = selectVoiceForDomain(language, genre) as VoiceId;
  const voiceLabels: Record<string, string> = {
    ar_male: "صوت ذكر عربي",
    ar_female: "صوت أنثى عربي",
    en_male: "صوت ذكر إنجليزي",
    en_female: "صوت أنثى إنجليزي",
    ar_male_formal: "صوت رسمي عربي",
    ar_male_energetic: "صوت حيوي عربي",
    ar_male_calm: "صوت هادئ عربي",
    ar_female_formal: "صوت أنثى رسمي",
    ar_female_emotional: "صوت أنثى عاطفي",
    ar_female_marketing: "صوت أنثى تسويقي",
    en_male_formal: "صوت ذكر رسمي",
    en_male_energetic: "صوت ذكر حيوي",
    en_female_formal: "صوت أنثى رسمي",
    en_female_emotional: "صوت أنثى عاطفي",
    documentary_narrator: "راوٍ وثائقي",
  };
  const voiceLabel = voiceLabels[voiceId] ?? voiceId;
  addStep({ id: "voice", icon: "🎙️", label: "اخترت الصوت", detail: `${voiceLabel} — يناسب ${dna.labelAr}` });

  // ── الخطوة 5: تحديد عدد المشاهد ──────────────────────────
  addStep({ id: "scenes", icon: "🎞️", label: "أحدد عدد المشاهد", detail: "أحسب الكثافة المثالية..." }, "thinking");

  let sceneCount = 5;
  let sceneReason = "";

  if (productionType === "image") {
    sceneCount = 1;
    sceneReason = "صورة واحدة تكفي";
  } else if (productionType === "fast_video") {
    sceneCount = description.length > 80 ? 5 : 4;
    sceneReason = `${sceneCount} مشاهد — مثالي للفيديو السريع`;
  } else if (productionType === "pro_video") {
    if (genre === "documentary" || genre === "educational") sceneCount = 7;
    else if (genre === "historical") sceneCount = 6;
    else if (genre === "marketing") sceneCount = 5;
    else sceneCount = 6;
    sceneReason = `${sceneCount} مشاهد — يغطي الفكرة بعمق`;
  } else if (productionType === "immersive") {
    sceneCount = 4;
    sceneReason = "4 زوايا غامرة";
  }

  addStep({ id: "scenes", icon: "🎞️", label: "حددت عدد المشاهد", detail: sceneReason });

  // ── الخطوة 6: كتابة خطة الفيلم بالذكاء ──────────────────
  addStep({ id: "plan", icon: "📋", label: "أكتب خطة الفيلم", detail: "أصمم العنوان والملخص..." }, "thinking");

  let filmTitle = description.slice(0, 50);
  let filmSynopsis = description;
  let understanding = language === "ar"
    ? `أفهم أنك تريد ${productionLabels[productionType]} عن: "${description.slice(0, 80)}"`
    : `I understand you want a ${productionLabels[productionType]} about: "${description.slice(0, 80)}"`;

  try {
    const planResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت مخرج سينمائي ذاتي لمنصة "خيال". مهمتك: تحليل الوصف وكتابة خطة الفيلم.
أجب بـ JSON فقط بدون أي نص آخر.`,
        },
        {
          role: "user",
          content: `الوصف: "${description}"
النوع السينمائي: ${dna.labelAr}
نوع الإنتاج: ${productionLabels[productionType]}
اللغة: ${language === "ar" ? "عربي" : "إنجليزي"}

أجب بـ JSON:
{
  "understanding": "جملة واحدة تصف ما فهمته من الوصف",
  "filmTitle": "عنوان الفيلم (${language === "ar" ? "بالعربي" : "بالإنجليزي"}, 3-6 كلمات)",
  "filmSynopsis": "ملخص الفيلم (${language === "ar" ? "بالعربي" : "بالإنجليزي"}, جملة واحدة)"
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "film_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              understanding: { type: "string" },
              filmTitle: { type: "string" },
              filmSynopsis: { type: "string" },
            },
            required: ["understanding", "filmTitle", "filmSynopsis"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = planResult.choices?.[0]?.message?.content;
    if (content) {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      if (parsed.understanding) understanding = parsed.understanding;
      if (parsed.filmTitle) filmTitle = parsed.filmTitle;
      if (parsed.filmSynopsis) filmSynopsis = parsed.filmSynopsis;
    }
  } catch {
    // fallback: استخدام القيم الافتراضية
  }

  addStep({ id: "plan", icon: "📋", label: "خطة الفيلم جاهزة", detail: `"${filmTitle}"` });

  // ── الخطوة 7: الإنتاج ─────────────────────────────────────
  addStep({ id: "produce", icon: "🚀", label: "أبدأ الإنتاج", detail: "خيال تعمل..." }, "thinking");

  return {
    understanding,
    language,
    productionType,
    genre,
    genreLabel: dna.labelAr,
    genreEmoji: dna.emoji,
    voice: voiceId,
    sceneCount,
    aspectRatio: quick.aspectRatio ?? "16:9",
    pace: quick.pace ?? "medium",
    filmTitle,
    filmSynopsis,
    reasoning: {
      productionType: productionTypeReason,
      genre: `${dna.emoji} ${dna.labelAr} — ${dna.narratorTone}`,
      voice: `${voiceLabel} — يناسب ${dna.labelAr}`,
      sceneCount: sceneReason,
    },
    thinkingSteps: steps,
  };
}

// ══════════════════════════════════════════════════════════════
// تحويل قرار المخرج إلى معاملات quickProduce
// ══════════════════════════════════════════════════════════════

export function decisionToProductionParams(decision: DirectorDecision) {
  return {
    description: decision.filmSynopsis || decision.filmTitle,
    language: decision.language,
    voice: decision.voice,
    sceneCount: decision.sceneCount,
    options: {
      useRunway: true,
      useElevenLabs: true,
      genre: decision.genre,
      genreLabel: decision.genreLabel,
      genreEmoji: decision.genreEmoji,
      aspectRatio: decision.aspectRatio,
    },
  };
}
