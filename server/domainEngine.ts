/**
 * domainEngine.ts — المقوم 1: محرك التحليل الذكي
 * ═══════════════════════════════════════════════════════════════
 * يفهم أي محتوى ويحدد نوعه ويضع خطة الفيلم الكاملة تلقائياً.
 * هذا هو القلب الذي يمكّن المنصة من تنفيذ أي خيال:
 * - حياة النملة تحت الأرض
 * - رحلة في الكون
 * - قصة أطفال
 * - مبنى معماري
 * - حضارة تاريخية
 * - أي شيء آخر
 */

import { invokeLLM } from "./_core/llm";

// ══════════════════════════════════════════════════════════════
// أنواع المجالات المدعومة
// ══════════════════════════════════════════════════════════════

export type ContentDomain =
  | "educational"   // تعليمي: علوم، أحياء، فيزياء، كيمياء، رياضيات
  | "storytelling"  // قصصي: قصص أطفال، روايات، خرافات، أساطير
  | "documentary"   // وثائقي: طبيعة، حيوانات، مجتمعات، ثقافات
  | "architectural" // معماري: مباني، مدن، تصميم داخلي، منظر طبيعي
  | "scientific"    // علمي: فضاء، كون، فيزياء نظرية، اكتشافات
  | "historical"    // تاريخي: حضارات، أحداث، شخصيات، عصور
  | "natural"       // طبيعي: بيئات، نباتات، حيوانات، مناخ
  | "spatial"       // فضائي: كواكب، مجرات، ثقوب سوداء، نجوم
  | "artistic"      // فني: لوحات، نحت، موسيقى، أداء
  | "engineering"   // هندسي: آليات، بنية تحتية، تقنية، صناعة
  | "microscopic"   // مجهري: خلايا، جراثيم، جزيئات، DNA
  | "cultural"      // ثقافي: عادات، تقاليد، أزياء، طعام
  | "fantasy"       // خيالي: عوالم افتراضية، سحر، مستقبل
  | "biographical"; // سيرة ذاتية: شخصيات، رحلات حياة

export type AudienceLevel =
  | "children"      // أطفال 4-10 سنوات
  | "youth"         // شباب 11-17 سنة
  | "general"       // عام — كل الأعمار
  | "professional"; // متخصصون ومحترفون

export type FilmTone =
  | "educational"   // تعليمي — واضح ومباشر
  | "dramatic"      // درامي — عاطفي ومؤثر
  | "documentary"   // وثائقي — موضوعي وعلمي
  | "storytelling"  // قصصي — سردي وشيق
  | "cinematic"     // سينمائي — بصري وجمالي
  | "scientific"    // علمي — دقيق وتحليلي
  | "adventurous";  // مغامراتي — مثير وديناميكي

export type VisualStyle =
  | "macro"         // تكبير — للتفاصيل الدقيقة
  | "aerial"        // جوي — من الأعلى
  | "interior"      // داخلي — من الداخل
  | "microscopic"   // مجهري — مستوى الخلايا
  | "cosmic"        // كوني — مقياس الكون
  | "historical"    // تاريخي — حقبة زمنية
  | "natural"       // طبيعي — بيئة حقيقية
  | "architectural" // معماري — هندسة وتصميم
  | "cinematic";    // سينمائي — إضاءة درامية

// ══════════════════════════════════════════════════════════════
// نتيجة التحليل الكاملة
// ══════════════════════════════════════════════════════════════

export interface DomainAnalysis {
  // التصنيف الأساسي
  primaryDomain: ContentDomain;
  secondaryDomains: ContentDomain[];
  audienceLevel: AudienceLevel;
  filmTone: FilmTone;
  visualStyle: VisualStyle;

  // خطة الفيلم
  filmTitle: { ar: string; en: string };
  filmSynopsis: { ar: string; en: string };
  recommendedSceneCount: number;
  recommendedDurationSeconds: number;

  // المشاهد المقترحة
  sceneOutline: SceneOutline[];

  // السياق الإبداعي
  keyThemes: string[];
  emotionalArc: string;
  visualPalette: string;
  musicMood: string;

  // اللغة
  detectedLanguage: string;
  contentComplexity: "simple" | "moderate" | "complex";
}

export interface SceneOutline {
  index: number;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  educationalFact?: { ar: string; en: string }; // للمحتوى التعليمي
  narrativeText?: { ar: string; en: string };   // للمحتوى القصصي
  visualFocus: string;    // ما يجب أن تُظهره الصورة
  cameraStyle: string;    // أسلوب التصوير
  lightingMood: string;   // مزاج الإضاءة
  duration: number;       // مدة المشهد بالثواني
}

