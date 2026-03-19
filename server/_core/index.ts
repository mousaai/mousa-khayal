import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import mediaRoutes from "../mediaRoutes";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
// ── استئناف الـ jobs المتوقفة عند بدء التشغيل ─────────────────────────────────────────
async function cleanupStuckJobs() {
  try {
    const { getDb } = await import("../db");
    const { videoJobs } = await import("../../drizzle/schema");
    const { inArray, eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return;

    // جلب جميع الـ jobs المتوقفة
    const stuckJobs = await db
      .select()
      .from(videoJobs)
      .where(inArray(videoJobs.status, ["pending", "processing"]));

    let resumed = 0;
    let failed = 0;

    for (const job of stuckJobs) {
      // إذا كان لديه scriptData وعدد محاولات < 3 → استئناف
      if (job.scriptData && (job.retryCount ?? 0) < 3) {
        // تأخير بسيط لضمان تحميل الروترات بالكامل
        setTimeout(async () => {
          try {
            const { videoRouter } = await import("../videoRouter");
            // استخدام runProductionJob عبر الروتر
            const { runProductionJobExported } = await import("../videoRouter");
            if (typeof runProductionJobExported === "function") {
              await runProductionJobExported(job.id, job.scriptData, job.optionsData ?? {});
            }
          } catch (e) {
            console.warn(`[Startup] فشل استئناف ${job.id}:`, e);
          }
        }, 3000 + resumed * 2000); // تأخير متدرج لتجنب الحمل الزائد
        resumed++;
      } else {
        // إذا لم يكن لديه بيانات كافية أو تجاوز عدد المحاولات → فشل
        await db.update(videoJobs)
          .set({
            status: "failed",
            currentStep: "انقطع الإنتاج بسبب إعادة تشغيل السيرفر",
            error: "Server restarted during production — max retries exceeded",
          })
          .where(eq(videoJobs.id, job.id));
        failed++;
      }
    }

    if (stuckJobs.length > 0) {
      console.log(`[Startup] استئناف ${resumed} مهمة وإلغاء ${failed} مهمة`);
    } else {
      console.log(`[Startup] Cleaned up stuck jobs`);
    }
  } catch (e) {
    console.warn("[Startup] cleanupStuckJobs error:", e);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // تنظيف الـ jobs العالقة بعد 10 ثواني من بدء السيرفر (لضمان استقرار اتصال DB)
  setTimeout(() => cleanupStuckJobs().catch(e => console.warn("[Startup] cleanupStuckJobs deferred error:", e)), 10_000);

  // ══ Compression: تقليل حجم الردود بـ 70-80% ════════════════════════════════════════════════
  app.use(compression({ level: 6, threshold: 1024 }));

  // ══ Rate Limiting متعدد الطبقات ════════════════════════════════════════════════════════════════════════
  // حد عام: 200 طلب/دقيقة لكل IP (يمنع DDoS بسيط) — ipKeyGenerator يتعامل مع IPv4 و IPv6
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'طلبات كثيرة جداً — حاول مرة أخرى بعد دقيقة' },
    keyGenerator: ipKeyGenerator,
    skip: (req) => req.path.startsWith('/api/oauth'),
  });
  app.use(globalLimiter);

  // حد مخصص: 5 طلبات إنتاج/دقيقة لكل IP على endpoints الثقيلة
  const productionLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'تجاوزت الحد المسموح (5 طلبات إنتاج/دقيقة). حاول بعد قليل' },
    keyGenerator: ipKeyGenerator,
  });
  // تطبيق على مسارات الإنتاج فقط
  app.use('/api/trpc/video.startProduction', productionLimiter);
  app.use('/api/trpc/video.quickProduce', productionLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Media endpoints (transcribe + upload)
  app.use(mediaRoutes);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
