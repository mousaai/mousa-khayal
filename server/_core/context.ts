import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** mousaUserId: معرّف المستخدم في موسى.ai (من session cookie إذا كان مستخدم موسى) */
  mousaUserId?: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // استخراج mousaUserId من الـ user إذا كان مستخدم موسى (openId يبدأ بـ mousa_)
  let mousaUserId: number | null = null;
  if (user?.openId?.startsWith('mousa_')) {
    // الـ mousaUserId يُخزَّن في user.id (numeric DB id) — نستخدمه للخصم
    // لكن الـ Mousa userId الحقيقي يُستخرج من openId: mousa_{mousaOpenId}
    mousaUserId = user.id;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    mousaUserId,
  };
}
