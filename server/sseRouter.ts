/**
 * sseRouter.ts — Server-Sent Events لبث حالة المهام الحية
 * ═══════════════════════════════════════════════════════════════
 *
 * بدلاً من polling كل 2 ثانية، الواجهة تفتح اتصال SSE واحد
 * والسيرفر يُرسل التحديثات فور حدوثها — تجربة مثل Manus تماماً.
 *
 * الاستخدام:
 *   GET /api/sse/job/:jobId
 *   الواجهة: const es = new EventSource(`/api/sse/job/${jobId}`)
 *
 * الأحداث المُرسَلة:
 *   - "thinking"  → خطوة تفكير جديدة من autonomousDirector
 *   - "progress"  → تحديث نسبة التقدم + currentStep
 *   - "done"      → الإنتاج اكتمل + videoUrl
 *   - "failed"    → خطأ في الإنتاج
 *   - "heartbeat" → نبضة كل 15 ثانية لمنع انقطاع الاتصال
 */
import { Router, type Request, type Response } from "express";
import { getDb } from "./db";
import { videoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ══════════════════════════════════════════════════════════════
// مخزن الاتصالات الحية: jobId → Set<Response>
// ══════════════════════════════════════════════════════════════
const liveConnections = new Map<string, Set<Response>>();

/**
 * بث حدث SSE لجميع المستمعين على jobId معين
 */
export function broadcastJobEvent(
  jobId: string,
  event: string,
  data: unknown
): void {
  const clients = liveConnections.get(jobId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(payload);
    } catch {
      // الاتصال انقطع — سيُزال عند إغلاق المقبس
    }
  }
}

/**
 * بث تحديث تقدم عام (progress + currentStep + status)
 */
export function broadcastProgress(
  jobId: string,
  update: {
    progress?: number;
    currentStep?: string;
    status?: string;
    videoUrl?: string;
    error?: string;
    thinkingStep?: unknown;
    decision?: unknown;
  }
): void {
  if (update.thinkingStep) {
    broadcastJobEvent(jobId, "thinking", update.thinkingStep);
  }
  if (update.status === "done") {
    broadcastJobEvent(jobId, "done", {
      videoUrl: update.videoUrl,
      progress: 100,
      currentStep: update.currentStep,
    });
  } else if (update.status === "failed") {
    broadcastJobEvent(jobId, "failed", { error: update.error });
  } else {
    broadcastJobEvent(jobId, "progress", {
      progress: update.progress,
      currentStep: update.currentStep,
      status: update.status,
      decision: update.decision,
    });
  }
}

// ══════════════════════════════════════════════════════════════
// Express Router
// ══════════════════════════════════════════════════════════════
const sseRouter = Router();

sseRouter.get("/api/sse/job/:jobId", async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // إعداد headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // تعطيل nginx buffering
  res.flushHeaders();

  // إرسال الحالة الحالية فوراً (للمستخدم الذي يُعيد الاتصال)
  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.id, jobId))
        .limit(1);
      if (rows[0]) {
        const job = rows[0];
        const metrics = job.metrics as any;
        // إرسال خطوات التفكير المحفوظة
        if (metrics?.thinkingSteps?.length) {
          for (const step of metrics.thinkingSteps) {
            res.write(`event: thinking\ndata: ${JSON.stringify(step)}\n\n`);
          }
        }
        // إرسال الحالة الحالية
        if (job.status === "done") {
          res.write(
            `event: done\ndata: ${JSON.stringify({
              videoUrl: job.videoUrl,
              progress: 100,
              currentStep: job.currentStep,
            })}\n\n`
          );
        } else if (job.status === "failed") {
          res.write(
            `event: failed\ndata: ${JSON.stringify({ error: job.error })}\n\n`
          );
        } else {
          res.write(
            `event: progress\ndata: ${JSON.stringify({
              progress: job.progress,
              currentStep: job.currentStep,
              status: job.status,
              decision: metrics?.decision ?? null,
            })}\n\n`
          );
        }
      }
    }
  } catch (e) {
    // تجاهل أخطاء قراءة الحالة الأولية
  }

  // تسجيل الاتصال
  if (!liveConnections.has(jobId)) {
    liveConnections.set(jobId, new Set());
  }
  liveConnections.get(jobId)!.add(res);

  // نبضة كل 15 ثانية لمنع انقطاع الاتصال
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  // تنظيف عند إغلاق الاتصال
  req.on("close", () => {
    clearInterval(heartbeat);
    liveConnections.get(jobId)?.delete(res);
    if (liveConnections.get(jobId)?.size === 0) {
      liveConnections.delete(jobId);
    }
  });
});

export default sseRouter;
