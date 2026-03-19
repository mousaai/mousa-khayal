/**
 * khayalSelfImprove.ts — محرك التحسين الذاتي لمنصة خيال
 *
 * الاستراتيجية:
 * 1. عند أي فشل → يُسجّله في khayal_failures
 * 2. إذا تكرر نفس النوع 3+ مرات → يُحلّل السبب بـ LLM
 * 3. يُنشئ برومبت محسّن ويُخزّنه في prompt_improvements
 * 4. يُنبّه المالك عند تكرار الفشل
 * 5. في الطلبات اللاحقة → يستخدم البرومبت المحسّن تلقائياً
 */

import { getDb } from "./db";
import { khayalFailures, promptImprovements } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { eq, and, gte, count, desc } from "drizzle-orm";

// ─── أنواع ────────────────────────────────────────────────────────────────────

export type FailureType =
  | "llm_error"
  | "image_error"
  | "storage_error"
  | "timeout"
  | "quality_low"
  | "content_blocked"
  | "other";

export type ProviderType = "khayal" | "manus" | "openai" | "replicate" | "runway" | "elevenlabs";
export type FallbackProviderType = "manus" | "openai" | "replicate" | "none";

export interface RecordFailureParams {
  failureType: FailureType;
  provider: ProviderType;
  fallbackProvider?: FallbackProviderType;
  operation: string;
  errorMessage?: string;
  errorCode?: string;
  inputSummary?: string;
  promptUsed?: string;
  durationMs?: number;
  retryCount?: number;
  userId?: number;
  jobId?: string;
}

// ─── تسجيل الفشل ──────────────────────────────────────────────────────────────

export async function recordFailure(params: RecordFailureParams): Promise<number> {
  try {
    const drizzle = await getDb();
    const result = await drizzle.insert(khayalFailures).values({
      failureType: params.failureType,
      provider: params.provider,
      fallbackProvider: params.fallbackProvider ?? "none",
      operation: params.operation,
      errorMessage: params.errorMessage?.slice(0, 2000),
      errorCode: params.errorCode?.slice(0, 32),
      inputSummary: params.inputSummary?.slice(0, 500),
      promptUsed: params.promptUsed?.slice(0, 2000),
      durationMs: params.durationMs,
      retryCount: params.retryCount ?? 0,
      userId: params.userId,
      jobId: params.jobId,
    });

    const failureId = (result as unknown as { insertId: number }).insertId;

    // فحص إذا تكرر نفس النوع 3+ مرات في آخر 24 ساعة → تحليل وتحسين
    void checkAndImprove(params, failureId).catch(console.error);

    return failureId;
  } catch (err) {
    console.error("[KhayalSelfImprove] Failed to record failure:", err);
    return -1;
  }
}

// ─── فحص التكرار والتحسين التلقائي ───────────────────────────────────────────

async function checkAndImprove(params: RecordFailureParams, failureId: number): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // عدّ نفس نوع الفشل في آخر 24 ساعة
  const drizzle = await getDb();
  const recentFailures = await drizzle
    .select({ count: count() })
    .from(khayalFailures)
    .where(
      and(
        eq(khayalFailures.failureType, params.failureType),
        eq(khayalFailures.operation, params.operation),
        gte(khayalFailures.createdAt, oneDayAgo)
      )
    );

  const failureCount = recentFailures[0]?.count ?? 0;

  // عند 3 فشل متكرر → تحليل وتحسين
  if (failureCount >= 3) {
    console.log(`[KhayalSelfImprove] ${failureCount} failures detected for ${params.operation}/${params.failureType} — analyzing...`);

    // تحليل السبب وتوليد إصلاح
    await analyzeAndFix(params, failureId, failureCount);

    // إشعار المالك عند 5+ فشل
    if (failureCount === 5 || failureCount === 10 || failureCount % 20 === 0) {
      await notifyOwner({
        title: `⚠️ تنبيه خيال: ${failureCount} فشل متكرر`,
        content: `العملية: ${params.operation}\nنوع الفشل: ${params.failureType}\nالمزود: ${params.provider}\nالخطأ: ${params.errorMessage?.slice(0, 200) ?? "غير محدد"}\n\nتم تفعيل التحسين الذاتي تلقائياً.`,
      }).catch(console.error);
    }
  }
}

// ─── تحليل الفشل وتوليد إصلاح ────────────────────────────────────────────────

