/**
 * contentFilter.ts — الفلتر الأخلاقي والقانوني الصارم لمنصة خيال
 * ─────────────────────────────────────────────────────────────────
 * يحمي المنصة من:
 * 1. المحتوى المخل بالآداب العامة
 * 2. المحتوى الذي يُرتّب مسؤولية قانونية
 * 3. انتهاك حقوق الملكية الفكرية والخصوصية
 * 4. المحتوى الذي يمس الأمن الوطني أو الديني
 *
 * يدعم متعدد اللغات: عربي، إنجليزي، فرنسي، إسباني، إيطالي، ياباني، صيني، هندي
 */

import { getDb } from "./db";
import { contentViolations } from "../drizzle/schema";

// ═══════════════════════════════════════════════════════════════
// قائمة الأنماط المحظورة — متعددة اللغات
// ═══════════════════════════════════════════════════════════════
const BANNED_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  // ── أخلاقي: محتوى جنسي ──
  { pattern: /\b(عاري|عارية|جنس|إباحي|خليع|فاحش|مثير جنسياً|تعري|عضو تناسلي|فرج|قضيب)\b/i, category: "sexual" },
  { pattern: /\b(nude|naked|porn|pornographic|erotic|explicit|nsfw|hentai|xxx|sex scene|orgasm|genitals?|vagina|penis|breast|nipple)\b/i, category: "sexual" },
  { pattern: /\b(nu|nue|pornographique|érotique|sexuel explicite)\b/i, category: "sexual" },
  { pattern: /\b(desnudo|pornográfico|erótico)\b/i, category: "sexual" },

  // ── أخلاقي: عنف صريح ──
  { pattern: /\b(قتل|ذبح|تعذيب|اغتصاب|انتهاك جنسي|تحرش)\b/i, category: "violence" },
  { pattern: /\b(gore|snuff|beheading|decapitation|dismember|torture|rape|murder)\b/i, category: "violence" },

  // ── قانوني: إرهاب وأسلحة ──
  { pattern: /\b(إرهاب|متفجرات|سلاح نووي|تفجير|هجوم إرهابي)\b/i, category: "terrorism" },
  { pattern: /\b(terrorist|bomb|explosive|nuclear weapon|attack plan|genocide|massacre)\b/i, category: "terrorism" },
  { pattern: /\b(terroriste|bombe|explosif|viol|meurtre)\b/i, category: "terrorism" },

  // ── قانوني: خطاب الكراهية والتمييز ──
  { pattern: /\b(hate speech|racist|white supremac|nazi|fascist|antisemit)\b/i, category: "hate_speech" },
  { pattern: /\b(تمييز عنصري|نازي|فاشي|كراهية دينية)\b/i, category: "hate_speech" },

  // ── ديني: تجديف وإهانة ──
  { pattern: /\b(كفر|ردة|إهانة الدين|سب الله|سب الرسول|تجديف)\b/i, category: "blasphemy" },
  { pattern: /\b(blasphemy|desecrate|mock (god|allah|prophet|jesus|religion))\b/i, category: "blasphemy" },

  // ── قانوني: مخدرات ──
  { pattern: /\b(cocaine|heroin|meth|drug lab|drug den|fentanyl)\b/i, category: "drugs" },
  { pattern: /\b(حشيش|مخدرات|مخبر مخدرات|هيروين|كوكايين)\b/i, category: "drugs" },

  // ── قانوني: انتهاك الخصوصية وتشهير أشخاص حقيقيين ──
  { pattern: /\b(deepfake|صورة مزيفة لـ|اصنع صورة لـ .{1,30} عاري)\b/i, category: "privacy" },

  // ── قانوني: محتوى يمس القاصرين ──
  { pattern: /\b(child porn|underage|minor.*sexual|طفل.*جنسي)\b/i, category: "child_safety" },
];

// أسماء شخصيات عامة حقيقية — لا يجوز توليد صور مسيئة لهم
const REAL_PERSONS_CONTEXT_WORDS = [
  "naked", "nude", "sexual", "erotic", "عاري", "عارية", "جنسي",
];

