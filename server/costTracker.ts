/**
 * costTracker.ts — نظام تتبع تكاليف منصة خيال
 *
 * يُسجّل كل استدعاء API مدفوع في جدول cost_events
 * ويحسب التكاليف بناءً على أسعار كل مزوّد
 *
 * ═══════════════════════════════════════════════════
 * جدول الأسعار (مارس 2026):
 *
 * LLM (GPT-4o عبر Manus):
 *   - Input:  $2.50 / 1M tokens  → $0.0000025 / token
 *   - Output: $10.00 / 1M tokens → $0.000010 / token
 *   - تقدير متوسط: $0.005 / استدعاء (500 input + 300 output tokens)
 *
 * Image Generation (عبر Manus):
 *   - $0.04 / صورة (1024x1024)
 *
 * Runway ML Gen-4 Turbo:
 *   - 5 ثوانٍ:  $0.50 / فيديو
 *   - 10 ثوانٍ: $1.00 / فيديو
 *
 * ElevenLabs eleven_multilingual_v2:
 *   - $0.30 / 1000 حرف → $0.0003 / حرف
 *
 * Cloudflare R2 Storage:
 *   - $0.015 / GB/شهر (تقريباً صفر لملفات صغيرة)
 *   - $0.0000004 / طلب قراءة
 * ═══════════════════════════════════════════════════
 */

import { getDb } from "./db";
import { costEvents, InsertCostEvent } from "../drizzle/schema";
import { sql } from "drizzle-orm";

// ─── أسعار المزوّدين ───────────────────────────────────────────
export const PRICING = {
  llm: {
    perInputToken:  0.0000025,  // $2.50 / 1M tokens
    perOutputToken: 0.000010,   // $10.00 / 1M tokens
    avgCallCost:    0.005,      // متوسط تقديري لكل استدعاء
  },
  image_gen: {
    perImage: 0.04,             // $0.04 / صورة
  },
  runway: {
    per5sec:  0.50,             // $0.50 / 5 ثوانٍ
    per10sec: 1.00,             // $1.00 / 10 ثوانٍ
  },
  elevenlabs: {
    perChar: 0.0003,            // $0.30 / 1000 حرف
    minCost: 0.001,             // حد أدنى
  },
  storage: {
    perMB:      0.000015,       // $0.015 / GB → $0.000015 / MB
    perRequest: 0.0000004,      // $0.0000004 / طلب
  },
} as const;

// ─── حساب التكلفة ──────────────────────────────────────────────
export function calcLLMCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * PRICING.llm.perInputToken) + (outputTokens * PRICING.llm.perOutputToken);
}

export function calcImageCost(count = 1): number {
  return count * PRICING.image_gen.perImage;
}

export function calcRunwayCost(durationSec: 5 | 10 = 5): number {
  return durationSec === 10 ? PRICING.runway.per10sec : PRICING.runway.per5sec;
}

export function calcElevenLabsCost(charCount: number): number {
  return Math.max(charCount * PRICING.elevenlabs.perChar, PRICING.elevenlabs.minCost);
}

export function calcStorageCost(sizeMB: number): number {
  return sizeMB * PRICING.storage.perMB;
}

// ─── تسجيل حدث تكلفة ──────────────────────────────────────────
export async function trackCost(event: {
  provider: InsertCostEvent["provider"];
  operation: string;
  units: number;
  unitType: string;
  costUsd: number;
  userId?: number | null;
  jobId?: string | null;
  projectId?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(costEvents).values({
      provider:   event.provider,
      operation:  event.operation,
      units:      event.units,
      unitType:   event.unitType,
      costUsd:    event.costUsd.toFixed(6),
      userId:     event.userId ?? null,
      jobId:      event.jobId ?? null,
      projectId:  event.projectId ?? null,
      metadata:   event.metadata ?? null,
    });
  } catch (err) {
    // لا نوقف الإنتاج بسبب خطأ في التتبع
    console.warn("[CostTracker] Failed to record cost event:", err);
  }
}

// ─── دوال مختصرة لكل مزوّد ────────────────────────────────────

