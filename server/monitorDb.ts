/**
 * mousa.ai — Monitor & Memory DB Helpers
 * DB helpers for Health Monitor, User Memory, and Conversation Threads
 */
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { getDb } from "./db";
import {
  systemHealthChecks,
  systemIncidents,
  systemAutoFixes,
  ownerAlerts,
  userMemory,
  userReports,
  conversationThreads,
} from "../drizzle/schema";

// ─── Health Monitor Helpers ───────────────────────────────────────────────────

/** Get latest health check per platform */
export async function getHealthSummary() {
  const db = await getDb(); if (!db) return [];
  const targets = ["fada", "raqaba", "harara", "maskan", "code", "khayal", "core_database"];
  const results = [];
  for (const target of targets) {
    const latest = await db.select().from(systemHealthChecks)
      .where(eq(systemHealthChecks.target, target))
      .orderBy(desc(systemHealthChecks.createdAt))
      .limit(1);
    if (latest[0]) results.push(latest[0]);
  }
  return results;
}

/** Get recent health checks for a target */
export async function getRecentHealthChecks(target: string, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemHealthChecks)
    .where(eq(systemHealthChecks.target, target))
    .orderBy(desc(systemHealthChecks.createdAt))
    .limit(limit);
}

/** Get open (unresolved) incidents */
export async function getOpenIncidents() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemIncidents)
    .where(sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`)
    .orderBy(desc(systemIncidents.createdAt))
    .limit(100);
}

/** Get all incidents */
export async function getAllIncidents(limit = 50, offset = 0) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemIncidents)
    .orderBy(desc(systemIncidents.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Get all auto fixes */
export async function getAllAutoFixes(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemAutoFixes)
    .orderBy(desc(systemAutoFixes.createdAt))
    .limit(limit);
}

/** Get owner alerts */
export async function getOwnerAlerts(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(ownerAlerts)
    .orderBy(desc(ownerAlerts.createdAt))
    .limit(limit);
}

/** Resolve an incident */
export async function resolveIncident(incidentId: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.update(systemIncidents)
    .set({ status: "resolved", resolvedAt: new Date(), ownerDecision: notes, updatedAt: new Date() })
    .where(eq(systemIncidents.id, incidentId));
}

/** Ignore an incident */
export async function ignoreIncident(incidentId: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.update(systemIncidents)
    .set({ status: "ignored", ownerDecision: notes, updatedAt: new Date() })
    .where(eq(systemIncidents.id, incidentId));
}

/** Get health stats for the last 24 hours */
export async function getHealthStats() {
  const db = await getDb(); if (!db) return null;
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalChecks, failedChecks, openInc, autoFixed, alerts] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)` }).from(systemHealthChecks).where(gte(systemHealthChecks.createdAt, last24h)),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemHealthChecks).where(and(eq(systemHealthChecks.status, "failed"), gte(systemHealthChecks.createdAt, last24h))),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemIncidents).where(sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemAutoFixes).where(and(eq(systemAutoFixes.success, true), gte(systemAutoFixes.createdAt, last24h))),
    db.select({ c: sql<number>`COUNT(*)` }).from(ownerAlerts).where(gte(ownerAlerts.createdAt, last24h)),
  ]);
  return {
    totalChecks24h: Number(totalChecks[0]?.c ?? 0),
    failedChecks24h: Number(failedChecks[0]?.c ?? 0),
    openIncidents: Number(openInc[0]?.c ?? 0),
    autoFixedToday: Number(autoFixed[0]?.c ?? 0),
    alertsToday: Number(alerts[0]?.c ?? 0),
  };
}

// ─── User Memory Helpers ──────────────────────────────────────────────────────

/** Get user memory record */
export async function getUserMemory(userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(userMemory).where(eq(userMemory.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert user memory */
export async function upsertUserMemory(userId: number, data: Partial<typeof userMemory.$inferInsert>) {
  const db = await getDb(); if (!db) return null;
  const existing = await getUserMemory(userId);
  if (existing) {
    await db.update(userMemory).set({ ...data, updatedAt: new Date() }).where(eq(userMemory.userId, userId));
  } else {
    await db.insert(userMemory).values({ userId, ...data });
  }
  return getUserMemory(userId);
}

/** Get user saved reports */
export async function getUserReportsList(userId: number, platform?: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [eq(userReports.userId, userId)];
  if (platform) conditions.push(eq(userReports.platform, platform));
  return db.select().from(userReports).where(and(...conditions)).orderBy(desc(userReports.createdAt)).limit(limit);
}

/** Get user conversation threads */
export async function getUserConversationThreads(userId: number, platform?: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [eq(conversationThreads.userId, userId)];
  if (platform) conditions.push(eq(conversationThreads.platform, platform));
  return db.select().from(conversationThreads).where(and(...conditions)).orderBy(desc(conversationThreads.createdAt)).limit(limit);
}

/** Get full user memory profile (memory + reports + threads) */
export async function getUserMemoryProfile(userId: number) {
  const [memory, reports, threads] = await Promise.all([
    getUserMemory(userId),
    getUserReportsList(userId, undefined, 10),
    getUserConversationThreads(userId, undefined, 10),
  ]);
  return { memory, reports, threads };
}
