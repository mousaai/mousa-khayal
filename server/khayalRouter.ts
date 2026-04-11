/**
 * khayalRouter.ts — محرك الذكاء المتقدم لمنصة خيال
 * ─────────────────────────────────────────────────────────────
 * المبادئ الأساسية:
 * 1. فكرة واحدة من زوايا متعددة (لا تعدد أفكار في نفس الخيال)
 * 2. احترام الأبعاد الهندسية الحقيقية للكتلة المصورة
 * 3. دعم أي لغة + استنتاج السيناريو تلقائياً
 * 4. دعم المستندات (PDF / Word / مخططات)
 * 5. محرك الفيلم الإخراجي بمدة محددة
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { khayalProjects, khayalScenes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeDocument } from "./documentAnalyzer";
import type { DocumentAnalysisResult } from "./documentAnalyzer";
import { checkContent, SAFE_CONTENT_DIRECTIVE } from "./contentFilter";
import { analyzeDomain, buildDomainPrompt, quickDetectDomain } from "./domainEngine";
import type { DomainAnalysis } from "./domainEngine";
import { generateScript } from "./scriptEngine";
import { guardMousaBalance, deductMousaCredits, isMousaEnabled } from "./mousaCreditsService";

// ═══════════════════════════════════════════════════════════════
// CAMERA ANGLES — زوايا الكاميرا المحددة لكتلة واحدة
// ═══════════════════════════════════════════════════════════════
const CAMERA_ANGLES = [
  {
    type: "wide_exterior",
    label_ar: "المنظر الخارجي الشامل",
    camera: "wide establishing shot from street level, 35mm lens, eye-level perspective",
    timing: "golden hour, warm directional sunlight from the right",
  },
  {
    type: "aerial_45",
    label_ar: "المنظر الجوي 45°",
    camera: "aerial drone shot at 45-degree angle, 24mm wide lens, bird's eye perspective",
    timing: "midday, dramatic shadows revealing mass geometry",
  },
  {
    type: "facade_front",
    label_ar: "الواجهة الأمامية",
    camera: "straight-on frontal elevation view, architectural photography style, symmetrical composition",
    timing: "blue hour, subtle ambient light, facade illuminated",
  },
  {
    type: "corner_perspective",
    label_ar: "المنظر الزاوي",
    camera: "corner perspective view showing two facades, 28mm lens, dynamic diagonal composition",
    timing: "sunset, long shadows, warm golden light",
  },
  {
    type: "interior_main",
    label_ar: "الفضاء الداخلي الرئيسي",
    camera: "interior wide angle shot, 16mm lens, showing depth and spatial quality",
    timing: "natural daylight through windows, warm ambient lighting",
  },
  {
    type: "detail_close",
    label_ar: "تفاصيل المواد والحرفية",
    camera: "close-up detail shot, 85mm macro lens, sharp focus on materials and craftsmanship",
    timing: "raking light to reveal texture and depth",
  },
  {
    type: "context_urban",
    label_ar: "السياق العمراني",
    camera: "wide context shot showing building in its urban/natural environment, 24mm lens",
    timing: "dusk, city lights beginning to appear",
  },
  {
    type: "aerial_top",
    label_ar: "المسقط الجوي العلوي",
    camera: "directly overhead aerial shot (nadir), showing roof plan and site layout",
    timing: "midday, clear sky, maximum shadow definition",
  },
];

// ═══════════════════════════════════════════════════════════════
// GEOMETRIC MASS CONSTRAINT — قيود الكتلة الهندسية
// ═══════════════════════════════════════════════════════════════
function buildGeometricConstraint(
  geometricMass?: DocumentAnalysisResult["geometricMass"],
  referenceImageUrl?: string
): string {
  if (!geometricMass && !referenceImageUrl) return "";

  const parts: string[] = [
    "CRITICAL GEOMETRIC CONSTRAINTS (must be respected exactly):",
    "- Maintain EXACT proportions of the original mass/building",
    "- Do NOT exaggerate building height or footprint",
    "- Do NOT add extra floors or wings not in the original",
    "- Do NOT change the fundamental shape of the mass",
    "- Preserve the exact setbacks and spacing as designed",
  ];

  if (geometricMass) {
    if (geometricMass.shape && geometricMass.shape !== "rectangular") {
      parts.push(`- Building shape is ${geometricMass.shape} — maintain this exact form`);
    }
    if (geometricMass.estimatedWidth && geometricMass.estimatedWidth !== "unknown") {
      parts.push(`- Width: ${geometricMass.estimatedWidth} (do not alter)`);
    }
    if (geometricMass.estimatedLength && geometricMass.estimatedLength !== "unknown") {
      parts.push(`- Length: ${geometricMass.estimatedLength} (do not alter)`);
    }
    if (geometricMass.estimatedHeight && geometricMass.estimatedHeight !== "unknown") {
      parts.push(`- Height: ${geometricMass.estimatedHeight} (do not alter)`);
    }
    if (geometricMass.floorCount > 0) {
      parts.push(`- Exactly ${geometricMass.floorCount} floor(s) — no more, no less`);
    }
    const sb = geometricMass.setbacks;
    if (sb.front !== "unknown") {
      parts.push(`- Setbacks: front ${sb.front}, back ${sb.back}, left ${sb.left}, right ${sb.right}`);
    }
  }

  if (referenceImageUrl) {
    parts.push("- Reference image provided: match the EXACT mass, shape, and proportions shown");
    parts.push("- Do NOT modify the fundamental geometry seen in the reference");
  }

  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// FACE ANALYSIS — استخراج وصف دقيق لملامح الشخص من صورته
// ═══════════════════════════════════════════════════════════════
async function analyzeFaceFeatures(imageUrl: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional portrait photographer and casting director.
Analyze the person's photo and produce a precise, detailed description of their physical appearance for use in AI image generation prompts.
Focus ONLY on observable physical features — never guess age, nationality, or identity.
Respond in English only with a single paragraph of 50-80 words.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: `Describe this person's physical appearance as a prompt fragment. Include: gender, face shape, skin tone, hair color and style, eye color and shape, eyebrow shape, nose shape, lip shape, any distinctive features (beard, freckles, dimples, glasses, etc.). Start with gender. Example: "a man with olive skin, dark brown wavy hair, deep-set brown eyes, strong jawline, short beard, prominent nose"`,
            },
          ],
        },
      ],
    });
    const content = result.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim().length > 20) {
      console.log("[KhayalRouter] Face features extracted:", content.trim().slice(0, 120));
      return content.trim();
    }
    return "";
  } catch (err) {
    console.error("[KhayalRouter] Face analysis failed:", err);
    return "";
  }
}

// Helper: كشف ما إذا كانت الصورة المرفوعة تحتوي على شخص
function isPersonImage(description: string, imageUrl?: string): boolean {
  // إذا كان الوصف يشير صراحةً لشخص أو تحويل شخصي
  const personalKeywords = /تخيلني|تخيل نفسي|حولني|اجعلني|كيف أكون|صورتي|شخصيتي|imagine me|transform me|my photo|my picture|my face|portrait of me/i;
  return personalKeywords.test(description);
}

// ═══════════════════════════════════════════════════════════════
// DEEP AI ANALYSIS — تحليل عميق + فكرة واحدة من زوايا متعددة
// ═══════════════════════════════════════════════════════════════
async function deepAnalyzeDescription(
  description: string,
  referenceImageUrl?: string,
  previousFeedback?: string,
  documentAnalysis?: DocumentAnalysisResult,
  sceneCount: number = 5,
  faceDescription?: string  // وصف ملامح الشخص المستخرج من الصورة
): Promise<{
  title: string;
  culturalContext: string;
  mainElements: string[];
  atmosphere: string;
  scenarioType: string;
  scenes: Array<{ type: string; label: string; prompt: string; arabicCaption: string }>;
  cinematicStyle: string;
  detectedLanguage: string;
  unifiedConcept: string;
}> {

  const geometricConstraint = buildGeometricConstraint(
    documentAnalysis?.geometricMass,
    referenceImageUrl
  );

  // اختيار الزوايا المناسبة حسب عدد المشاهد
  const selectedAngles = CAMERA_ANGLES.slice(0, Math.min(sceneCount, CAMERA_ANGLES.length));

  // تنويع الجو بين المشاهد لخلق رحلة بصرية كاملة
  const LIGHTING_MOODS = [
    "golden hour sunrise, warm amber rays piercing through morning mist",
    "harsh midday sun, dramatic shadows revealing architectural geometry",
    "soft diffused overcast light, even illumination highlighting textures",
    "magic hour sunset, deep orange and crimson sky, long dramatic shadows",
    "blue hour dusk, city lights beginning to glow, deep indigo sky",
    "night scene, dramatic artificial lighting, moonlit atmosphere",
    "stormy dramatic sky, dynamic clouds, moody atmospheric lighting",
    "clear dawn, first light of day, peaceful serene atmosphere",
  ];

  // كشف نوع الطلب لاختيار الأسلوب المناسب
  // استخراج الموضوع الرئيسي من الوصف (أول كيان ذُكر)
  const mainSubjectMatch = description.match(/^([\u0600-\u06FF\w\s]{2,30})/);
  const mainSubject = mainSubjectMatch ? mainSubjectMatch[1].trim() : description.slice(0, 30);
  
  const isArchitectural = /مبن|بيت|فيلا|برج|مسجد|مدرسة|مستشفى|مكتب|واجهة|تصميم معماري|مخطط|طابق|building|villa|tower|mosque|facade|architectural|floor plan/i.test(description) && !/صقر|طائر|حيوان|نملة|أسد|نمر|ذئب|حصان|falcon|bird|animal|eagle|lion|tiger|wolf|horse/i.test(description) || !!documentAnalysis;
  const isPersonal = /تخيلني|تخيل نفسي|حولني|اجعلني|كيف أكون|imagine me|transform me/i.test(description);
  const isNature = /غابة|بحر|نهر|جبل|صحراء|forest|ocean|mountain|desert|nature/i.test(description) && !/صقر|طائر|حيوان|نملة|أسد|نمر|ذئب|حصان|falcon|bird|animal|eagle|lion|tiger|wolf|horse/i.test(description);
  // كشف الحيوانات والطيور كفئة مستقلة (أولوية عالية)
  const isAnimal = /صقر|طائر|حيوان|نملة|أسد|نمر|ذئب|حصان|قط|كلب|أرنب|غزال|نسر|حمامة|بومة|ببغاء|تمساح|دلفين|حوت|falcon|bird|eagle|lion|tiger|wolf|horse|cat|dog|rabbit|deer|owl|parrot|dolphin|whale|animal|creature/i.test(description);
  const isFantasy = !isAnimal && /خيال|سحر|تنين|magic|fantasy|dragon/i.test(description);
  const isHistorical = /تاريخ|قديم|حرب|معركة|فرسان|history|ancient|war|battle|knight/i.test(description);

  // بناء الـ system prompt المناسب حسب نوع الطلب
  let contentTypeGuidance = "";
  let promptStartRule = "";

  if (isArchitectural && !isPersonal && !isFantasy) {
    // معماري: استخدم الزوايا المعمارية والقيود الهندسية
    contentTypeGuidance = `ARCHITECTURAL MODE:
- ONE building/space seen from ${sceneCount} different angles
- Maintain geometric consistency across all scenes
- Add people for scale, environmental context
${geometricConstraint ? geometricConstraint + "\n" : ""}
For each scene, use EXACTLY this camera angle:
${selectedAngles.map((a, i) => `Scene ${i + 1}: ${a.camera} | Lighting: ${LIGHTING_MOODS[i % LIGHTING_MOODS.length]}`).join("\n")}`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic architectural visualization, award-winning photography,"`;
  } else if (isPersonal || faceDescription) {
    // تحويل شخصي: حافظ على ملامح الشخص مع تطبيق التحويل
    const faceConstraint = faceDescription
      ? `FACE IDENTITY LOCK — CRITICAL:\n- The subject is: ${faceDescription}\n- EVERY scene MUST feature this EXACT person with these EXACT features\n- Do NOT change face shape, eye color, hair color, or any distinctive features\n- The face must be recognizable as the same person across ALL scenes`
      : `PERSONAL TRANSFORMATION MODE:\n- The subject is a REAL PERSON — preserve their facial features, eye color, face shape`;
    contentTypeGuidance = `${faceConstraint}
- Apply the requested transformation (age, style, role, environment) while keeping identity recognizable
- Generate ${sceneCount} variations: different angles, expressions, lighting
- High-quality portrait photography style, cinematic quality`;
    promptStartRule = faceDescription
      ? `Start each prompt with: "Ultra photorealistic portrait photography, ${faceDescription},${""}"` 
      : `Start each prompt with: "Ultra photorealistic portrait photography, cinematic lighting,"`;
  } else if (isAnimal) {
    // حيوانات وطيور: التركيز الكامل على الكائن الحي
    contentTypeGuidance = `WILDLIFE PHOTOGRAPHY MODE — SUBJECT FOCUS:
- The MAIN SUBJECT is: "${mainSubject}" — it MUST be the CENTRAL element in EVERY scene
- DO NOT add buildings, architecture, or urban elements unless explicitly mentioned
- Generate ${sceneCount} cinematic views: close-up portrait, action shot, environmental context, dramatic angle, aerial/ground view
- Wildlife photography style: National Geographic quality, natural habitat, dramatic lighting
- The animal/bird must be clearly visible, detailed, and dominant in each frame
- Show the subject's natural behavior: flying, hunting, resting, in motion`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic wildlife photography, National Geographic quality, ${mainSubject} as the main subject,"`;
  } else if (isFantasy) {
    // خيال إبداعي: حرية كاملة، لا قيود
    contentTypeGuidance = `CREATIVE FANTASY MODE — NO LIMITS:
- Bring the imagination to life exactly as described
- Generate ${sceneCount} cinematic views of the same fantasy concept
- Different angles, scales, and lighting for maximum visual impact
- Surrealist photorealism: impossible things look absolutely real`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic surrealist photography, cinematic render,"`;
  } else if (isHistorical) {
    // تاريخي: واقعية تاريخية دقيقة
    contentTypeGuidance = `HISTORICAL REALISM MODE:
- Accurate historical details: costumes, weapons, architecture, environment
- Generate ${sceneCount} cinematic views of the historical scene
- Epic scale, dramatic lighting, documentary-style realism`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic historical scene, cinematic photography,"`;
  } else if (isNature) {
    // طبيعة: جمال طبيعي حقيقي
    contentTypeGuidance = `NATURE PHOTOGRAPHY MODE:
- Breathtaking natural environment, National Geographic quality
- Generate ${sceneCount} views: wide landscape, medium, close-up details
- Perfect natural lighting, atmospheric conditions`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic nature photography, National Geographic quality,"`;
  } else {
    // عام: أي شيء يطلبه المستخدم
    contentTypeGuidance = `UNIVERSAL CREATIVE MODE — NO RESTRICTIONS:
- Visualize EXACTLY what the user described, with full creative freedom
- Generate ${sceneCount} cinematic views of the same concept
- Different angles, lighting, and perspectives for visual richness
- The only rule: make it look absolutely real and cinematic`;
    promptStartRule = `Start each prompt with: "Ultra photorealistic cinematic render,"`;
  }

  const systemPrompt = `You are the world's greatest cinematic director and visual storyteller.
You can visualize ANYTHING: architecture, people, fantasy, history, nature, science, emotions — with no limits.
Your work surpasses Hollywood CGI studios in photorealism and artistic vision.

${SAFE_CONTENT_DIRECTIVE}

${contentTypeGuidance}

SUBJECT FIDELITY DIRECTIVE (critical — do not violate):
- The MAIN SUBJECT of the user's description MUST appear prominently in EVERY scene
- NEVER replace or omit the main subject with something else
- If the user describes a falcon, EVERY scene must show a falcon — not buildings, not landscapes alone
- If the user describes a building, EVERY scene must show that building
- Context and environment support the main subject, they do not replace it

AI ENRICHMENT DIRECTIVE (enhance, do not replace):
- Add atmospheric depth: haze, volumetric light, lens effects
- Add supporting context that COMPLEMENTS the main subject
- Add micro-details that make the scene feel real
- Each scene should feel like a frame from an award-winning film

Prompt rules:
1. ${promptStartRule}
2. Keep the SAME core concept in EVERY scene (consistency is critical)
3. Add unique lighting and camera angle for each scene
4. Include: "8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, photorealistic materials"
5. Each prompt should be 80-120 words for maximum quality

${previousFeedback ? `User refinement request: ${previousFeedback}` : ""}
${documentAnalysis ? `Document context: ${documentAnalysis.mainDescription}` : ""}

Respond ONLY with valid JSON:
{
  "title": "poetic title in the language of the description",
  "unifiedConcept": "single sentence describing the ONE concept being visualized",
  "culturalContext": "cultural/geographic context",
  "detectedLanguage": "ISO 639-1",
  "scenarioType": "design|develop|deteriorate|compare|imagine|transform|fantasy|historical|nature",
  "mainElements": ["el1", "el2", "el3"],
  "atmosphere": "overall atmosphere",
  "cinematicStyle": "cinematic style",
  "musicMood": "ambient|dramatic|peaceful|epic|mysterious|joyful",
  "scenes": [
    ${selectedAngles.map((a, i) => `{"type": "${a.type}", "label": "caption in the language of the description", "prompt": "Ultra photorealistic cinematic render...", "arabicCaption": "short poetic phrase in the language of the description", "lightingMood": "${LIGHTING_MOODS[i % LIGHTING_MOODS.length].split(",")[0]}"}`).join(",\n    ")}
  ]
}`;

  const userContent: any[] = [
    { type: "text", text: `Concept to visualize: ${description}` },
  ];

  if (referenceImageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: referenceImageUrl, detail: "high" },
    });
  }

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: referenceImageUrl ? userContent : userContent[0].text },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 4000,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content);

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("Invalid scenes");
    }

    return {
      ...parsed,
      scenarioType: parsed.scenarioType || "imagine",
      detectedLanguage: parsed.detectedLanguage || "ar",
      unifiedConcept: parsed.unifiedConcept || description,
    };
  } catch (err) {
    console.error("[KhayalRouter] LLM failed, using fallback:", err);

    // Keyword-based scenario inference
    let scenarioType = "imagine";
    const lower = description.toLowerCase();
    if (/جديد|new|nouveau|新|design|تصميم/.test(lower)) scenarioType = "design";
    else if (/تطوير|develop|future|مستقبل/.test(lower)) scenarioType = "develop";
    else if (/تدهور|decay|ruin|أطلال/.test(lower)) scenarioType = "deteriorate";
    else if (/مقارنة|compare|before|after/.test(lower)) scenarioType = "compare";

    const baseDesc = documentAnalysis?.mainDescription || description;
    const gc = geometricConstraint ? `, ${geometricConstraint.split("\n")[0]}` : "";

    return {
      title: description.slice(0, 60),
      culturalContext: documentAnalysis?.culturalContext || "Universal",
      detectedLanguage: /[\u0600-\u06FF]/.test(description) ? "ar" : "en",
      scenarioType,
      mainElements: documentAnalysis?.architecturalElements || [description.slice(0, 30)],
      atmosphere: "Dramatic cinematic",
      cinematicStyle: "Photorealistic",
      unifiedConcept: baseDesc,
      scenes: selectedAngles.map((angle, i) => ({
        type: angle.type,
        label: angle.label_ar,
        arabicCaption: ["حيث يبدأ الخيال", "من حيث ترى الطيور", "وجهاً لوجه", "من الزاوية", "عالم بداخل عالم", "الجمال في التفاصيل", "في سياقه", "من الأعلى"][i] || "مشهد",
        prompt: `Ultra photorealistic cinematic render, ${baseDesc}${gc}, ${angle.camera}, ${angle.timing}, 8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, award-winning architectural photography`,
      })),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// FILM DURATION CALCULATOR
// ═══════════════════════════════════════════════════════════════
export function calculateFilmRequirements(durationSeconds: number): {
  sceneCount: number;
  sceneDurationSec: number;
  estimatedGenerationMinutes: number;
  estimatedGenerationSeconds: number;
  batchSize: number;
  description: string;
  durationLabel: string;
} {
  // Minimum 5 seconds, no upper limit
  const clampedSeconds = Math.max(5, durationSeconds);

  // Each scene = 5-10s screen time depending on total duration
  // Short films (< 60s): 5s per scene for more scenes
  // Long films (>= 60s): 8s per scene
  const SCENE_SCREEN_TIME = clampedSeconds < 60 ? 5 : 8;
  const sceneCount = Math.max(1, Math.ceil(clampedSeconds / SCENE_SCREEN_TIME));

  // Parallel generation: all scenes generated simultaneously
  // Each image: ~20s average. With full parallelism, total = ~20s regardless of count
  // But API rate limits mean we batch: 8 parallel at a time
  const BATCH_SIZE = 8;
  const batches = Math.ceil(sceneCount / BATCH_SIZE);
  const AVG_GEN_TIME = 22; // seconds per batch
  const estGenSec = batches * AVG_GEN_TIME;
  const estimatedGenerationMinutes = Math.ceil(estGenSec / 60);

  // Human-readable duration label
  const mins = Math.floor(clampedSeconds / 60);
  const secs = clampedSeconds % 60;
  const durationLabel = mins > 0
    ? secs > 0 ? `${mins}م ${secs}ث` : `${mins} دقيقة`
    : `${secs} ثانية`;

  return {
    sceneCount,
    sceneDurationSec: SCENE_SCREEN_TIME,
    estimatedGenerationMinutes,
    estimatedGenerationSeconds: estGenSec,
    batchSize: BATCH_SIZE,
    durationLabel,
    description: `فيلم ${durationLabel} = ${sceneCount} مشهد | وقت التوليد المتوقع: ~${estGenSec < 60 ? estGenSec + ' ثانية' : estimatedGenerationMinutes + ' دقيقة'}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════
export const khayalRouter = router({

  // ── تقدير وقت الفيلم (قبل التوليد) ──
  estimateFilm: publicProcedure
    .input(z.object({
      durationSeconds: z.number().min(5), // لا حد أعلى
    }))
    .query(({ input }) => {
      return calculateFilmRequirements(input.durationSeconds);
    }),

  // ── فحص المحتوى الأخلاقي ──
  checkContent: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return checkContent(input.text, invokeLLM);
    }),

  // ── تحليل مستند (PDF / Word / صورة مخطط) ──
  analyzeDocument: publicProcedure
    .input(z.object({
      fileBase64: z.string(),
      mimeType: z.string(),
      imageUrl: z.string().url().optional(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const result = await analyzeDocument(buffer, input.mimeType, input.imageUrl);
      return result;
    }),

  // ── توليد المشهد الكامل ──
  generateScene: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      scenarioType: z.string().optional(),
      referenceImageUrl: z.string().url().optional(),
      title: z.string().optional(),
      previousFeedback: z.string().optional(),
      projectId: z.number().optional(),
      sceneCount: z.number().min(3).max(8).default(5),
      documentAnalysis: z.object({
        extractedText: z.string(),
        projectTitle: z.string(),
        projectType: z.string(),
        dimensions: z.array(z.object({ element: z.string(), value: z.string(), unit: z.string() })),
        architecturalElements: z.array(z.string()),
        geometricMass: z.object({
          shape: z.string(),
          estimatedWidth: z.string(),
          estimatedLength: z.string(),
          estimatedHeight: z.string(),
          floorCount: z.number(),
          setbacks: z.object({ front: z.string(), back: z.string(), left: z.string(), right: z.string() }),
        }),
        mainDescription: z.string(),
        culturalContext: z.string(),
        language: z.string(),
        confidence: z.number(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }: any) => {
      const db = await getDb();

      // ━━ فحص رصيد MOUSA.AI قبل التوليد ━━
      if (isMousaEnabled() && ctx?.user?.id) {
        const guard = await guardMousaBalance(ctx.user.id);
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      // ━━ كشف وجه الشخص إذا كانت الصورة تحتوي على شخص ━━
      let faceDescription: string | undefined;
      if (input.referenceImageUrl && isPersonImage(input.description, input.referenceImageUrl)) {
        console.log("[generateScene] Detecting face features from reference image...");
        faceDescription = await analyzeFaceFeatures(input.referenceImageUrl) || undefined;
        if (faceDescription) {
          console.log("[generateScene] Face locked:", faceDescription.slice(0, 80));
        }
      }

      const analysis = await deepAnalyzeDescription(
        input.description,
        input.referenceImageUrl,
        input.previousFeedback,
        input.documentAnalysis as DocumentAnalysisResult | undefined,
        input.sceneCount,
        faceDescription
      );

      let projectId: number | null = input.projectId || null;
      if (db) {
        if (projectId) {
          await db.update(khayalProjects)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(khayalProjects.id, projectId));
        } else {
          const [project] = await db.insert(khayalProjects).values({
            title: input.title || analysis.title || input.description.slice(0, 80),
            description: input.description,
            inputType: input.referenceImageUrl ? "mixed" : "text",
            scenarioType: (["design", "develop", "deteriorate", "compare", "imagine"].includes(analysis.scenarioType) ? analysis.scenarioType as "design" | "develop" | "deteriorate" | "compare" | "imagine" : "imagine"),
            inputData: {
              description: input.description,
              referenceImageUrl: input.referenceImageUrl,
              culturalContext: analysis.culturalContext,
              cinematicStyle: analysis.cinematicStyle,
              detectedLanguage: analysis.detectedLanguage,
              unifiedConcept: analysis.unifiedConcept,
              documentAnalysis: input.documentAnalysis,
            },
            status: "processing",
          });
          projectId = (project as any).insertId;
        }
      }

      // توليد الصور بشكل متوازٍ
      const generatedScenes = await Promise.allSettled(
        analysis.scenes.map(async (scene, index) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" as const }]
            : undefined;

          const { url } = await generateImage({
            prompt: scene.prompt,
            originalImages,
          });

          if (db && projectId) {
            await db.insert(khayalScenes).values({
              projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: scene.prompt,
              arabicCaption: scene.arabicCaption || "",
              order: index,
            });
          }

          return {
            type: scene.type,
            label: scene.label,
            imageUrl: url,
            prompt: scene.prompt,
            arabicCaption: scene.arabicCaption || "",
            order: index,
          };
        })
      );

      if (db && projectId) {
        await db.update(khayalProjects)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(khayalProjects.id, projectId));
      }

      const successfulScenes = generatedScenes
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value);

      // ━━ خصم كريدتس MOUSA.AI بعد نجاح التوليد ━━
      if (isMousaEnabled() && (ctx as any)?.user?.id && successfulScenes.length > 0) {
        await deductMousaCredits(
          (ctx as any).user.id,
          `خيال — توليد ${successfulScenes.length} مشهد: ${input.description.slice(0, 60)}`
        );
      }

      return {
        projectId,
        scenes: successfulScenes,
        description: input.description,
        scenarioType: analysis.scenarioType,
        title: analysis.title,
        culturalContext: analysis.culturalContext,
        atmosphere: analysis.atmosphere,
        cinematicStyle: analysis.cinematicStyle,
        mainElements: analysis.mainElements,
        detectedLanguage: analysis.detectedLanguage,
        unifiedConcept: analysis.unifiedConcept,
      };
    }),

  // ── توليد فيلم إخراجي طويل (دفعات) ──
  generateFilm: protectedProcedure
    .input(z.object({
      description: z.string().min(2),
      durationMinutes: z.number().min(1).max(120),
      referenceImageUrl: z.string().url().optional(),
      documentAnalysis: z.any().optional(),
      batchIndex: z.number().default(0),   // للتوليد على دفعات
      projectId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const filmReqs = calculateFilmRequirements(input.durationMinutes);

      // حساب المشاهد لهذه الدفعة
      const BATCH_SIZE = filmReqs.batchSize;
      const startIdx = input.batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, filmReqs.sceneCount);
      const batchSceneCount = endIdx - startIdx;

      if (batchSceneCount <= 0) {
        return { scenes: [], isComplete: true, projectId: input.projectId };
      }

      // ━━ كشف وجه الشخص في الدفعة الأولى فقط ━━
      let faceDescription: string | undefined;
      if (input.referenceImageUrl && input.batchIndex === 0 && isPersonImage(input.description, input.referenceImageUrl)) {
        faceDescription = await analyzeFaceFeatures(input.referenceImageUrl) || undefined;
        if (faceDescription) console.log("[generateFilm] Face locked:", faceDescription.slice(0, 80));
      }

      // توليد الـ prompts للدفعة الحالية
      const analysis = await deepAnalyzeDescription(
        input.description,
        input.referenceImageUrl,
        undefined,
        input.documentAnalysis as DocumentAnalysisResult | undefined,
        batchSceneCount,
        faceDescription
      );

      // إنشاء/تحديث المشروع
      let projectId: number | null = input.projectId || null;
      if (db && !projectId) {
        const [project] = await db.insert(khayalProjects).values({
          title: analysis.title || input.description.slice(0, 80),
          description: input.description,
          inputType: input.referenceImageUrl ? "mixed" : "text",
          scenarioType: (["design", "develop", "deteriorate", "compare", "imagine"].includes(analysis.scenarioType) ? analysis.scenarioType as "design" | "develop" | "deteriorate" | "compare" | "imagine" : "imagine"),
          inputData: {
            description: input.description,
            durationMinutes: input.durationMinutes,
            totalScenes: filmReqs.sceneCount,
            unifiedConcept: analysis.unifiedConcept,
          },
          status: "processing",
        });
        projectId = (project as any).insertId;
      }

      // توليد صور الدفعة
      const generatedScenes = await Promise.allSettled(
        analysis.scenes.map(async (scene, i) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" as const }]
            : undefined;

          const { url } = await generateImage({
            prompt: scene.prompt,
            originalImages,
          });

          if (db && projectId) {
            await db.insert(khayalScenes).values({
              projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: scene.prompt,
              arabicCaption: scene.arabicCaption || "",
              order: startIdx + i,
            });
          }

          return {
            type: scene.type,
            label: scene.label,
            imageUrl: url,
            prompt: scene.prompt,
            arabicCaption: scene.arabicCaption || "",
            order: startIdx + i,
          };
        })
      );

      const isComplete = endIdx >= filmReqs.sceneCount;
      if (db && projectId && isComplete) {
        await db.update(khayalProjects)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(khayalProjects.id, projectId));
      }

      return {
        projectId,
        scenes: generatedScenes
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map(r => r.value),
        batchIndex: input.batchIndex,
        totalScenes: filmReqs.sceneCount,
        isComplete,
        progress: Math.round((endIdx / filmReqs.sceneCount) * 100),
        scenarioType: analysis.scenarioType,
        title: analysis.title,
        culturalContext: analysis.culturalContext,
        unifiedConcept: analysis.unifiedConcept,
        detectedLanguage: analysis.detectedLanguage,
        cinematicStyle: analysis.cinematicStyle,
        atmosphere: analysis.atmosphere,
        mainElements: analysis.mainElements,
        filmRequirements: filmReqs,
      };
    }),

  // ── تحسين المشهد ──
  refineScene: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      feedback: z.string().min(3),
      sceneType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      const projects = await db.select().from(khayalProjects)
        .where(eq(khayalProjects.id, input.projectId)).limit(1);

      if (!projects.length) throw new Error("المشروع غير موجود");
      const project = projects[0];
      const inputData = project.inputData as any;

      const analysis = await deepAnalyzeDescription(
        project.description || "",
        inputData?.referenceImageUrl,
        input.feedback,
        undefined,
        5
      );

      await db.update(khayalProjects)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(khayalProjects.id, input.projectId));

      const scenesToRefine = input.sceneType
        ? analysis.scenes.filter(s => s.type === input.sceneType)
        : analysis.scenes;

      const generatedScenes = await Promise.allSettled(
        scenesToRefine.map(async (scene, index) => {
          const { url } = await generateImage({
            prompt: `${scene.prompt}, refined: ${input.feedback}`,
          });

          if (db) {
            await db.insert(khayalScenes).values({
              projectId: input.projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: scene.prompt,
              arabicCaption: scene.arabicCaption || "",
              order: index + 100,
            });
          }

          return {
            type: scene.type,
            label: scene.label,
            imageUrl: url,
            prompt: scene.prompt,
            arabicCaption: scene.arabicCaption || "",
          };
        })
      );

      await db.update(khayalProjects)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(khayalProjects.id, input.projectId));

      return {
        scenes: generatedScenes
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map(r => r.value),
        feedback: input.feedback,
      };
    }),

  // ── جلب المشاريع ──
  getProjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(khayalProjects)
      .orderBy(desc(khayalProjects.createdAt))
      .limit(20);
  }),

  // ── جلب مشاهد مشروع ──
  getProjectScenes: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(khayalScenes)
        .where(eq(khayalScenes.projectId, input.projectId))
        .orderBy(khayalScenes.order);
    }),

  // ══════════════════════════════════════════════════════════════
  // المقوم 1: تحليل المحتوى وخطة الفيلم
  // ══════════════════════════════════════════════════════════════
  analyzeDomain: publicProcedure
    .input(z.object({
      description: z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      // كشف سريع بدون AI أولاً
      const quickDomain = quickDetectDomain(input.description);

      // تحليل عميق بالـ AI
      const analysis = await analyzeDomain(input.description);

      return {
        ...analysis,
        quickDomain, // للمقارنة
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // المقوم 2: توليد السيناريو الكامل
  // ══════════════════════════════════════════════════════════════
  generateScript: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      domainAnalysis: z.any().optional(), // إذا تم التحليل مسبقاً
    }))
    .mutation(async ({ input }) => {
      // إذا لم يكن هناك تحليل مسبق، نحلل الآن
      const analysis: DomainAnalysis = input.domainAnalysis ||
        await analyzeDomain(input.description);

      const script = await generateScript(input.description, analysis);

      return {
        script,
        analysis,
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // وضع "أنا هناك" — جولة غمر 360° من داخل أي بيئة
  // ══════════════════════════════════════════════════════════════
  immersiveView: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      referenceImageUrl: z.string().url().optional(),
      language: z.enum(["ar", "en"]).optional().default("ar"),
    }))
    .mutation(async ({ input }) => {
      // 1. فحص المحتوى الأخلاقي
      const contentCheck = await checkContent(input.description, invokeLLM);
      if (!contentCheck.allowed) {
        throw new Error(contentCheck.message || "المحتوى غير مناسب");
      }

      // 2. تحليل البيئة وتوليد 6 زوايا غمرية بالـ LLM
      const systemPrompt = `You are the world's greatest immersive experience director.
You specialize in placing the viewer INSIDE any environment — no matter how small, large, real, or imaginary.

${SAFE_CONTENT_DIRECTIVE}

TASK: The user wants to be placed INSIDE the described environment.
Generate 6 immersive camera angles as if the viewer IS THERE, experiencing it from within.

IMMERSIVE ANGLE TYPES:
1. eye_level — Standing/floating at eye level inside the environment, looking forward
2. look_up — Looking straight up from inside (ceiling, sky, canopy, stars above)
3. look_down — Looking straight down at the ground/floor beneath
4. look_back — Turning around 180°, seeing what's behind
5. close_detail — Extreme close-up of a fascinating detail in the environment
6. panoramic — Wide 360° panoramic view showing the full environment all around

FOR EACH ANGLE:
- The viewer IS INSIDE the environment (first-person or very close third-person)
- Include sensory details: light quality, atmosphere, scale, textures
- Make it feel REAL and IMMERSIVE
- Adapt scale: if inside a shell = macro photography scale; if inside a forest = human scale; if inside an atom = quantum visualization

Rules for prompts:
- Start with: "Ultra photorealistic immersive first-person view, inside [environment],"
- Include: the specific angle description
- Include: "8K resolution, ultra-detailed, volumetric lighting, photorealistic, immersive atmosphere, cinematic quality"
- 60-100 words per prompt

Respond ONLY with valid JSON:
{
  "title": "poetic Arabic title for this immersive experience",
  "titleEn": "English title",
  "environment": "brief description of the environment type",
  "detectedLanguage": "ISO 639-1",
  "immersiveAngles": [
    {
      "type": "eye_level|look_up|look_down|look_back|close_detail|panoramic",
      "label_ar": "Arabic label",
      "label_en": "English label",
      "prompt": "full image generation prompt",
      "caption_ar": "short poetic Arabic caption"
    }
  ]
}`;

      let angles: Array<{ type: string; label_ar: string; label_en: string; prompt: string; caption_ar: string }>;

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Place me inside: ${input.description}` },
          ],
          responseFormat: { type: "json_object" },
          maxTokens: 3000,
        });
        const content = typeof result.choices[0].message.content === "string"
          ? result.choices[0].message.content
          : JSON.stringify(result.choices[0].message.content);
        const parsed = JSON.parse(content);
        angles = parsed.immersiveAngles || [];

        // 3. توليد الصور بالتوازي
        const generatedAngles = await Promise.allSettled(
          angles.map(async (angle) => {
            const { url } = await generateImage({ prompt: angle.prompt });
            return {
              type: angle.type,
              label_ar: angle.label_ar,
              label_en: angle.label_en,
              caption_ar: angle.caption_ar,
              imageUrl: url,
              prompt: angle.prompt,
            };
          })
        );

        const successfulAngles = generatedAngles
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
          .map(r => r.value);

        return {
          title: parsed.title || input.description.slice(0, 60),
          titleEn: parsed.titleEn || input.description.slice(0, 60),
          environment: parsed.environment || input.description,
          detectedLanguage: parsed.detectedLanguage || "ar",
          angles: successfulAngles,
          description: input.description,
        };
      } catch (err) {
        console.error("[ImmersiveView] Failed:", err);
        throw new Error("فشل توليد الجولة الغمرية. حاول مرة أخرى.");
      }
    }),

  // ══════════════════════════════════════════════════════════════
  // المقوم 1+2+3: توليد كامل بالمحركات الجديدة
  // ══════════════════════════════════════════════════════════════
  generateWithDomainEngine: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      referenceImageUrl: z.string().url().optional(),
      visualMode: z.enum(["free", "cinematic", "realistic", "precise"]).default("cinematic"),
    }))
    .mutation(async ({ input, ctx }: any) => {
      // ━━ فحص رصيد MOUSA.AI قبل التوليد ━━
      if (isMousaEnabled() && ctx?.user?.id) {
        const guard = await guardMousaBalance(ctx.user.id);
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      // ━━ كشف وجه الشخص إذا كانت الصورة تحتوي على شخص ━━
      let faceDescription: string | undefined;
      if (input.referenceImageUrl && isPersonImage(input.description, input.referenceImageUrl)) {
        faceDescription = await analyzeFaceFeatures(input.referenceImageUrl) || undefined;
        if (faceDescription) console.log("[generateWithDomainEngine] Face locked:", faceDescription.slice(0, 80));
      }

      // المقوم 1: تحليل المحتوى
      const analysis = await analyzeDomain(input.description);

      // المقوم 2: كتابة السيناريو
      const script = await generateScript(input.description, analysis);

      // المقوم 3: بناء prompts الصور المخصصة
      const unifiedConcept = input.description;
      // إذا كان هناك وصف وجه، أضفه كقيد ثابت في بداية كل prompt
      const facePrefix = faceDescription
        ? `Ultra photorealistic portrait photography, ${faceDescription}, same person in every scene, consistent facial features,`
        : "";

      // توليد الصور بشكل متوازٍ
      const generatedScenes = await Promise.allSettled(
        analysis.sceneOutline.map(async (sceneOutline, index) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" as const }]
            : undefined;

          // بناء prompt مخصص للمجال
          const domainPrompt = buildDomainPrompt(sceneOutline, analysis, unifiedConcept);

          // إضافة قيود الوضع البصري
          const modeConstraints: Record<string, string> = {
            free: "",
            cinematic: "cinematic color grading, dramatic lighting, film quality,",
            realistic: "photorealistic, true-to-life, accurate proportions,",
            precise: "architectural precision, exact proportions, technical accuracy,",
          };
          const modeConstraint = modeConstraints[input.visualMode] ?? "";

          const finalPrompt = facePrefix
            ? `${facePrefix} ${domainPrompt} ${modeConstraint}`.trim()
            : `${domainPrompt} ${modeConstraint}`.trim();

          const { url } = await generateImage({
            prompt: finalPrompt,
            originalImages,
          });

          // الحصول على النص من السيناريو
          const scriptScene = script.scenes[index];

          return {
            type: `scene_${index}`,
            label: sceneOutline.title.ar,
            labelEn: sceneOutline.title.en,
            imageUrl: url,
            prompt: finalPrompt,
            arabicCaption: sceneOutline.educationalFact?.ar || sceneOutline.narrativeText?.ar || "",
            englishCaption: sceneOutline.educationalFact?.en || sceneOutline.narrativeText?.en || "",
            narration: scriptScene?.narration,
            educationalFact: scriptScene?.educationalFact,
            storyText: scriptScene?.storyText,
            displayText: scriptScene?.displayText,
            duration: sceneOutline.duration,
            order: index,
          };
        })
      );

      const successfulScenes = generatedScenes
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value);

      // ━━ خصم كريدتس MOUSA.AI بعد نجاح التوليد ━━
      if (isMousaEnabled() && (ctx as any)?.user?.id && successfulScenes.length > 0) {
        await deductMousaCredits(
          (ctx as any).user.id,
          `خيال — توليد بالمحرك المتقدم: ${input.description.slice(0, 60)}`
        );
      }

      return {
        scenes: successfulScenes,
        description: input.description,
        title: analysis.filmTitle.ar,
        titleEn: analysis.filmTitle.en,
        synopsis: analysis.filmSynopsis.ar,
        synopsisEn: analysis.filmSynopsis.en,
        domain: analysis.primaryDomain,
        filmTone: analysis.filmTone,
        audienceLevel: analysis.audienceLevel,
        detectedLanguage: analysis.detectedLanguage,
        musicMood: analysis.musicMood,
        script,
        analysis,
        // للتوافق مع الواجهة القديمة
        scenarioType: "imagine",
        culturalContext: analysis.keyThemes.join(", "),
        atmosphere: analysis.emotionalArc,
        cinematicStyle: analysis.visualStyle,
        mainElements: analysis.keyThemes,
        unifiedConcept: input.description,
      };
    }),
});

// ══════════════════════════════════════════════════════════════
// NOTE: The router export above closes with }); — we need to
// add video procedures. We'll create a separate videoRouter.
// ══════════════════════════════════════════════════════════════
