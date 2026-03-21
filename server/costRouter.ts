/**
 * costRouter.ts — tRPC procedures للوحة التحكم المالية
 * محمية بـ adminProcedure (role = "admin" فقط)
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getCostTotals,
  getCostSummary,
  getDailyCosts,
  getTopExpensiveOps,
  getCostPerUser,
  getRecentEvents,
  PRICING,
} from "./costTracker";

// ─── Admin guard ──────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Router ───────────────────────────────────────────────────
export const costRouter = router({

  /** بطاقات الملخص: اليوم / الشهر / كل الوقت */
  getTotals: adminProcedure.query(async () => {
    return getCostTotals();
  }),

  /** ملخص حسب المزوّد للفترة المحددة */
  getSummary: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return getCostSummary(input.days);
    }),

  /** تكاليف يومية للرسم البياني */
  getDailyChart: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ input }) => {
      return getDailyCosts(input.days);
    }),

  /** أغلى العمليات */
  getTopOps: adminProcedure
    .input(z.object({
      days:  z.number().min(1).max(365).default(30),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      return getTopExpensiveOps(input.days, input.limit);
    }),

  /** تكلفة كل مستخدم */
  getCostPerUser: adminProcedure
    .input(z.object({
      days:  z.number().min(1).max(365).default(30),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      return getCostPerUser(input.days, input.limit);
    }),

  /** آخر الأحداث */
  getRecentEvents: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return getRecentEvents(input.limit);
    }),

  /** جدول الأسعار المرجعي */
  getPricing: adminProcedure.query(() => {
    return PRICING;
  }),

  /** تقرير شامل دفعة واحدة */
  getFullReport: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      const [totals, summary, daily, topOps, perUser, recent] = await Promise.all([
        getCostTotals(),
        getCostSummary(input.days),
        getDailyCosts(Math.min(input.days, 30)),
        getTopExpensiveOps(input.days, 10),
        getCostPerUser(input.days, 10),
        getRecentEvents(20),
      ]);
      return { totals, summary, daily, topOps, perUser, recent, days: input.days };
    }),
});
