/**
 * videoRouter.ts — محرك الفيديو الاحترافي
 * يتبع منهج الإخراج: سيناريو → صور → صوت → Ken Burns → دمج → رفع
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { VideoProducer, generateVideoScript } from "./videoProducer";
import { getDb } from "./db";
import { khayalProjects } from "../drizzle/schema";

// تخزين حالة المهام في الذاكرة (يمكن نقلها لقاعدة البيانات لاحقاً)
const videoJobs = new Map<string, {
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}>();

// تنظيف المهام القديمة (أكثر من ساعة)
setInterval(() => {
  const now = Date.now();
  Array.from(videoJobs.entries()).forEach(([id, job]) => {
    if (now - job.createdAt > 3600000) {
      videoJobs.delete(id);
    }
  });
}, 300000);

export const videoRouter = router({

  // ══════════════════════════════════════════════════════════════
  // توليد سيناريو الفيديو (بدون إنتاج)
  // ══════════════════════════════════════════════════════════════
  generateScript: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: z.enum(["ar_male", "ar_female", "en_male", "en_female"]).default("ar_male"),
      sceneCount: z.number().min(3).max(10).default(6),
    }))
    .mutation(async ({ input }) => {
      const script = await generateVideoScript(
        input.description,
        input.language,
        input.voice,
        input.sceneCount
      );
      return { script };
    }),

  // ══════════════════════════════════════════════════════════════
  // بدء إنتاج الفيديو (يعيد jobId فوراً)
  // ══════════════════════════════════════════════════════════════
  startProduction: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000).optional(),
      script: z.object({
        title: z.string(),
        language: z.enum(["ar", "en"]),
        voice: z.enum(["ar_male", "ar_female", "en_male", "en_female"]),
        narration: z.string(),
        domain: z.string().optional(),
        scenes: z.array(z.object({
          imagePrompt: z.string(),
          subtitle: z.string(),
          narration: z.string().optional(),
          duration: z.number(),
          zoom: z.enum(["in", "out", "pan_left", "pan_right"]),
        })),
      }).optional(),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: z.enum(["ar_male", "ar_female", "en_male", "en_female"]).default("ar_male"),
      sceneCount: z.number().min(3).max(10).default(6),
    }))
    .mutation(async ({ input }) => {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // تسجيل المهمة
      videoJobs.set(jobId, {
        status: "pending",
        progress: 0,
        currentStep: "جاري التحضير...",
        createdAt: Date.now(),
      });

      // تشغيل الإنتاج في الخلفية (بدون await)
      (async () => {
        try {
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "processing",
            currentStep: "توليد السيناريو...",
            progress: 2,
          });

          // الحصول على السيناريو
          let script = input.script;
          if (!script) {
            if (!input.description) throw new Error("يجب تقديم وصف أو سيناريو");
            script = await generateVideoScript(
              input.description,
              input.language,
              input.voice,
              input.sceneCount
            );
          }

          // إنتاج الفيديو
          const producer = new VideoProducer();
          const videoUrl = await producer.produce(script, (update) => {
            const current = videoJobs.get(jobId);
            if (current) {
              videoJobs.set(jobId, {
                ...current,
                ...update,
              });
            }
          });

          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "done",
            progress: 100,
            currentStep: "اكتمل الإنتاج!",
            videoUrl,
          });

        } catch (err) {
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "failed",
            progress: 0,
            currentStep: "فشل الإنتاج",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();

      return { jobId };
    }),

  // ══════════════════════════════════════════════════════════════
  // فحص حالة مهمة الإنتاج
  // ══════════════════════════════════════════════════════════════
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = videoJobs.get(input.jobId);
      if (!job) {
        return {
          status: "not_found" as const,
          progress: 0,
          currentStep: "المهمة غير موجودة",
        };
      }
      return {
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        videoUrl: job.videoUrl,
        error: job.error,
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // إنتاج سريع (سيناريو + إنتاج في خطوة واحدة)
  // ══════════════════════════════════════════════════════════════
  quickProduce: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: z.enum(["ar_male", "ar_female", "en_male", "en_female"]).default("ar_male"),
      sceneCount: z.number().min(3).max(8).default(5),
    }))
    .mutation(async ({ input }) => {
      const jobId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      videoJobs.set(jobId, {
        status: "pending",
        progress: 0,
        currentStep: "جاري التحضير...",
        createdAt: Date.now(),
      });

      // تشغيل في الخلفية
      (async () => {
        try {
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "processing",
            currentStep: "تحليل المحتوى وكتابة السيناريو...",
            progress: 3,
          });

          const script = await generateVideoScript(
            input.description,
            input.language,
            input.voice,
            input.sceneCount
          );

          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            currentStep: `السيناريو جاهز: "${script.title}"`,
            progress: 8,
          });

          const producer = new VideoProducer();
          const videoUrl = await producer.produce(script, (update) => {
            const current = videoJobs.get(jobId);
            if (current) {
              videoJobs.set(jobId, { ...current, ...update });
            }
          });

          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "done",
            progress: 100,
            currentStep: "اكتمل الإنتاج!",
            videoUrl,
          });

        } catch (err) {
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "failed",
            progress: 0,
            currentStep: "فشل الإنتاج",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();

      return { jobId };
    }),
});
