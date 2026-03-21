/**
 * AdminCosts.tsx — لوحة التحكم المالية للأدمن
 * تعرض تكاليف كل API في الوقت الفعلي مع رسوم بيانية
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

// ─── ألوان المزوّدين ──────────────────────────────────────────
const PROVIDER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  llm:        { label: "LLM (GPT-4o)",       color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "🧠", desc: "تحليل النصوص وكتابة السيناريو" },
  image_gen:  { label: "توليد الصور",         color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: "🎨", desc: "إنشاء الصور بالذكاء الاصطناعي" },
  runway:     { label: "Runway ML",           color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "🎬", desc: "تحريك الصور إلى فيديو" },
  elevenlabs: { label: "ElevenLabs TTS",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "🔊", desc: "التعليق الصوتي الاحترافي" },
  storage:    { label: "التخزين (R2)",        color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: "💾", desc: "رفع الملفات والفيديوهات" },
  other:      { label: "أخرى",               color: "#ec4899", bg: "rgba(236,72,153,0.12)",  icon: "⚙️", desc: "عمليات متنوعة" },
};

// ─── مرجع الأسعار ─────────────────────────────────────────────
const PRICE_REFERENCE = [
  { provider: "llm",        unit: "1000 token",    price: "$0.005",  note: "متوسط تقديري (input+output)" },
  { provider: "image_gen",  unit: "صورة واحدة",    price: "$0.04",   note: "1024×1024 px" },
  { provider: "runway",     unit: "5 ثوانٍ فيديو", price: "$0.50",   note: "Gen-4 Turbo" },
  { provider: "runway",     unit: "10 ثوانٍ فيديو",price: "$1.00",   note: "Gen-4 Turbo" },
  { provider: "elevenlabs", unit: "1000 حرف",       price: "$0.30",   note: "eleven_multilingual_v2" },
  { provider: "storage",    unit: "1 GB/شهر",       price: "$0.015",  note: "Cloudflare R2" },
];

// ─── دالة تنسيق التكلفة ───────────────────────────────────────
function fmtUSD(val: number | string | null | undefined): string {
  const n = Number(val ?? 0);
  if (n === 0) return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 1)     return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtNum(val: number | string | null | undefined): string {
  return Number(val ?? 0).toLocaleString("ar-SA");
}

// ─── Mini Bar Chart ───────────────────────────────────────────
function MiniBarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: maxVal > 0 ? `${Math.max((d.value / maxVal) * 56, 2)}px` : "2px",
              background: d.color,
              opacity: 0.85,
            }}
            title={`${d.label}: ${fmtUSD(d.value)}`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Daily Line Chart ─────────────────────────────────────────
function DailyChart({ daily }: { daily: { day: string; provider: string; cost_usd: number }[] }) {
  // تجميع حسب اليوم
  const days = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of daily) {
      map.set(row.day, (map.get(row.day) ?? 0) + Number(row.cost_usd));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14); // آخر 14 يوم
  }, [daily]);

  const maxVal = Math.max(...days.map(d => d[1]), 0.01);
  const chartH = 80;

  if (days.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        لا توجد بيانات بعد
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: chartH + 20 }}>
      {/* خطوط مرجعية */}
      {[0.25, 0.5, 0.75].map(pct => (
        <div
          key={pct}
          className="absolute w-full border-t"
          style={{ bottom: 20 + pct * chartH, borderColor: "rgba(255,255,255,0.06)" }}
        />
      ))}
      {/* الأعمدة */}
      <div className="absolute inset-x-0 bottom-5 flex items-end gap-0.5" style={{ height: chartH }}>
        {days.map(([day, val], i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{
                height: `${Math.max((val / maxVal) * chartH, 2)}px`,
                background: "linear-gradient(to top, rgba(139,92,246,0.8), rgba(59,130,246,0.6))",
              }}
              title={`${day}: ${fmtUSD(val)}`}
            />
          </div>
        ))}
      </div>
      {/* تسميات الأيام */}
      <div className="absolute inset-x-0 bottom-0 flex gap-0.5" style={{ height: 18 }}>
        {days.map(([day], i) => (
          <div key={i} className="flex-1 text-center" style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>
            {day.slice(5)} {/* MM-DD */}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────
export default function AdminCosts() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);

  const { data: report, isLoading, refetch } = trpc.costs.getFullReport.useQuery(
    { days },
    { refetchInterval: 60_000 } // تحديث كل دقيقة
  );

  // ─── حراسة الوصول ─────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#08090f" }}>
        <div className="text-white opacity-50">جارٍ التحقق من الصلاحيات...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#08090f" }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div className="text-white text-lg">هذه الصفحة للمشرفين فقط</div>
        <Link href="/" className="text-blue-400 text-sm hover:underline">← العودة للرئيسية</Link>
      </div>
    );
  }

  const totals = report?.totals;
  const summary = report?.summary ?? [];
  const daily   = report?.daily   ?? [];
  const topOps  = report?.topOps  ?? [];
  const perUser = report?.perUser ?? [];
  const recent  = report?.recent  ?? [];

  // إجمالي التكلفة حسب المزوّد للرسم البياني
  const providerBars = summary.map(s => ({
    label: PROVIDER_CONFIG[s.provider]?.label ?? s.provider,
    value: Number(s.total_cost_usd ?? 0),
    color: PROVIDER_CONFIG[s.provider]?.color ?? "#6b7280",
  }));
  const maxProviderVal = Math.max(...providerBars.map(b => b.value), 0.01);

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{
        background: "#08090f",
        color: "white",
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      {/* ─── Header ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(8,9,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← خيال</Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span className="font-bold text-white">💰 لوحة التكاليف</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            أدمن
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* فلتر الفترة */}
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1 rounded text-xs transition-all"
                style={{
                  background: days === d ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${days === d ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`,
                  color: days === d ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                }}
              >
                {d} يوم
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs px-3 py-1 rounded transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ─── بطاقات الملخص ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "اليوم", data: totals?.today,   icon: "📅", color: "#10b981" },
            { label: `آخر ${days} يوم`, data: totals?.month, icon: "📆", color: "#8b5cf6" },
            { label: "إجمالي كل الوقت", data: totals?.allTime, icon: "📊", color: "#f59e0b" },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: card.color }}>
                {isLoading ? "..." : fmtUSD(card.data?.usd)}
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                {fmtNum(card.data?.events)} عملية
              </div>
            </div>
          ))}
        </div>

        {/* ─── الرسم البياني اليومي + توزيع المزوّدين ─────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* الرسم البياني اليومي */}
          <div
            className="col-span-2 rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">التكاليف اليومية (آخر 14 يوم)</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>بالدولار الأمريكي</span>
            </div>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                جارٍ التحميل...
              </div>
            ) : (
              <DailyChart daily={daily} />
            )}
          </div>

          {/* توزيع المزوّدين */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="font-semibold text-sm mb-4">توزيع التكاليف</div>
            {isLoading ? (
              <div className="h-16 flex items-center justify-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>...</div>
            ) : providerBars.length === 0 ? (
              <div className="h-16 flex items-center justify-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد بيانات</div>
            ) : (
              <>
                <MiniBarChart data={providerBars} maxVal={maxProviderVal} />
                <div className="mt-3 space-y-1.5">
                  {summary.map((s, i) => {
                    const cfg = PROVIDER_CONFIG[s.provider] ?? PROVIDER_CONFIG.other;
                    const total = Number(report?.totals?.month?.usd ?? 1);
                    const pct = total > 0 ? ((Number(s.total_cost_usd) / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                          <span style={{ color: "rgba(255,255,255,0.7)" }}>{cfg.icon} {cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: cfg.color }}>{fmtUSD(s.total_cost_usd)}</span>
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── بطاقات تفصيلية لكل مزوّد ───────────────────── */}
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>تفاصيل كل مزوّد</h2>
          <div className="grid grid-cols-3 gap-3">
            {summary.map((s, i) => {
              const cfg = PROVIDER_CONFIG[s.provider] ?? PROVIDER_CONFIG.other;
              return (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{cfg.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{cfg.label}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{cfg.desc}</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold" style={{ color: cfg.color }}>
                    {fmtUSD(s.total_cost_usd)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.3)" }}>عدد العمليات</div>
                      <div className="font-medium text-white">{fmtNum(s.event_count)}</div>
                    </div>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.3)" }}>متوسط التكلفة</div>
                      <div className="font-medium text-white">{fmtUSD(s.avg_cost_usd)}</div>
                    </div>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.3)" }}>إجمالي الوحدات</div>
                      <div className="font-medium text-white">{fmtNum(s.total_units)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {summary.length === 0 && !isLoading && (
              <div
                className="col-span-3 rounded-xl p-8 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
              >
                <div className="text-4xl mb-3">📭</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  لا توجد بيانات تكاليف بعد — ستظهر هنا بعد أول إنتاج
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── أغلى العمليات + تكلفة المستخدمين ──────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* أغلى العمليات */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h3 className="font-semibold text-sm mb-4">🔥 أغلى العمليات</h3>
            {isLoading ? (
              <div className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>جارٍ التحميل...</div>
            ) : topOps.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد بيانات</div>
            ) : (
              <div className="space-y-2">
                {topOps.map((op, i) => {
                  const cfg = PROVIDER_CONFIG[op.provider] ?? PROVIDER_CONFIG.other;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cfg.icon}</span>
                        <div>
                          <div className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{op.operation}</div>
                          <div style={{ color: "rgba(255,255,255,0.3)" }}>{fmtNum(op.count)} مرة</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold" style={{ color: cfg.color }}>{fmtUSD(op.total_cost_usd)}</div>
                        <div style={{ color: "rgba(255,255,255,0.3)" }}>متوسط {fmtUSD(op.avg_cost_usd)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* تكلفة المستخدمين */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h3 className="font-semibold text-sm mb-4">👤 تكلفة المستخدمين</h3>
            {isLoading ? (
              <div className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>جارٍ التحميل...</div>
            ) : perUser.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد بيانات</div>
            ) : (
              <div className="space-y-2">
                {perUser.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}
                      >
                        {(u.user_name ?? "؟")[0]}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                          {u.user_name ?? "زائر"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.3)" }}>
                          {fmtNum(u.events)} عملية · {u.active_days} يوم نشط
                        </div>
                      </div>
                    </div>
                    <div className="font-bold" style={{ color: "#8b5cf6" }}>
                      {fmtUSD(u.total_cost_usd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── آخر الأحداث ─────────────────────────────────── */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="font-semibold text-sm mb-4">📋 آخر الأحداث</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="text-right pb-2 font-medium">المزوّد</th>
                  <th className="text-right pb-2 font-medium">العملية</th>
                  <th className="text-right pb-2 font-medium">الوحدات</th>
                  <th className="text-right pb-2 font-medium">التكلفة</th>
                  <th className="text-right pb-2 font-medium">المستخدم</th>
                  <th className="text-right pb-2 font-medium">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>جارٍ التحميل...</td>
                  </tr>
                ) : recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد أحداث بعد</td>
                  </tr>
                ) : (
                  recent.map((ev, i) => {
                    const cfg = PROVIDER_CONFIG[ev.provider] ?? PROVIDER_CONFIG.other;
                    const ts  = new Date(ev.created_at);
                    return (
                      <tr
                        key={i}
                        className="border-b"
                        style={{ borderColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}
                      >
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="py-2 font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{ev.operation}</td>
                        <td className="py-2">{fmtNum(ev.units)} {ev.unit_type}</td>
                        <td className="py-2 font-bold" style={{ color: cfg.color }}>{fmtUSD(ev.cost_usd)}</td>
                        <td className="py-2">{ev.user_name ?? "زائر"}</td>
                        <td className="py-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {ts.toLocaleDateString("ar-SA")} {ts.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── جدول مرجع الأسعار ───────────────────────────── */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="font-semibold text-sm mb-4">📌 مرجع الأسعار (مارس 2026)</h3>
          <div className="grid grid-cols-3 gap-3">
            {PRICE_REFERENCE.map((p, i) => {
              const cfg = PROVIDER_CONFIG[p.provider] ?? PROVIDER_CONFIG.other;
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 text-xs"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>{cfg.icon}</span>
                    <span style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div className="font-bold text-white text-sm">{p.price}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)" }}>لكل {p.unit}</div>
                  <div className="mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{p.note}</div>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
            * الأسعار تقديرية بناءً على التسعير الرسمي لكل مزوّد. الأسعار الفعلية قد تختلف حسب الاستخدام والخطة.
            مصادر: OpenAI Pricing، Runway ML Pricing، ElevenLabs Pricing، Cloudflare R2 Pricing.
          </p>
        </div>

      </div>
    </div>
  );
}