// ══════════════════════════════════════════════════════════════
// قواعد الكشف السريع (بدون AI — للسرعة)
// ══════════════════════════════════════════════════════════════

const DOMAIN_KEYWORDS: Record<ContentDomain, RegExp> = {
  educational:   /نمل|حشر|خلي|علم|تعليم|مرحل|دور|حياة|كيف|لماذا|ant|insect|cell|biology|science|how|why|learn|stage|life cycle/i,
  storytelling:  /قصة|حكاية|كان يا ما كان|ذات مرة|شخصية|بطل|story|tale|once upon|character|hero|narrative/i,
  documentary:   /وثائقي|طبيعة|حيوان|غابة|محيط|documentary|nature|wildlife|forest|ocean|planet/i,
  architectural: /مبنى|بيت|فيلا|برج|مسجد|قصر|تصميم|معماري|building|house|villa|tower|mosque|palace|architecture/i,
  scientific:    /فضاء|كوكب|نجم|مجرة|ثقب أسود|space|planet|star|galaxy|black hole|quantum|physics/i,
  historical:    /تاريخ|حضارة|قديم|فرعون|روماني|إسلامي|history|civilization|ancient|pharaoh|roman|medieval/i,
  natural:       /غابة|صحراء|جبل|نهر|بحر|شجرة|نبات|forest|desert|mountain|river|sea|tree|plant/i,
  spatial:       /كون|مجرة|كوكب|نجم|فضاء|universe|galaxy|planet|star|cosmos|nebula/i,
  artistic:      /فن|لوحة|نحت|رسم|موسيقى|art|painting|sculpture|drawing|music|dance/i,
  engineering:   /هندسة|آلة|محرك|بنية|تقنية|engineering|machine|engine|infrastructure|technology/i,
  microscopic:   /خلية|جرثوم|فيروس|DNA|جزيء|cell|bacteria|virus|molecule|microscope|nano/i,
  cultural:      /ثقافة|عادات|تقاليد|أزياء|طعام|culture|customs|traditions|costume|food|festival/i,
  fantasy:       /خيال|سحر|تنين|عالم افتراضي|مستقبل|fantasy|magic|dragon|virtual world|future/i,
  biographical:  /سيرة|شخصية|حياة|رحلة|قصة نجاح|biography|life story|journey|success story/i,
};

