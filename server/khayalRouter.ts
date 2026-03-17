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
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { khayalProjects, khayalScenes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeDocument } from "./documentAnalyzer";
import type { DocumentAnalysisResult } from "./documentAnalyzer";

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
// DEEP AI ANALYSIS — تحليل عميق + فكرة واحدة من زوايا متعددة
// ═══════════════════════════════════════════════════════════════
async function deepAnalyzeDescription(
  description: string,
  referenceImageUrl?: string,
  previousFeedback?: string,
  documentAnalysis?: DocumentAnalysisResult,
  sceneCount: number = 5
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

  const systemPrompt = `You are a world-class cinematic director and architectural visualization expert.

FUNDAMENTAL PRINCIPLE: Generate ${sceneCount} views of THE SAME SINGLE ARCHITECTURAL CONCEPT from different camera angles.
- ONE building / ONE space / ONE concept
- MULTIPLE camera angles and lighting conditions
- NO different buildings or different concepts per scene
- The viewer should clearly recognize it's the same place from all angles

${geometricConstraint ? geometricConstraint + "\n" : ""}

For each scene, use EXACTLY this camera angle and timing:
${selectedAngles.map((a, i) => `Scene ${i + 1}: ${a.camera} | ${a.timing}`).join("\n")}

Prompt rules:
1. Start with "Ultra photorealistic cinematic render,"
2. Include the SAME building description in EVERY scene (consistency is critical)
3. Add the specific camera angle and lighting for each scene
4. Include: "8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting"
5. Add people/life for scale and realism
6. NEVER change the building's fundamental geometry between scenes

${previousFeedback ? `User refinement: ${previousFeedback}` : ""}
${documentAnalysis ? `Document context: ${documentAnalysis.mainDescription}` : ""}

Respond ONLY with valid JSON:
{
  "title": "poetic project title",
  "unifiedConcept": "single sentence describing the ONE concept being visualized",
  "culturalContext": "cultural/geographic context",
  "detectedLanguage": "ISO 639-1",
  "scenarioType": "design|develop|deteriorate|compare|imagine",
  "mainElements": ["el1", "el2", "el3"],
  "atmosphere": "overall atmosphere",
  "cinematicStyle": "cinematic style",
  "scenes": [
    ${selectedAngles.map((a, i) => `{"type": "${a.type}", "label": "${a.label_ar}", "prompt": "Ultra photorealistic...", "arabicCaption": "short poetic Arabic phrase"}`).join(",\n    ")}
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
export function calculateFilmRequirements(durationMinutes: number): {
  sceneCount: number;
  sceneDurationSec: number;
  estimatedGenerationMinutes: number;
  batchSize: number;
  description: string;
} {
  // Each scene = ~8 seconds of screen time + 2s transition = 10s total
  const SCENE_SCREEN_TIME = 10; // seconds
  const totalSeconds = durationMinutes * 60;
  const sceneCount = Math.ceil(totalSeconds / SCENE_SCREEN_TIME);

  // Each image takes ~15-25 seconds to generate (average 20s)
  const AVG_GEN_TIME = 20; // seconds per image
  // We generate in parallel batches of 5
  const BATCH_SIZE = 5;
  const batches = Math.ceil(sceneCount / BATCH_SIZE);
  const estimatedGenerationSeconds = batches * AVG_GEN_TIME * BATCH_SIZE / BATCH_SIZE + batches * 5;
  const estimatedGenerationMinutes = Math.ceil(estimatedGenerationSeconds / 60);

  return {
    sceneCount,
    sceneDurationSec: SCENE_SCREEN_TIME,
    estimatedGenerationMinutes,
    batchSize: BATCH_SIZE,
    description: `فيلم ${durationMinutes} دقيقة = ${sceneCount} مشهد، وقت التوليد المتوقع: ~${estimatedGenerationMinutes} دقيقة`,
  };
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════
export const khayalRouter = router({

  // ── تقدير وقت الفيلم (قبل التوليد) ──
  estimateFilm: publicProcedure
    .input(z.object({
      durationMinutes: z.number().min(1).max(120),
    }))
    .query(({ input }) => {
      return calculateFilmRequirements(input.durationMinutes);
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
    .mutation(async ({ input }) => {
      const db = await getDb();

      const analysis = await deepAnalyzeDescription(
        input.description,
        input.referenceImageUrl,
        input.previousFeedback,
        input.documentAnalysis as DocumentAnalysisResult | undefined,
        input.sceneCount
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
            scenarioType: (analysis.scenarioType as "design" | "develop" | "deteriorate" | "compare" | "imagine") || "imagine",
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
  generateFilm: publicProcedure
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

      // توليد الـ prompts للدفعة الحالية
      const analysis = await deepAnalyzeDescription(
        input.description,
        input.referenceImageUrl,
        undefined,
        input.documentAnalysis as DocumentAnalysisResult | undefined,
        batchSceneCount
      );

      // إنشاء/تحديث المشروع
      let projectId: number | null = input.projectId || null;
      if (db && !projectId) {
        const [project] = await db.insert(khayalProjects).values({
          title: analysis.title || input.description.slice(0, 80),
          description: input.description,
          inputType: input.referenceImageUrl ? "mixed" : "text",
          scenarioType: (analysis.scenarioType as "design" | "develop" | "deteriorate" | "compare" | "imagine") || "imagine",
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
  refineScene: publicProcedure
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
});
