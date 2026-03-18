/**
 * videoRouter.ts v3.0 — محرك الفيديو الاحترافي
 * يتبع منهج الإخراج v3.0:
 * سيناريو → صور → ElevenLabs TTS → Runway Image-to-Video → Ken Burns (Fallback) → دمج → موسيقى → رفع
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import {
  VideoProducer,
  generateVideoScript,
  type VideoScript,
  type VideoJob,
} from "./videoProducer";

// ═══════════════════════════════════════════════════════════
// Zod schemas للمدخلات
// ═══════════════════════════════════════════════════════════

const motionEffectEnum = z.enum([
  "zoom_in", "zoom_out", "pan_left", "pan_right",
  "shake", "rotate", "bounce", "spiral",
]);

const transitionEffectEnum = z.enum([
  "fade", "dissolve", "wipe_left", "wipe_right",
  "zoom_fade", "blur_fade", "slide_left", "slide_right",
]);

const sceneTypeEnum = z.enum([
  "b_roll", "talking_head", "animation", "screen_recording", "mixed",
]);

const sceneSchema = z.object({
  imagePrompt: z.string(),
  subtitle: z.string(),
  narration: z.string().optional(),
  duration: z.number(),
  zoom: motionEffectEnum,
  transition: transitionEffectEnum.optional(),
  sceneType: sceneTypeEnum.optional(),
});

// كل أصوات ElevenLabs الـ 11
const voiceEnum = z.enum([
  "ar_male", "ar_female", "en_male", "en_female",
  "ar_male_formal", "ar_male_energetic", "ar_male_calm",
  "ar_female_formal", "ar_female_emotional", "ar_female_marketing",
  "en_male_formal", "en_male_energetic",
  "en_female_formal", "en_female_emotional",
  "documentary_narrator",
]);

const scriptSchema = z.object({
  title: z.string(),
  language: z.enum(["ar", "en"]),
  voice: voiceEnum,
  narration: z.string(),
  domain: z.string().optional(),
  musicMood: z.string().optional(),
  scenes: z.array(sceneSchema),
});

const productionOptionsSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).default("16:9"),
  mode: z.enum(["draft", "production"]).default("production"),
  musicVolume: z.number().min(0).max(1).default(0.12),
  useRunway: z.boolean().default(true),
  useElevenLabs: z.boolean().default(true),
});

// ═══════════════════════════════════════════════════════════
// تخزين حالة المهام في الذاكرة
// ═══════════════════════════════════════════════════════════

interface JobRecord {
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  metrics?: VideoJob["metrics"];
}

const videoJobs = new Map<string, JobRecord>();

// تنظيف المهام القديمة (أكثر من ساعة)
setInterval(() => {
  const now = Date.now();
  Array.from(videoJobs.entries()).forEach(([id, job]) => {
    if (now - job.createdAt > 3600000) videoJobs.delete(id);
  });
}, 300000);

// ═══════════════════════════════════════════════════════════
// الـ Router
// ═══════════════════════════════════════════════════════════

export const videoRouter = router({

  // ──────────────────────────────────────────────────────────
  // توليد سيناريو الفيديو (بدون إنتاج)
  // ──────────────────────────────────────────────────────────
  generateScript: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
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

  // ──────────────────────────────────────────────────────────
  // بدء إنتاج الفيديو (يعيد jobId فوراً)
  // ──────────────────────────────────────────────────────────
  startProduction: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000).optional(),
      script: scriptSchema.optional(),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(10).default(6),
      options: productionOptionsSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      videoJobs.set(jobId, {
        status: "pending",
        progress: 0,
        currentStep: "جاري التحضير...",
        createdAt: Date.now(),
      });

      // تشغيل الإنتاج في الخلفية
      (async () => {
        try {
          videoJobs.set(jobId, {
            ...videoJobs.get(jobId)!,
            status: "processing",
            currentStep: "توليد السيناريو...",
            progress: 2,
          });

          let script: VideoScript | undefined = input.script as VideoScript | undefined;
          if (!script) {
            if (!input.description) throw new Error("يجب تقديم وصف أو سيناريو");
            script = await generateVideoScript(
              input.description,
              input.language,
              input.voice,
              input.sceneCount
            );
          }

          const producer = new VideoProducer();
          const videoUrl = await producer.produce(
            script,
            {
              aspectRatio: input.options?.aspectRatio ?? "16:9",
              mode: input.options?.mode ?? "production",
              musicVolume: input.options?.musicVolume ?? 0.12,
              useRunway: input.options?.useRunway ?? true,
              useElevenLabs: input.options?.useElevenLabs ?? true,
            },
            (update: Partial<VideoJob>) => {
              const current = videoJobs.get(jobId);
              if (current) {
                videoJobs.set(jobId, {
                  ...current,
                  status: (update.status as JobRecord["status"]) ?? current.status,
                  progress: update.progress ?? current.progress,
                  currentStep: update.currentStep ?? current.currentStep,
                  videoUrl: update.videoUrl ?? current.videoUrl,
                  error: update.error ?? current.error,
                  metrics: update.metrics ?? current.metrics,
                });
              }
            }
          );

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

  // ──────────────────────────────────────────────────────────
  // فحص حالة مهمة الإنتاج
  // ──────────────────────────────────────────────────────────
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = videoJobs.get(input.jobId);
      if (!job) {
        return {
          status: "not_found" as const,
          progress: 0,
          currentStep: "المهمة غير موجودة",
          videoUrl: undefined as string | undefined,
          error: undefined as string | undefined,
          metrics: undefined as VideoJob["metrics"] | undefined,
        };
      }
      return {
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        videoUrl: job.videoUrl,
        error: job.error,
        metrics: job.metrics,
      };
    }),

  // ──────────────────────────────────────────────────────────
  // إنتاج سريع (سيناريو + إنتاج في خطوة واحدة)
  // ──────────────────────────────────────────────────────────
  quickProduce: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(8).default(5),
      options: productionOptionsSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const jobId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      videoJobs.set(jobId, {
        status: "pending",
        progress: 0,
        currentStep: "جاري التحضير...",
        createdAt: Date.now(),
      });

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
          const videoUrl = await producer.produce(
            script,
            {
              aspectRatio: input.options?.aspectRatio ?? "16:9",
              mode: input.options?.mode ?? "production",
              musicVolume: input.options?.musicVolume ?? 0.12,
              useRunway: input.options?.useRunway ?? true,
              useElevenLabs: input.options?.useElevenLabs ?? true,
            },
            (update: Partial<VideoJob>) => {
              const current = videoJobs.get(jobId);
              if (current) {
                videoJobs.set(jobId, {
                  ...current,
                  status: (update.status as JobRecord["status"]) ?? current.status,
                  progress: update.progress ?? current.progress,
                  currentStep: update.currentStep ?? current.currentStep,
                  videoUrl: update.videoUrl ?? current.videoUrl,
                  error: update.error ?? current.error,
                  metrics: update.metrics ?? current.metrics,
                });
              }
            }
          );

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
