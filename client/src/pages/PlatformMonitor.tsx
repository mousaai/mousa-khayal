/**
 * mousa.ai — Platform Health Monitor Dashboard
 * لوحة مراقبة صحة المنصات الفرعية في الوقت الفعلي
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Wrench, Bell, Shield, Zap, TrendingUp,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

const PLATFORM_NAMES: Record<string, { ar: string; en: string; url: string }> = {
  fada:          { ar: "فضاء",      en: "FADA",     url: "https://fada.mousa.ai" },
  raqaba:        { ar: "رقابة",     en: "RAQABA",   url: "https://raqaba.mousa.ai" },
  harara:        { ar: "حرارة",     en: "HARARA",   url: "https://harara.mousa.ai" },
  maskan:        { ar: "مسكن",      en: "MASKAN",   url: "https://maskan.mousa.ai" },
  code:          { ar: "كود",       en: "CODE",     url: "https://code.mousa.ai" },
  khayal:        { ar: "خيال",      en: "KHAYAL",   url: "https://khayal.mousa.ai" },
  core_database: { ar: "قاعدة البيانات", en: "DATABASE", url: "" },
};

const STATUS_CONFIG = {
  healthy:  { label: "يعمل",      color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   icon: CheckCircle2 },
  degraded: { label: "بطيء",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  icon: AlertTriangle },
  failed:   { label: "متوقف",     color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   icon: XCircle },
  unknown:  { label: "غير معروف", color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)", icon: Clock },
};

const INCIDENT_STATUS_LABELS: Record<string, string> = {
  detected:       "مكتشف",
  investigating:  "قيد التحقيق",
  auto_fixing:    "إصلاح تلقائي",
  auto_fixed:     "أُصلح تلقائياً",
  owner_notified: "أُبلغ المالك",
  escalated:      "مُصعَّد",
  resolved:       "محلول",
  ignored:        "متجاهل",
};

const SEVERITY_CONFIG = {
  critical: { label: "حرج",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  high:     { label: "عالي",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  medium:   { label: "متوسط", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  low:      { label: "منخفض", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

type HealthCheck = {
  id: number;
  target: string;
  checkType: string;
  status: "healthy" | "degraded" | "failed";
  responseTimeMs: number | null;
  httpStatus: number | null;
  errorMessage: string | null;
  createdAt: Date;
};

type Incident = {
  id: number;
  target: string;
  incidentType: string;
  severity: string;
  status: string;
  description: string;
  canAutoFix: boolean;
  autoFixAttempts: number | null;
  detectedAt: Date;
  resolvedAt: Date | null;
  ownerDecision: string | null;
  createdAt: Date;
};

type AutoFix = {
  id: number;
  incidentId: number;
  fixType: string;
  success: boolean;
  actionTaken: string;
  durationMs: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

export default function PlatformMonitor() {
  const [activeSection, setActiveSection] = useState<"overview" | "incidents" | "autofixes" | "alerts">("overview");
  const [expandedIncident, setExpandedIncident] = useState<number | null>(null);

  const { data: healthSummary, isLoading: summaryLoading, refetch: refetchSummary } =
    trpc.monitoring.getHealthSummary.useQuery(undefined, { refetchInterval: 60_000 });

  const { data: healthStats, refetch: refetchStats } =
    trpc.monitoring.getHealthStats.useQuery(undefined, { refetchInterval: 60_000 });

  const { data: openIncidents, isLoading: incidentsLoading, refetch: refetchIncidents } =
    trpc.monitoring.getOpenIncidents.useQuery(undefined, { refetchInterval: 30_000 });

  const { data: allIncidents, refetch: refetchAllIncidents } =
    trpc.monitoring.getAllIncidents.useQuery(
      { limit: 50, offset: 0 },
      { enabled: activeSection === "incidents" }
    );

  const { data: autoFixes, isLoading: autoFixesLoading, refetch: refetchAutoFixes } =
    trpc.monitoring.getAllAutoFixes.useQuery(
      { limit: 50 },
      { enabled: activeSection === "autofixes" }
    );

  const { data: ownerAlerts, isLoading: alertsLoading, refetch: refetchAlerts } =
    trpc.monitoring.getOwnerAlerts.useQuery(
      { limit: 50 },
      { enabled: activeSection === "alerts" }
    );

  const resolveIncidentMutation = trpc.monitoring.resolveIncident.useMutation({
    onSuccess: () => {
      toast.success("تم تحديد الحادثة كمحلولة ✅");
      refetchIncidents();
      refetchAllIncidents();
    },
    onError: (e) => toast.error(e.message),
  });

  const ignoreIncidentMutation = trpc.monitoring.ignoreIncident.useMutation({
    onSuccess: () => {
      toast.success("تم تجاهل الحادثة");
      refetchIncidents();
      refetchAllIncidents();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchStats();
    refetchIncidents();
    toast.success("تم تحديث البيانات");
  };

  const getStatusConfig = (status: string) =>
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;

  const formatTime = (date: Date) =>
    new Date(date).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-platinum font-bold text-xl">مراقبة المنصات</h2>
          <p className="text-steel text-sm mt-0.5">فحص تلقائي كل 5 دقائق — آخر تحديث: الآن</p>
        </div>
        <button
          onClick={handleRefreshAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.25)", color: "#d4a017" }}
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "فحوصات (24س)", value: healthStats?.totalChecks24h ?? 0, icon: Activity, color: "#3b82f6" },
          { label: "فشل (24س)", value: healthStats?.failedChecks24h ?? 0, icon: XCircle, color: "#ef4444" },
          { label: "حوادث مفتوحة", value: healthStats?.openIncidents ?? 0, icon: AlertTriangle, color: "#f59e0b" },
          { label: "أُصلح تلقائياً", value: healthStats?.autoFixedToday ?? 0, icon: Wrench, color: "#22c55e" },
          { label: "تنبيهات (24س)", value: healthStats?.alertsToday ?? 0, icon: Bell, color: "#a855f7" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color: stat.color }} />
              <div className="text-platinum font-bold text-xl">{stat.value}</div>
              <div className="text-steel text-xs mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Platform Status Grid */}
      <div className="mb-6">
        <h3 className="text-platinum font-semibold mb-3 flex items-center gap-2">
          <Shield size={16} className="text-gold" />
          حالة المنصات الفرعية
        </h3>
        {summaryLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : !healthSummary?.length ? (
          <div className="text-center py-8 rounded-xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
            <Activity size={24} className="text-steel mx-auto mb-2 opacity-30" />
            <p className="text-steel text-sm">لا توجد بيانات فحص بعد — يبدأ الفحص الأول بعد 30 ثانية من تشغيل السيرفر</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(healthSummary as HealthCheck[]).map((check) => {
              const platform = PLATFORM_NAMES[check.target];
              const statusCfg = getStatusConfig(check.status);
              const StatusIcon = statusCfg.icon;
              return (
                <div key={check.target} className="rounded-xl p-4" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-platinum font-semibold text-sm">{platform?.ar ?? check.target}</div>
                      <div className="text-steel text-xs" style={{ fontFamily: "monospace" }}>{platform?.en ?? check.target}</div>
                    </div>
                    <StatusIcon size={18} style={{ color: statusCfg.color }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                      {statusCfg.label}
                    </span>
                    <span className="text-steel text-xs">{formatDuration(check.responseTimeMs)}</span>
                  </div>
                  {check.httpStatus && (
                    <div className="text-steel text-xs mt-1">HTTP {check.httpStatus}</div>
                  )}
                  {check.errorMessage && (
                    <div className="text-xs mt-1 truncate" style={{ color: "#ef4444" }}>{check.errorMessage}</div>
                  )}
                  <div className="text-steel text-xs mt-2 opacity-60">
                    {new Date(check.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </div>
                  {platform?.url && (
                    <a href={platform.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs mt-1 hover:opacity-80 transition-opacity"
                      style={{ color: "#d4a017" }}>
                      <ExternalLink size={10} /> زيارة
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open Incidents Alert */}
      {openIncidents && openIncidents.length > 0 && (
        <div className="mb-6 rounded-xl p-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
            <span className="text-platinum font-semibold">{openIncidents.length} حادثة مفتوحة تحتاج انتباهاً</span>
          </div>
          <div className="space-y-2">
            {(openIncidents as Incident[]).slice(0, 3).map((inc) => {
              const sevCfg = SEVERITY_CONFIG[inc.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
              return (
                <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                      {sevCfg.label}
                    </span>
                    <span className="text-platinum text-sm truncate">{inc.description}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolveIncidentMutation.mutate({ incidentId: inc.id })}
                      disabled={resolveIncidentMutation.isPending}
                      className="text-xs px-3 py-1 rounded-lg transition-all"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
                    >
                      حلّ
                    </button>
                    <button
                      onClick={() => ignoreIncidentMutation.mutate({ incidentId: inc.id })}
                      disabled={ignoreIncidentMutation.isPending}
                      className="text-xs px-3 py-1 rounded-lg transition-all"
                      style={{ background: "rgba(107,114,128,0.1)", color: "#6b7280", border: "1px solid rgba(107,114,128,0.25)" }}
                    >
                      تجاهل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-sections Tabs */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(212,160,23,0.08)" }}>
          {([
            ["overview", "نظرة عامة", Activity],
            ["incidents", "الحوادث", AlertTriangle],
            ["autofixes", "الإصلاحات التلقائية", Wrench],
            ["alerts", "تنبيهات المالك", Bell],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color: activeSection === id ? "#d4a017" : "rgba(255,255,255,0.4)",
                borderBottom: activeSection === id ? "2px solid #d4a017" : "2px solid transparent",
                background: "transparent",
              }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview Section */}
          {activeSection === "overview" && (
            <div>
              <h4 className="text-platinum font-semibold mb-4">ملخص الحوادث المفتوحة</h4>
              {incidentsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !openIncidents?.length ? (
                <div className="text-center py-8 rounded-xl" style={{ border: "1px dashed rgba(34,197,94,0.15)" }}>
                  <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "#22c55e" }} />
                  <p className="text-platinum font-semibold">جميع المنصات تعمل بشكل طبيعي</p>
                  <p className="text-steel text-sm mt-1">لا توجد حوادث مفتوحة حالياً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(openIncidents as Incident[]).map((inc) => {
                    const sevCfg = SEVERITY_CONFIG[inc.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                    const isExpanded = expandedIncident === inc.id;
                    return (
                      <div key={inc.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <button
                          onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                              {sevCfg.label}
                            </span>
                            <span className="text-platinum text-sm font-medium truncate">{inc.description}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-steel text-xs">{INCIDENT_STATUS_LABELS[inc.status] ?? inc.status}</span>
                            {isExpanded ? <ChevronUp size={14} className="text-steel" /> : <ChevronDown size={14} className="text-steel" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
                              <div>
                                <div className="text-steel text-xs mb-1">المنصة</div>
                                <div className="text-platinum text-sm">{PLATFORM_NAMES[inc.target]?.ar ?? inc.target}</div>
                              </div>
                              <div>
                                <div className="text-steel text-xs mb-1">نوع الحادثة</div>
                                <div className="text-platinum text-sm font-mono text-xs">{inc.incidentType}</div>
                              </div>
                              <div>
                                <div className="text-steel text-xs mb-1">محاولات الإصلاح</div>
                                <div className="text-platinum text-sm">{inc.autoFixAttempts ?? 0}</div>
                              </div>
                              <div>
                                <div className="text-steel text-xs mb-1">اكتُشف في</div>
                                <div className="text-platinum text-xs">{formatTime(inc.detectedAt)}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => resolveIncidentMutation.mutate({ incidentId: inc.id })}
                                disabled={resolveIncidentMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
                              >
                                <CheckCircle2 size={12} /> تحديد كمحلول
                              </button>
                              <button
                                onClick={() => ignoreIncidentMutation.mutate({ incidentId: inc.id })}
                                disabled={ignoreIncidentMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{ background: "rgba(107,114,128,0.1)", color: "#6b7280", border: "1px solid rgba(107,114,128,0.25)" }}
                              >
                                <XCircle size={12} /> تجاهل
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Incidents Section */}
          {activeSection === "incidents" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-platinum font-semibold">سجل الحوادث</h4>
                <button onClick={() => refetchAllIncidents()} className="flex items-center gap-1.5 text-xs text-steel hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>
              {!allIncidents?.length ? (
                <div className="text-center py-8 text-steel text-sm">لا توجد حوادث مسجلة</div>
              ) : (
                <div className="space-y-2">
                  {(allIncidents as Incident[]).map((inc) => {
                    const sevCfg = SEVERITY_CONFIG[inc.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                    const isResolved = inc.status === "resolved" || inc.status === "ignored" || inc.status === "auto_fixed";
                    return (
                      <div key={inc.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", opacity: isResolved ? 0.6 : 1 }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                                {sevCfg.label}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#8A9BB0" }}>
                                {INCIDENT_STATUS_LABELS[inc.status] ?? inc.status}
                              </span>
                              <span className="text-steel text-xs">{PLATFORM_NAMES[inc.target]?.ar ?? inc.target}</span>
                            </div>
                            <p className="text-platinum text-sm">{inc.description}</p>
                            <div className="text-steel text-xs mt-1">{formatTime(inc.createdAt)}</div>
                          </div>
                          {!isResolved && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => resolveIncidentMutation.mutate({ incidentId: inc.id })}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
                              >حلّ</button>
                              <button
                                onClick={() => ignoreIncidentMutation.mutate({ incidentId: inc.id })}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: "rgba(107,114,128,0.1)", color: "#6b7280" }}
                              >تجاهل</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Auto Fixes Section */}
          {activeSection === "autofixes" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-platinum font-semibold">سجل الإصلاحات التلقائية</h4>
                <button onClick={() => refetchAutoFixes()} className="flex items-center gap-1.5 text-xs text-steel hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>
              {autoFixesLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !autoFixes?.length ? (
                <div className="text-center py-8 text-steel text-sm">لا توجد إصلاحات تلقائية مسجلة</div>
              ) : (
                <div className="space-y-2">
                  {(autoFixes as AutoFix[]).map((fix) => (
                    <div key={fix.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full`} style={{ background: fix.success ? "#22c55e" : "#ef4444" }} />
                          <span className="text-platinum text-sm font-medium">{fix.fixType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                            background: fix.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            color: fix.success ? "#22c55e" : "#ef4444",
                          }}>
                            {fix.success ? "نجح" : "فشل"}
                          </span>
                          <span className="text-steel text-xs">{formatDuration(fix.durationMs)}</span>
                        </div>
                      </div>
                      {fix.actionTaken && <p className="text-steel text-xs mb-1">{fix.actionTaken}</p>}
                      <div className="text-steel text-xs mt-1">{formatTime(fix.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Owner Alerts Section */}
          {activeSection === "alerts" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-platinum font-semibold">تنبيهات المالك</h4>
                <button onClick={() => refetchAlerts()} className="flex items-center gap-1.5 text-xs text-steel hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>
              {alertsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !ownerAlerts?.length ? (
                <div className="text-center py-8 text-steel text-sm">لا توجد تنبيهات مسجلة</div>
              ) : (
                <div className="space-y-3">
                  {(ownerAlerts as { id: number; title: string; content: string; alertType: string; sent: boolean; createdAt: Date }[]).map((alert) => (
                    <div key={alert.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bell size={14} style={{ color: "#d4a017" }} />
                          <span className="text-platinum font-semibold text-sm">{alert.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}>
                            {alert.alertType}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full`} style={{
                            background: alert.sent ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
                            color: alert.sent ? "#22c55e" : "#6b7280",
                          }}>
                            {alert.sent ? "أُرسل" : "لم يُرسل"}
                          </span>
                        </div>
                      </div>
                      <p className="text-steel text-xs leading-relaxed whitespace-pre-wrap">{alert.content}</p>
                      <div className="text-steel text-xs mt-2 opacity-60">{formatTime(alert.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
