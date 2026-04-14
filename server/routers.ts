import { COOKIE_NAME, SESSION_TOKEN_TTL_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { khayalRouter } from "./khayalRouter";
import { videoRouter } from "./videoRouter";
import { chatRouter } from "./chatRouter";
import { exportRouter } from "./exportRouter";
import { costRouter } from "./costRouter";
import { creditsRouter } from "./creditsRouter";
import { developerRouter } from "./developerRouter";
import { designRouter } from "./designRouter";
import { notificationsRouter } from "./notificationsRouter";
import { mousaRouter } from "./mousaRouter";
import { z } from "zod";
import { verifyMousaToken } from "./mousaCreditsService";
import { sdk } from "./_core/sdk";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    /**
     * loginWithMousa — تحويل Mousa handoff token إلى session cookie حقيقي
     * نمط فضاء: بعد verifyToken ناجح، يُنشئ هذا الـ endpoint جلسة سيرفر
     * حتى يصبح ctx.user متاحاً في جميع الـ procedures
     */
    loginWithMousa: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { result, error } = await verifyMousaToken(input.token);

        if (error || !result?.valid) {
          return {
            success: false,
            error: error?.error ?? "Invalid token",
            code: error?.code ?? "INVALID_TOKEN",
          };
        }

        // استخدام openId من موسى كمعرّف فريد للمستخدم في قاعدة البيانات
        const mousaOpenId = `mousa_${result.openId}`;

        // إنشاء/تحديث المستخدم في قاعدة البيانات المحلية
        // نحفظ mousaUserId (الرقمي) وmousaBalance لعرض الرصيد الحقيقي
        await db.upsertUser({
          openId: mousaOpenId,
          name: result.name || null,
          email: result.email || null,
          loginMethod: "mousa",
          lastSignedIn: new Date(),
          mousaUserId: typeof result.userId === 'number' ? result.userId : null,
          mousaBalance: typeof result.creditBalance === 'number' ? result.creditBalance : null,
          mousaLastSync: new Date(),
        });

        // إنشاء session token محلي
        const sessionToken = await sdk.createSessionToken(mousaOpenId, {
          name: result.name || "",
          expiresInMs: SESSION_TOKEN_TTL_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESSION_TOKEN_TTL_MS,
        });

        return {
          success: true,
          userId: result.userId,
          openId: result.openId,
          name: result.name,
          email: result.email,
          creditBalance: result.creditBalance,
        };
      }),
  }),
  khayal: khayalRouter,
  video: videoRouter,
  chat: chatRouter,
  export: exportRouter,
  costs: costRouter,
  credits: creditsRouter,
  developer: developerRouter,
  design: designRouter,
  notifications: notificationsRouter,
  mousa: mousaRouter,
});

export type AppRouter = typeof appRouter;
