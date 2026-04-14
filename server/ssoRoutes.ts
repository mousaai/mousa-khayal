/**
 * ssoRoutes.ts — نظام SSO الكامل وفق دليل mousa.ai v2.0
 * المنصة: فضاء (fada.mousa.ai)
 *
 * نقاط API المنفّذة:
 *   GET  /api/sso/token   — استقبال token من mousa.ai (redirect) وإنشاء جلسة
 *   POST /api/sso/verify  — التحقق من token وإنشاء جلسة (JSON response)
 *   GET  /api/sso/status  — حالة الجلسة الحالية والرصيد الحقيقي
 *   POST /api/sso/relink  — إعادة ربط حساب قديم بـ mousa.ai
 *
 * التدفق الكامل (وفق الدليل):
 *   1. المستخدم يضغط بطاقة فضاء في mousa.ai
 *   2. يُعاد توجيهه إلى: https://fada.mousa.ai?token=<JWT>
 *   3. الواجهة تُرسل token إلى /api/sso/token أو /api/sso/verify
 *   4. السيرفر يتحقق من token عبر mousa.ai API
 *   5. يجلب الرصيد الحقيقي عبر check-balance
 *   6. يحفظ المستخدم في DB المحلية
 *   7. يُنشئ JWT cookie محلي صالح لسنة كاملة
 */
import { Router } from "express";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import * as db from "./db";
import {
  verifyMousaToken,
  checkMousaBalance,
} from "./mousaCreditsService";

const router = Router();

// مدة الجلسة المحلية: سنة كاملة (وفق الدليل)
const SSO_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365;

// ─── دالة مشتركة: تنفيذ SSO الكامل ─────────────────────────────────────────
async function processSSOToken(token: string): Promise<{
  success: boolean;
  userId?: number;
  openId?: string;
  name?: string;
  email?: string;
  creditBalance?: number;
  error?: string;
  code?: string;
}> {
  // الخطوة 3: التحقق من token عبر mousa.ai API
  const { result, error } = await verifyMousaToken(token);

  if (error) {
    return {
      success: false,
      error: error.error,
      code: error.code,
    };
  }

  if (!result) {
    return {
      success: false,
      error: "فشل التحقق من الهوية",
      code: "VERIFY_FAILED",
    };
  }

  // الخطوة 4: جلب الرصيد الحقيقي اللحظي (قد يختلف عن creditBalance في التوكن)
  let realBalance = result.creditBalance;
  try {
    const balanceData = await checkMousaBalance(result.userId);
    if (balanceData !== null) {
      realBalance = balanceData.balance;
    }
  } catch (balanceErr) {
    console.warn("[SSO] check-balance failed, using token balance:", balanceErr);
  }

  // الخطوة 5: حفظ/تحديث المستخدم في DB المحلية
  // openId المحلي = `mousa_{openId}` لتمييزه عن مستخدمي Manus OAuth
  const localOpenId = `mousa_${result.openId}`;
  await db.upsertUser({
    openId: localOpenId,
    name: result.name || null,
    email: result.email || null,
    loginMethod: "mousa_sso",
    lastSignedIn: new Date(),
    mousaUserId: result.userId,
    mousaBalance: realBalance,
    mousaLastSync: new Date(),
  });

  return {
    success: true,
    userId: result.userId,
    openId: result.openId,
    name: result.name,
    email: result.email,
    creditBalance: realBalance,
  };
}

// ─── GET /api/sso/token — استقبال token من URL (redirect) ───────────────────
/**
 * يُستدعى عندما يضغط المستخدم بطاقة فضاء في mousa.ai
 * URL: https://fada.mousa.ai?token=XXX
 * الواجهة تُرسله إلى: GET /api/sso/token?token=XXX&return_url=/
 */
router.get("/api/sso/token", async (req, res) => {
  const token = req.query.token as string;
  const returnUrl = (req.query.return_url as string) || "/";

  if (!token) {
    return res.status(400).json({ error: "token مطلوب", code: "MISSING_TOKEN" });
  }

  const ssoResult = await processSSOToken(token);

  if (!ssoResult.success) {
    // TOKEN_EXPIRED → إعادة توجيه لـ mousa.ai/dashboard
    if (ssoResult.code === "TOKEN_EXPIRED") {
      return res.redirect("https://www.mousa.ai/dashboard");
    }
    return res.status(401).json({ error: ssoResult.error, code: ssoResult.code });
  }

  // الخطوة 6: إنشاء JWT cookie محلي صالح لسنة كاملة
  const localOpenId = `mousa_${ssoResult.openId}`;
  const sessionToken = await sdk.createSessionToken(localOpenId, {
    name: ssoResult.name || "",
    expiresInMs: SSO_SESSION_TTL_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: SSO_SESSION_TTL_MS,
  });

  // إعادة توجيه للصفحة المطلوبة
  return res.redirect(returnUrl);
});

// ─── POST /api/sso/verify — التحقق من token (JSON response) ─────────────────
/**
 * يُستدعى من الواجهة الأمامية عند وجود ?token= في URL
 * يُعيد JSON بدلاً من redirect
 */
router.post("/api/sso/verify", async (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    return res.status(400).json({ error: "token مطلوب", code: "MISSING_TOKEN" });
  }

  const ssoResult = await processSSOToken(token);

  if (!ssoResult.success) {
    return res.status(401).json({
      success: false,
      error: ssoResult.error,
      code: ssoResult.code,
    });
  }

  // إنشاء JWT cookie محلي صالح لسنة كاملة
  const localOpenId = `mousa_${ssoResult.openId}`;
  const sessionToken = await sdk.createSessionToken(localOpenId, {
    name: ssoResult.name || "",
    expiresInMs: SSO_SESSION_TTL_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: SSO_SESSION_TTL_MS,
  });

  return res.json({
    success: true,
    userId: ssoResult.userId,
    openId: ssoResult.openId,
    name: ssoResult.name,
    email: ssoResult.email,
    creditBalance: ssoResult.creditBalance,
  });
});

