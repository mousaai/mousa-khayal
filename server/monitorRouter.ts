/**
 * monitorRouter.ts — لوحة مراقبة النظام الهجين
 * يوفر إحصاءات الأداء وسجل الفشل والتحسينات
 */
import { publicProcedure, router } from "./_core/trpc";
import { getPerformanceStats } from "./khayalSelfImprove";
import { getDb } from "./db";
import { khayalFailures, promptImprovements } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const monitorRouter = router({
  // إحصاءات الأداء الإجمالية
  stats: publicProcedure.query(async () => {
    return await getPerformanceStats();
  }),

  // آخر 20 فشل
  recentFailures: publicProcedure.query(async () => {
    const db = await getDb();
    return await db
      .select()
      .from(khayalFailures)
      .orderBy(desc(khayalFailures.createdAt))
      .limit(20);
  }),

  // التحسينات النشطة
  activeImprovements: publicProcedure.query(async () => {
    const db = await getDb();
    return await db
      .select()
      .from(promptImprovements)
      .where(eq(promptImprovements.isActive, 1))
      .orderBy(desc(promptImprovements.createdAt))
      .limit(10);
  }),
});
