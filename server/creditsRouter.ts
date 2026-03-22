/**
 * creditsRouter.ts — إدارة رصيد MOUSA.AI في منصة خيال
 * وفق الوثيقة الرسمية v2.0 — 2026
 *
 * بيانات خيال في Mousa.ai:
 *   Platform ID: khayal | API Key: khayal@mousa30
 *   URL: khayal.mousa.ai | minCost: 10 | maxCost: 50
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  verifyMousaToken,
  checkMousaBalance,
  isMousaEnabled,
  getCreditsPerSession,
  getMousaUpgradeUrl,
  getMousaPlatformId,
  SESSION_COSTS,
  type SessionType,
} from "./mousaCreditsService";

export const creditsRouter = router({
  /**
   * فحص الرصيد الحالي للمستخدم
   * v2.0: balance فقط — sufficient تُحسب محلياً
   */
  getBalance: publicProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        sessionType: z.enum(["scene", "script_only", "film_short", "film_medium", "film_long", "autonomous", "surprise", "default"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = input.userId ?? (ctx as any)?.user?.id;
      const sessionType: SessionType = input.sessionType ?? "default";
      const costForSession = SESSION_COSTS[sessionType];

      if (!userId || !isMousaEnabled()) {
        return {
          enabled: false,
          balance: null,
          canGenerate: true,
          costForSession,
          sessionCosts: SESSION_COSTS,
          upgradeUrl: getMousaUpgradeUrl(),
        };
      }

      const balanceResult = await checkMousaBalance(userId);
      const balance = balanceResult?.balance ?? null;
      const canGenerate = balance === null || balance >= costForSession;

      return {
        enabled: true,
        balance,
        canGenerate,
        costForSession,
        sessionCosts: SESSION_COSTS,
        upgradeUrl: balanceResult?.upgradeUrl ?? getMousaUpgradeUrl(),
      };
    }),

  /**
   * التحقق من JWT handoff token القادم من mousa.ai (?token=...)
   * v2.0: يعيد creditBalance مباشرة في الـ response
   * إذا كان TOKEN_EXPIRED → أعد توجيه المستخدم لـ https://www.mousa.ai/dashboard
   */
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      if (!isMousaEnabled()) {
        return { success: false, error: "MOUSA.AI integration not configured", code: null };
      }

      const { result, error } = await verifyMousaToken(input.token);

      if (error) {
        return {
          success: false,
          error: error.error,
          code: error.code,
          // إذا TOKEN_EXPIRED → الواجهة تعرض زر "تسجيل الدخول مجدداً"
          redirectUrl:
            error.code === "TOKEN_EXPIRED"
              ? "https://www.mousa.ai/dashboard"
              : null,
        };
      }

      if (!result || !result.valid) {
        return { success: false, error: "Invalid token", code: "INVALID_TOKEN", redirectUrl: null };
      }

      return {
        success: true,
        userId: result.userId,
        openId: result.openId,
        name: result.name,
        email: result.email,
        creditBalance: result.creditBalance,  // v2.0: creditBalance
        platform: result.platform,
      };
    }),

  /**
   * حالة تكامل MOUSA.AI — يُستخدم من الواجهة الأمامية لعرض التسعيرة
   */
  getStatus: publicProcedure.query(() => {
    return {
      enabled: isMousaEnabled(),
      platformId: getMousaPlatformId(),
      platformNameAr: "خيال",
      platformNameEn: "KHAYAL",
      costPerSession: getCreditsPerSession(),
      sessionCosts: SESSION_COSTS,
      minCost: 5,    // script_only
      maxCost: 3200,  // film_long
      platformUrl: "https://khayal.mousa.ai/",
      upgradeUrl: getMousaUpgradeUrl(),
      dashboardUrl: "https://www.mousa.ai/dashboard",
    };
  }),

  /**
   * رصيد المستخدم المسجل حالياً (protected)
   */
  myBalance: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
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

    const balanceResult = await checkMousaBalance(userId);
    const balance = balanceResult?.balance ?? null;

    return {
      enabled: true,
      balance,
      canGenerate: balance === null || balance >= costForSession,
      costForSession,
      sessionCosts: SESSION_COSTS,
      upgradeUrl: balanceResult?.upgradeUrl ?? getMousaUpgradeUrl(),
    };
  }),
});
