import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { khayalRouter } from "./khayalRouter";
import { videoRouter } from "./videoRouter";
import { chatRouter } from "./chatRouter";
import { exportRouter } from "./exportRouter";

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
  }),
  khayal: khayalRouter,
  video: videoRouter,
  chat: chatRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
