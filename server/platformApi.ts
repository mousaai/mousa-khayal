/**
 * platformApi.ts — mousa.ai Platform Integration REST API
 *
 * هذا الملف يوفر REST endpoints للمنصات الفرعية الست للتكامل مع المنصة الرئيسية.
 * جميع الـ endpoints تحت /api/platform/
 *
 * الـ endpoints المتاحة:
 *   POST /api/platform/generate-token  → يولّد JWT مؤقت (5 دقائق) لتمرير هوية المستخدم
 *   POST /api/platform/deduct-credits  → يخصم كريدت من حساب المستخدم (يستدعيه التطبيق الفرعي)
 *   GET  /api/platform/check-balance   → يتحقق من رصيد المستخدم
 *   POST /api/platform/verify-token    → يتحقق من صحة handoff token ويعيد بيانات المستخدم
 */

import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import {
  getOrCreateWallet,
  deductCredits,
  getUserByOpenId,
  getUserById,
  createSession,
  completeSession,
  calculatePlatformCost,
} from "./db";
import { routeQuery, cacheResponse, getRouterStats, type Platform } from "./knowledge/queryRouter";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";

// ─── Platform API Keys ────────────────────────────────────────────────────────
// مفاتيح API لكل منصة فرعية — يجب تعيينها كـ environment variables
// في حال عدم وجود مفتاح، يُستخدم مفتاح افتراضي للتطوير فقط
const PLATFORM_API_KEYS: Record<string, string> = {
  fada:    ENV.platformApiKeyFada    || "dev-key-fada-mousa2024",
  raqaba:  ENV.platformApiKeyRaqaba  || "dev-key-raqaba-mousa2024",
  harara:  ENV.platformApiKeyHarara  || "dev-key-harara-mousa2024",
  maskan:  ENV.platformApiKeyMaskan  || "dev-key-maskan-mousa2024",
  code:    ENV.platformApiKeyCode    || "dev-key-code-mousa2024",
  khayal:  ENV.platformApiKeyKhayal  || "dev-key-khayal-mousa2024",
};

// تكلفة كل منصة بالكريدت — يجب أن تتطابق مع PLATFORM_CONFIGS في routers.ts
const PLATFORM_COSTS: Record<string, number> = {
  fada:   20,
  raqaba: 30,
  harara: 35,
  maskan: 15,
  code:   10,
  khayal: 25,
};

const VALID_PLATFORMS = new Set(Object.keys(PLATFORM_COSTS));

// أسماء المنصات بالعربية للتسجيل
const PLATFORM_NAMES: Record<string, string> = {
  fada:   "فضاء",
  raqaba: "رقابة",
  harara: "حرارة",
  maskan: "مسكن",
  code:   "كود",
  khayal: "خيال",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret || "mousa-platform-secret-2024");
}

/** التحقق من مفتاح API للمنصة الفرعية */
function validatePlatformApiKey(platformId: string, apiKey: string): boolean {
  const expectedKey = PLATFORM_API_KEYS[platformId];
  if (!expectedKey) return false;
  return apiKey === expectedKey;
}

/** استخراج مفتاح API من Authorization header */
function extractApiKey(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ─── CORS Headers for Sub-platforms ──────────────────────────────────────────
// Allow requests from known sub-platform domains and mousa.ai itself
const ALLOWED_ORIGINS = new Set([
  "https://mousa.ai",
  "https://www.mousa.ai",
  "https://sarahdesign-umc8qbss.manus.space",
  "https://khaledinspec-vbvhhdsv.manus.space",
  "https://thermabuild-x9xsnp5r.manus.space",
  "https://famhousing-glcsxkkd.manus.space",
  "https://archicodesa-wzq39rwg.manus.space",
  "https://tashkila3d-bxekpajg.manus.space",
  // Custom subdomains (once DNS propagates)
  "https://fada.mousa.ai",
  "https://raqaba.mousa.ai",
  "https://harara.mousa.ai",
  "https://maskan.mousa.ai",
  "https://code.mousa.ai",
  "https://khayal.mousa.ai",
]);

function setCorsHeaders(req: import("express").Request, res: Response) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV !== "production") {
    // Allow any origin in development
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Platform-ID");
  res.setHeader("Vary", "Origin");
}

// ─── Register Routes ──────────────────────────────────────────────────────────

