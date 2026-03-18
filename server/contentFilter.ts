/**
 * contentFilter.ts — الفلتر الأخلاقي الصارم لمنصة خيال
 * ─────────────────────────────────────────────────────────────
 * يفحص الوصف قبل التوليد ويرفض أي محتوى مخل بالآداب
 * يدعم متعدد اللغات: عربي، إنجليزي، فرنسي، إسباني، إيطالي، ياباني، صيني، هندي
 */

// ═══════════════════════════════════════════════════════════════
// قائمة الأنماط المحظورة — متعددة اللغات
// ═══════════════════════════════════════════════════════════════
const BANNED_PATTERNS: RegExp[] = [
  // عربي — محتوى جنسي / عنف / تجديف
  /\b(عاري|عارية|جنس|إباحي|خليع|فاحش|مثير جنسياً|تعري|عضو تناسلي|فرج|قضيب)\b/i,
  /\b(قتل|ذبح|تعذيب|اغتصاب|انتهاك جنسي|تحرش|إرهاب|متفجرات|سلاح نووي)\b/i,
  /\b(كفر|ردة|إهانة الدين|سب الله|سب الرسول|تجديف)\b/i,

  // English — sexual / violent / hate
  /\b(nude|naked|porn|pornographic|erotic|explicit|nsfw|hentai|xxx|sex scene|orgasm|genitals?|vagina|penis|breast|nipple)\b/i,
  /\b(kill|murder|torture|rape|assault|terrorist|bomb|explosive|genocide|massacre)\b/i,
  /\b(hate speech|racist|white supremac|nazi|fascist)\b/i,

  // French
  /\b(nu|nue|pornographique|érotique|sexuel explicite|viol|meurtre|terroriste)\b/i,

  // Spanish
  /\b(desnudo|pornográfico|erótico|violación|asesinato|terrorista|explosivo)\b/i,

  // Italian
  /\b(nudo|pornografico|erotico|stupro|omicidio|terrorista)\b/i,

  // Patterns for violence glorification
  /\b(gore|snuff|beheading|decapitation|dismember)\b/i,

  // Drug-related
  /\b(cocaine|heroin|meth|drug lab|drug den|حشيش|مخدرات|مخبر مخدرات)\b/i,
];

// ═══════════════════════════════════════════════════════════════
// رسائل الرفض — متعددة اللغات
// ═══════════════════════════════════════════════════════════════
const REJECTION_MESSAGES: Record<string, string> = {
  ar: "⚠️ لا يمكن معالجة هذا الطلب. تحتوي الرسالة على محتوى مخل بالآداب أو غير لائق. منصة خيال مخصصة للإبداع المعماري والفني الراقي فقط.",
  en: "⚠️ This request cannot be processed. The description contains inappropriate or indecent content. Khayal platform is dedicated exclusively to architectural and artistic creativity.",
  fr: "⚠️ Cette demande ne peut pas être traitée. La description contient un contenu inapproprié. La plateforme Khayal est dédiée à la créativité architecturale.",
  es: "⚠️ Esta solicitud no puede procesarse. La descripción contiene contenido inapropiado. La plataforma Khayal está dedicada a la creatividad arquitectónica.",
  default: "⚠️ This request cannot be processed due to inappropriate content. Please describe an architectural or artistic vision.",
};

// ═══════════════════════════════════════════════════════════════
// الفحص الأساسي بالأنماط (سريع، بدون AI)
// ═══════════════════════════════════════════════════════════════
function patternCheck(text: string): { blocked: boolean; reason?: string } {
  const normalized = text.toLowerCase().trim();

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: `Matched banned pattern: ${pattern.source.slice(0, 40)}`,
      };
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
): Promise<{ blocked: boolean; reason?: string; language?: string }> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a strict content moderation system for an architectural visualization platform.
          
Your ONLY job is to determine if the user's description is appropriate for generating visual content.

BLOCK ONLY if the description EXPLICITLY contains:
- Sexual or pornographic content (nudity, explicit acts)
- Graphic violence or gore (detailed blood, torture)
- Hate speech or racial discrimination
- Drug manufacturing instructions
- Blasphemy or direct religious insults

ALLOW everything else including:
- Buildings, architecture, spaces, cities, rooms
- Nature: mountains, caves, forests, deserts, rivers, oceans
- Animals, wildlife, pets
- Sci-fi worlds, fantasy realms, magical places
- Historical places and civilizations
- People in normal everyday situations
- Food, markets, streets, vehicles
- Weather, seasons, time of day
- Any creative, artistic, or imaginative vision
- Abstract concepts and emotions

Be VERY permissive. Only block content that is CLEARLY and EXPLICITLY inappropriate.
Do NOT block descriptions of nature, animals, everyday life, or fantasy.
When in doubt, ALLOW it.

Respond ONLY with valid JSON: {"blocked": true/false, "reason": "brief reason if blocked", "language": "detected ISO 639-1 code"}`,
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
      reason: parsed.reason,
      language: parsed.language || "en",
    };
  } catch {
    // إذا فشل الـ AI، نسمح بالمرور (الفلتر الأساسي كافٍ)
    return { blocked: false };
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
}

export async function checkContent(
  text: string,
  invokeLLM?: Function
): Promise<ContentFilterResult> {
  // 1. الفحص السريع بالأنماط
  const patternResult = patternCheck(text);
  if (patternResult.blocked) {
    const lang = /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
    return {
      allowed: false,
      message: REJECTION_MESSAGES[lang] || REJECTION_MESSAGES.default,
      language: lang,
      checkType: "pattern",
    };
  }

  // 2. الفحص العميق بالـ AI (إذا كان متاحاً)
  if (invokeLLM) {
    const aiResult = await aiCheck(text, invokeLLM);
    if (aiResult.blocked) {
      const lang = aiResult.language || "en";
      return {
        allowed: false,
        message: REJECTION_MESSAGES[lang] || REJECTION_MESSAGES.default,
        language: lang,
        checkType: "ai",
      };
    }
  }

  return { allowed: true, checkType: "passed" };
}

// ═══════════════════════════════════════════════════════════════
// الـ prompt الآمن — يُضاف لكل طلب توليد
// ═══════════════════════════════════════════════════════════════
export const SAFE_CONTENT_DIRECTIVE = `
ABSOLUTE CONTENT RULES (non-negotiable):
- Generate ONLY architectural, artistic, and environmental visualizations
- NO nudity, sexual content, or suggestive imagery of any kind
- NO graphic violence, gore, or disturbing imagery
- NO hate symbols, discriminatory content, or offensive material
- NO drug-related content or illegal activities
- Maintain Islamic values and universal moral standards
- If the prompt implies inappropriate content, generate a beautiful architectural alternative instead
`;
