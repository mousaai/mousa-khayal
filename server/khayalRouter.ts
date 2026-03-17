/**
 * khayalRouter.ts — محرك الذكاء المتقدم لمنصة خيال
 * يحلل الوصف بعمق بأي لغة، يستنتج السيناريو تلقائياً،
 * يولّد مشاهد سينمائية فوتوريالستيك بمستوى هوليوود
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { khayalProjects, khayalScenes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════
// DEEP AI ANALYSIS — متعدد اللغات، استنتاج تلقائي للسيناريو
// ═══════════════════════════════════════════════════════════════════════════
async function deepAnalyzeDescription(
  description: string,
  referenceImageUrl?: string,
  previousFeedback?: string
): Promise<{
  title: string;
  culturalContext: string;
  mainElements: string[];
  atmosphere: string;
  scenarioType: string;
  scenes: Array<{ type: string; label: string; prompt: string; arabicCaption: string }>;
  cinematicStyle: string;
  detectedLanguage: string;
}> {

  const systemPrompt = `You are a world-class cinematic director and architectural visualization expert with deep knowledge of ALL world cultures, architectural styles, and artistic traditions.

Your task: Analyze the provided description (in ANY language) and generate 5 photorealistic cinematic scenes at Hollywood level.

CRITICAL RULES:
1. Detect the language and cultural context automatically from the description
2. Infer the scenario type automatically from the description:
   - "design" → new design, fresh concept, modern, innovative
   - "develop" → development, prosperity, growth, future flourishing
   - "deteriorate" → decay, aging, ruins, abandonment, time erosion
   - "compare" → before/after, time comparison, transformation
   - "imagine" → free imagination, sci-fi, fantasy, any creative concept
3. Generate prompts in ENGLISH for maximum image quality
4. Each prompt MUST start with "Ultra photorealistic cinematic render,"
5. Include specific cultural/architectural details matching the description
6. Vary camera angles: wide establishing, aerial drone, eye-level, close-up detail, atmospheric
7. Add dramatic lighting: golden hour, blue hour, storm light, soft dawn, dramatic shadows
8. Always include: "8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, award-winning photography"
9. Add people/life to scenes for realism
10. Arabic captions should be poetic short phrases (even if description is in another language)

${previousFeedback ? `User refinement feedback: ${previousFeedback}` : ""}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "title": "poetic title in the description's language",
  "culturalContext": "detected cultural/geographic context",
  "detectedLanguage": "ISO 639-1 code (ar/en/ja/fr/zh/it/es/hi)",
  "scenarioType": "design|develop|deteriorate|compare|imagine",
  "mainElements": ["element1", "element2", "element3"],
  "atmosphere": "overall atmosphere description",
  "cinematicStyle": "chosen cinematic style",
  "scenes": [
    {"type": "exterior", "label": "label in description language", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة"},
    {"type": "aerial", "label": "label in description language", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة"},
    {"type": "interior", "label": "label in description language", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة"},
    {"type": "detail", "label": "label in description language", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة"},
    {"type": "atmosphere", "label": "label in description language", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة"}
  ]
}`;

  const userContent: any[] = [
    { type: "text", text: `Description: ${description}` },
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
        { role: "user", content: referenceImageUrl ? userContent : `Description: ${description}` },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 3500,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content);

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("Invalid scenes structure");
    }

    return {
      ...parsed,
      scenarioType: parsed.scenarioType || "imagine",
      detectedLanguage: parsed.detectedLanguage || "ar",
    };
  } catch (err) {
    console.error("[KhayalRouter] LLM analysis failed, using fallback:", err);

    // Intelligent fallback based on keywords
    let scenarioType = "imagine";
    const lowerDesc = description.toLowerCase();
    if (/جديد|new|nouveau|新|nuevo|नया|design|تصميم/.test(lowerDesc)) scenarioType = "design";
    else if (/تطوير|develop|développer|開発|desarrollo|विकास|future|مستقبل/.test(lowerDesc)) scenarioType = "develop";
    else if (/تدهور|decay|dégradation|廃墟|deterioro|खंडहर|ruin|أطلال/.test(lowerDesc)) scenarioType = "deteriorate";
    else if (/مقارنة|compare|avant|before|after|比較|comparar/.test(lowerDesc)) scenarioType = "compare";

    return {
      title: description.slice(0, 60),
      culturalContext: "Universal",
      detectedLanguage: /[\u0600-\u06FF]/.test(description) ? "ar" : "en",
      scenarioType,
      mainElements: [description.slice(0, 30)],
      atmosphere: "Dramatic cinematic",
      cinematicStyle: "Photorealistic",
      scenes: [
        {
          type: "exterior", label: "Exterior View", arabicCaption: "حيث يبدأ الخيال",
          prompt: `Ultra photorealistic cinematic render, ${description}, golden hour lighting, wide establishing shot, people walking, 8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, award-winning architectural photography`,
        },
        {
          type: "aerial", label: "Aerial View", arabicCaption: "من حيث ترى الطيور",
          prompt: `Ultra photorealistic aerial drone view, ${description}, dramatic sky with clouds, bird's eye perspective, 8K, cinematic, ultra-detailed, volumetric lighting, DJI Mavic Pro photography`,
        },
        {
          type: "interior", label: "Interior Space", arabicCaption: "عالم بداخل عالم",
          prompt: `Ultra photorealistic interior architectural render, ${description}, warm ambient lighting, people inside, ultra-detailed, 8K, cinematic photography, depth of field, interior design magazine quality`,
        },
        {
          type: "detail", label: "Architectural Detail", arabicCaption: "الجمال في التفاصيل",
          prompt: `Ultra photorealistic close-up architectural detail, ${description}, sharp focus, dramatic shadows, macro lens, 8K, ultra-detailed, material texture, craftsmanship`,
        },
        {
          type: "atmosphere", label: "Atmospheric Scene", arabicCaption: "لحظة تسكن الذاكرة",
          prompt: `Ultra photorealistic atmospheric cinematic scene, ${description}, moody dramatic lighting, blue hour, people silhouettes, 8K, film photography style, cinematic color grading, fog and mist`,
        },
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const khayalRouter = router({

  // ── توليد المشهد الكامل ──
  generateScene: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      scenarioType: z.string().optional(), // ignored — AI infers automatically
      referenceImageUrl: z.string().url().optional(),
      title: z.string().optional(),
      previousFeedback: z.string().optional(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // 1. تحليل عميق بالذكاء الاصطناعي (متعدد اللغات + استنتاج تلقائي)
      const analysis = await deepAnalyzeDescription(
        input.description,
        input.referenceImageUrl,
        input.previousFeedback
      );

      // 2. إنشاء مشروع في قاعدة البيانات
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
            },
            status: "processing",
          });
          projectId = (project as any).insertId;
        }
      }

      // 3. توليد الصور بشكل متوازٍ
      const generatedScenes = await Promise.allSettled(
        analysis.scenes.map(async (scene, index) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" as const }]
            : undefined;

          const enhancedPrompt = `${scene.prompt}, ${analysis.cinematicStyle} style, ${analysis.atmosphere}`;

          const { url } = await generateImage({
            prompt: enhancedPrompt,
            originalImages,
          });

          if (db && projectId) {
            await db.insert(khayalScenes).values({
              projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: enhancedPrompt,
              arabicCaption: scene.arabicCaption || "",
              order: index,
            });
          }

          return {
            type: scene.type,
            label: scene.label,
            imageUrl: url,
            prompt: enhancedPrompt,
            arabicCaption: scene.arabicCaption || "",
            order: index,
          };
        })
      );

      // 4. تحديث حالة المشروع
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
      };
    }),

  // ── تحسين المشهد (حلقة ذاتية) ──
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
        input.feedback
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

  // ── جلب المشاريع السابقة ──
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
