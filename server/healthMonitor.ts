/**
 * mousa.ai — Proactive Health Monitor
 * =====================================
 * يعمل هذا النظام في الخلفية ويراقب المنصات الست + الخدمات الأساسية.
 * 
 * منطق القرار:
 * 1. إذا كان الخطأ قابلاً للإصلاح التلقائي → يُصلح ويُسجَّل
 * 2. إذا فشل الإصلاح التلقائي 3 مرات → يُرفع تنبيه للمالك
 * 3. إذا كان الخطأ يحتاج قراراً → يُرفع تنبيه فوري مع خيارات
 */

import { getDb } from "./db";
import {
  systemHealthChecks,
  systemIncidents,
  systemAutoFixes,
  ownerAlerts,
  type InsertSystemHealthCheck,
  type InsertSystemIncident,
  type InsertSystemAutoFix,
  type InsertOwnerAlert,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── GitHub Actions Dispatch ──────────────────────────────────────────────────
const GITHUB_REPOS: Record<string, string> = {
  fada:   "mousa-fada",
  raqaba: "mousa-raqaba",
  harara: "mousa-harara",
  maskan: "mousa-maskan",
  code:   "mousa-code",
  khayal: "mousa-khayal",
};

async function dispatchGitHubAction(
  platform: string,
  action: "deploy" | "rollback" | "restart",
  reason: string
): Promise<{ success: boolean; message: string }> {
  const token = process.env.GITHUB_TOKEN_MOUSA ?? "";
  const owner = process.env.GITHUB_OWNER ?? "";
  const repo = GITHUB_REPOS[platform];

  if (!token || !owner || !repo) {
    return { success: false, message: `GitHub not configured — missing: ${!token ? "token " : ""}${!owner ? "owner " : ""}${!repo ? "repo" : ""}` };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/health-check.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { action, reason: reason.slice(0, 200) },
        }),
      }
    );

    if (response.status === 204) {
      console.log(`[HealthMonitor] GitHub Actions ${action} dispatched for ${platform}`);
      return { success: true, message: `GitHub Actions ${action} dispatched for ${platform}` };
    } else {
      const body = await response.text();
      return { success: false, message: `GitHub API ${response.status}: ${body.slice(0, 150)}` };
    }
  } catch (e: any) {
    return { success: false, message: `GitHub dispatch failed: ${e.message}` };
  }
}

// ─── Configuración ────────────────────────────────────────────────────────────

const PLATFORMS = ["fada", "raqaba", "harara", "maskan", "code", "khayal"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_URLS: Record<Platform, string> = {
  fada:   "https://fada.mousa.ai/",
  raqaba: "https://raqaba.mousa.ai/",
  harara: "https://harara.mousa.ai/",
  maskan: "https://maskan.mousa.ai/",
  code:   "https://code.mousa.ai/",
  khayal: "https://khayal.mousa.ai/",
};

const PLATFORM_HEALTH_ENDPOINTS: Record<Platform, string> = {
  fada:   "https://fada.mousa.ai/api/health",
  raqaba: "https://raqaba.mousa.ai/api/health",
  harara: "https://harara.mousa.ai/api/health",
  maskan: "https://maskan.mousa.ai/api/health",
  code:   "https://code.mousa.ai/api/health",
  khayal: "https://khayal.mousa.ai/api/health",
};

// حد الاستجابة البطيئة (ms)
const SLOW_RESPONSE_THRESHOLD_MS = 5000;
// عدد المحاولات قبل رفع التنبيه
const MAX_AUTO_FIX_ATTEMPTS = 3;
// نافذة الفحص للكشف عن معدل الخطأ المرتفع (دقيقة)
const ERROR_RATE_WINDOW_MINUTES = 15;
// نسبة الخطأ المقبولة
const MAX_ERROR_RATE = 0.3; // 30%

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function saveHealthCheck(data: InsertSystemHealthCheck) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(systemHealthChecks).values(data);
  } catch (e) {
    console.error("[HealthMonitor] Failed to save health check:", e);
  }
}

