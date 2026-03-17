import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { khayalProjects, khayalScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ===== تحليل الوصف وتوليد prompts سينمائية =====
async function analyzeDescriptionAndGeneratePrompts(
  description: string,
  scenarioType: string,
  referenceImageUrl?: string
): Promise<{ scenes: Array<{ type: string; label: string; prompt: string }> }> {

  const scenarioInstructions: Record<string, string> = {
    design: "تصميم جديد ومبتكر، حديث وفاخر، مع إضاءة ذهبية عند الغروب",
    develop: "تطوير وتحسين المكان، مستقبل مزدهر بعد 20 سنة من التطوير والنمو",
    deteriorate: "تدهور وتقادم، إهمال وتآكل الزمن، أجواء درامية كئيبة",
    compare: "مقارنة زمنية واضحة، قبل وبعد، تحول درامي",
    imagine: "خيال إبداعي حر، أي شيء ممكن، مبهر وغير متوقع",
  };

  const scenarioDesc = scenarioInstructions[scenarioType] || scenarioInstructions.imagine;

  const systemPrompt = `أنت مخرج سينمائي ومصمم معماري خبير. مهمتك تحليل الوصف المقدم وتوليد 5 مشاهد سينمائية فوتوريالستيك احترافية.

لكل مشهد، أنشئ prompt احترافي باللغة الإنجليزية لتوليد صورة AI فوتوريالستيك بجودة عالية جداً.

السيناريو المطلوب: ${scenarioDesc}

قواعد الـ prompts:
- ابدأ دائماً بـ "Photorealistic cinematic render of"
- أضف تفاصيل الإضاءة (golden hour / dramatic night / soft morning light)
- أضف أسلوب التصوير (wide angle / aerial drone / eye level / close-up detail)
- أضف جودة الصورة (8K, ultra-detailed, architectural visualization, cinematic color grading)
- اجعل كل مشهد مختلفاً ومكملاً للآخر

أعد النتيجة كـ JSON بهذا الشكل بالضبط:
{
  "scenes": [
    {"type": "exterior", "label": "المنظر الخارجي", "prompt": "..."},
    {"type": "aerial", "label": "المنظر الجوي", "prompt": "..."},
    {"type": "interior", "label": "الفضاء الداخلي", "prompt": "..."},
    {"type": "detail", "label": "التفاصيل المعمارية", "prompt": "..."},
    {"type": "atmosphere", "label": "الأجواء والمشهد", "prompt": "..."}
  ]
}`;

  const userMessage = referenceImageUrl
    ? [
        { type: "text" as const, text: `الوصف: ${description}` },
        { type: "image_url" as const, image_url: { url: referenceImageUrl, detail: "high" as const } },
      ]
    : `الوصف: ${description}`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
  });

  const content = typeof result.choices[0].message.content === "string"
    ? result.choices[0].message.content
    : JSON.stringify(result.choices[0].message.content);

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return {
      scenes: [
        { type: "exterior", label: "المنظر الخارجي", prompt: `Photorealistic cinematic render of ${description}, golden hour lighting, wide angle, 8K ultra-detailed, architectural visualization, cinematic color grading` },
        { type: "aerial", label: "المنظر الجوي", prompt: `Photorealistic aerial drone view of ${description}, dramatic sky, bird's eye perspective, 8K, cinematic` },
        { type: "interior", label: "الفضاء الداخلي", prompt: `Photorealistic interior render of ${description}, warm ambient lighting, ultra-detailed, 8K, architectural photography` },
        { type: "detail", label: "التفاصيل", prompt: `Photorealistic close-up architectural detail of ${description}, sharp focus, dramatic shadows, 8K` },
        { type: "atmosphere", label: "الأجواء", prompt: `Photorealistic atmospheric cinematic scene of ${description}, moody dramatic lighting, 8K, film photography style` },
      ]
    };
  }
}

// ===== Router =====
export const khayalRouter = router({

  // تحليل الوصف وإنشاء مشروع
  generateScene: publicProcedure
    .input(z.object({
      description: z.string().min(10),
      scenarioType: z.enum(["design", "develop", "deteriorate", "compare", "imagine"]).default("imagine"),
      referenceImageUrl: z.string().url().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // 1. إنشاء مشروع في قاعدة البيانات
      let projectId: number | null = null;
      if (db) {
        const [project] = await db.insert(khayalProjects).values({
          title: input.title || input.description.slice(0, 80),
          description: input.description,
          inputType: input.referenceImageUrl ? "mixed" : "text",
          scenarioType: input.scenarioType,
          inputData: { description: input.description, referenceImageUrl: input.referenceImageUrl },
          status: "processing",
        });
        projectId = (project as any).insertId;
      }

      // 2. تحليل الوصف وتوليد prompts
      const { scenes: scenePrompts } = await analyzeDescriptionAndGeneratePrompts(
        input.description,
        input.scenarioType,
        input.referenceImageUrl
      );

      // 3. توليد الصور بشكل متوازٍ
      const generatedScenes = await Promise.allSettled(
        scenePrompts.map(async (scene, index) => {
          const originalImages = input.referenceImageUrl
            ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" }]
            : undefined;

          const { url } = await generateImage({
            prompt: scene.prompt,
            originalImages,
          });

          // حفظ في قاعدة البيانات
          if (db && projectId) {
            await db.insert(khayalScenes).values({
              projectId,
              sceneType: scene.type,
              sceneLabel: scene.label,
              imageUrl: url || "",
              prompt: scene.prompt,
              order: index,
            });
          }

          return {
            type: scene.type,
            label: scene.label,
            imageUrl: url,
            prompt: scene.prompt,
            order: index,
          };
        })
      );

      // 4. تحديث حالة المشروع
      if (db && projectId) {
        await db.update(khayalProjects)
          .set({ status: "done" })
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
      };
    }),

  // جلب مشاريع سابقة
  getProjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(khayalProjects).orderBy(khayalProjects.createdAt);
  }),

  // جلب مشاهد مشروع معين
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
