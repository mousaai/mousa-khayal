/**
 * notificationsRouter.ts — نظام التنبيهات الداخلي
 *
 * Procedures:
 *   - getAll: جلب آخر 50 تنبيه (للمالك فقط)
 *   - getUnreadCount: عدد التنبيهات غير المقروءة
 *   - markRead: تعليم تنبيه كمقروء
 *   - markAllRead: تعليم جميع التنبيهات كمقروءة
 *   - deleteOld: حذف التنبيهات القديمة (أكثر من 30 يوم)
 */
import { z } from "zod";
import { desc, eq, lt, sql } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { notifications } from "../drizzle/schema";

export const notificationsRouter = router({
  /** جلب آخر 50 تنبيه */
  getAll: adminProcedure.query(async () => {
    const db = await getDb();
    return db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  /** عدد التنبيهات غير المقروءة */
  getUnreadCount: adminProcedure.query(async () => {
    const db = await getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.isRead, 0));
    return { count: Number(result[0]?.count ?? 0) };
  }),

  /** تعليم تنبيه واحد كمقروء */
  markRead: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(notifications)
        .set({ isRead: 1 })
        .where(eq(notifications.id, input.id));
      return { success: true };
    }),

  /** تعليم جميع التنبيهات كمقروءة */
  markAllRead: adminProcedure.mutation(async () => {
    const db = await getDb();
    await db.update(notifications).set({ isRead: 1 });
    return { success: true };
  }),

  /** حذف التنبيهات الأقدم من 30 يوماً */
  deleteOld: adminProcedure.mutation(async () => {
    const db = await getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db
      .delete(notifications)
      .where(lt(notifications.createdAt, thirtyDaysAgo));
    return { success: true };
  }),
});