async function createIncident(data: InsertSystemIncident): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(systemIncidents).values(data);
    return (result[0] as any).insertId ?? null;
  } catch (e) {
    console.error("[HealthMonitor] Failed to create incident:", e);
    return null;
  }
}

async function updateIncidentStatus(
  incidentId: number,
  status: SystemIncident["status"],
  extra?: Partial<typeof systemIncidents.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(systemIncidents)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(eq(systemIncidents.id, incidentId));
  } catch (e) {
    console.error("[HealthMonitor] Failed to update incident:", e);
  }
}

async function saveAutoFix(data: InsertSystemAutoFix) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(systemAutoFixes).values(data);
  } catch (e) {
    console.error("[HealthMonitor] Failed to save auto fix:", e);
  }
}

async function sendOwnerAlert(data: InsertOwnerAlert) {
  const db = await getDb();
  if (!db) return;
  try {
    // حفظ في DB
    await db.insert(ownerAlerts).values({ ...data, sent: false });
    // إرسال فوري عبر نظام الإشعارات
    const sent = await notifyOwner({ title: data.title, content: data.content });
    if (sent) {
      await db.update(ownerAlerts)
        .set({ sent: true, sentAt: new Date() })
        .where(eq(ownerAlerts.title, data.title));
    }
    console.log(`[HealthMonitor] Owner alert sent: ${data.title}`);
  } catch (e) {
    console.error("[HealthMonitor] Failed to send owner alert:", e);
  }
}

// نوع مساعد
type SystemIncident = typeof systemIncidents.$inferSelect;

// ─── Platform Reachability Check ──────────────────────────────────────────────

async function checkPlatformReachability(platform: Platform): Promise<{
  status: "healthy" | "degraded" | "failed";
  responseTimeMs: number;
  httpStatus?: number;
  errorMessage?: string;
}> {
  const url = PLATFORM_URLS[platform];
  const healthUrl = PLATFORM_HEALTH_ENDPOINTS[platform];
  const start = Date.now();

  // نحاول /api/health أولاً، ثم الصفحة الرئيسية
  for (const testUrl of [healthUrl, url]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(testUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "mousa.ai-healthcheck/1.0" },
      });
      clearTimeout(timeout);
      const responseTimeMs = Date.now() - start;

      if (res.ok || res.status === 404) {
        // 404 يعني السيرفر يعمل لكن الـ endpoint غير موجود
        return {
          status: responseTimeMs > SLOW_RESPONSE_THRESHOLD_MS ? "degraded" : "healthy",
          responseTimeMs,
          httpStatus: res.status,
        };
      }

      if (res.status >= 500) {
        return {
          status: "failed",
          responseTimeMs,
          httpStatus: res.status,
          errorMessage: `Server error: ${res.status}`,
        };
      }

      // 401/403 يعني السيرفر يعمل (المصادقة مطلوبة)
      if (res.status === 401 || res.status === 403) {
        return {
          status: "healthy",
          responseTimeMs,
          httpStatus: res.status,
        };
      }

      return {
        status: "degraded",
        responseTimeMs,
        httpStatus: res.status,
        errorMessage: `Unexpected status: ${res.status}`,
      };
    } catch (e: any) {
      if (e.name === "AbortError") {
        return {
          status: "failed",
          responseTimeMs: Date.now() - start,
          errorMessage: "Request timeout (>8s)",
        };
      }
      // جرب الرابط التالي
      continue;
    }
  }

  return {
    status: "failed",
    responseTimeMs: Date.now() - start,
    errorMessage: "All endpoints unreachable",
  };
}

// ─── Database Connectivity Check ──────────────────────────────────────────────

async function checkDatabaseConnectivity(): Promise<{
  status: "healthy" | "degraded" | "failed";
  responseTimeMs: number;
  errorMessage?: string;
}> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) throw new Error("DB instance not available");
    await db.execute(sql`SELECT 1`);
    return { status: "healthy", responseTimeMs: Date.now() - start };
  } catch (e: any) {
    return {
      status: "failed",
      responseTimeMs: Date.now() - start,
      errorMessage: e.message,
    };
  }
}