export function quickDetectDomain(text: string): ContentDomain | null {
  if (!text || text.trim().length < 5) return null;

  const scores: Partial<Record<ContentDomain, number>> = {};

  for (const [domain, regex] of Object.entries(DOMAIN_KEYWORDS)) {
    const matches = text.match(regex);
    if (matches) {
      scores[domain as ContentDomain] = matches.length;
    }
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (!sorted[0]) return null;
  return sorted[0][0] as ContentDomain;
}

// ══════════════════════════════════════════════════════════════
// المحرك الرئيسي — تحليل عميق بالـ AI
// ══════════════════════════════════════════════════════════════

export async function analyzeDomain(description: string): Promise<DomainAnalysis> {
  const quickDomain = quickDetectDomain(description);
  const detectedLang = /[\u0600-\u06FF]/.test(description) ? "ar" : "en";

  const systemPrompt = `You are the world's most advanced content analysis and film planning AI.
Your job: analyze ANY description and create a complete film plan.

You handle ALL content types:
- Educational: ant life cycle, human body, solar system, photosynthesis
- Storytelling: children's stories, novels, myths, legends  
- Documentary: wildlife, nature, cultures, societies
- Architectural: buildings, cities, interiors, landscapes
- Scientific: space, physics, chemistry, biology
- Historical: civilizations, events, eras, figures
- Natural: ecosystems, animals, plants, weather
- Cosmic: planets, galaxies, black holes, nebulae
- Microscopic: cells, bacteria, DNA, molecules
- Cultural: traditions, customs, food, festivals
- Fantasy: imaginary worlds, magic, future
- Biographical: life stories, journeys, achievements

CRITICAL RULES:
1. Detect content type automatically from description
2. Plan scenes that SHOW the content visually (not just describe it)
3. Write educational/narrative text for each scene in BOTH Arabic and English
4. Choose scene count based on content complexity (3-12 scenes)
5. Each scene must have a clear visual focus that AI image generation can render

Respond ONLY with valid JSON matching this exact structure:
{
  "primaryDomain": "educational|storytelling|documentary|architectural|scientific|historical|natural|spatial|artistic|engineering|microscopic|cultural|fantasy|biographical",
  "secondaryDomains": [],
  "audienceLevel": "children|youth|general|professional",
  "filmTone": "educational|dramatic|documentary|storytelling|cinematic|scientific|adventurous",
  "visualStyle": "macro|aerial|interior|microscopic|cosmic|historical|natural|architectural|cinematic",
  "filmTitle": { "ar": "العنوان بالعربي", "en": "Title in English" },
  "filmSynopsis": { "ar": "ملخص الفيلم بالعربي", "en": "Film synopsis in English" },
  "recommendedSceneCount": 6,
  "recommendedDurationSeconds": 60,
  "keyThemes": ["theme1", "theme2"],
  "emotionalArc": "description of emotional journey",
  "visualPalette": "color palette description",
  "musicMood": "ambient|peaceful|dramatic|epic|mysterious|educational|adventurous",
  "detectedLanguage": "ar|en|fr|es|zh|ja|hi|de",
  "contentComplexity": "simple|moderate|complex",
  "sceneOutline": [
    {
      "index": 0,
      "title": { "ar": "عنوان المشهد", "en": "Scene Title" },
      "description": { "ar": "وصف ما يحدث في المشهد", "en": "Scene description" },
      "educationalFact": { "ar": "معلومة علمية/تعليمية", "en": "Educational fact" },
      "narrativeText": { "ar": "نص سردي/قصصي", "en": "Narrative text" },
      "visualFocus": "exactly what the image should show",
      "cameraStyle": "close-up macro|wide aerial|eye-level|microscopic zoom|cosmic wide",
      "lightingMood": "golden hour|blue hour|dramatic|soft natural|cosmic glow|underground dim",
      "duration": 8
    }
  ]
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze and plan a film for: "${description}"` },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 5000,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content) as DomainAnalysis;

    // التحقق من صحة البيانات
    if (!parsed.sceneOutline || !Array.isArray(parsed.sceneOutline) || parsed.sceneOutline.length === 0) {
      throw new Error("Invalid scene outline");
    }

    return {
      ...parsed,
      detectedLanguage: parsed.detectedLanguage || detectedLang,
    };

  } catch (err) {
    console.error("[DomainEngine] AI analysis failed, using fallback:", err);

    // Fallback ذكي بدون AI
    return buildFallbackAnalysis(description, quickDomain || "educational", detectedLang);
  }
}

// ══════════════════════════════════════════════════════════════
// Fallback ذكي — عندما يفشل AI
// ══════════════════════════════════════════════════════════════