export function registerPlatformApiRoutes(app: Express) {

  // ── CORS Middleware — يُضاف على جميع ردود /api/platform/* بما فيها ردود الخطأ ──
  // هذا يحل مشكلة الحلقة المفرغة: المتصفح يرفض ردود الخطأ بدون CORS headers
  app.use("/api/platform", (req: Request, res: Response, next) => {
    setCorsHeaders(req, res);
    next();
  });

  // Handle CORS preflight for all /api/platform/* routes
  app.options("/api/platform/*", (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    res.status(204).send();
  });

  // ── 1. Generate Handoff Token ────────────────────────────────────────────────
  /**
   * POST /api/platform/generate-token
   * يولّد JWT مؤقت (5 دقائق) يحتوي على بيانات المستخدم لتمريرها للمنصة الفرعية
   *
   * يُستدعى من: المنصة الرئيسية (frontend) عند الضغط على بطاقة منصة فرعية
   *
   * Headers: Authorization: Bearer <session-cookie-value>
   * Body: { platform: "fada" | "raqaba" | "harara" | "maskan" | "code" }
   * Response: { token: string, platformUrl: string, expiresAt: number }
   */
  app.post("/api/platform/generate-token", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      // استخراج المستخدم من context (يتم حقنه من middleware)
      const user = (req as Request & { user?: { id: number; openId: string; name: string | null; email: string | null } }).user;
      if (!user) {
        res.status(401).json({ error: "غير مصرح — يجب تسجيل الدخول أولاً" });
        return;
      }

      const { platform } = req.body as { platform?: string };
      if (!platform || !VALID_PLATFORMS.has(platform)) {
        res.status(400).json({ error: "معرّف المنصة غير صحيح" });
        return;
      }

      const wallet = await getOrCreateWallet(user.id);
      // بناء الـ payload — الرصيد فقط، المنصة الفرعية تحدد تكلفتها بنفسها
      const payload = {
        sub: String(user.id),
        openId: user.openId,
        name: user.name ?? "",
        email: user.email ?? "",
        creditBalance: wallet.balance,
        platform,
        iss: "mousa.ai",
        type: "platform-handoff",
      };

      // توقيع الـ JWT بصلاحية 24 ساعة (كافية لجلسة عمل كاملة)
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecret());

      const PLATFORM_URLS: Record<string, string> = {
        fada:   "https://fada.mousa.ai/",
        raqaba: "https://raqaba.mousa.ai/",
        harara: "https://harara.mousa.ai/",
        maskan: "https://maskan.mousa.ai/",
        code:   "https://code.mousa.ai/",
        khayal: "https://khayal.mousa.ai/",
      };

      res.json({
        token,
        platformUrl: `${PLATFORM_URLS[platform]}?token=${encodeURIComponent(token)}`,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        creditBalance: wallet.balance,
      });
    } catch (error) {
      console.error("[Platform API] generate-token error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 2. Verify Handoff Token ──────────────────────────────────────────────────
  /**
   * POST /api/platform/verify-token
   * يتحقق من صحة handoff token ويعيد بيانات المستخدم
   *
   * يُستدعى من: المنصة الفرعية عند استقبال ?token= في URL
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Body: { token: string }
   * Response: { valid: true, userId, openId, name, email, creditBalance, platform }
   */
  app.post("/api/platform/verify-token", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

      const { token } = req.body as { token?: string };
      if (!token) {
        res.status(400).json({ error: "الـ token مطلوب" });
        return;
      }

      const { payload } = await jwtVerify(token, getJwtSecret());

      // التحقق من أن الـ token مخصص لهذه المنصة
      if (payload["platform"] !== platformId) {
        res.status(403).json({ error: "الـ token ليس مخصصاً لهذه المنصة" });
        return;
      }

      if (payload["type"] !== "platform-handoff") {
        res.status(403).json({ error: "نوع الـ token غير صحيح" });
        return;
      }

      // تحديث الرصيد من قاعدة البيانات (الـ token قد يكون قديماً)
      const userId = Number(payload["sub"]);
      const wallet = await getOrCreateWallet(userId);
      // الرصيد فقط — المنصة الفرعية تحدد تكلفتها بنفسها وتقارنها بالرصيد
      res.json({
        valid: true,
        userId,
        openId: payload["openId"],
        name: payload["name"],
        email: payload["email"],
        creditBalance: wallet.balance,
        platform: payload["platform"],
      });
    } catch (error) {
      if ((error as Error).name === "JWTExpired") {
        res.status(401).json({ error: "انتهت صلاحية الـ token — يرجى العودة لـ mousa.ai", code: "TOKEN_EXPIRED" });
        return;
      }
      console.error("[Platform API] verify-token error:", error);
      res.status(401).json({ error: "الـ token غير صالح" });
    }
  });

  // ── 3. Deduct Credits ────────────────────────────────────────────────────────
  /**
   * POST /api/platform/deduct-credits
   * يخصم كريدت من حساب المستخدم — يُستدعى من المنصة الفرعية بعد كل طلب AI
   *
   * يُستدعى من: المنصة الفرعية بعد نجاح طلب AI
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Body: { userId: number, amount?: number, description?: string }
   * Response: { success: true, newBalance: number, deducted: number }
   */
  app.post("/api/platform/deduct-credits", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

        const body = req.body as {
        userId?: number;
        amount?: number;
        description?: string;
        /** usage_factors: تفاصيل الاستخدام الفعلي من المنصة الفرعية لاحتساب التكلفة الدقيقة */
        usage_factors?: Record<string, number>;
      };

      const { userId, amount, description, usage_factors } = body;

      if (!userId || typeof userId !== "number") {
        res.status(400).json({ error: "userId مطلوب ويجب أن يكون رقماً" });
        return;
      }

      // ─── احتساب التكلفة الديناميكية ─────────────────────────────────────────
      let deductAmount: number;
      let costBreakdown: Record<string, number> = {};
      let costRule = "";

      if (amount !== undefined && typeof amount === "number" && amount > 0) {
        // المنصة حددت المبلغ صراحةً — نستخدمه مباشرةً
        deductAmount = amount;
        costBreakdown = { specified: amount };
        costRule = "مبلغ محدد من المنصة";
      } else if (usage_factors && typeof usage_factors === "object") {
        // المنصة أرسلت usage_factors — نحتسب التكلفة بالمعادلة الديناميكية
        const calc = await calculatePlatformCost(platformId, usage_factors);
        deductAmount = calc.cost;
        costBreakdown = calc.breakdown;
        costRule = calc.rule;
      } else {
        // لا يوجد usage_factors ولا amount — نستخدم التكلفة الافتراضية
        const calc = await calculatePlatformCost(platformId, {});
        deductAmount = calc.cost;
        costBreakdown = calc.breakdown;
        costRule = calc.rule;
      }

      const deductDesc = description ?? `استخدام منصة ${PLATFORM_NAMES[platformId] ?? platformId}`;

      const result = await deductCredits(userId, deductAmount, platformId, deductDesc);

      if (!result.success) {
        res.status(402).json({
          error: result.error ?? "رصيد الكريدت غير كافٍ",
          currentBalance: result.newBalance,
          required: deductAmount,
          costBreakdown,
          upgradeUrl: "https://www.mousa.ai/pricing?ref=" + platformId,
        });
        return;
      }

      // ✅ تسجيل الجلسة في ai_sessions لتتبع الاستهلاك
      try {
        const sessionTitle = description ?? `تقرير ${PLATFORM_NAMES[platformId] ?? platformId}`;
        const session = await createSession(userId, platformId as any, sessionTitle);
        await completeSession(session.id, deductAmount);
      } catch (sessionErr) {
        console.warn("[Platform API] Failed to log session:", sessionErr);
      }

      res.json({
        success: true,
        newBalance: result.newBalance,
        deducted: deductAmount,
        platform: platformId,
        costBreakdown,
        costRule,
      });
    } catch (error) {
      console.error("[Platform API] deduct-credits error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 4. Check Balance ─────────────────────────────────────────────────────────
  /**
   * GET /api/platform/check-balance?userId=<id>
   * يتحقق من رصيد المستخدم ويخبر المنصة الفرعية إذا كان الرصيد كافياً
   *
   * يُستدعى من: المنصة الفرعية قبل بدء طلب AI
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Query: userId=<number>
   * Response: { balance: number, sufficient: boolean, platformCost: number, upgradeUrl: string }
   */
  app.get("/api/platform/check-balance", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

      const userId = Number(req.query["userId"]);
      if (!userId || isNaN(userId)) {
        res.status(400).json({ error: "userId مطلوب في query string" });
        return;
      }

       const wallet = await getOrCreateWallet(userId);
      // الرصيد فقط — المنصة الفرعية تحدد تكلفتها وتقارنها بالرصيد بنفسها
      res.json({
        balance: wallet.balance,
        upgradeUrl: `https://www.mousa.ai/pricing?ref=${platformId}&return=${encodeURIComponent("https://www.mousa.ai/dashboard")}`,
      });
    } catch (error) {
      console.error("[Platform API] check-balance error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 5. Platform Info ───────────────────────────────────────────────────────────────────────────────
  /**
   * GET /api/platform/info
   * معلومات عامة عن المنصات المتاحة وتكاليفها (لا يحتاج مصادقة) — تكاليف ديناميكية من DB
   */
  app.get("/api/platform/info", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    // المعلومات الثابتة لكل منصة
    const PLATFORM_META: Record<string, { nameAr: string; nameEn: string; url: string }> = {
      fada:   { nameAr: "فضاء",  nameEn: "FADA",   url: "https://fada.mousa.ai/" },
      raqaba: { nameAr: "رقابة", nameEn: "RAQABA", url: "https://raqaba.mousa.ai/" },
      harara: { nameAr: "حرارة", nameEn: "HARARA", url: "https://harara.mousa.ai/" },
      maskan: { nameAr: "مسكن",  nameEn: "MASKAN", url: "https://maskan.mousa.ai/" },
      code:   { nameAr: "كود",   nameEn: "CODE",   url: "https://code.mousa.ai/" },
      khayal: { nameAr: "خيال",  nameEn: "KHAYAL", url: "https://khayal.mousa.ai/" },
    };
    // جلب التكاليف من DB بشكل ديناميكي
    const platforms: Record<string, { nameAr: string; nameEn: string; url: string; minCost: number; maxCost: number; baseCost: number }> = {};
    for (const [id, meta] of Object.entries(PLATFORM_META)) {
      const costCalc = await calculatePlatformCost(id, {});
      platforms[id] = { ...meta, minCost: costCalc.cost, maxCost: costCalc.cost, baseCost: costCalc.cost };
    }
    // جلب maxCost من DB أيضاً
    try {
      const { getAllPricingRules } = await import("./db");
      const rules = await getAllPricingRules();
      for (const rule of rules) {
        if (rule.isActive && platforms[rule.platform]) {
          platforms[rule.platform].minCost = rule.minCost;
          platforms[rule.platform].maxCost = rule.maxCost;
          platforms[rule.platform].baseCost = rule.baseCost;
        }
      }
    } catch { /* use calculated values */ }
    res.json({
      platforms,
      pricingUrl: "https://www.mousa.ai/pricing",
      dashboardUrl: "https://www.mousa.ai/dashboard",
    });
  });

  // ── 6. Smart Query — Cost-Optimized AI Endpoint ───────────────────────────────────────────────────────────────────────────────
  /**
   * POST /api/platform/smart-query
   * الـ endpoint الذكي الذي يوجّه الاستفسارات للمصدر الأرخص أولاً:
   * 1. FAQ Cache (0 كريدت)
   * 2. Building Codes (0 كريدت)
   * 3. Climate/Material Data (0 كريدت)
   * 4. Decision Trees (0 كريدت)
   * 5. LLM مع حقن السياق المحلي (3-5 كريدت فقط)
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Body: { userId: number, query: string, emirate?: string, history?: Array<{role,content}> }
   * Response: { answer, source, creditCost, confidence, data? }
   */
  app.post("/api/platform/smart-query", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

      const { userId, query, emirate, history, systemPrompt } = req.body as {
        userId?: number;
        query?: string;
        emirate?: string;
        history?: Array<{ role: string; content: string }>;
        systemPrompt?: string;
      };

      if (!userId || !query) {
        res.status(400).json({ error: "userId و query مطلوبان" });
        return;
      }

      // Check balance first
      const wallet = await getOrCreateWallet(userId);
      if (wallet.balance < 1) {
        res.status(402).json({
          error: "رصيد الكريدت غير كافٍ",
          currentBalance: wallet.balance,
          upgradeUrl: `https://www.mousa.ai/pricing?ref=${platformId}`,
        });
        return;
      }

      // Route the query through the smart router
      const routerResult = await routeQuery({
        platform: platformId as Platform,
        query,
        emirate,
      });

      let finalAnswer = routerResult.answer;
      let actualCreditCost = routerResult.creditCost;

      // If LLM is needed, call it with local context enrichment
      if (routerResult.needsLLMEnrichment || routerResult.source === "llm") {
        const localContext = (routerResult.data?.localContext as string) || "";
        
        const platformSystemPrompts: Record<string, string> = {
          fada:   "أنت فضاء، مستشار ذكي متخصص في التصميم الداخلي والديكور. تقدم توصيات احترافية للمساحات السكنية والتجارية في الإمارات.",
          raqaba: "أنت رقابة، مشرف ميداني ذكي متخصص في تفتيش مواقع البناء. تحلل الصور وتكتشف المخالفات وتقيّم التقدم الإنشائي.",
          harara: "أنت حرارة، محلل متخصص في الكفاءة الطاقوية والأحمال الحرارية للمباني وفق المعايير الإماراتية.",
          maskan: "أنت مسكن، محلل متخصص في احتياجات السكن والتمويل العقاري في الإمارات.",
          code:   "أنت كود، مرجع هندسي متخصص في كودات البناء والسلامة والاشتراطات الفنية الإماراتية.",
          khayal: "أنت خيال، مصور معماري ذكي متخصص في التصور ثلاثي الأبعاد والتصميم المعماري الإبداعي.",
        };

        const sysPrompt = systemPrompt || platformSystemPrompts[platformId] || "أنت مساعد هندسي ذكي متخصص في قطاع البناء والعمران في الإمارات.";
        
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: sysPrompt + (localContext ? `\n\n${localContext}` : "") },
          ...(history || []).slice(-6).map(h => ({
            role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
            content: h.content
          })),
          { role: "user", content: query },
        ];

        const llmResponse = await invokeLLM({ messages });
        const rawContent = llmResponse.choices?.[0]?.message?.content;
        finalAnswer = (typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent)) || "عذراً، لم أتمكن من معالجة طلبك.";
        actualCreditCost = localContext ? 3 : 5; // Cheaper with local context

        // Auto-cache the LLM response for future use
        cacheResponse(
          { platform: platformId as Platform, query },
          query,
          finalAnswer,
          75
        ).catch(() => {});
      }

      // Deduct credits + log session
      if (actualCreditCost > 0) {
        await deductCredits(
          userId,
          actualCreditCost,
          platformId,
          `استخدام ${platformId} — ${routerResult.source}`
        );
        // ✅ تسجيل الجلسة في ai_sessions
        try {
          const session = await createSession(userId, platformId as any, query.slice(0, 120));
          await completeSession(session.id, actualCreditCost);
        } catch (sessionErr) {
          console.warn("[Platform API] Failed to log smart-query session:", sessionErr);
        }
      }

      res.json({
        answer: finalAnswer,
        source: routerResult.source,
        creditCost: actualCreditCost,
        confidence: routerResult.confidence,
        newBalance: wallet.balance - actualCreditCost,
        data: routerResult.data,
      });
    } catch (error) {
      console.error("[Platform API] smart-query error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 7. Router Stats (for admin dashboard) ────────────────────────────────────
  /**
   * GET /api/platform/router-stats
   * إحصاءات الـ Smart Router — كم كريدت تم توفيره
   * Headers: Authorization: Bearer <any-platform-api-key>, X-Platform-ID: <platform>
   */
  app.get("/api/platform/router-stats", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "غير مصرح" });
        return;
      }

      const stats = await getRouterStats();
      res.json(stats);
    } catch (error) {
      console.error("[Platform API] router-stats error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 8. Public Pricing (no auth required) ────────────────────────────────────
  /**
   * GET /api/platform/pricing
   * تسعير المنصات الفرعية — عام بدون مصادقة
   * يُعيد minCost/maxCost/baseCost/description/nameAr/nameEn لكل منصة من DB
   * يمكن للمنصات الفرعية استدعاؤه مباشرةً بدون API key
   */
  app.get("/api/platform/pricing", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const { getAllPricingRules } = await import("./db");
      const rules = await getAllPricingRules();

      const DEFAULTS: Record<string, {
        minCost: number; maxCost: number; baseCost: number;
        description: string; nameAr: string; nameEn: string;
      }> = {
        fada:   { minCost: 5,  maxCost: 60, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "فضاء",  nameEn: "FADA"   },
        raqaba: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "رقابة", nameEn: "RAQABA" },
        harara: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "حرارة", nameEn: "HARARA" },
        maskan: { minCost: 5,  maxCost: 50, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "مسكن", nameEn: "MASKAN" },
        code:   { minCost: 3,  maxCost: 30, baseCost: 3,  description: "3 كريدت أساسي + حسب الاستخدام", nameAr: "كود",  nameEn: "CODE"   },
        khayal: { minCost: 5,  maxCost: 70, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "خيال", nameEn: "KHAYAL" },
      };

      const result: Record<string, typeof DEFAULTS[string]> = { ...DEFAULTS };
      for (const rule of rules) {
        if (rule.isActive && result[rule.platform]) {
          result[rule.platform] = {
            ...result[rule.platform],
            minCost: rule.minCost,
            maxCost: rule.maxCost,
            baseCost: rule.baseCost,
            description: rule.description ?? result[rule.platform].description,
          };
        }
      }

      res.json({
        success: true,
        updatedAt: new Date().toISOString(),
        platforms: result,
      });
    } catch (error) {
      console.error("[Platform API] pricing error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 9. Pricing Webhook (platform-initiated price updates) ──────────────────
  /**
   * POST /api/platform/pricing-webhook
   * تحديث أسعار المنصة الفرعية — يُستدعى من المنصة فور تغيير أسعارها
   * يتحقق من مفتاح API ثم يحدّث قاعدة البيانات فوراً ويُرسل إشعاراً للمالك
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Body: { services: [{name, cost}], minCost, maxCost, baseCost?, description? }
   * Response: { success: true, platform, updated, updatedAt }
   */
  app.post("/api/platform/pricing-webhook", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      // 1. التحقق من مفتاح API والمنصة
      const apiKey = extractApiKey(req);
      const platformId = req.headers["x-platform-id"] as string;

      if (!apiKey || !platformId) {
        return res.status(401).json({ error: "Authorization و X-Platform-ID مطلوبان" });
      }
      if (!VALID_PLATFORMS.has(platformId)) {
        return res.status(400).json({ error: `منصة غير معروفة: ${platformId}` });
      }
      if (!validatePlatformApiKey(platformId, apiKey)) {
        return res.status(403).json({ error: "مفتاح API غير صالح" });
      }

      // 2. التحقق من البيانات المرسلة
      const { services, minCost, maxCost, baseCost, description } = req.body as {
        services?: Array<{ name: string; cost: number }>;
        minCost?: number;
        maxCost?: number;
        baseCost?: number;
        description?: string;
      };

      if (typeof minCost !== "number" || typeof maxCost !== "number") {
        return res.status(400).json({ error: "minCost و maxCost مطلوبان وأرقام" });
      }
      if (minCost < 0 || maxCost < minCost) {
        return res.status(400).json({ error: "minCost يجب أن يكون ≤ maxCost" });
      }
      if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ error: "services مطلوبة وغير فارغة" });
      }

      // 3. بناء factorWeights من services
      const factorWeights: Record<string, number> = {};
      for (const svc of services) {
        if (typeof svc.name === "string" && typeof svc.cost === "number") {
          factorWeights[svc.name] = svc.cost;
        }
      }

      // 4. تحديث قاعدة البيانات
      const { upsertPricingRule } = await import("./db");
      await upsertPricingRule({
        platform: platformId,
        baseCost: typeof baseCost === "number" ? baseCost : minCost,
        minCost,
        maxCost,
        factorWeights,
        description: typeof description === "string" ? description
          : `${PLATFORM_NAMES[platformId] ?? platformId}: تحديث تلقائي عبر Webhook`,
        isActive: true,
      });

      // 5. إشعار المالك فوراً
      const { notifyOwner } = await import("./_core/notification");
      const servicesSummary = services
        .map((s) => `${s.name}: ${s.cost} كريدت`)
        .join(" | ");
      await notifyOwner({
        title: `تحديث أسعار ${PLATFORM_NAMES[platformId] ?? platformId}`,
        content: `قامت منصة **${PLATFORM_NAMES[platformId] ?? platformId}** بتحديث أسعارها تلقائياً:\n\n- الحد الأدنى: ${minCost} كريدت\n- الحد الأقصى: ${maxCost} كريدت\n- الخدمات: ${servicesSummary}`,
      });

      console.log(`[Platform API] Pricing webhook: ${platformId} updated (min=${minCost}, max=${maxCost}, services=${services.length})`);

      return res.json({
        success: true,
        platform: platformId,
        updated: {
          minCost,
          maxCost,
          baseCost: typeof baseCost === "number" ? baseCost : minCost,
          services,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Platform API] pricing-webhook error:", error);
      return res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 10. User by OpenID ──────────────────────────────────────────────────────
  /**
   * GET /api/platform/user-by-openid?openId=<openId>
   * يجلب بيانات المستخدم بالـ openId من Manus OAuth
   *
   * يُستدعى من: المنصة الفرعية عند استقبال المستخدم لأول مرة بدون token
   * (مثلاً: المستخدم مسجّل دخوله في fada.mousa.ai عبر Manus OAuth مباشرةً)
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Query: openId=<string> ← معرّف المستخدم من Manus OAuth
   * Response 200: { userId, balance, token }
   * Response 404: { error: "USER_NOT_FOUND" }
   */
  app.get("/api/platform/user-by-openid", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

      const openId = req.query["openId"] as string;
      if (!openId || typeof openId !== "string" || openId.trim() === "") {
        res.status(400).json({ error: "openId مطلوب في query string" });
        return;
      }

      // البحث عن المستخدم بالـ openId
      const user = await getUserByOpenId(openId.trim());
      if (!user) {
        res.status(404).json({ error: "USER_NOT_FOUND" });
        return;
      }

      // جلب الرصيد
      const wallet = await getOrCreateWallet(user.id);

      // توليد handoff token (اختياري — يُسهّل التكامل)
      const payload = {
        sub: String(user.id),
        openId: user.openId,
        name: user.name ?? "",
        email: user.email ?? "",
        creditBalance: wallet.balance,
        platform: platformId,
        iss: "mousa.ai",
        type: "platform-handoff",
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecret());

      res.json({
        userId: user.id,
        balance: wallet.balance,
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    } catch (error) {
      console.error("[Platform API] user-by-openid error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 11. Refresh Token ──────────────────────────────────────────────────────
  /**
   * POST /api/platform/refresh-token
   * يجدد الـ token للمنصة الفرعية بدون الحاجة لإعادة التوجيه لـ mousa.ai
   *
   * يُستدعى من: المنصة الفرعية عند انتهاء صلاحية الـ token
   *
   * Headers: Authorization: Bearer <platform-api-key>, X-Platform-ID: <platform>
   * Body: { userId: number } أو { openId: string }
   * Response: { token: string, expiresAt: number, creditBalance: number }
   */
  app.post("/api/platform/refresh-token", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platformId = req.headers["x-platform-id"] as string;
      const apiKey = extractApiKey(req);

      if (!platformId || !apiKey || !validatePlatformApiKey(platformId, apiKey)) {
        res.status(401).json({ error: "مفتاح API غير صحيح أو منصة غير معرّفة" });
        return;
      }

      const { userId, openId } = req.body as { userId?: number; openId?: string };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let user: any = null;

      if (userId) {
        // البحث بالـ userId
        user = (await getUserById(Number(userId))) ?? null;
      } else if (openId) {
        // البحث بالـ openId
        user = (await getUserByOpenId(openId)) ?? null;
      }

      if (!user) {
        res.status(404).json({ error: "المستخدم غير موجود" });
        return;
      }

      const wallet = await getOrCreateWallet(user.id);

      const payload = {
        sub: String(user.id),
        openId: user.openId,
        name: user.name ?? "",
        email: user.email ?? "",
        creditBalance: wallet.balance,
        platform: platformId,
        iss: "mousa.ai",
        type: "platform-handoff",
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecret());

      res.json({
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        creditBalance: wallet.balance,
      });
    } catch (error) {
      console.error("[Platform API] refresh-token error:", error);
      res.status(500).json({ error: "خطأ داخلي في الخادم" });
    }
  });

  // ── 8. Login Redirect — OAuth Bridge for Sub-platforms ─────────────────────
  /**
   * GET /api/platform/login-redirect?platform=fada&returnTo=https://fada.mousa.ai/
   *
   * OAuth Bridge: المنصات الفرعية تعيد توجيه المستخدم غير المصادق هنا.
   * mousa.ai يبدأ OAuth بـ redirect_uri=mousa.ai (المسجّل).
   * بعد نجاح المصادقة، يولّد platform token ويعيد المستخدم للمنصة الفرعية.
   *
   * الاستخدام في المنصة الفرعية:
   *   window.location.href = `https://mousa.ai/api/platform/login-redirect?platform=fada&returnTo=${encodeURIComponent(window.location.href)}`;
   */
  app.get("/api/platform/login-redirect", (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platform = String(req.query["platform"] || "").trim();
      const returnTo = String(req.query["returnTo"] || "").trim();

      // التحقق من صحة المنصة
      if (!platform || !VALID_PLATFORMS.has(platform)) {
        res.status(400).send("Invalid platform parameter");
        return;
      }

      // التحقق من صحة returnTo URL (يجب أن يكون من نطاقات mousa.ai)
      const ALLOWED_RETURN_DOMAINS = [
        "fada.mousa.ai",
        "raqaba.mousa.ai",
        "harara.mousa.ai",
        "maskan.mousa.ai",
        "code.mousa.ai",
        "khayal.mousa.ai",
        "mousa.ai",
        "www.mousa.ai",
        // Manus preview domains
        ".manus.space",
      ];

      let safeReturnTo = `https://${platform}.mousa.ai/`; // fallback
      if (returnTo) {
        try {
          const parsedUrl = new URL(returnTo);
          const isAllowed = ALLOWED_RETURN_DOMAINS.some(d =>
            d.startsWith(".") ? parsedUrl.hostname.endsWith(d) : parsedUrl.hostname === d
          );
          if (isAllowed) {
            safeReturnTo = returnTo;
          }
        } catch {
          // Invalid URL — use fallback
        }
      }

      // بناء returnPath يحتوي على platform و returnTo
      // سيُستخدم في /api/oauth/callback للـ redirect النهائي
      const returnPath = `/api/platform/post-login?platform=${encodeURIComponent(platform)}&returnTo=${encodeURIComponent(safeReturnTo)}`;

      // بناء OAuth URL بـ redirect_uri = mousa.ai (المسجّل)
      const oauthPortalUrl = process.env.VITE_OAUTH_PORTAL_URL || "https://auth.manus.im";
      const appId = process.env.VITE_APP_ID || "";
      const redirectUri = `https://mousa.ai/api/oauth/callback`;
      const statePayload = JSON.stringify({ redirectUri, returnPath });
      const state = btoa(statePayload);

      const oauthUrl = new URL(`${oauthPortalUrl}/app-auth`);
      oauthUrl.searchParams.set("appId", appId);
      oauthUrl.searchParams.set("redirectUri", redirectUri);
      oauthUrl.searchParams.set("state", state);
      oauthUrl.searchParams.set("type", "signIn");

      console.log(`[Platform OAuth Bridge] Redirecting to OAuth for platform=${platform}, returnTo=${safeReturnTo}`);
      res.redirect(302, oauthUrl.toString());
    } catch (error) {
      console.error("[Platform OAuth Bridge] Error:", error);
      res.status(500).send("Internal server error");
    }
  });

  // ── 9. Post-Login — Generate Token After OAuth ────────────────────────────────
  /**
   * GET /api/platform/post-login?platform=fada&returnTo=https://fada.mousa.ai/
   *
   * يُستدعى من /api/oauth/callback بعد نجاح المصادقة.
   * يولّد platform handoff token ويعيد المستخدم للمنصة الفرعية.
   */
  app.get("/api/platform/post-login", async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
      const platform = String(req.query["platform"] || "").trim();
      const returnTo = String(req.query["returnTo"] || "").trim();

      if (!platform || !VALID_PLATFORMS.has(platform)) {
        res.redirect(302, "https://mousa.ai/");
        return;
      }

      // التحقق من المستخدم عبر session cookie مباشرةً
      type AuthUser = { id: number; openId: string; name: string | null; email: string | null };
      let user: AuthUser | null = null;
      try {
        const authResult = await sdk.authenticateRequest(req);
        user = authResult as AuthUser;
      } catch {
        // لم يتم المصادقة — أعد لـ login-redirect
        res.redirect(302, `https://mousa.ai/api/platform/login-redirect?platform=${encodeURIComponent(platform)}&returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (!user) {
        res.redirect(302, `https://mousa.ai/api/platform/login-redirect?platform=${encodeURIComponent(platform)}&returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      // توليد platform handoff token
      const wallet = await getOrCreateWallet(user.id);
      const payload = {
        sub: String(user.id),
        openId: user.openId,
        name: user.name ?? "",
        email: user.email ?? "",
        creditBalance: wallet.balance,
        platform,
        iss: "mousa.ai",
        type: "platform-handoff",
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecret());

      // إعادة التوجيه للمنصة الفرعية مع الـ token
      const baseReturnTo = returnTo || `https://${platform}.mousa.ai/`;
      const separator = baseReturnTo.includes("?") ? "&" : "?";
      const finalUrl = `${baseReturnTo}${separator}token=${encodeURIComponent(token)}`;

      console.log(`[Platform OAuth Bridge] Post-login redirect for platform=${platform}, user=${user.id}`);
      res.redirect(302, finalUrl);
    } catch (error) {
      console.error("[Platform OAuth Bridge] post-login error:", error);
      res.redirect(302, "https://mousa.ai/");
    }
  });

  console.log("[Platform API] Routes registered: /api/platform/*");
}