// ═══════════════════════════════════════════════════════════════
// رسائل الرفض — متعددة اللغات مع اقتراح بديل
// ═══════════════════════════════════════════════════════════════
const REJECTION_MESSAGES: Record<string, Record<string, string>> = {
  sexual: {
    ar: "⚠️ لا يمكن معالجة هذا الطلب. يحتوي على محتوى جنسي غير لائق. خيال مخصص للإبداع المعماري والفني الراقي. جرّب: وصف مبنى، منظر طبيعي، أو فكرة فنية.",
    en: "⚠️ This request cannot be processed. It contains inappropriate sexual content. Khayal is dedicated to architectural and artistic creativity. Try: describing a building, landscape, or artistic concept.",
    default: "⚠️ Request blocked: inappropriate sexual content.",
  },
  violence: {
    ar: "⚠️ لا يمكن معالجة هذا الطلب. يحتوي على محتوى عنيف صريح. خيال لا يُنتج مشاهد عنف أو دماء.",
    en: "⚠️ This request cannot be processed. It contains explicit violent content. Khayal does not generate violent or disturbing imagery.",
    default: "⚠️ Request blocked: violent content.",
  },
  terrorism: {
    ar: "⚠️ هذا الطلب مرفوض قانونياً. يحتوي على محتوى يتعلق بالإرهاب أو الأسلحة. هذا النوع من المحتوى يُعرّض المنصة والمستخدم للمسؤولية القانونية.",
    en: "⚠️ This request is legally blocked. It contains terrorism or weapons-related content. This type of content creates legal liability for both the platform and the user.",
    default: "⚠️ Request blocked: terrorism/weapons content — legal liability.",
  },
  hate_speech: {
    ar: "⚠️ هذا الطلب مرفوض. يحتوي على خطاب كراهية أو تمييز عنصري. خيال يحترم جميع الأديان والثقافات والأعراق.",
    en: "⚠️ This request is blocked. It contains hate speech or racial discrimination. Khayal respects all religions, cultures, and ethnicities.",
    default: "⚠️ Request blocked: hate speech.",
  },
  blasphemy: {
    ar: "⚠️ هذا الطلب مرفوض. يحتوي على محتوى مسيء للأديان. خيال يحترم جميع المعتقدات الدينية.",
    en: "⚠️ This request is blocked. It contains content that is disrespectful to religious beliefs. Khayal respects all faiths.",
    default: "⚠️ Request blocked: religious disrespect.",
  },
  drugs: {
    ar: "⚠️ هذا الطلب مرفوض قانونياً. يحتوي على محتوى يتعلق بالمخدرات.",
    en: "⚠️ This request is legally blocked. It contains drug-related content.",
    default: "⚠️ Request blocked: drug-related content.",
  },
  privacy: {
    ar: "⚠️ هذا الطلب مرفوض. توليد صور مزيفة لأشخاص حقيقيين بدون إذنهم يُعدّ انتهاكاً قانونياً للخصوصية.",
    en: "⚠️ This request is blocked. Generating fake images of real people without consent is a legal privacy violation.",
    default: "⚠️ Request blocked: privacy violation.",
  },
  child_safety: {
    ar: "⚠️ هذا الطلب مرفوض فوراً. يحتوي على محتوى يمس سلامة الأطفال. هذا جريمة قانونية.",
    en: "⚠️ This request is immediately blocked. It contains content that endangers child safety. This is a criminal offense.",
    default: "⚠️ Request blocked: child safety violation — criminal offense.",
  },
  general: {
    ar: "⚠️ لا يمكن معالجة هذا الطلب. يحتوي على محتوى غير لائق. منصة خيال مخصصة للإبداع المعماري والفني الراقي فقط.",
    en: "⚠️ This request cannot be processed. It contains inappropriate content. Khayal platform is dedicated to architectural and artistic creativity.",
    default: "⚠️ This request cannot be processed due to inappropriate content.",
  },
};

function getRejectionMessage(category: string, lang: string): string {
  const msgs = REJECTION_MESSAGES[category] || REJECTION_MESSAGES.general;
  return msgs[lang] || msgs.en || msgs.default;
}

// ═══════════════════════════════════════════════════════════════
// الفحص الأساسي بالأنماط (سريع، بدون AI)
// ═══════════════════════════════════════════════════════════════
function patternCheck(text: string): { blocked: boolean; category?: string } {
  const normalized = text.toLowerCase().trim();

  for (const { pattern, category } of BANNED_PATTERNS) {
    if (pattern.test(normalized)) {
      return { blocked: true, category };
    }
  }

  return { blocked: false };
}

// ═══════════════════════════════════════════════════════════════
// الفحص بالـ AI (عميق، للحالات الغامضة)
// ═══════════════════════════════════════════════════════════════
async function aiCheck(
  text: string,
  invokeLLM: Function
): Promise<{ blocked: boolean; category?: string; language?: string }> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a strict content moderation system for an architectural and creative visualization platform called "Khayal".

Your job is to determine if the user's description is safe to generate visual content for.