/** تسجيل تكلفة استدعاء LLM */
export async function trackLLM(opts: {
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  userId?: number | null;
  jobId?: string | null;
  projectId?: number | null;
  model?: string;
}) {
  const input  = opts.inputTokens  ?? 500;
  const output = opts.outputTokens ?? 300;
  const cost   = calcLLMCost(input, output);
  await trackCost({
    provider:  "llm",
    operation: opts.operation,
    units:     input + output,
    unitType:  "tokens",
    costUsd:   cost,
    userId:    opts.userId,
    jobId:     opts.jobId,
    projectId: opts.projectId,
    metadata:  { model: opts.model ?? "gpt-4o", inputTokens: input, outputTokens: output },
  });
}

/** تسجيل تكلفة توليد صورة */
export async function trackImageGen(opts: {
  operation: string;
  count?: number;
  userId?: number | null;
  jobId?: string | null;
  projectId?: number | null;
  prompt?: string;
}) {
  const count = opts.count ?? 1;
  await trackCost({
    provider:  "image_gen",
    operation: opts.operation,
    units:     count,
    unitType:  "images",
    costUsd:   calcImageCost(count),
    userId:    opts.userId,
    jobId:     opts.jobId,
    projectId: opts.projectId,
    metadata:  { promptPreview: opts.prompt?.substring(0, 100) },
  });
}

/** تسجيل تكلفة Runway */
export async function trackRunway(opts: {
  operation: string;
  durationSec?: 5 | 10;
  userId?: number | null;
  jobId?: string | null;
  projectId?: number | null;
  motionPreset?: string;
}) {
  const dur = opts.durationSec ?? 5;
  await trackCost({
    provider:  "runway",
    operation: opts.operation,
    units:     dur,
    unitType:  "seconds",
    costUsd:   calcRunwayCost(dur),
    userId:    opts.userId,
    jobId:     opts.jobId,
    projectId: opts.projectId,
    metadata:  { durationSec: dur, motionPreset: opts.motionPreset },
  });
}

/** تسجيل تكلفة ElevenLabs */
export async function trackElevenLabs(opts: {
  operation: string;
  charCount: number;
  userId?: number | null;
  jobId?: string | null;
  projectId?: number | null;
  voice?: string;
  model?: string;
}) {
  await trackCost({
    provider:  "elevenlabs",
    operation: opts.operation,
    units:     opts.charCount,
    unitType:  "characters",
    costUsd:   calcElevenLabsCost(opts.charCount),
    userId:    opts.userId,
    jobId:     opts.jobId,
    projectId: opts.projectId,
    metadata:  { voice: opts.voice, model: opts.model },
  });
}

/** تسجيل تكلفة التخزين */
export async function trackStorage(opts: {
  operation: string;
  sizeMB: number;
  userId?: number | null;
  jobId?: string | null;
  fileType?: string;
}) {
  await trackCost({
    provider:  "storage",
    operation: opts.operation,
    units:     Math.round(opts.sizeMB * 1000) / 1000,
    unitType:  "mb",
    costUsd:   calcStorageCost(opts.sizeMB),
    userId:    opts.userId,
    jobId:     opts.jobId,
    metadata:  { fileType: opts.fileType },
  });
}

// ─── استعلامات التقارير ────────────────────────────────────────

/** إجمالي التكاليف حسب المزوّد والفترة الزمنية */
export async function getCostSummary(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      provider,
      COUNT(*)                                        AS event_count,
      SUM(units)                                      AS total_units,
      SUM(CAST(cost_usd AS DECIMAL(12,6)))            AS total_cost_usd,
      AVG(CAST(cost_usd AS DECIMAL(12,6)))            AS avg_cost_usd,
      MIN(created_at)                                 AS first_event,
      MAX(created_at)                                 AS last_event
    FROM cost_events
    WHERE created_at >= ${since}
    GROUP BY provider
    ORDER BY total_cost_usd DESC
  `);
  return rows[0] as Array<{
    provider: string;
    event_count: number;
    total_units: number;
    total_cost_usd: number;
    avg_cost_usd: number;
    first_event: Date;
    last_event: Date;
  }>;
}

/** تكاليف يومية للرسم البياني */
export async function getDailyCosts(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      DATE(created_at)                                AS day,
      provider,
      SUM(CAST(cost_usd AS DECIMAL(12,6)))            AS cost_usd,
      COUNT(*)                                        AS events
    FROM cost_events
    WHERE created_at >= ${since}
    GROUP BY DATE(created_at), provider
    ORDER BY day ASC, provider
  `);
  return rows[0] as Array<{
    day: string;
    provider: string;
    cost_usd: number;
    events: number;
  }>;
}

