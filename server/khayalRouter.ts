/**
 * khayalRouter.ts — محرك الذكاء المتقدم لمنصة خيال
 * يحلل الوصف بعمق، يولّد مشاهد سينمائية فوتوريالستيك،
 * ويدعم حلقة تحسين ذاتي وذاكرة المستخدم
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { khayalProjects, khayalScenes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ===== تحليل الوصف العميق بالذكاء الاصطناعي =====
async function deepAnalyzeDescription(
  description: string,
  scenarioType: string,
  referenceImageUrl?: string,
  previousFeedback?: string
): Promise<{
  title: string;
  culturalContext: string;
  mainElements: string[];
  atmosphere: string;
  scenes: Array<{ type: string; label: string; prompt: string; arabicCaption: string }>;
  cinematicStyle: string;
}> {

  const scenarioInstructions: Record<string, string> = {
    design: "تصميم جديد ومبتكر، حديث وفاخر، مع إضاءة ذهبية عند الغروب، نظيف وعصري",
    develop: "تطوير وتحسين المكان، مستقبل مزدهر بعد 20 سنة من التطوير والنمو والازدهار",
    deteriorate: "تدهور وتقادم وإهمال، تآكل الزمن، أجواء درامية كئيبة، أطلال وذكريات",
    compare: "مقارنة زمنية واضحة، قبل وبعد، تحول درامي من الماضي إلى المستقبل",
    imagine: "خيال إبداعي حر بلا حدود، أي شيء ممكن، مبهر وغير متوقع، فريد من نوعه",
  };

  const scenarioDesc = scenarioInstructions[scenarioType] || scenarioInstructions.imagine;

  const systemPrompt = `أنت مخرج سينمائي عالمي خبير ومصمم معماري بارع، تفهم كل ثقافات العالم وأساليبها المعمارية والفنية.
مهمتك: تحليل الوصف المقدم بعمق وتوليد 5 مشاهد سينمائية فوتوريالستيك احترافية بمستوى هوليوود.

السيناريو: ${scenarioDesc}
${previousFeedback ? `\nملاحظات التحسين من المستخدم: ${previousFeedback}` : ""}

قواعد توليد الـ prompts:
1. ابدأ كل prompt بـ "Ultra photorealistic cinematic render,"
2. أضف السياق الثقافي والمعماري المحدد
3. أضف تفاصيل الإضاءة الدرامية (golden hour / blue hour / dramatic storm / soft dawn)
4. أضف أسلوب الكاميرا (wide establishing shot / aerial drone / eye-level / macro detail / tracking shot)
5. أضف جودة الصورة: "8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, award-winning architectural photography"
6. أضف بشر وحياة في المشاهد لإضفاء الواقعية
7. اجعل كل مشهد مختلفاً تماماً ومكملاً للآخر

أعد JSON بهذا الشكل بالضبط (لا تضف أي نص خارج الـ JSON):
{
  "title": "عنوان شعري للمشروع بالعربية",
  "culturalContext": "السياق الثقافي والجغرافي المستنتج",
  "mainElements": ["عنصر1", "عنصر2", "عنصر3"],
  "atmosphere": "وصف الأجواء العامة",
  "cinematicStyle": "الأسلوب السينمائي المختار",
  "scenes": [
    {"type": "exterior", "label": "المنظر الخارجي", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة بالعربية"},
    {"type": "aerial", "label": "المنظر الجوي", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة بالعربية"},
    {"type": "interior", "label": "الفضاء الداخلي", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة بالعربية"},
    {"type": "detail", "label": "التفاصيل المعمارية", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة بالعربية"},
    {"type": "atmosphere", "label": "الأجواء والمشهد", "prompt": "Ultra photorealistic...", "arabicCaption": "جملة شعرية قصيرة بالعربية"}
  ]
}`;

  const userContent: any[] = [
    { type: "text", text: `الوصف: ${description}` },
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
        { role: "user", content: referenceImageUrl ? userContent : `الوصف: ${description}` },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 3000,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content);

    // التحقق من صحة البيانات
    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("Invalid scenes structure");
    }

    return parsed;
  } catch (err) {
    console.error("[KhayalRouter] LLM analysis failed, using fallback:", err);
    // Fallback احترافي
    return {
      title: description.slice(0, 60),
      culturalContext: "عالمي",
      mainElements: [description.slice(0, 30)],
      atmosphere: "سينمائي درامي",
      cinematicStyle: "فوتوريالستيك",
      scenes: [
        { type: "exterior", label: "المنظر الخارجي", arabicCaption: "حيث يبدأ الخيال",
          prompt: `Ultra photorealistic cinematic render, ${description}, golden hour lighting, wide establishing shot, 8K resolution, ultra-detailed, cinematic color grading, depth of field, volumetric lighting, award-winning architectural photography` },
        { type: "aerial", label: "المنظر الجوي", arabicCaption: "من حيث ترى الطيور",
          prompt: `Ultra photorealistic aerial drone view, ${description}, dramatic sky with clouds, bird's eye perspective, 8K, cinematic, ultra-detailed, volumetric lighting` },
        { type: "interior", label: "الفضاء الداخلي", arabicCaption: "عالم بداخل عالم",
          prompt: `Ultra photorealistic interior architectural render, ${description}, warm ambient lighting, people inside, ultra-detailed, 8K, cinematic photography, depth of field` },
        { type: "detail", label: "التفاصيل المعمارية", arabicCaption: "الجمال في التفاصيل",
          prompt: `Ultra photorealistic close-up architectural detail, ${description}, sharp focus, dramatic shadows, macro lens, 8K, ultra-detailed` },
        { type: "atmosphere", label: "الأجواء والمشهد", arabicCaption: "لحظة تسكن الذاكرة",
          prompt: `Ultra photorealistic atmospheric cinematic scene, ${description}, moody dramatic lighting, blue hour, people silhouettes, 8K, film photography style, cinematic color grading` },
      ],
    };
  }
}

// ===== Router =====
export const khayalRouter = router({

  // ===== توليد المشهد الكامل =====
  generateScene: publicProcedure
    .input(z.object({
      description: z.string().min(3),
      scenarioType: z.enum(["design", "develop", "deteriorate", "compare", "imagine"]).default("imagine"),
      referenceImageUrl: z.string().url().optional(),
      title: z.string().optional(),
      previousFeedback: z.string().optional(),
      projectId: z.number().optional(), // لإعادة التوليد مع تحسين
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // 1. تحليل عميق بالذكاء الاصطناعي
      const analysis = await deepAnalyzeDescription(
        input.description,
        input.scenarioType,
        input.referenceImageUrl,
        input.previousFeedback
      );

      // 2. إنشاء أو تحديث مشروع في قاعدة البيانات
      let projectId: number | null = input.projectId || null;
      if (db) {
        if (projectId) {
          // تحديث مشروع موجود (حلقة تحسين)
          await db.update(khayalProjects)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(khayalProjects.id, projectId));
        } else {
          // إنشاء مشروع جديد
          const [project] = await db.insert(khayalProjects).values({
            title: input.title || analysis.title || input.description.slice(0, 80),
            description: input.description,
            inputType: input.referenceImageUrl ? "mixed" : "text",
            scenarioType: input.scenarioType,
            inputData: {
              description: input.description,
              referenceImageUrl: input.referenceImageUrl,
              culturalContext: analysis.culturalContext,
              cinematicStyle: analysis.cinematicStyle,
            },
            status: "processing",
          });
          projectId = (project as any).insertId;
        }
      }

      // 3. توليد الصور بشكل متوازٍ مع تحسين الـ prompts
      const generatedScenes = await Promise.allSettled(
        analysis.scenes.map(async (scene, index) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" }]
            : undefined;

          // إضافة السياق الثقافي للـ prompt
          const enhancedPrompt = `${scene.prompt}, ${analysis.cinematicStyle} style, ${analysis.atmosphere}`;

          const { url } = await generateImage({
            prompt: enhancedPrompt,
            originalImages,
          });

          // حفظ في قاعدة البيانات
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
        scenarioType: input.scenarioType,
        title: analysis.title,
        culturalContext: analysis.culturalContext,
        atmosphere: analysis.atmosphere,
        cinematicStyle: analysis.cinematicStyle,
        mainElements: analysis.mainElements,
      };
    }),

  // ===== إعادة التوليد مع تحسين (حلقة ذاتية) =====
  refineScene: publicProcedure
    .input(z.object({
      projectId: z.number(),
      feedback: z.string().min(3),
      sceneType: z.string().optional(), // لتحسين مشهد محدد فقط
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // جلب المشروع الأصلي
      const projects = await db.select().from(khayalProjects)
        .where(eq(khayalProjects.id, input.projectId)).limit(1);

      if (!projects.length) throw new Error("المشروع غير موجود");
      const project = projects[0];

      const inputData = project.inputData as any;

      // إعادة التوليد مع ملاحظات التحسين
      const analysis = await deepAnalyzeDescription(
        project.description || "",
        project.scenarioType || "imagine",
        inputData?.referenceImageUrl,
        input.feedback
      );

      // تحديث المشروع
      await db.update(khayalProjects)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(khayalProjects.id, input.projectId));

      // توليد مشاهد محسّنة
      const scenesToRefine = input.sceneType
        ? analysis.scenes.filter(s => s.type === input.sceneType)
        : analysis.scenes;

      const generatedScenes = await Promise.allSettled(
        scenesToRefine.map(async (scene, index) => {
          const { url } = await generateImage({
            prompt: `${scene.prompt}, refined based on feedback: ${input.feedback}`,
          });

          if (db) {
            await db.insert(khayalScenes).values({
              projectId: input.projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: scene.prompt,
              arabicCaption: scene.arabicCaption || "",
              order: index + 100, // نسخة محسّنة
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

  // ===== جلب المشاريع السابقة (الذاكرة) =====
  getProjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(khayalProjects)
      .orderBy(desc(khayalProjects.createdAt))
      .limit(20);
  }),

  // ===== جلب مشاهد مشروع معين =====
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
