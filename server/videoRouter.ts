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
import {
  videoJobs as videoJobsTable,
  shareLinks as shareLinksTable,
  sceneRevisions as sceneRevisionsTable,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
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

  //  // ────────────────────────────────────────────────────────
  // جلب آخر job للمستخدم (للعودة بعد إغلاق المتصفح)
  // ────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────
  // تاريخ الإنتاجات — آخر 20 فيديو مكتمل
  // ────────────────────────────────────────────────────────
  getProductionHistory: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select()
        .from(videoJobsTable)
        .where(eq(videoJobsTable.status, "done"))
        .orderBy(desc(videoJobsTable.createdAt))
        .limit(input?.limit ?? 20);
      return rows.map(r => ({
        jobId: r.id,
        title: r.description?.slice(0, 80) ?? "فيديو",
        description: r.description ?? "",
        videoUrl: r.videoUrl ?? "",
        metrics: r.metrics as any,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    }),

  // ────────────────────────────────────────────────────────
  // إنشاء رابط مشاركة لفيديو مكتمل
  // ────────────────────────────────────────────────────────
  createShareLink: publicProcedure
    .input(z.object({
      jobId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      genre: z.string().optional(),
      genreLabel: z.string().optional(),
      genreEmoji: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // جلب بيانات الفيديو
      const job = await getJobFromDB(input.jobId);
      if (!job || !job.videoUrl) throw new Error("الفيديو غير موجود أو لم يكتمل بعد");

      // إنشاء رمز فريد
      const shareId = Math.random().toString(36).slice(2, 10).toUpperCase();

      await db.insert(shareLinksTable).values({
        id: shareId,
        jobId: input.jobId,
        videoUrl: job.videoUrl,
        title: input.title ?? job.description?.slice(0, 80) ?? "فيديو خيال",
        description: input.description ?? job.description ?? "",
        genre: input.genre ?? null,
        genreLabel: input.genreLabel ?? null,
        genreEmoji: input.genreEmoji ?? null,
      });

      return {
        shareId,
        shareUrl: `/share/${shareId}`,
        videoUrl: job.videoUrl,
      };
    }),

  // ────────────────────────────────────────────────────────
  // جلب بيانات رابط المشاركة (لصفحة المشاهدة العامة)
  // ────────────────────────────────────────────────────────
  getShareLink: publicProcedure
    .input(z.object({ shareId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select()
        .from(shareLinksTable)
        .where(eq(shareLinksTable.id, input.shareId))
        .limit(1);
      if (!rows.length) return null;
      const link = rows[0];
      // زيادة عداد المشاهدات
      await db.update(shareLinksTable)
        .set({ viewCount: (link.viewCount ?? 0) + 1 })
        .where(eq(shareLinksTable.id, input.shareId));
      return link;
    }),

  // ────────────────────────────────────────────────────────
  // تعديل مشهد واحد دون إعادة إنتاج الفيلم كاملاً
  // ────────────────────────────────────────────────────────
  reviseScene: publicProcedure
    .input(z.object({
      jobId: z.string(),
      sceneIndex: z.number().min(0),
      newPrompt: z.string().min(5),
      revisionNote: z.string().optional(),
      referenceImageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");

      // توليد صورة جديدة للمشهد
      const { generateImage } = await import("./_core/imageGeneration");
      const genOptions: any = {
        prompt: input.newPrompt + ", ultra photorealistic, 8K, cinematic lighting",
      };
      if (input.referenceImageUrl) {
        genOptions.originalImages = [{ url: input.referenceImageUrl, mimeType: "image/jpeg" }];
      }

      const { url: newImageUrl } = await generateImage(genOptions);

      // أرشفة النسخة السابقة
      await db.update(sceneRevisionsTable)
        .set({ isActive: 0 })
        .where(eq(sceneRevisionsTable.jobId, input.jobId));

      // حفظ النسخة الجديدة
      const insertData: any = {
        jobId: input.jobId,
        sceneIndex: input.sceneIndex,
        imageUrl: newImageUrl,
        prompt: input.newPrompt ?? null,
        revisionNote: input.revisionNote ?? null,
        version: 1,
        isActive: 1,
      };
      await db.insert(sceneRevisionsTable).values(insertData);

      return {
        sceneIndex: input.sceneIndex,
        newImageUrl,
        prompt: input.newPrompt,
      };
    }),

  // ────────────────────────────────────────────────────────
  // جلب تعديلات مشهد محدد
  // ────────────────────────────────────────────────────────
  getSceneRevisions: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(sceneRevisionsTable)
        .where(eq(sceneRevisionsTable.jobId, input.jobId))
        .orderBy(desc(sceneRevisionsTable.createdAt));
    }),

  // ────────────────────────────────────────────────────────
  // كشف نوع الفيلم من الوصف (للعرض في الواجهة)
  // ────────────────────────────────────────────────────────
  detectGenre: publicProcedure
    .input(z.object({
      description: z.string().min(2),
      hasReferenceImage: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const { detectFilmGenre, getGenreDNA } = await import("./filmGenreEngine");
      const genre = detectFilmGenre(input.description, input.hasReferenceImage);
      const dna = getGenreDNA(genre);
      return {
        genre,
        labelAr: dna.labelAr,
        labelEn: dna.labelEn,
        emoji: dna.emoji,
        color: dna.color,
        musicStyle: dna.musicStyle,
        narratorTone: dna.narratorTone,
      };
    }),

  // ────────────────────────────────────────────────────────
  // تحليل صورة المستخدم لاستخراج وصف الشخصية
  // ────────────────────────────────────────────────────────
  analyzeCharacter: publicProcedure
    .input(z.object({
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing human portraits and describing physical features for AI image generation.
Your task: analyze the person in the image and provide a detailed description of their physical appearance that can be used to maintain character consistency across multiple AI-generated scenes.
Focus on: face shape, skin tone, hair color/style/length, eye color, distinctive features, approximate age, build.
Be specific and objective. Use English for the description as it works best with image generation models.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this person's physical appearance in detail for character consistency:" },
              { type: "image_url", image_url: { url: input.imageUrl, detail: "high" } },
            ],
          },
        ],
        maxTokens: 500,
      });
      const description = typeof result.choices[0].message.content === "string"
        ? result.choices[0].message.content
        : "";
      return { characterDescription: description };
    }),

  // ────────────────────────────────────────────────────────
  // إنتاج سريع مع Character Consistency
  // ────────────────────────────────────────────────────────
  quickProduceWithCharacter: publicProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(8).default(5),
      options: productionOptionsSchema.optional(),
      referenceImageUrl: z.string().url().optional(),
      characterDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const jobId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await createJobInDB(jobId, input.description);

      (async () => {
        try {
          await updateJobInDB(jobId, { status: "processing", currentStep: "تحليل المحتوى وكتابة السيناريو...", progress: 3 });

          const script = await generateVideoScript(
            input.description,
            input.language,
            input.voice,
            input.sceneCount,
            input.characterDescription,
            input.referenceImageUrl
          );

          // حفظ بيانات الشخصية في السيناريو
          script.characterDescription = input.characterDescription;
          script.referenceImageUrl = input.referenceImageUrl;

          await updateJobInDB(jobId, {
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
              quality: input.options?.quality ?? "fast",
              enableCharacterConsistency: !!input.characterDescription,
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
});