BLOCK if the description EXPLICITLY contains:
1. Sexual or pornographic content (nudity, explicit acts, suggestive imagery)
2. Graphic violence or gore (detailed blood, torture, dismemberment)
3. Hate speech, racial discrimination, or extremist ideology
4. Terrorism, weapons manufacturing, or attack planning
5. Drug manufacturing or trafficking
6. Content that violates privacy (fake images of real named individuals in compromising situations)
7. Content endangering children
8. Religious blasphemy or direct insults to any faith
9. Content that could create legal liability (defamation, impersonation of real people)

ALLOW everything else including:
- Architecture, buildings, spaces, cities, interiors, engineering
- Nature: mountains, caves, forests, deserts, rivers, oceans, shells, microscopic worlds
- Animals, wildlife, insects, marine life
- Science visualization: atoms, cells, physics, chemistry, mathematics, astronomy
- Sci-fi worlds, fantasy realms, magical places, impossible scenarios
- Historical places and civilizations
- People in normal everyday situations
- Food, markets, streets, vehicles
- Weather, seasons, time of day
- Any creative, artistic, or imaginative vision
- Abstract concepts and emotions
- Being "inside" any environment (shell, atom, cave, building, etc.)

Be VERY permissive for creative and educational content. Only block CLEARLY inappropriate content.
When in doubt, ALLOW it.

Respond ONLY with valid JSON:
{"blocked": true/false, "category": "sexual|violence|terrorism|hate_speech|blasphemy|drugs|privacy|child_safety|general", "reason": "brief reason if blocked", "language": "detected ISO 639-1 code"}`,
        },
        {
          role: "user",
          content: `Check this description: "${text.slice(0, 500)}"`,
        },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 200,
    });

    const content = result.choices[0].message.content;
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    return {
      blocked: parsed.blocked === true,
      category: parsed.category || "general",
      language: parsed.language || "en",
    };
  } catch {
    return { blocked: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// تسجيل المحتوى المرفوض في قاعدة البيانات
// ═══════════════════════════════════════════════════════════════
async function logViolation(
  text: string,
  category: string,
  checkType: "pattern" | "ai"
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // نحفظ فقط أول 200 حرف لحماية الخصوصية
    await db.insert(contentViolations).values({
      textSnippet: text.slice(0, 200),
      category,
      checkType,
      createdAt: Date.now(),
    });
  } catch {
    // لا نوقف الإنتاج إذا فشل التسجيل
  }
}

// ═══════════════════════════════════════════════════════════════
// الدالة الرئيسية للفحص
// ═══════════════════════════════════════════════════════════════
export interface ContentFilterResult {
  allowed: boolean;
  message?: string;
  language?: string;
  checkType: "pattern" | "ai" | "passed";
  category?: string;
}

export async function checkContent(
  text: string,
  invokeLLM?: Function
): Promise<ContentFilterResult> {
  const detectedLang = /[\u0600-\u06FF]/.test(text) ? "ar" : "en";

  // 1. الفحص السريع بالأنماط
  const patternResult = patternCheck(text);
  if (patternResult.blocked) {
    const category = patternResult.category || "general";
    // تسجيل غير متزامن — لا ينتظر
    logViolation(text, category, "pattern").catch(() => {});
    return {
      allowed: false,
      message: getRejectionMessage(category, detectedLang),
      language: detectedLang,
      checkType: "pattern",
      category,
    };
  }

  // 2. الفحص العميق بالـ AI (إذا كان متاحاً)
  if (invokeLLM) {
    const aiResult = await aiCheck(text, invokeLLM);
    if (aiResult.blocked) {
      const category = aiResult.category || "general";
      const lang = aiResult.language || detectedLang;
      logViolation(text, category, "ai").catch(() => {});
      return {
        allowed: false,
        message: getRejectionMessage(category, lang),
        language: lang,
        checkType: "ai",
        category,
      };
    }
  }

  return { allowed: true, checkType: "passed" };
}

// ═══════════════════════════════════════════════════════════════
// الـ prompt الآمن — يُضاف لكل طلب توليد
// ═══════════════════════════════════════════════════════════════
export const SAFE_CONTENT_DIRECTIVE = `
ABSOLUTE CONTENT RULES (non-negotiable — legal and ethical compliance):
- Generate ONLY architectural, artistic, scientific, educational, and environmental visualizations
- NO nudity, sexual content, or suggestive imagery of any kind
- NO graphic violence, gore, or disturbing imagery
- NO hate symbols, discriminatory content, or offensive material
- NO drug-related content or illegal activities
- NO content that could constitute defamation or privacy violation
- NO impersonation of real named individuals in inappropriate contexts
- Maintain Islamic values, universal moral standards, and international legal compliance
- If the prompt implies inappropriate content, generate a beautiful architectural or artistic alternative instead
- The platform operator bears no responsibility for misuse; all content is logged for compliance review
`;
