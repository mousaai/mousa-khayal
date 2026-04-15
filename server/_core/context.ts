import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** mousaUserId: معرّف المستخدم الحقيقي في موسى.ai — محفوظ في DB منذ تسجيل الدخول */
  mousaUserId?: number | null;
  /** mousaBalance: آخر رصيد معروف (يُحدَّث كل 5 دقائق في الخلفية) */
  mousaBalance?: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  // mousaUserId و mousaBalance محفوظان في DB منذ تسجيل الدخول عبر mousa.ai SSO
  // sdk.authenticateRequest يُحدّث الرصيد في الخلفية كل 5 دقائق تلقائياً
  const mousaUserId: number | null = user
    ? ((user as any).mousaUserId ?? null)
    : null;

  const mousaBalance: number | null = user
    ? ((user as any).mousaBalance ?? null)
    : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    mousaUserId,
    mousaBalance,
  };
}
