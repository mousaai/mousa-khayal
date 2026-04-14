/**
 * mousaRouter.ts — router mousa.ai الكامل وفق دليل فضاء v2.0
 * checkBalance + deductCredits + getBalance
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { checkMousaBalance, deductMousaCredits } from "./mousa-api";
import { CREDIT_COSTS, type CreditOperation } from "./credit-costs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const operationEnum = Object.keys(CREDIT_COSTS) as [CreditOperation, ...CreditOperation[]];

export const mousaRouter = router({
  // --- [1] فحص الرصيد قبل تنفيذ عملية ---
  checkBalance: protectedProcedure
    .input(z.object({
      operation: z.enum(operationEnum),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const mousaUserId = ctx.mousaUserId ?? (ctx.user as any)?.mousaUserId;
        const cost = CREDIT_COSTS[input.operation];

        // بدون ربط mousa → اسمح بالمرور (وضع تجريبي)
        if (!mousaUserId) {
          return {
            sufficient: true,
            balance: null,
            cost,
            requiresMousa: false,
          };
        }

        const data = await checkMousaBalance(mousaUserId);
        return {
          sufficient: data.balance >= cost,
          balance: data.balance,
          cost,
          upgradeUrl: data.upgradeUrl,
          requiresMousa: true,
        };
      } catch (err) {
        console.error("[mousa.checkBalance] Error:", err);
        // عند الخطأ: اسمح بالمرور لتجنب إيقاف الخدمة
        return {
          sufficient: true,
          balance: null,
          cost: CREDIT_COSTS[input.operation],
          requiresMousa: false,
        };
      }
    }),

  // --- [2] خصم الكريدت بعد نجاح العملية ---
  deductCredits: protectedProcedure
    .input(z.object({
      operation: z.enum(operationEnum),
      description: z.string().optional(),
      idempotencyKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const mousaUserId = ctx.mousaUserId ?? (ctx.user as any)?.mousaUserId;

        if (!mousaUserId) {
          return { success: true, newBalance: null, deducted: 0, requiresMousa: false };
        }

        const cost = CREDIT_COSTS[input.operation];
        const description = input.description || `خيال: عملية ${input.operation} (${cost} كريدت)`;
        const key = input.idempotencyKey || `${input.operation}-${ctx.user!.id}-${Date.now()}`;

        const result = await deductMousaCredits(mousaUserId, cost, description, key);

        // رصيد غير كافٍ (402)
        if ("error" in result) {
          return {
            success: false,
            newBalance: result.currentBalance,
            deducted: 0,
            requiresMousa: true,
            upgradeUrl: result.upgradeUrl,
            error: result.error,
          };
        }

        // تحديث الرصيد المحلي في قاعدة البيانات
        const dbInst = await getDb();
        await dbInst.update(users)
          .set({ mousaBalance: result.newBalance, mousaLastSync: new Date() })
          .where(eq(users.id, ctx.user!.id));

        return {
          success: true,
          newBalance: result.newBalance,
          deducted: result.deducted,
          requiresMousa: true,
        };
      } catch (err) {
        console.error("[mousa.deductCredits] Error:", err);
        // عند الخطأ: اسمح بالمرور ولا توقف الخدمة
        return { success: true, newBalance: null, deducted: 0, requiresMousa: false };
      }
    }),

  // --- [3] جلب الرصيد الحالي ---
  getBalance: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const mousaUserId = ctx.mousaUserId ?? (ctx.user as any)?.mousaUserId;

        if (!mousaUserId) {
          return {
            balance: (ctx.user as any)?.mousaBalance ?? null,
            requiresMousa: false,
            upgradeUrl: null,
          };
        }

        const data = await checkMousaBalance(mousaUserId);

        // تحديث الرصيد المحلي
        const dbInst2 = await getDb();
        await dbInst2.update(users)
          .set({ mousaBalance: data.balance, mousaLastSync: new Date() })
          .where(eq(users.id, ctx.user!.id));

        return {
          balance: data.balance,
          requiresMousa: true,
          upgradeUrl: data.upgradeUrl,
        };
      } catch (err) {
        console.error("[mousa.getBalance] Error:", err);
        return {
          balance: (ctx.user as any)?.mousaBalance ?? null,
          requiresMousa: true,
          upgradeUrl: null,
        };
      }
    }),
});
