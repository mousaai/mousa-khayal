/**
 * videoRouter.ts v4.0 — محرك الفيديو الاحترافي
 * يتبع منهج الإخراج v4.0:
 * سيناريو → صور (متوازية) → ElevenLabs TTS → Runway → Ken Burns (Fallback) → دمج → موسيقى → رفع
 * الـ jobs تُحفظ في DB حتى تعمل بعد إغلاق المتصفح
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { guardMousaBalance, deductMousaCredits, isMousaEnabled, getCreditsPerSession, getMousaUserIdFromUser } from "./mousaCreditsService";
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
import { jobQueue } from "./jobQueue";
import { directAutonomously, decisionToProductionParams, type DirectorDecision } from "./autonomousDirector";
import { broadcastProgress } from "./sseRouter";
import { recordProduction } from "./khayalMemory";
import { pickSurprise } from "./surpriseEngine";
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

async function createJobInDB(
  jobId: string,
  description?: string,
  scriptData?: any,
  optionsData?: any,
  userId?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(videoJobsTable).values({
    id: jobId,
    userId: userId ? parseInt(userId) || null : null,
    status: "pending",
    progress: 0,
    currentStep: "جاري التحضير...",
    description: description ?? null,
    scriptData: scriptData ?? null,
    optionsData: optionsData ?? null,
    sceneStates: null,
    retryCount: 0,
    lastHeartbeat: new Date(),
  });
}

// دالة مساعدة: تشغيل الإنتاج مع خصم الكريدتس عند الاكتمال
async function runProductionJobWithDeduct(
  jobId: string,
  scriptData: any,
  optionsData: any,
  mousaUserId: number | null  // Mousa userId الحقيقي (من openId: mousa_{id})
): Promise<void> {
  await runProductionJob(jobId, scriptData, optionsData);
  // خصم الكريدتس بعد اكتمال الإنتاج — فقط لمستخدمي موسى
  if (isMousaEnabled() && mousaUserId) {
    const job = await getJobFromDB(jobId);
    if (job?.status === 'done') {
      // تحديد نوع الجلسة حسب عدد المشاهد
      const sceneCount = scriptData?.sceneCount ?? 5;
      const sessionType = sceneCount <= 6 ? 'film_short' : sceneCount <= 15 ? 'film_medium' : 'film_long';
      await deductMousaCredits(
        mousaUserId,
        `خيال — إنتاج فيديو: ${(scriptData.description ?? scriptData.title ?? 'فيديو').slice(0, 60)}`,
        { sessionType }
      ).catch(err => console.error('[videoRouter] deductMousaCredits error:', err));
    }
  }
}

async function updateJobInDB(jobId: string, update: {
  status?: "pending" | "processing" | "done" | "failed";
  progress?: number;
  currentStep?: string;
  videoUrl?: string;
  error?: string;
  metrics?: any;
  sceneStates?: any;
  retryCount?: number;
  lastHeartbeat?: Date;
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
        ...(update.sceneStates !== undefined && { sceneStates: update.sceneStates }),
        ...(update.retryCount !== undefined && { retryCount: update.retryCount }),
        ...(update.lastHeartbeat !== undefined && { lastHeartbeat: update.lastHeartbeat }),
      })
      .where(eq(videoJobsTable.id, jobId));
    // بث SSE فوراً لجميع المستمعين الحيين
    broadcastProgress(jobId, {
      progress: update.progress,
      currentStep: update.currentStep,
      status: update.status,
      videoUrl: update.videoUrl,
      error: update.error,
      decision: (update.metrics as any)?.decision,
    });
  } catch (e) {
    console.error("[videoRouter] updateJobInDB error:", e);
  }
}

// كشف واستئناف المهام المتوقفة (processing > 5 دقائق بدون heartbeat)
async function resumeStaleJobs() {
  try {
    const db = await getDb();
    if (!db) return;
    // Runway يحتاج 5-15 دقيقة لكل مشهد — نعطيه 20 دقيقة قبل اعتباره متوقفاً
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const staleJobs = await db
      .select()
      .from(videoJobsTable)
      .where(eq(videoJobsTable.status, "processing"))
      .limit(5);

    for (const job of staleJobs) {
      const heartbeat = job.lastHeartbeat ? new Date(job.lastHeartbeat).getTime() : 0;
      if (heartbeat < twentyMinutesAgo.getTime() && job.scriptData && job.retryCount < 3) {
        console.log(`[videoRouter] استئناف مهمة متوقفة: ${job.id} (محاولة ${(job.retryCount ?? 0) + 1}/3)`);
        await updateJobInDB(job.id, { retryCount: (job.retryCount ?? 0) + 1, lastHeartbeat: new Date() });
        runProductionJob(job.id, job.scriptData as any, job.optionsData as any);
      }
    }
  } catch (e) {
    console.error("[videoRouter] resumeStaleJobs error:", e);
  }
}

// تشغيل مهمة إنتاج في الخلفية مع heartbeat منتظم
export async function runProductionJobExported(
  jobId: string,
  scriptData: any,
  optionsData: any
): Promise<void> {
  return runProductionJob(jobId, scriptData, optionsData);
}

async function runProductionJob(
  jobId: string,
  scriptData: any,
  optionsData: any
) {
  const heartbeatInterval = setInterval(async () => {
    await updateJobInDB(jobId, { lastHeartbeat: new Date() });
  }, 30_000); // heartbeat كل 30 ثانية

  try {
    await updateJobInDB(jobId, { status: "processing", currentStep: "تحليل المحتوى...", progress: 2, lastHeartbeat: new Date() });

    let script: VideoScript;
    if (scriptData.scenes) {
      script = scriptData as VideoScript;
    } else {
      script = await generateVideoScript(
        scriptData.description,
        scriptData.language ?? "ar",
        scriptData.voice ?? "ar_male",
        scriptData.sceneCount ?? 5
      );
    }

    const producer = new VideoProducer();
    const videoUrl = await producer.produce(
      script,
      {
        aspectRatio: optionsData?.aspectRatio ?? "16:9",
        mode: optionsData?.mode ?? "production",
        musicVolume: optionsData?.musicVolume ?? 0.12,
        useRunway: optionsData?.useRunway ?? true,
        useElevenLabs: optionsData?.useElevenLabs ?? true,
        quality: optionsData?.quality ?? "fast",
      },
      async (update: Partial<VideoJob>) => {
        await updateJobInDB(jobId, {
          status: update.status as any,
          progress: update.progress,
          currentStep: update.currentStep,
          videoUrl: update.videoUrl,
          error: update.error,
          metrics: update.metrics,
          lastHeartbeat: new Date(),
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
  } finally {
    clearInterval(heartbeatInterval);
  }
}

// بدء فحص المهام المتوقفة كل 5 دقائق
setInterval(resumeStaleJobs, 5 * 60 * 1000);

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
  generateScript: protectedProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(10).default(6),
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل توليد السيناريو
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }
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
  startProduction: protectedProcedure
    .input(z.object({
      description: z.string().min(2).max(2000).optional(),
      script: scriptSchema.optional(),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(10).default(6),
      options: productionOptionsSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل بدء الإنتاج
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const realUserId = ctx.user.id.toString();

      // حفظ السيناريو والخيارات في DB للاستئناف عند الانقطاع
      const scriptData = input.script ?? {
        description: input.description,
        language: input.language,
        voice: input.voice,
        sceneCount: input.sceneCount,
      };
      await createJobInDB(jobId, input.description, scriptData, input.options ?? {}, realUserId);

      // إضافة إلى الطابور الذكي — يدعم 500 مستخدم متزامن
      try {
        const { position, waitSeconds } = await new Promise<{ position: number; waitSeconds: number }>((resolve) => {
          jobQueue.enqueue(jobId, realUserId, () => runProductionJobWithDeduct(jobId, scriptData, input.options ?? {}, mousaUserId))
            .then(resolve)
            .catch(async (err: Error) => {
              const msg = err.message.includes(':') ? err.message.split(':')[1] : err.message;
              await updateJobInDB(jobId, { status: 'failed', error: msg, currentStep: msg });
              resolve({ position: -1, waitSeconds: 0 });
            });
        });
        if (position > 0) {
          await updateJobInDB(jobId, {
            status: 'pending',
            currentStep: `في الطابور — رقم ${position} (وقت متوقع: ${waitSeconds} ثانية)`,
            progress: 0,
          });
        }
      } catch (_) { /* تم التعامل مع الخطأ أعلاه */ }

      return { jobId };
    }),

  // ──────────────────────────────────────────────────────────
  // فحص حالة مهمة الإنتاج (من DB)
  // ──────────────────────────────────────────────────────────
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = await getJobFromDB(input.jobId);
      // إحصاءات الطابور الحالية
      const qStats = jobQueue.stats();
      const queuePosition = jobQueue.getQueuePosition(input.jobId);
      const estimatedWaitSeconds = queuePosition > 0 ? jobQueue.estimatedWaitSeconds(queuePosition) : 0;
      if (!job) {
        return {
          status: "not_found" as const,
          progress: 0,
          currentStep: "المهمة غير موجودة",
          videoUrl: undefined as string | undefined,
          error: undefined as string | undefined,
          metrics: undefined as VideoJob["metrics"] | undefined,
          queuePosition: 0,
          estimatedWaitSeconds: 0,
          queueStats: qStats,
        };
      }
      return {
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep ?? "",
        videoUrl: job.videoUrl ?? undefined,
        error: job.error ?? undefined,
        metrics: job.metrics as VideoJob["metrics"] | undefined,
        queuePosition,
        estimatedWaitSeconds,
        queueStats: qStats,
      };
    }),

  // ──────────────────────────────────────────────────────────
  // إنتاج سريع (سيناريو + إنتاج في خطوة واحدة)
  // ──────────────────────────────────────────────────────────
  quickProduce: protectedProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(8).default(3),
      options: productionOptionsSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل بدء الإنتاج
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      const jobId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const realUserId = ctx.user.id.toString();

      // حفظ البيانات في DB للاستئناف عند الانقطاع
      const scriptData = {
        description: input.description,
        language: input.language,
        voice: input.voice,
        sceneCount: input.sceneCount,
      };
      await createJobInDB(jobId, input.description, scriptData, input.options ?? {}, realUserId);

      // إضافة إلى الطابور الذكي — يدعم 500 مستخدم متزامن
      jobQueue.enqueue(jobId, realUserId, () => runProductionJobWithDeduct(jobId, scriptData, input.options ?? {}, mousaUserId))
        .then(async ({ position, waitSeconds }) => {
          if (position > 0) {
            await updateJobInDB(jobId, {
              status: 'pending',
              currentStep: `في الطابور — رقم ${position} (وقت متوقع: ${waitSeconds} ثانية)`,
              progress: 0,
            });
          }
        })
        .catch(async (err: Error) => {
          const msg = err.message.includes(':') ? err.message.split(':')[1] : err.message;
          await updateJobInDB(jobId, { status: 'failed', error: msg, currentStep: msg });
        });

      return { jobId };
    }),

  //  // ────────────────────────────────────────────────────────
  // جلب آخر job للمستخدم (للعودة بعد إغلاق المتصفح)
  // ────────────────────────────────────────────────────────
  getMyLatestJob: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const { and, eq: eqOp } = await import('drizzle-orm');
      // نجلب آخر job قيد المعالجة لهذا المستخدم
      const rows = await db.select()
        .from(videoJobsTable)
        .where(and(eqOp(videoJobsTable.status, "processing"), eqOp(videoJobsTable.userId, ctx.user.id)))
        .orderBy(desc(videoJobsTable.createdAt))
        .limit(1);
      // إذا لم يوجد processing، نجلب آخر done لهذا المستخدم
      if (rows.length === 0) {
        const doneRows = await db.select()
          .from(videoJobsTable)
          .where(and(eqOp(videoJobsTable.status, "done"), eqOp(videoJobsTable.userId, ctx.user.id)))
          .orderBy(desc(videoJobsTable.createdAt))
          .limit(1);
        return doneRows[0] ?? null;
      }
      return rows[0];
    }),

  // ────────────────────────────────────────────────────────
  // تاريخ الإنتاجات — آخر 20 فيديو مكتمل
  // ────────────────────────────────────────────────────────
  getProductionHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { and, eq: eqOp } = await import('drizzle-orm');
      const rows = await db.select()
        .from(videoJobsTable)
        .where(and(eqOp(videoJobsTable.status, "done"), eqOp(videoJobsTable.userId, ctx.user.id)))
        .orderBy(desc(videoJobsTable.createdAt))
        .limit(input?.limit ?? 20);
      return rows.map((r: any) => ({
        jobId: r.id,
        title: r.description?.slice(0, 80) ?? "فيديو",
        description: r.description ?? "",
        videoUrl: r.videoUrl ?? "",
        metrics: r.metrics as any,
        scriptData: r.scriptData as any,
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
  quickProduceWithCharacter: protectedProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      language: z.enum(["ar", "en"]).default("ar"),
      voice: voiceEnum.default("ar_male"),
      sceneCount: z.number().min(3).max(8).default(5),
      options: productionOptionsSchema.optional(),
      referenceImageUrl: z.string().url().optional(),
      characterDescription: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل بدء الإنتاج
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      const jobId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await createJobInDB(jobId, input.description, undefined, undefined, ctx.user.id.toString());

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

  // ════════════════════════════════════════════════════════════════
  // autonomousProduce — خيال تقرر كل شيء بنفسها (مثل Manus)
  // ════════════════════════════════════════════════════════════════
  autonomousProduce: protectedProcedure
    .input(z.object({
      description: z.string().min(2).max(2000),
      userId: z.string().optional(), // openId أو IP للذاكرة
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل بدء الإنتاج
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      const jobId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const memUserId = ctx.user.openId ?? ctx.user.id.toString();
      await createJobInDB(jobId, input.description, undefined, undefined, ctx.user.id.toString());
      await updateJobInDB(jobId, { status: 'pending', currentStep: '🧠 خيال تفكر...', progress: 0 });

      const qUserId = memUserId;
      jobQueue.enqueue(jobId, qUserId, async () => {
        await updateJobInDB(jobId, { status: 'processing', currentStep: '🧠 خيال تحلل الفكرة...', progress: 2 });

        const thinkingSteps: any[] = [];
        const decision = await directAutonomously(input.description, async (step) => {
          thinkingSteps.push(step);
          await updateJobInDB(jobId, {
            currentStep: `${step.icon} ${step.label}: ${step.detail}`,
            progress: Math.min(15, 2 + thinkingSteps.length * 2),
            metrics: { thinkingSteps: [...thinkingSteps], decision: null },
          });
        });

        await updateJobInDB(jobId, {
          currentStep: `🎬 ${decision.filmTitle} — بدأ الإنتاج`,
          progress: 16,
          metrics: {
            thinkingSteps: decision.thinkingSteps,
            decision: {
              productionType: decision.productionType,
              genre: decision.genre,
              genreLabel: decision.genreLabel,
              genreEmoji: decision.genreEmoji,
              voice: decision.voice,
              sceneCount: decision.sceneCount,
              filmTitle: decision.filmTitle,
              understanding: decision.understanding,
              reasoning: decision.reasoning,
            },
          },
        });

        const params = decisionToProductionParams(decision);
        const script = await generateVideoScript(params.description, params.language, params.voice, params.sceneCount);
        await updateJobInDB(jobId, { currentStep: `📝 السيناريو جاهز: "${script.title}"`, progress: 22 });

        const producer = new VideoProducer();
        const videoUrl = await producer.produce(
          script,
          {
            aspectRatio: params.options?.aspectRatio ?? '16:9',
            mode: 'production',
            musicVolume: 0.12,
            useRunway: true,
            useElevenLabs: true,
            quality: decision.productionType === 'pro_video' ? 'pro' : 'fast',
          },
          async (update: Partial<VideoJob>) => {
            await updateJobInDB(jobId, {
              status: update.status as any,
              progress: update.progress ? Math.max(22, update.progress) : undefined,
              currentStep: update.currentStep,
              videoUrl: update.videoUrl,
              error: update.error,
              metrics: update.metrics ? {
                ...update.metrics,
                thinkingSteps: decision.thinkingSteps,
                decision: {
                  productionType: decision.productionType,
                  genre: decision.genre,
                  genreLabel: decision.genreLabel,
                  genreEmoji: decision.genreEmoji,
                  voice: decision.voice,
                  sceneCount: decision.sceneCount,
                  filmTitle: decision.filmTitle,
                  understanding: decision.understanding,
                  reasoning: decision.reasoning,
                },
              } : undefined,
            });
          }
        );

        await updateJobInDB(jobId, { status: 'done', progress: 100, currentStep: '✅ اكتمل الإنتاج!', videoUrl });
        // تسجيل الإنتاج في ذاكرة خيال
        recordProduction(memUserId, {
          genre: decision.genre,
          voiceId: decision.voice,
          aspectRatio: decision.aspectRatio,
          sceneCount: decision.sceneCount,
          style: decision.genreLabel,
          duration: decision.productionType === 'pro_video' ? 'long' : 'short',
          domain: decision.genre,
        }).catch(() => {});
        try {
          await notifyOwner({
            title: '✨ خيال — اكتمل الإنتاج الذاتي!',
            content: `"${decision.filmTitle}" جاهز.\nالنوع: ${decision.genreEmoji} ${decision.genreLabel}\nالصوت: ${decision.voice}\nالمشاهد: ${decision.sceneCount}`,
          });
        } catch { /* الإشعار اختياري */ }
      }).catch(async (err: Error) => {
        const msg = err.message.includes(':') ? err.message.split(':')[1] : err.message;
        await updateJobInDB(jobId, { status: 'failed', error: msg, currentStep: msg });
      });

      return { jobId };
    }),

  // ════════════════════════════════════════════════════════════════
  // surpriseProduce — خيال تختار الموضوع وتنتج كاملاً من الصفر (فاجئني)
  // ════════════════════════════════════════════════════════════════
  surpriseProduce: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // فحص رصيد MOUSA.AI قبل بدء الإنتاج
      const mousaUserId = getMousaUserIdFromUser(ctx.user);
      if (isMousaEnabled() && mousaUserId) {
        const guard = await guardMousaBalance(mousaUserId, 'autonomous');
        if (!guard.allowed) {
          throw new Error(JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balance: guard.balance ?? 0,
            upgradeUrl: guard.upgradeUrl ?? "https://www.mousa.ai/pricing?ref=khayal",
          }));
        }
      }

      const memUserId = ctx.user.openId ?? ctx.user.id.toString();

      // خيال تختار الموضوع
      const surprise = await pickSurprise(memUserId);

      const jobId = `surprise_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createJobInDB(jobId, surprise.description, undefined, undefined, ctx.user.id.toString());
      await updateJobInDB(jobId, {
        status: 'pending',
        currentStep: surprise.announcement,
        progress: 0,
        metrics: { surpriseAnnouncement: surprise.announcement, surpriseTopic: surprise.topic.title },
      });

      jobQueue.enqueue(jobId, memUserId, async () => {
        await updateJobInDB(jobId, { status: 'processing', currentStep: `🧠 خيال تحلل: ${surprise.topic.title}`, progress: 2 });

        const thinkingSteps: any[] = [];
        const decision = await directAutonomously(surprise.description, async (step) => {
          thinkingSteps.push(step);
          await updateJobInDB(jobId, {
            currentStep: `${step.icon} ${step.label}: ${step.detail}`,
            progress: Math.min(15, 2 + thinkingSteps.length * 2),
            metrics: {
              thinkingSteps: [...thinkingSteps],
              decision: null,
              surpriseAnnouncement: surprise.announcement,
              surpriseTopic: surprise.topic.title,
            },
          });
        }, memUserId);

        await updateJobInDB(jobId, {
          currentStep: `🎬 ${decision.filmTitle} — بدأ الإنتاج`,
          progress: 16,
          metrics: {
            thinkingSteps: decision.thinkingSteps,
            decision: {
              productionType: decision.productionType,
              genre: decision.genre,
              genreLabel: decision.genreLabel,
              genreEmoji: decision.genreEmoji,
              voice: decision.voice,
              sceneCount: decision.sceneCount,
              filmTitle: decision.filmTitle,
              understanding: decision.understanding,
              reasoning: decision.reasoning,
            },
            surpriseAnnouncement: surprise.announcement,
            surpriseTopic: surprise.topic.title,
          },
        });

        const params = decisionToProductionParams(decision);
        const script = await generateVideoScript(params.description, params.language, params.voice, params.sceneCount);
        await updateJobInDB(jobId, { currentStep: `📝 السيناريو جاهز: "${script.title}"`, progress: 22 });

        const producer = new VideoProducer();
        const videoUrl = await producer.produce(
          script,
          {
            aspectRatio: params.options?.aspectRatio ?? '16:9',
            mode: 'production',
            musicVolume: 0.12,
            useRunway: true,
            useElevenLabs: true,
            quality: decision.productionType === 'pro_video' ? 'pro' : 'fast',
          },
          async (update: Partial<VideoJob>) => {
            await updateJobInDB(jobId, {
              status: update.status as any,
              progress: update.progress ? Math.max(22, update.progress) : undefined,
              currentStep: update.currentStep,
              videoUrl: update.videoUrl,
              error: update.error,
              metrics: update.metrics ? {
                ...update.metrics,
                thinkingSteps: decision.thinkingSteps,
                decision: {
                  productionType: decision.productionType,
                  genre: decision.genre,
                  genreLabel: decision.genreLabel,
                  genreEmoji: decision.genreEmoji,
                  voice: decision.voice,
                  sceneCount: decision.sceneCount,
                  filmTitle: decision.filmTitle,
                  understanding: decision.understanding,
                  reasoning: decision.reasoning,
                },
                surpriseAnnouncement: surprise.announcement,
                surpriseTopic: surprise.topic.title,
              } : undefined,
            });
          }
        );

        await updateJobInDB(jobId, { status: 'done', progress: 100, currentStep: '✅ اكتمل الإنتاج!', videoUrl });
        recordProduction(memUserId, {
          genre: decision.genre,
          voiceId: decision.voice,
          aspectRatio: decision.aspectRatio,
          sceneCount: decision.sceneCount,
          style: decision.genreLabel,
          duration: decision.productionType === 'pro_video' ? 'long' : 'short',
          domain: surprise.topic.domain,
        }).catch(() => {});
      }).catch(async (err: Error) => {
        const msg = err.message.includes(':') ? err.message.split(':')[1] : err.message;
        await updateJobInDB(jobId, { status: 'failed', error: msg, currentStep: msg });
      });

      return { jobId, announcement: surprise.announcement, topicTitle: surprise.topic.title };
    }),

  // ════════════════════════════════════════════════════════════════
  // getAutonomousDecision — جلب قرارات خيال لعرضها في الواجهة
  // ════════════════════════════════════════════════════════════════
  getAutonomousDecision: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(videoJobsTable).where(eq(videoJobsTable.id, input.jobId)).limit(1);
      if (!rows[0]) return null;
      const metrics = rows[0].metrics as any;
      return {
        thinkingSteps: metrics?.thinkingSteps ?? [],
        decision: metrics?.decision ?? null,
      };
    }),

  // ════════════════════════════════════════════════════════════════
  // getMemoryStatus — حالة ذاكرة خيال للمستخدم الحالي
  // ════════════════════════════════════════════════════════════════
  getMemoryStatus: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return { hasMemory: false, totalProductions: 0, preferredGenre: null, preferredVoice: null };
    const { getMemory } = await import('./khayalMemory');
    const memory = await getMemory(String(ctx.user.id));
    return {
      hasMemory: memory.hasMemory,
      totalProductions: memory.totalProductions,
      preferredGenre: memory.preferredGenre,
      preferredVoice: memory.preferredVoice,
    };
  }),

  // ────────────────────────────────────────────────────────
  // ★ editScene — تعديل مشهد واحد وإعادة دمج الفيديو (بدون إعادة إنتاج كاملة)
  // ────────────────────────────────────────────────────────
  editScene: publicProcedure
    .input(z.object({
      jobId: z.string(),
      sceneIndex: z.number().min(0),
      newPrompt: z.string().min(5).max(1000),
      revisionNote: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('قاعدة البيانات غير متاحة');

      // جلب بيانات المهمة الأصلية
      const rows = await db.select().from(videoJobsTable).where(eq(videoJobsTable.id, input.jobId)).limit(1);
      const job = rows[0];
      if (!job) throw new Error('المهمة غير موجودة');
      if (job.status !== 'done') throw new Error('لا يمكن تعديل فيديو غير مكتمل');
      if (!job.scriptData) throw new Error('لا يوجد سيناريو محفوظ لهذه المهمة');

      const script = job.scriptData as any;
      if (input.sceneIndex >= (script.scenes?.length ?? 0)) {
        throw new Error(`رقم المشهد ${input.sceneIndex} غير صحيح`);
      }

      // تحديث المهمة إلى حالة التعديل
      const editJobId = `edit_${input.jobId}_s${input.sceneIndex}_${Date.now()}`;
      await createJobInDB(editJobId, `تعديل مشهد ${input.sceneIndex + 1}: ${input.newPrompt.slice(0, 50)}`);
      await updateJobInDB(editJobId, { status: 'pending', currentStep: 'جاري تحضير التعديل...', progress: 0 });

      // جلب روابط مقاطع المشاهد الأصلية من sceneStates
      const sceneStates = (job.sceneStates as Array<{ videoUrl?: string; imageUrl?: string; done?: boolean }> | null) ?? [];
      const existingSceneVideoUrls: Array<string | null> = script.scenes.map((_: any, i: number) =>
        sceneStates[i]?.videoUrl ?? null
      );

      // تشغيل التعديل في الخلفية
      ;(async () => {
        try {
          const producer = new VideoProducer();
          const newVideoUrl = await producer.produceEditedVideo(
            script,
            input.sceneIndex,
            input.newPrompt,
            existingSceneVideoUrls,
            {
              aspectRatio: (job.optionsData as any)?.aspectRatio ?? '16:9',
              quality: (job.optionsData as any)?.quality ?? 'fast',
              useRunway: (job.optionsData as any)?.useRunway ?? true,
            },
            async (update: Partial<VideoJob>) => {
              await updateJobInDB(editJobId, {
                status: update.status as any,
                progress: update.progress,
                currentStep: update.currentStep,
                videoUrl: update.videoUrl,
                error: update.error,
              });
            }
          );

          // تحديث المهمة الأصلية بالفيديو الجديد
          await updateJobInDB(input.jobId, { videoUrl: newVideoUrl });
          await updateJobInDB(editJobId, { status: 'done', progress: 100, currentStep: 'اكتمل التعديل!', videoUrl: newVideoUrl });

          // حفظ سجل التعديل في sceneRevisions
          const prevRevisions = await db.select().from(sceneRevisionsTable)
            .where(eq(sceneRevisionsTable.jobId, input.jobId))
            .limit(1);
          const nextVersion = prevRevisions.length > 0 ? (prevRevisions[0].version ?? 1) + 1 : 1;

          // أرشفة النسخ السابقة
          await db.update(sceneRevisionsTable)
            .set({ isActive: 0 })
            .where(eq(sceneRevisionsTable.jobId, input.jobId));

          // حفظ التعديل الجديد
          await db.insert(sceneRevisionsTable).values({
            jobId: input.jobId,
            sceneIndex: input.sceneIndex,
            imageUrl: newVideoUrl,
            prompt: input.newPrompt,
            revisionNote: input.revisionNote ?? null,
            version: nextVersion,
            isActive: 1,
          } as any);

          // تحديث السيناريو بالـ prompt الجديد
          const updatedScript = { ...script };
          updatedScript.scenes[input.sceneIndex].imagePrompt = input.newPrompt;
          await db.update(videoJobsTable)
            .set({ scriptData: updatedScript })
            .where(eq(videoJobsTable.id, input.jobId));

        } catch (err) {
          await updateJobInDB(editJobId, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
            currentStep: 'فشل التعديل',
          });
        }
      })();

      return { editJobId, sceneIndex: input.sceneIndex };
    }),

  // ────────────────────────────────────────────────────────
  // ★ getEditJobStatus — جلب حالة مهمة التعديل
  // ────────────────────────────────────────────────────────
  getEditJobStatus: publicProcedure
    .input(z.object({ editJobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(videoJobsTable)
        .where(eq(videoJobsTable.id, input.editJobId))
        .limit(1);
      if (!rows[0]) return null;
      const job = rows[0];
      return {
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        videoUrl: job.videoUrl,
        error: job.error,
      };
    }),

  // ────────────────────────────────────────────────────────
  // retryJob — يُعيد ضبط retryCount ويُعيد الإنتاج من البداية
  // ────────────────────────────────────────────────────────
  retryJob: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const rows = await db.select().from(videoJobsTable).where(eq(videoJobsTable.id, input.jobId)).limit(1);
      const job = rows[0];
      if (!job) throw new Error('Job not found');
      if (job.status !== 'failed') throw new Error('Job is not in failed state');
      if (!job.scriptData) throw new Error('No script data to retry with');

      // إعادة ضبط المحاولات والحالة
      await updateJobInDB(input.jobId, {
        status: 'pending',
        progress: 0,
        currentStep: 'إعادة المحاولة...',
        retryCount: 0,
        lastHeartbeat: new Date(),
      });

      // إعادة الإنتاج في الخلفية
      setTimeout(() => {
        runProductionJob(input.jobId, job.scriptData as any, job.optionsData as any);
      }, 500);

      return { success: true, jobId: input.jobId };
    }),
});
