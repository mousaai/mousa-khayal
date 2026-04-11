/**
 * notification.ts — نظام التنبيهات الداخلي المستقل
 *
 * مستقل 100% عن مانوس — يكتب التنبيهات في قاعدة البيانات المحلية
 * وتُعرض في الواجهة عبر NotificationBell component
 */
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";

export type NotificationPayload = {
  title: string;
  content: string;
  type?: "info" | "success" | "warning" | "error";
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }
  return { title, content, type: input.type ?? "info" };
};

/**
 * يحفظ تنبيهاً في قاعدة البيانات الداخلية.
 * يعرضه NotificationBell في الواجهة لصاحب المشروع.
 * مستقل تماماً عن مانوس.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content, type } = validatePayload(payload);
  try {
    const db = await getDb();
    await db.insert(notifications).values({
      title,
      content,
      type: type ?? "info",
      isRead: 0,
    });
    console.log(`[Notification] ✓ Saved: "${title}"`);
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to save notification:", error);
    return false;
  }
}
