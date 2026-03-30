/**
 * mousa.ai — Session Memory Service
 * ====================================
 * يحفظ ذاكرة آخر جلسة لكل مستخدم في كل منصة.
 * يُحقن هذا السياق تلقائياً في بداية كل محادثة جديدة.
 */

import { getDb } from "./db";
import {
  sessionMemory,
  aiSessions,
  aiMessages,
  type InsertSessionMemory,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionContext {
  hasHistory: boolean;
  lastSessionSummary?: string;
  lastQuery?: string;
  totalSessions: number;
  totalCreditsUsed: number;
  extractedPreferences?: Record<string, unknown>;
  lastSessionAt?: Date;
  /** رسالة ترحيب مخصصة بناءً على السياق */
  welcomeMessage?: string;
}

// ─── Get Session Context ──────────────────────────────────────────────────────

export async function getSessionContext(
  userId: number,
  platform: string
): Promise<SessionContext> {
  const db = await getDb();
  if (!db) {
    return { hasHistory: false, totalSessions: 0, totalCreditsUsed: 0 };
  }

  try {
    const memory = await db
      .select()
      .from(sessionMemory)
      .where(
        and(
          eq(sessionMemory.userId, userId),
          eq(sessionMemory.platform, platform)
        )
      )
      .limit(1);

    if (!memory[0]) {
      return { hasHistory: false, totalSessions: 0, totalCreditsUsed: 0 };
    }

    const m = memory[0];
    const totalSessions = m.totalSessions ?? 0;
    const totalCreditsUsed = m.totalCreditsUsed ?? 0;

    // بناء رسالة ترحيب مخصصة
    let welcomeMessage: string | undefined;
    if (totalSessions > 0 && m.lastSessionSummary) {
      if (totalSessions === 1) {
        welcomeMessage = `مرحباً مجدداً! في جلستك السابقة: ${m.lastSessionSummary.slice(0, 100)}...`;
      } else {
        welcomeMessage = `مرحباً! هذه جلستك رقم ${totalSessions + 1}. آخر ما عملنا عليه: ${m.lastSessionSummary.slice(0, 100)}...`;
      }
    }

    return {
      hasHistory: totalSessions > 0,
      lastSessionSummary: m.lastSessionSummary ?? undefined,
      lastQuery: m.lastQuery ?? undefined,
      totalSessions,
      totalCreditsUsed,
      extractedPreferences: (m.extractedPreferences as Record<string, unknown>) ?? undefined,
      lastSessionAt: m.lastSessionAt ?? undefined,
      welcomeMessage,
    };
  } catch (e) {
    console.error("[SessionMemory] Failed to get context:", e);
    return { hasHistory: false, totalSessions: 0, totalCreditsUsed: 0 };
  }
}

// ─── Update Session Memory ────────────────────────────────────────────────────

export async function updateSessionMemory(params: {
  userId: number;
  platform: string;
  sessionId: number;
  creditsUsed: number;
  lastQuery?: string;
  lastResponse?: string;
  projectContext?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    // جلب آخر رسالة من الجلسة لاستخراج الملخص
    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, params.sessionId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(10);

    // ملخص بسيط من آخر رسالة مساعد
    const lastAssistantMsg = messages.find(m => m.role === "assistant");
    const summary = lastAssistantMsg
      ? lastAssistantMsg.content.slice(0, 300)
      : undefined;

    // تحقق من وجود سجل مسبق
    const existing = await db
      .select({ id: sessionMemory.id, totalSessions: sessionMemory.totalSessions, totalCreditsUsed: sessionMemory.totalCreditsUsed })
      .from(sessionMemory)
      .where(
        and(
          eq(sessionMemory.userId, params.userId),
          eq(sessionMemory.platform, params.platform)
        )
      )
      .limit(1);

    const now = new Date();

    if (existing[0]) {
      // تحديث السجل الموجود
      await db.update(sessionMemory)
        .set({
          lastSessionSummary: summary,
          lastQuery: params.lastQuery,
          lastResponse: params.lastResponse,
          lastProjectContext: params.projectContext ?? null,
          totalSessions: sql`${sessionMemory.totalSessions} + 1`,
          totalCreditsUsed: sql`${sessionMemory.totalCreditsUsed} + ${params.creditsUsed}`,
          lastSessionAt: now,
          updatedAt: now,
        })
        .where(eq(sessionMemory.id, existing[0].id));
    } else {
      // إنشاء سجل جديد
      await db.insert(sessionMemory).values({
        userId: params.userId,
        platform: params.platform,
        lastSessionSummary: summary,
        lastQuery: params.lastQuery,
        lastResponse: params.lastResponse,
        lastProjectContext: params.projectContext ?? null,
        totalSessions: 1,
        totalCreditsUsed: params.creditsUsed,
        lastSessionAt: now,
      });
    }
  } catch (e) {
    console.error("[SessionMemory] Failed to update:", e);
  }
}

// ─── Build System Prompt with Memory ─────────────────────────────────────────

export function buildMemorySystemPrompt(
  basePrompt: string,
  context: SessionContext
): string {
  if (!context.hasHistory) {
    return basePrompt;
  }

  const memoryBlock = [
    "\n\n---",
    "## ذاكرة الجلسات السابقة",
    context.lastSessionSummary
      ? `**آخر جلسة:** ${context.lastSessionSummary}`
      : "",
    context.lastQuery
      ? `**آخر سؤال:** ${context.lastQuery}`
      : "",
    `**إجمالي الجلسات:** ${context.totalSessions}`,
    `**إجمالي الكريدت المستخدم:** ${context.totalCreditsUsed}`,
    context.extractedPreferences && Object.keys(context.extractedPreferences).length > 0
      ? `**تفضيلات المستخدم:** ${JSON.stringify(context.extractedPreferences)}`
      : "",
    "---",
    "استخدم هذا السياق لتقديم تجربة متواصلة ومخصصة. لا تُعيد طرح أسئلة سبق الإجابة عنها.",
  ].filter(Boolean).join("\n");

  return basePrompt + memoryBlock;
}
