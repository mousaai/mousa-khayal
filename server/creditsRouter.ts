/**
 * creditsRouter.ts — إدارة رصيد MOUSA.AI في منصة خيال
 * وفق نهج فضاء v2.0 — 2026
 *
 * يستخدم mousaUserId الحقيقي من mousa.ai (وليس الـ id المحلي)
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  isMousaEnabled,
  getMousaUpgradeUrl,
  getMousaPlatformId,
  SESSION_COSTS,
  type SessionType,
} from "./mousaCreditsService";
import {
  checkMousaBalance,
  getMousaUserByOpenId,
  verifyMousaToken as verifyMousaTokenAPI,
} from "./mousa-api";
import * as db from "./db";

/** جلب mousaUserId من ctx أو من mousa.ai عبر openId */
async function resolveMousaUserId(ctx: any): Promise<number | null> {
  // إذا كان محفوظاً في context (من DB)
  if (ctx.mousaUserId) return ctx.mousaUserId;

  // إذا لم يكن موجوداً: نجلبه من mousa.ai بـ openId
  const user = ctx.user;
  if (!user?.openId) return null;

  const mousaData = await getMousaUserByOpenId(user.openId);
  if (!mousaData) return null;

  // حفظه في DB للمرة القادمة
  db.upsertUser({
    openId: user.openId,
    mousaUserId: mousaData.userId,
    mousaBalance: mousaData.balance,
    mousaLastSync: new Date(),
  }).catch(() => {});

  return mousaData.userId;
}

export const creditsRouter = router({
  /**
   * فحص الرصيد الحالي للمستخدم
   * يستخدم mousaUserId الحقيقي من mousa.ai
   */
  getBalance: publicProcedure
    .input(
      z.object({
        sessionType: z.enum(["scene", "script_only", "film_short", "film_medium", "film_long", "autonomous", "surprise", "default"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const sessionType: SessionType = input.sessionType ?? "default";
      const costForSession = SESSION_COSTS[sessionType];

      if (!isMousaEnabled() || !(ctx as any)?.user) {
        return {
          enabled: false,
          balance: null,
          canGenerate: true,
          costForSession,
          sessionCosts: SESSION_COSTS,
          upgradeUrl: getMousaUpgradeUrl(),
        };
      }

      const mousaUserId = await resolveMousaUserId(ctx);

      if (!mousaUserId) {
        return {
          enabled: true,
          balance: null,
          canGenerate: true,
          costForSession,
          sessionCosts: SESSION_COSTS,
          upgradeUrl: getMousaUpgradeUrl(),
        };
      }

      try {
        const balanceResult = await checkMousaBalance(mousaUserId);
        const balance = balanceResult?.balance ?? null;
        const canGenerate = balance === null || balance >= costForSession;

        // تحديث الرصيد في DB
        if (balance !== null && (ctx as any)?.user?.openId) {
          db.upsertUser({
            openId: (ctx as any).user.openId,
            mousaBalance: balance,
            mousaLastSync: new Date(),
          }).catch(() => {});
        }

        return {
          enabled: true,
          balance,
          canGenerate,
          costForSession,
          sessionCosts: SESSION_COSTS,
          upgradeUrl: balanceResult?.upgradeUrl ?? getMousaUpgradeUrl(),
        };
      } catch (err) {
        console.error("[Credits] checkMousaBalance failed:", err);
        return {
          enabled: true,
          balance: null,
          canGenerate: true,
          costForSession,
          sessionCosts: SESSION_COSTS,
          upgradeUrl: getMousaUpgradeUrl(),
        };
      }
    }),

  /**
   * التحقق من JWT handoff token القادم من mousa.ai (?token=...)
   */
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      if (!isMousaEnabled()) {
        return { success: false, error: "MOUSA.AI integration not configured", code: null };
      }

      try {
        const result = await verifyMousaTokenAPI(input.token);
        return {
          success: true,
          userId: result.userId,
          openId: result.openId,
          name: result.name,
          email: result.email,
          creditBalance: result.creditBalance,
          platform: null,
        };
      } catch (err: any) {
        const code = err.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
        return {
          success: false,
          error: err.message,
          code,
          redirectUrl: code === "TOKEN_EXPIRED" ? "https://www.mousa.ai/dashboard" : null,
        };
      }
    }),

  /**
   * حالة تكامل MOUSA.AI
   */
  getStatus: publicProcedure.query(() => {
    return {
      enabled: isMousaEnabled(),
      platformId: getMousaPlatformId(),
      platformNameAr: "خيال",
      platformNameEn: "KHAYAL",
      costPerSession: SESSION_COSTS.default,
      sessionCosts: SESSION_COSTS,
      minCost: 5,
      maxCost: 3200,
      platformUrl: "https://khayal.mousa.ai/",
      upgradeUrl: getMousaUpgradeUrl(),
      dashboardUrl: "https://www.mousa.ai/dashboard",
    };
  }),

  /**
   * رصيد المستخدم المسجل حالياً (protected)
   */
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const costForSession = SESSION_COSTS.default;

    if (!isMousaEnabled()) {
      return {
        enabled: false,
        balance: null,
        canGenerate: true,
        costForSession,
        sessionCosts: SESSION_COSTS,
        upgradeUrl: getMousaUpgradeUrl(),
      };
    }

    const mousaUserId = await resolveMousaUserId(ctx);

    if (!mousaUserId) {
      return {
        enabled: true,
        balance: null,
        canGenerate: true,
        costForSession,
        sessionCosts: SESSION_COSTS,
        upgradeUrl: getMousaUpgradeUrl(),
      };
    }

    try {
      const balanceResult = await checkMousaBalance(mousaUserId);
      const balance = balanceResult?.balance ?? null;

      return {
        enabled: true,
        balance,
        canGenerate: balance === null || balance >= costForSession,
        costForSession,
        sessionCosts: SESSION_COSTS,
        upgradeUrl: balanceResult?.upgradeUrl ?? getMousaUpgradeUrl(),
      };
    } catch {
      return {
        enabled: true,
        balance: null,
        canGenerate: true,
        costForSession,
        sessionCosts: SESSION_COSTS,
        upgradeUrl: getMousaUpgradeUrl(),
      };
    }
  }),
});