// ─── GET /api/sso/status — حالة الجلسة الحالية والرصيد ──────────────────────
/**
 * يُعيد حالة الجلسة الحالية مع الرصيد الحقيقي من mousa.ai
 * يُستخدم للتحقق من صحة الجلسة وتحديث الرصيد
 */
router.get("/api/sso/status", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);

    if (!user) {
      return res.json({
        authenticated: false,
        isGuest: true,
      });
    }

    // جلب الرصيد الحقيقي إذا كان لدينا mousaUserId
    let realBalance = user.mousaBalance ?? 0;
    let balanceFresh = false;

    if (user.mousaUserId) {
      try {
        const balanceData = await checkMousaBalance(user.mousaUserId);
        if (balanceData !== null) {
          realBalance = balanceData.balance;
          balanceFresh = true;
          // تحديث الرصيد في DB في الخلفية
          db.upsertUser({
            openId: user.openId,
            mousaBalance: realBalance,
            mousaLastSync: new Date(),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("[SSO] status check-balance failed:", err);
      }
    }

    return res.json({
      authenticated: true,
      isGuest: false,
      userId: user.mousaUserId,
      openId: user.openId.replace(/^mousa_/, ""),
      name: user.name,
      email: user.email,
      creditBalance: realBalance,
      balanceFresh,
      loginMethod: user.loginMethod,
    });
  } catch {
    return res.json({
      authenticated: false,
      isGuest: true,
    });
  }
});

// ─── POST /api/sso/relink — إعادة ربط حساب قديم بـ mousa.ai ─────────────────
/**
 * يُستخدم لربط حساب Manus OAuth الحالي بـ mousa.ai
 * يقبل token من mousa.ai ويُحدّث mousaUserId في DB
 */
router.post("/api/sso/relink", async (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    return res.status(400).json({ error: "token مطلوب", code: "MISSING_TOKEN" });
  }

  // التحقق من الجلسة الحالية
  let currentUser = null;
  try {
    currentUser = await sdk.authenticateRequest(req);
  } catch {
    // المستخدم غير مسجّل — سنُنشئ جلسة جديدة
  }

  const ssoResult = await processSSOToken(token);

  if (!ssoResult.success) {
    return res.status(401).json({
      success: false,
      error: ssoResult.error,
      code: ssoResult.code,
    });
  }

  // إذا كان المستخدم مسجّلاً بالفعل (Manus OAuth)، نُحدّث mousaUserId فقط
  if (currentUser && !currentUser.openId.startsWith("mousa_")) {
    await db.upsertUser({
      openId: currentUser.openId,
      mousaUserId: ssoResult.userId,
      mousaBalance: ssoResult.creditBalance,
      mousaLastSync: new Date(),
    });

    return res.json({
      success: true,
      relinked: true,
      userId: ssoResult.userId,
      creditBalance: ssoResult.creditBalance,
      message: "تم ربط حسابك بـ mousa.ai بنجاح",
    });
  }

  // إنشاء جلسة جديدة بـ mousa openId
  const localOpenId = `mousa_${ssoResult.openId}`;
  const sessionToken = await sdk.createSessionToken(localOpenId, {
    name: ssoResult.name || "",
    expiresInMs: SSO_SESSION_TTL_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: SSO_SESSION_TTL_MS,
  });

  return res.json({
    success: true,
    relinked: false,
    userId: ssoResult.userId,
    openId: ssoResult.openId,
    name: ssoResult.name,
    email: ssoResult.email,
    creditBalance: ssoResult.creditBalance,
  });
});

// ─── GET /api/pricing ────────────────────────────────────────────────────────
/**
 * يُعيد جدول أسعار المنصة للمزامنة مع mousa.ai
 * يُستخدم من mousa.ai لتحديث عرض الأسعار في الواجهة
 */
router.get("/api/pricing", (_req, res) => {
  const CREDIT_TO_SAR = 10; // 10 كريدت = 1 ريال سعودي
  return res.json({
    platform: process.env.PLATFORM_ID || "khayal",
    currency: "SAR",
    conversionRate: { credits: CREDIT_TO_SAR, currency: "SAR", amount: 1 },
    services: [
      { id: "scene",        name: "مشهد واحد",                  credits: 20   },
      { id: "scene_hd",     name: "مشهد HD",                    credits: 30   },
      { id: "script_only",  name: "سيناريو فقط",                credits: 5    },
      { id: "film_short",   name: "فيلم قصير (حتى 5 مشاهد)",   credits: 350  },
      { id: "film_medium",  name: "فيلم متوسط (حتى 10 مشاهد)", credits: 700  },
      { id: "film_long",    name: "فيلم طويل (حتى 20 مشهد)",   credits: 1400 },
      { id: "autonomous",   name: "جلسة ذاتية كاملة",           credits: 200  },
      { id: "surprise",     name: "جلسة مفاجأة",                credits: 100  },
      { id: "design_basic", name: "تصميم أساسي",                credits: 40   },
      { id: "design_full",  name: "تصميم كامل",                 credits: 80   },
    ],
    updatedAt: new Date().toISOString(),
  });
});

export default router;