/** أغلى 10 عمليات */
export async function getTopExpensiveOps(days = 30, limit = 10) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      operation,
      provider,
      COUNT(*)                                        AS count,
      SUM(CAST(cost_usd AS DECIMAL(12,6)))            AS total_cost_usd,
      AVG(CAST(cost_usd AS DECIMAL(12,6)))            AS avg_cost_usd
    FROM cost_events
    WHERE created_at >= ${since}
    GROUP BY operation, provider
    ORDER BY total_cost_usd DESC
    LIMIT ${limit}
  `);
  return rows[0] as Array<{
    operation: string;
    provider: string;
    count: number;
    total_cost_usd: number;
    avg_cost_usd: number;
  }>;
}

/** تكلفة كل مستخدم */
export async function getCostPerUser(days = 30, limit = 20) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      ce.user_id,
      u.name                                          AS user_name,
      COUNT(*)                                        AS events,
      SUM(CAST(ce.cost_usd AS DECIMAL(12,6)))         AS total_cost_usd,
      COUNT(DISTINCT DATE(ce.created_at))             AS active_days
    FROM cost_events ce
    LEFT JOIN users u ON u.id = ce.user_id
    WHERE ce.created_at >= ${since}
    GROUP BY ce.user_id, u.name
    ORDER BY total_cost_usd DESC
    LIMIT ${limit}
  `);
  return rows[0] as Array<{
    user_id: number | null;
    user_name: string | null;
    events: number;
    total_cost_usd: number;
    active_days: number;
  }>;
}

/** إجمالي التكاليف اليوم / هذا الشهر / كل الوقت */
export async function getCostTotals() {
  const todayStart  = new Date(); todayStart.setHours(0,0,0,0);
  const monthStart  = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      SUM(CASE WHEN created_at >= ${todayStart}  THEN CAST(cost_usd AS DECIMAL(12,6)) ELSE 0 END) AS today_usd,
      SUM(CASE WHEN created_at >= ${monthStart}  THEN CAST(cost_usd AS DECIMAL(12,6)) ELSE 0 END) AS month_usd,
      SUM(CAST(cost_usd AS DECIMAL(12,6)))                                                         AS total_usd,
      COUNT(CASE WHEN created_at >= ${todayStart}  THEN 1 END)                                     AS today_events,
      COUNT(CASE WHEN created_at >= ${monthStart}  THEN 1 END)                                     AS month_events,
      COUNT(*)                                                                                      AS total_events
    FROM cost_events
  `);
  const r = (rows[0] as any[])[0] ?? {};
  return {
    today:  { usd: Number(r.today_usd  ?? 0), events: Number(r.today_events  ?? 0) },
    month:  { usd: Number(r.month_usd  ?? 0), events: Number(r.month_events  ?? 0) },
    allTime:{ usd: Number(r.total_usd  ?? 0), events: Number(r.total_events  ?? 0) },
  };
}

/** آخر N حدث تكلفة */
export async function getRecentEvents(limit = 50) {
  const db = await getDb();
  const rows = await db.execute(sql`
    SELECT
      ce.id,
      ce.provider,
      ce.operation,
      ce.units,
      ce.unit_type,
      CAST(ce.cost_usd AS DECIMAL(12,6)) AS cost_usd,
      ce.job_id,
      ce.user_id,
      u.name AS user_name,
      ce.metadata,
      ce.created_at
    FROM cost_events ce
    LEFT JOIN users u ON u.id = ce.user_id
    ORDER BY ce.created_at DESC
    LIMIT ${limit}
  `);
  return rows[0] as Array<{
    id: number;
    provider: string;
    operation: string;
    units: number;
    unit_type: string;
    cost_usd: number;
    job_id: string | null;
    user_id: number | null;
    user_name: string | null;
    metadata: unknown;
    created_at: Date;
  }>;
}
