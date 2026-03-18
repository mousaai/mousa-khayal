/**
 * videoRouter.ts v4.0 — محرك الفيديو الاحترافي
 * يتبع منهج الإخراج v4.0:
 * سيناريو → صور (متوازية) → ElevenLabs TTS → Runway → Ken Burns (Fallback) → دمج → موسيقى → رفع
 * الـ jobs تُحفظ في DB حتى تعمل بعد إغلاق المتصفح
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import {
  VideoProducer,
  generateVideoScript,
  type VideoScript,
  type VideoJob,
} from "./videoProducer";
import { getDb } from "./db";
import { videoJobs as videoJobsTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
// ═══════════════════════════════════════════════════════════
// Zod schemas للمدخلاتت
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
  quality: z.enum(["fast", "pro"]).default("fast"), // fast=720p/ultrafast, pro=1080p/medium+xfade
});

// ═══════════════════════════════════════════════════════════
// helpers للـ DB
// ═══════════════════════════════════════════════════════════

async function createJobInDB(jobId: string, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(videoJobsTable).values({
    id: jobId,
    status: "pending",
    progress: 0,
    currentStep: "جاري التحضير...",
    description: description ?? null,
  });
}

async function updateJobInDB(jobId: string, update: {
  status?: "pending" | "processing" | "done" | "failed";
  progress?: number;
  currentStep?: string;
  videoUrl?: string;
  error?: string;
  metrics?: any;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(videoJobsTable)
      .set({
        ...(update.status !== undefined && { status: update.status }),
        ...(update.progress !== undefined && { progress: update.progress }),
        ...(update.currentStep !== undefined && { currentStep: update.currentStep }),
        ...(update.videoUrl !== undefined && { videoUrl: update.videoUrl }),
        ...(update.error !== undefined && { error: update.error }),
        ...(update.metrics !== undefined && { metrics: update.metrics }),
      })
      .where(eq(videoJobsTable.id, jobId));
  } catch (e) {
    console.error("[videoRouter] updateJobInDB error:", e);
  }
}

async function getJobFromDB(jobId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(videoJobsTable).where(eq(videoJobsTable.id, jobId)).limit(1);
  return rows[0] ?? null;
}

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
  // بدء إنتاج الفيديو (يعيد jobId فوراً، يعمل في الخلفية)
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

      await createJobInDB(jobId, input.description);

      // تشغيل الإنتاج في الخلفية — يستمر حتى لو أغلق المتصفح
      (async () => {
        try {
          await updateJobInDB(jobId, { status: "processing", currentStep: "توليد السيناريو...", progress: 2 });

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
              quality: input.options?.quality ?? "fast",
            },
            async (update: Partial<VideoJob>) => {
              await updateJobInDB(jobId, {
                status: update.status as any,
                progress: update.progress,
                currentStep: update.currentStep,
                videoUrl: update.videoUrl,
                error: update.error,
                metrics: update.metrics,
              });
            }
          );

          await updateJobInDB(jobId, { status: "done", progress: 100, currentStep: "اكتمل الإنتاج!", videoUrl });

          // ── إشعار المنصة عند اكتمال الإنتاج ──
          try {
            await notifyOwner({
              title: "✨ خيال — اكتمل الإنتاج!",
              content: `فيديوك جاهز للمشاهدة والتحميل.\nرابط الفيديو: ${videoUrl}`,
            });
          } catch { /* الإشعار اختياري */ }

        } catch (err) {
          await updateJobInDB(jobId, {
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
  // فحص حالة مهمة الإنتاج (من DB)
  // ──────────────────────────────────────────────────────────
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = await getJobFromDB(input.jobId);
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
        currentStep: job.currentStep ?? "",
        videoUrl: job.videoUrl ?? undefined,
        error: job.error ?? undefined,
        metrics: job.metrics as VideoJob["metrics"] | undefined,
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

      await createJobInDB(jobId, input.description);

      // يعمل في الخلفية — يستمر حتى لو أغلق المتصفح
      (async () => {
        try {
          await updateJobInDB(jobId, { status: "processing", currentStep: "تحليل المحتوى وكتابة السيناريو...", progress: 3 });

          const script = await generateVideoScript(
            input.description,
            input.language,
            input.voice,
            input.sceneCount
          );

          await updateJobInDB(jobId, { currentStep: `السيناريو جاهز: "${script.title}"`, progress: 8 });

          const producer = new VideoProducer();
          const videoUrl = await producer.produce(
            script,
            {
              aspectRatio: input.options?.aspectRatio ?? "16:9",
              mode: input.options?.mode ?? "production",
              musicVolume: input.options?.musicVolume ?? 0.12,
              useRunway: input.options?.useRunway ?? true,
              useElevenLabs: input.options?.useElevenLabs ?? true,
              quality: input.options?.quality ?? "fast",
            },
            async (update: Partial<VideoJob>) => {
              await updateJobInDB(jobId, {
                status: update.status as any,
                progress: update.progress,
                currentStep: update.currentStep,
                videoUrl: update.videoUrl,
                error: update.error,
                metrics: update.metrics,
              });
            }
          );

          await updateJobInDB(jobId, { status: "done", progress: 100, currentStep: "اكتمل الإنتاج!", videoUrl });

          // ── إشعار المنصة عند اكتمال الإنتاج ──
          try {
            await notifyOwner({
              title: "✨ خيال — اكتمل الإنتاج!",
              content: `فيديوك جاهز للمشاهدة والتحميل.\nرابط الفيديو: ${videoUrl}`,
            });
          } catch { /* الإشعار اختياري */ }

        } catch (err) {
          await updateJobInDB(jobId, {
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
  // جلب آخر job للمستخدم (للعودة بعد إغلاق المتصفح)
  // ──────────────────────────────────────────────────────────
  getMyLatestJob: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;
      // نجلب آخر job قيد المعالجة
      const rows = await db.select()
        .from(videoJobsTable)
        .where(eq(videoJobsTable.status, "processing"))
        .limit(1);
      // إذا لم يوجد processing، نجلب آخر done
      if (rows.length === 0) {
        const doneRows = await db.select()
          .from(videoJobsTable)
          .where(eq(videoJobsTable.status, "done"))
          .limit(1);
        return doneRows[0] ?? null;
      }
      return rows[0];
    }),
});