function buildFallbackAnalysis(
  description: string,
  domain: ContentDomain,
  lang: string
): DomainAnalysis {
  const DOMAIN_CONFIGS: Record<ContentDomain, {
    tone: FilmTone;
    visual: VisualStyle;
    scenes: number;
    duration: number;
    music: string;
    palette: string;
  }> = {
    educational:   { tone: "educational",  visual: "macro",         scenes: 6, duration: 60,  music: "peaceful",    palette: "bright, clear, scientific blues and greens" },
    storytelling:  { tone: "storytelling", visual: "cinematic",     scenes: 7, duration: 70,  music: "adventurous", palette: "warm, storybook colors, golden tones" },
    documentary:   { tone: "documentary",  visual: "natural",       scenes: 8, duration: 80,  music: "ambient",     palette: "natural, earthy, National Geographic style" },
    architectural: { tone: "cinematic",    visual: "architectural", scenes: 8, duration: 80,  music: "peaceful",    palette: "architectural grays, warm sunlight" },
    scientific:    { tone: "scientific",   visual: "cosmic",        scenes: 6, duration: 60,  music: "epic",        palette: "deep space blues, nebula purples, star whites" },
    historical:    { tone: "documentary",  visual: "historical",    scenes: 8, duration: 80,  music: "dramatic",    palette: "sepia tones, aged textures, historical warmth" },
    natural:       { tone: "documentary",  visual: "natural",       scenes: 7, duration: 70,  music: "peaceful",    palette: "lush greens, earth tones, natural light" },
    spatial:       { tone: "scientific",   visual: "cosmic",        scenes: 6, duration: 60,  music: "epic",        palette: "cosmic blacks, nebula colors, star light" },
    artistic:      { tone: "cinematic",    visual: "cinematic",     scenes: 6, duration: 60,  music: "peaceful",    palette: "rich artistic colors, gallery lighting" },
    engineering:   { tone: "educational",  visual: "macro",         scenes: 6, duration: 60,  music: "ambient",     palette: "industrial grays, technical blues" },
    microscopic:   { tone: "scientific",   visual: "microscopic",   scenes: 6, duration: 60,  music: "ambient",     palette: "microscope blues, cell greens, fluorescent" },
    cultural:      { tone: "documentary",  visual: "cinematic",     scenes: 7, duration: 70,  music: "adventurous", palette: "vibrant cultural colors, festival warmth" },
    fantasy:       { tone: "dramatic",     visual: "cinematic",     scenes: 8, duration: 80,  music: "epic",        palette: "magical purples, fantasy golds, mystical" },
    biographical:  { tone: "dramatic",     visual: "cinematic",     scenes: 7, duration: 70,  music: "dramatic",    palette: "warm personal tones, documentary style" },
  };

  const config = DOMAIN_CONFIGS[domain];
  const isAr = lang === "ar";

  const sceneOutline: SceneOutline[] = Array.from({ length: config.scenes }, (_, i) => ({
    index: i,
    title: {
      ar: `مشهد ${i + 1}: ${description.slice(0, 20)}`,
      en: `Scene ${i + 1}: ${description.slice(0, 20)}`,
    },
    description: {
      ar: `توثيق بصري للمشهد ${i + 1} من ${description.slice(0, 30)}`,
      en: `Visual documentation of scene ${i + 1} from ${description.slice(0, 30)}`,
    },
    educationalFact: {
      ar: "معلومة علمية مثيرة للاهتمام",
      en: "Fascinating scientific fact",
    },
    narrativeText: {
      ar: "نص سردي يصف هذا المشهد",
      en: "Narrative text describing this scene",
    },
    visualFocus: `${description.slice(0, 40)}, scene ${i + 1}`,
    cameraStyle: ["wide establishing shot", "close-up detail", "aerial view", "eye-level", "macro shot", "overhead"][i % 6],
    lightingMood: ["golden hour", "soft natural light", "dramatic shadows", "blue hour", "bright daylight", "warm sunset"][i % 6],
    duration: Math.round(config.duration / config.scenes),
  }));

  return {
    primaryDomain: domain,
    secondaryDomains: [],
    audienceLevel: "general",
    filmTone: config.tone,
    visualStyle: config.visual,
    filmTitle: {
      ar: description.slice(0, 50),
      en: description.slice(0, 50),
    },
    filmSynopsis: {
      ar: `فيلم يستكشف ${description}`,
      en: `A film exploring ${description}`,
    },
    recommendedSceneCount: config.scenes,
    recommendedDurationSeconds: config.duration,
    keyThemes: [description.slice(0, 20)],
    emotionalArc: "discovery and wonder",
    visualPalette: config.palette,
    musicMood: config.music,
    detectedLanguage: lang,
    contentComplexity: "moderate",
    sceneOutline,
  };
}

// ══════════════════════════════════════════════════════════════
// بناء prompt الصورة حسب نوع المجال
// ══════════════════════════════════════════════════════════════

export function buildDomainPrompt(
  scene: SceneOutline,
  analysis: DomainAnalysis,
  unifiedConcept: string
): string {
  const DOMAIN_PROMPT_PREFIXES: Record<ContentDomain, string> = {
    educational:   "Ultra-detailed educational illustration, scientific accuracy, clear visual storytelling,",
    storytelling:  "Cinematic storybook illustration, warm dramatic lighting, narrative depth,",
    documentary:   "National Geographic documentary photography, natural lighting, authentic atmosphere,",
    architectural: "Ultra photorealistic architectural visualization, award-winning photography,",
    scientific:    "NASA-quality scientific visualization, cosmic scale, photorealistic rendering,",
    historical:    "Historically accurate cinematic reconstruction, period-correct details,",
    natural:       "Wildlife documentary photography, natural habitat, BBC Earth quality,",
    spatial:       "Space telescope quality imagery, cosmic scale, scientifically accurate,",
    artistic:      "Fine art photography, gallery quality, artistic composition,",
    engineering:   "Technical precision visualization, engineering accuracy, detailed machinery,",
    microscopic:   "Electron microscope quality imagery, cellular detail, scientific accuracy,",
    cultural:      "Cultural documentary photography, authentic traditions, vibrant colors,",
    fantasy:       "Epic fantasy concept art, magical atmosphere, cinematic quality,",
    biographical:  "Cinematic biographical documentary style, emotional depth, authentic setting,",
  };

  const prefix = DOMAIN_PROMPT_PREFIXES[analysis.primaryDomain];

  return [
    prefix,
    unifiedConcept,
    scene.visualFocus,
    scene.cameraStyle,
    scene.lightingMood,
    `${analysis.visualPalette},`,
    "8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting,",
    "photorealistic materials, ray-traced reflections, professional photography",
  ].filter(Boolean).join(" ");
}
