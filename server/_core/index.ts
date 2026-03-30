import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerPlatformApiRoutes } from "../platformApi";
import { registerPlatformDocsRoute } from "../platformDocs";
import { registerWidgetApiRoutes } from "../widgetApi";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureSubscriptionProducts } from "../stripeSubscriptions";
import { startHealthMonitor } from "../healthMonitor";

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

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (required for rate limiting behind reverse proxy / Manus platform)
  app.set("trust proxy", 1);

  // ── CORS — allow all mousa.ai subdomains with credentials ────────────────
  // This is required for fada.mousa.ai, raqaba.mousa.ai etc. to call /api/trpc
  // and have their cookies sent + accepted by the browser.
  app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    const isMousaOrigin =
      origin === "https://mousa.ai" ||
      origin === "https://www.mousa.ai" ||
      /^https:\/\/[a-z0-9-]+\.mousa\.ai$/.test(origin) ||
      // Allow manus.space preview domains during development
      /^https:\/\/[a-z0-9-]+\.manus\.space$/.test(origin) ||
      origin === "http://localhost:3000" ||
      origin === "http://localhost:5173";

    if (isMousaOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Platform-ID");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // ── Compression (Gzip/Deflate) ────────────────────────────────────────────
  // Compresses HTML, JSON, JS responses — reduces transfer size by 60-80%
  app.use(compression({
    level: 6,           // balance between speed and compression ratio
    threshold: 1024,    // only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress already-compressed assets (images, fonts)
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }));

  // ── Security Headers (helmet) ────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite HMR & CDN assets need flexibility
      crossOriginEmbedderPolicy: false, // Allow CDN images/fonts
    })
  );

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  // General API rate limit: 200 requests / 15 minutes per IP
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً (429)" },
  });

  // Strict limit for AI chat: 30 messages / 5 minutes per IP
  const chatLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تجاوزت الحد المسموح من الرسائل، يرجى الانتظار قليلاً (429)" },
  });

  // Auth endpoints: 20 attempts / 15 minutes per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "محاولات تسجيل دخول كثيرة، يرجى المحاولة لاحقاً (429)" },
  });

  app.use("/api/trpc", apiLimiter);
  app.use("/api/oauth", authLimiter);

  // Widget endpoints: 20 requests / 5 minutes per IP (prevent LLM/TTS abuse)
  const widgetLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تجاوزت الحد المسموح لموسى الذكي، يرجى الانتظار قليلاً (429)" },
  });

  // Platform API: 100 requests / 15 minutes per IP
  const platformLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "طلبات كثيرة على Platform API (429)" },
  });

  app.use("/api/widget", widgetLimiter);
  app.use("/api/platform", platformLimiter);

  // ⚠️ Stripe webhook MUST be registered BEFORE express.json() to preserve raw body
  registerStripeWebhook(app);

  // Body parser — reduced from 50MB to 5MB for security (DoS protection)
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Platform Integration API — for sub-platforms to authenticate users & deduct credits
  registerPlatformApiRoutes(app);

  // Platform Integration Docs — developer guide at /api/platform/docs
  registerPlatformDocsRoute(app);

  // MOUSA Widget API — chat and TTS for the embedded AI guide widget
  registerWidgetApiRoutes(app);

  // Video Library Proxy — avoids CORS issues when fetching intro videos from mousa-videos library
  // Maps internal platform IDs → Video Library API slugs (4 languages: ar/en/ur/fr)
  const PLATFORM_TO_VIDEO_SLUG: Record<string, string> = {
    fada:             "sarah-ai",
    raqaba:           "khalid-inspect",
    harara:           "thermabuild",
    maskan:           "fam-housing",
    code:             "archicode",
    khayal:           "tashkila3d",
    // allow direct slug passthrough
    "sarah-ai":       "sarah-ai",
    "khalid-inspect": "khalid-inspect",
    "thermabuild":    "thermabuild",
    "fam-housing":    "fam-housing",
    "archicode":      "archicode",
    "tashkila3d":     "tashkila3d",
    "mousa-ai":       "mousa-ai",
  };
  const SUPPORTED_VIDEO_LANGS = ["ar", "en", "ur", "fr"];
  app.get("/api/video-intro", async (req, res) => {
    try {
      const rawSlug = String(req.query.slug || "").trim();
      const rawLang = String(req.query.lang || "ar").trim();
      if (!rawSlug) {
        return res.status(400).json({ error: "Missing slug" });
      }
      // Map platform ID to Video Library API slug
      const apiSlug = PLATFORM_TO_VIDEO_SLUG[rawSlug] ?? rawSlug;
      // Normalise lang — only ar/en/ur/fr supported by Video Library
      const lang = SUPPORTED_VIDEO_LANGS.includes(rawLang) ? rawLang : "ar";
      const input = encodeURIComponent(JSON.stringify({ json: { slug: apiSlug, lang } }));
      const upstream = await fetch(
        `https://mousa-videos-dhirhndb.manus.space/api/trpc/releases.getIntro?input=${input}`
      );
      const data = await upstream.json() as Record<string, unknown>;
      return res.json(data);
    } catch (err) {
      console.error("[VideoProxy] Error:", err);
      return res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  // tRPC API with chat rate limiter on AI procedures
  app.use(
    "/api/trpc/ai.sendMessage",
    chatLimiter
  );

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
    // Ensure Stripe subscription products exist (idempotent)
    ensureSubscriptionProducts().catch((err) =>
      console.error("[Stripe] Failed to ensure subscription products:", err)
    );
    // Seed default pricing rules if not already seeded (idempotent — skips existing)
    import("../db").then(({ seedDefaultPricingRules }) => {
      seedDefaultPricingRules(0).catch((err) =>
        console.error("[Pricing] Failed to seed default pricing rules:", err)
      );
    });
    // Start proactive health monitoring (checks every 5 minutes)
    startHealthMonitor(5);
  });
}

startServer().catch(console.error);
