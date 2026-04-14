import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getMousaUserByOpenId } from "../mousa-api";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** mousaUserId: معرّف المستخدم الحقيقي في موسى.ai */
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

  // استخراج mousaUserId الحقيقي
  let mousaUserId: number | null = null;

  if (user) {
    // الأولوية: mousaUserId المحفوظ في DB (الـ userId الحقيقي في mousa.ai)
    const savedMousaUserId = (user as any).mousaUserId;

    if (savedMousaUserId) {
      mousaUserId = savedMousaUserId;
    } else {
      // إذا لم يكن محفوظاً: نجلبه من mousa.ai بـ openId بشكل غير متزامن
      // ونحفظه للمرة القادمة (لا ننتظر النتيجة لتسريع الطلب)
      getMousaUserByOpenId(user.openId).then((mousaData) => {
        if (mousaData && user) {
          db.upsertUser({
            openId: user.openId,
            mousaUserId: mousaData.userId,
            mousaBalance: mousaData.balance,
            mousaLastSync: new Date(),
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    mousaUserId,
  };
}