// ─── Auto-Fix Logic ───────────────────────────────────────────────────────────

async function attemptAutoFix(
  incidentId: number,
  incidentType: string,
  target: string
): Promise<boolean> {
  const start = Date.now();

  // تحديث حالة الحادثة
  await updateIncidentStatus(incidentId, "auto_fixing");

  let success = false;
  let actionTaken = "";
  let fixType: typeof systemAutoFixes.$inferInsert["fixType"] = "retry_request";

  try {
    if (incidentType === "platform_down" || incidentType === "token_auth_failure") {
      // المرحلة 1: إعادة المحاولة بعد تأخير قصير
      fixType = "retry_request";
      await new Promise(r => setTimeout(r, 2000));
      const platform = target as Platform;
      if (PLATFORM_URLS[platform]) {
        const result = await checkPlatformReachability(platform);
        success = result.status === "healthy";
        actionTaken = `Retried platform reachability check. Result: ${result.status} (${result.responseTimeMs}ms)`;

        // المرحلة 2: إذا فشلت إعادة المحاولة → dispatch GitHub Actions restart
        if (!success && GITHUB_REPOS[platform]) {
          fixType = "notify_platform";
          const ghResult = await dispatchGitHubAction(
            platform,
            "restart",
            `${incidentType} detected — auto restart triggered by mousa.ai healthMonitor`
          );
          actionTaken += ` | GitHub Actions: ${ghResult.message}`;
          // نعتبره نجاحاً جزئياً إذا تم إرسال الـ dispatch بنجاح
          if (ghResult.success) success = true;
        }
      }
    } else if (incidentType === "slow_response") {
      // للاستجابة البطيئة: نسجل فقط ونراقب
      fixType = "retry_request";
      actionTaken = "Logged slow response. Will monitor for improvement.";
      success = true; // لا يحتاج إصلاحاً فعلياً
    } else if (incidentType === "database_error") {
      fixType = "retry_request";
      await new Promise(r => setTimeout(r, 3000));
      const result = await checkDatabaseConnectivity();
      success = result.status === "healthy";
      actionTaken = `Retried DB connectivity. Result: ${result.status}`;
    } else {
      // أنواع أخرى تحتاج تدخلاً بشرياً
      fixType = "notify_platform";
      actionTaken = `Incident type '${incidentType}' requires manual intervention.`;
      success = false;
    }
  } catch (e: any) {
    actionTaken = `Auto-fix attempt failed: ${e.message}`;
    success = false;
  }

  await saveAutoFix({
    incidentId,
    fixType,
    success,
    actionTaken,
    durationMs: Date.now() - start,
  });

  if (success) {
    await updateIncidentStatus(incidentId, "auto_fixed", { resolvedAt: new Date() });
  }

  return success;
}

// ─── Main Monitor Cycle ───────────────────────────────────────────────────────

