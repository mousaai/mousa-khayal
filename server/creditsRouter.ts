/**
 * creditsRouter.ts — إدارة رصيد MOUSA.AI في منصة خيال
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { verifyMousaToken, checkMousaBalance, isMousaEnabled } from "./mousaCreditsService";

export const creditsRouter = router({
  // فحص الرصيد الحالي للمستخدم
  getBalance: publicProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const userId = input.userId || (ctx as any)?.user?.id;
      if (!userId || !isMousaEnabled()) {
        return { enabled: false, balance: null, canGenerate: true };
      }
      const balanceResult = await checkMousaBalance(userId);
      return {
        enabled: true,
        balance: balanceResult?.balance ?? null,
        sufficient: balanceResult?.sufficient ?? true,
        canGenerate: balanceResult === null || (balanceResult.balance >= 25),
        costPerSession: 25,
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
      };
    }),

  // التحقق من توكن MOUSA.AI وربطه بالمستخدم
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      if (!isMousaEnabled()) {
        return { success: false, error: "MOUSA.AI integration not configured" };
      }
      const result = await verifyMousaToken(input.token);
      if (!result || !result.valid) {
        return { success: false, error: "Invalid or expired token" };
      }
      return {
        success: true,
        userId: result.userId ?? null,
        balance: result.balance ?? null,
      };
    }),

  // حالة تكامل MOUSA.AI
  getStatus: publicProcedure.query(() => {
    return {
      enabled: isMousaEnabled(),
      platformId: process.env.MOUSA_PLATFORM_ID || "khayal",
      costPerSession: 25,
      upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
    };
  }),
});