async function analyzeAndFix(
  params: RecordFailureParams,
  failureId: number,
  failureCount: number
): Promise<void> {
  if (!params.promptUsed) return; // لا يمكن تحسين بدون برومبت

  try {
    const analysisResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت محلل أداء لمنصة خيال للذكاء الاصطناعي.
مهمتك: تحليل فشل متكرر في توليد المحتوى واقتراح إصلاح للبرومبت.
أجب بـ JSON فقط.`,
        },
        {
          role: "user",
          content: `تحليل فشل متكرر:
- العملية: ${params.operation}
- نوع الفشل: ${params.failureType}
- المزود: ${params.provider}
- عدد مرات التكرار: ${failureCount} في آخر 24 ساعة
- رسالة الخطأ: ${params.errorMessage ?? "غير محدد"}
- البرومبت المستخدم:
${params.promptUsed}

اقترح:
1. سبب الفشل المحتمل
2. برومبت محسّن يتجنب هذا الفشل
3. سبب التحسين`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "failure_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              failureReason: { type: "string", description: "سبب الفشل المحتمل" },
              improvedPrompt: { type: "string", description: "البرومبت المحسّن" },
              improvementReason: { type: "string", description: "سبب التحسين" },
            },
            required: ["failureReason", "improvedPrompt", "improvementReason"],
            additionalProperties: false,
          },
        },
      },
    });

      const rawContent = analysisResponse.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) return;

    const analysis = JSON.parse(content) as {
      failureReason: string;
      improvedPrompt: string;
      improvementReason: string;
    };

    // تحديث سجل الفشل بنتيجة التحليل
    const drizzle2 = await getDb();
    await drizzle2
      .update(khayalFailures)
      .set({
        analysisResult: analysis.failureReason,
        suggestedFix: analysis.improvedPrompt,
        fixApplied: 1,
      })
      .where(eq(khayalFailures.id, failureId));

    // حفظ البرومبت المحسّن
    await drizzle2.insert(promptImprovements).values({
      operation: params.operation,
      failureType: params.failureType,
      originalPrompt: params.promptUsed,
      improvedPrompt: analysis.improvedPrompt,
      improvementReason: analysis.improvementReason,
      triggeredByFailureId: failureId,
      successRateBefore: Math.max(0, 100 - failureCount * 10),
    });

    console.log(`[KhayalSelfImprove] ✅ Improved prompt saved for ${params.operation}`);
  } catch (err) {
    console.error("[KhayalSelfImprove] Analysis failed:", err);
  }
}

// ─── استرجاع البرومبت المحسّن ─────────────────────────────────────────────────

export async function getImprovedPrompt(
  operation: string,
  originalPrompt: string
): Promise<string | null> {
  try {
    // البحث عن أحدث تحسين نشط لهذه العملية
    const drizzle = await getDb();
    const improvements = await drizzle
      .select()
      .from(promptImprovements)
      .where(
        and(
          eq(promptImprovements.operation, operation),
          eq(promptImprovements.isActive, 1)
        )
      )
      .orderBy(desc(promptImprovements.createdAt))
      .limit(1);

    if (improvements.length === 0) return null;

    const improvement = improvements[0];

    // زيادة عداد الاستخدام
    await drizzle
      .update(promptImprovements)
      .set({ useCount: (improvement.useCount ?? 0) + 1 })
      .where(eq(promptImprovements.id, improvement.id));

    return improvement.improvedPrompt;
  } catch {
    return null;
  }
}

// ─── إحصاءات الأداء ──────────────────────────────────────────────────────────

export interface PerformanceStats {
  totalFailures: number;
  failuresByType: Record<string, number>;
  failuresByProvider: Record<string, number>;
  totalImprovements: number;
  activeImprovements: number;
  last24hFailures: number;
}

export async function getPerformanceStats(): Promise<PerformanceStats> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const drizzle = await getDb();
    const [allFailures, recentFailures, allImprovements] = await Promise.all([
      drizzle.select().from(khayalFailures),
      drizzle.select({ count: count() }).from(khayalFailures).where(gte(khayalFailures.createdAt, oneDayAgo)),
      drizzle.select().from(promptImprovements),
    ]);

    const failuresByType: Record<string, number> = {};
    const failuresByProvider: Record<string, number> = {};

    for (const f of allFailures) {
      failuresByType[f.failureType] = (failuresByType[f.failureType] ?? 0) + 1;
      failuresByProvider[f.provider] = (failuresByProvider[f.provider] ?? 0) + 1;
    }

    return {
      totalFailures: allFailures.length,
      failuresByType,
      failuresByProvider,
      totalImprovements: allImprovements.length,
      activeImprovements: allImprovements.filter((i: typeof allImprovements[number]) => i.isActive === 1).length,
      last24hFailures: recentFailures[0]?.count ?? 0,
    };
  } catch {
    return {
      totalFailures: 0,
      failuresByType: {},
      failuresByProvider: {},
      totalImprovements: 0,
      activeImprovements: 0,
      last24hFailures: 0,
    };
  }
}