export async function runHealthCheck() {
  console.log("[HealthMonitor] Starting health check cycle...");
  const db = await getDb();
  if (!db) {
    console.warn("[HealthMonitor] DB not available, skipping cycle");
    return;
  }

  const now = new Date();
  const issues: Array<{
    target: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    canAutoFix: boolean;
    needsOwnerAlert: boolean;
    alertType?: "immediate" | "decision" | "info";
  }> = [];

  // 1. فحص المنصات الست
  for (const platform of PLATFORMS) {
    const result = await checkPlatformReachability(platform);

    await saveHealthCheck({
      target: platform,
      checkType: "platform_reachability",
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      httpStatus: result.httpStatus,
      errorMessage: result.errorMessage,
    });

    if (result.status === "failed") {
      issues.push({
        target: platform,
        type: "platform_down",
        severity: "critical",
        description: `منصة ${platform} لا تستجيب. ${result.errorMessage ?? ""}`,
        canAutoFix: true,
        needsOwnerAlert: false, // سنحاول الإصلاح أولاً
      });
    } else if (result.status === "degraded" && result.responseTimeMs > SLOW_RESPONSE_THRESHOLD_MS) {
      issues.push({
        target: platform,
        type: "slow_response",
        severity: "medium",
        description: `منصة ${platform} تستجيب ببطء: ${result.responseTimeMs}ms`,
        canAutoFix: true,
        needsOwnerAlert: false,
      });
    }
  }

  // 2. فحص قاعدة البيانات
  const dbResult = await checkDatabaseConnectivity();
  await saveHealthCheck({
    target: "core_database",
    checkType: "database_connectivity",
    status: dbResult.status,
    responseTimeMs: dbResult.responseTimeMs,
    errorMessage: dbResult.errorMessage,
  });

  if (dbResult.status === "failed") {
    issues.push({
      target: "core_database",
      type: "database_error",
      severity: "critical",
      description: `قاعدة البيانات لا تستجيب: ${dbResult.errorMessage}`,
      canAutoFix: true,
      needsOwnerAlert: true,
      alertType: "immediate",
    });
  }

  // 3. فحص معدل الأخطاء في الـ 15 دقيقة الأخيرة
  const windowStart = new Date(now.getTime() - ERROR_RATE_WINDOW_MINUTES * 60 * 1000);
  for (const platform of PLATFORMS) {
    try {
      const recentChecks = await db
        .select({ status: systemHealthChecks.status })
        .from(systemHealthChecks)
        .where(
          and(
            eq(systemHealthChecks.target, platform),
            eq(systemHealthChecks.checkType, "platform_reachability"),
            gte(systemHealthChecks.createdAt, windowStart)
          )
        );

      if (recentChecks.length >= 3) {
        const failedCount = recentChecks.filter(c => c.status === "failed").length;
        const errorRate = failedCount / recentChecks.length;
        if (errorRate > MAX_ERROR_RATE) {
          issues.push({
            target: platform,
            type: "high_error_rate",
            severity: "high",
            description: `معدل خطأ مرتفع في منصة ${platform}: ${Math.round(errorRate * 100)}% في آخر ${ERROR_RATE_WINDOW_MINUTES} دقيقة`,
            canAutoFix: false,
            needsOwnerAlert: true,
            alertType: "decision",
          });
        }
      }
    } catch (e) {
      // تجاهل أخطاء الفحص
    }
  }

  // 4. معالجة المشاكل المكتشفة
  for (const issue of issues) {
    // تحقق من وجود حادثة مفتوحة مسبقاً لنفس الهدف والنوع
    let existingIncident: SystemIncident | null = null;
    try {
      const existing = await db
        .select()
        .from(systemIncidents)
        .where(
          and(
            eq(systemIncidents.target, issue.target),
            eq(systemIncidents.incidentType, issue.type as any),
            // حوادث مفتوحة (ليست resolved أو ignored)
            sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`
          )
        )
        .orderBy(desc(systemIncidents.createdAt))
        .limit(1);
      existingIncident = existing[0] ?? null;
    } catch (e) {
      // تجاهل
    }

    let incidentId: number | null = null;

    if (!existingIncident) {
      // إنشاء حادثة جديدة
      incidentId = await createIncident({
        target: issue.target,
        incidentType: issue.type as any,
        severity: issue.severity,
        status: "detected",
        description: issue.description,
        canAutoFix: issue.canAutoFix,
        autoFixAttempts: 0,
        detectedAt: now,
      });
    } else {
      incidentId = existingIncident.id;
      // تحديث عدد المحاولات
      const attempts = (existingIncident.autoFixAttempts ?? 0);
      if (attempts >= MAX_AUTO_FIX_ATTEMPTS) {
        // وصلنا للحد الأقصى — رفع تنبيه للمالك
        if (existingIncident.status !== "owner_notified" && existingIncident.status !== "escalated") {
          await updateIncidentStatus(incidentId, "owner_notified");
          await sendOwnerAlert({
            incidentId,
            alertType: "decision",
            title: `⚠️ خلل متكرر يحتاج قراراً: ${issue.target}`,
            content: `
**المشكلة:** ${issue.description}

**المحاولات التلقائية:** ${attempts} محاولة فاشلة

**الإجراءات المتاحة:**
1. إعادة تشغيل المنصة يدوياً
2. التواصل مع فريق ${issue.target}
3. تعطيل المنصة مؤقتاً وإخطار المستخدمين

**الوقت:** ${now.toLocaleString("ar-AE")}
            `.trim(),
          });
        }
        continue;
      }
    }

    if (!incidentId) continue;

    // محاولة الإصلاح التلقائي
    if (issue.canAutoFix) {
      const fixed = await attemptAutoFix(incidentId, issue.type, issue.target);
      if (!fixed) {
        // تحديث عدد المحاولات
        const db2 = await getDb();
        if (db2) {
          await db2.update(systemIncidents)
            .set({
              autoFixAttempts: sql`${systemIncidents.autoFixAttempts} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(systemIncidents.id, incidentId));
        }
      } else {
        console.log(`[HealthMonitor] Auto-fixed: ${issue.target} / ${issue.type}`);
      }
    }

    // رفع تنبيه فوري للحوادث الحرجة التي تحتاج قراراً
    if (issue.needsOwnerAlert && issue.alertType) {
      await sendOwnerAlert({
        incidentId,
        alertType: issue.alertType,
        title: `🚨 تنبيه ${issue.severity === "critical" ? "حرج" : "مهم"}: ${issue.target}`,
        content: `
**المشكلة:** ${issue.description}
**الخطورة:** ${issue.severity}
**الوقت:** ${now.toLocaleString("ar-AE")}
${issue.canAutoFix ? "**الإجراء:** جاري الإصلاح التلقائي..." : "**الإجراء المطلوب:** تدخل يدوي"}
        `.trim(),
      });
    }
  }

  // 5. إرسال ملخص دوري (كل 6 ساعات) إذا كان هناك حوادث مفتوحة
  try {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const recentAlerts = await db
      .select()
      .from(ownerAlerts)
      .where(
        and(
          eq(ownerAlerts.alertType, "summary"),
          gte(ownerAlerts.createdAt, sixHoursAgo)
        )
      )
      .limit(1);

    if (recentAlerts.length === 0) {
      // فحص الحوادث المفتوحة
      const openIncidents = await db
        .select()
        .from(systemIncidents)
        .where(
          sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`
        );

      if (openIncidents.length > 0) {
        const summary = openIncidents.map(i =>
          `• ${i.target}: ${i.description} (${i.status})`
        ).join("\n");

        await sendOwnerAlert({
          alertType: "summary",
          title: `📊 ملخص صحة المنصة — ${openIncidents.length} حادثة مفتوحة`,
          content: `**الحوادث المفتوحة:**\n${summary}\n\n**الوقت:** ${now.toLocaleString("ar-AE")}`,
        });
      }
    }
  } catch (e) {
    // تجاهل أخطاء الملخص
  }

  const issueCount = issues.length;
  console.log(`[HealthMonitor] Cycle complete. Issues found: ${issueCount}`);
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let monitorInterval: NodeJS.Timeout | null = null;

export function startHealthMonitor(intervalMinutes = 5) {
  if (monitorInterval) {
    console.log("[HealthMonitor] Already running");
    return;
  }

  console.log(`[HealthMonitor] Starting with ${intervalMinutes}min interval`);

  // تشغيل فوري بعد 30 ثانية من بدء السيرفر
  setTimeout(() => {
    runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e));
  }, 30_000);

  // ثم كل X دقائق
  monitorInterval = setInterval(() => {
    runHealthCheck().catch(e => console.error("[HealthMonitor] Error:", e));
  }, intervalMinutes * 60 * 1000);
}

export function stopHealthMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[HealthMonitor] Stopped");
  }
}
