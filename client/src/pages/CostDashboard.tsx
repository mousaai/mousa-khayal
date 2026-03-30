/*
 * mousa.ai — Cost & Consumption Dashboard
 * Admin-only: full visibility into platform costs, subscriber usage, and revenue
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  DollarSign, TrendingUp, TrendingDown, Users, Zap, BarChart3,
  Server, Mic, Palette, Globe, Database, CreditCard, ArrowLeft,
  RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_NAMES: Record<string, string> = {
  fada: "فضاء", raqaba: "رقابة", harara: "حرارة",
  maskan: "مسكن", code: "كود", khayal: "خيال",
  mousa_main: "موسى (رئيسي)", shared: "مشترك",
};

const PLATFORM_COLORS: Record<string, string> = {
  fada: "#d4a017", raqaba: "#3b82f6", harara: "#f97316",
  maskan: "#22c55e", code: "#a855f7", khayal: "#ec4899",
  mousa_main: "#64748b", shared: "#94a3b8",
};

const CATEGORY_NAMES: Record<string, string> = {
  manus_hosting: "استضافة mousa.ai",
  sub_platform_hosting: "استضافة المنصات الفرعية",
  llm_api: "LLM API (نماذج الذكاء الاصطناعي)",
  tts_api: "TTS API (ElevenLabs - الصوت)",
  stt_api: "STT API (التعرف على الكلام)",
  storage: "التخزين (S3)",
  database: "قاعدة البيانات",
  stripe_fees: "رسوم Stripe",
  domain: "النطاق (Domain)",
  email_service: "خدمة البريد الإلكتروني",
  other: "أخرى",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  manus_hosting: Server,
  sub_platform_hosting: Globe,
  llm_api: Activity,
  tts_api: Mic,
  stt_api: Mic,
  storage: Database,
  database: Database,
  stripe_fees: CreditCard,
  domain: Globe,
  email_service: Globe,
  other: DollarSign,
};

const GOLD = "#d4a017";
const DARK_BG = "#080E1A";
const CARD_BG = "rgba(13,27,42,0.8)";
const BORDER = "rgba(212,160,23,0.12)";
const TEXT_MAIN = "#F0EDE6";
const TEXT_MUTED = "#8A9BB0";

function fmt$(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CostDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [showAddCost, setShowAddCost] = useState(false);
  const [newCost, setNewCost] = useState({
    platform: "mousa_main" as string,
    category: "manus_hosting" as string,
    amountCents: "",
    description: "",
    periodStart: `${month}-01`,
    periodEnd: `${month}-${new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate()}`,
  });

  const isAdmin = user?.role === "admin";

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } =
    trpc.analytics.getFullDashboard.useQuery({ month }, { enabled: isAuthenticated && isAdmin });

  const { data: subscribers, isLoading: subLoading, refetch: refetchSubs } =
    trpc.analytics.getSubscriberConsumption.useQuery({ month }, { enabled: isAuthenticated && isAdmin });

  const addCostMutation = trpc.analytics.addCostLog.useMutation({
    onSuccess: () => { refetchDash(); setShowAddCost(false); setNewCost(prev => ({ ...prev, amountCents: "", description: "" })); },
  });

  const deleteCostMutation = trpc.analytics.deleteCostLog.useMutation({
    onSuccess: () => refetchDash(),
  });

  // ── Month navigation ──────────────────────────────────────────────────────
  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (nm <= defaultMonth) setMonth(nm);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const costByCategoryChartData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.costs.byCategory)
      .map(([cat, cents]) => ({ name: CATEGORY_NAMES[cat] ?? cat, value: cents / 100, cents }))
      .sort((a, b) => b.cents - a.cents);
  }, [dashboard]);

  const costByPlatformChartData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.costs.byPlatform)
      .map(([p, cents]) => ({ name: PLATFORM_NAMES[p] ?? p, value: cents / 100, color: PLATFORM_COLORS[p] ?? "#64748b" }))
      .sort((a, b) => b.value - a.value);
  }, [dashboard]);

  const creditByPlatformChartData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.credits.byPlatform)
      .map(([p, credits]) => ({ name: PLATFORM_NAMES[p] ?? p, credits, color: PLATFORM_COLORS[p] ?? "#64748b" }))
      .sort((a, b) => b.credits - a.credits);
  }, [dashboard]);

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DARK_BG }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: GOLD }} />
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = getLoginUrl("/admin/costs");
    return null;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DARK_BG }}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: "#f87171" }} />
          <p style={{ color: TEXT_MAIN, fontSize: "1.1rem" }}>غير مصرح — هذه الصفحة للمشرفين فقط</p>
          <Link href="/admin"><a className="mt-4 inline-block text-sm" style={{ color: GOLD }}>← العودة للوحة الإدارة</a></Link>
        </div>
      </div>
    );
  }

  const isLoading = dashLoading || subLoading;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: DARK_BG, fontFamily: "'IBM Plex Arabic', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between" style={{ background: "rgba(8,14,26,0.95)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <a className="flex items-center gap-1 text-sm" style={{ color: TEXT_MUTED }}>
              <ArrowLeft size={14} />
              لوحة الإدارة
            </a>
          </Link>
          <span style={{ color: BORDER }}>›</span>
          <h1 className="font-bold" style={{ color: TEXT_MAIN, fontSize: "1rem" }}>داشبورد التكاليف والاستهلاك</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-1">
            <button onClick={nextMonth} disabled={month >= defaultMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: month >= defaultMonth ? TEXT_MUTED : GOLD, background: "rgba(212,160,23,0.08)" }}>
              <ChevronUp size={14} />
            </button>
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "rgba(212,160,23,0.1)", color: GOLD, border: `1px solid rgba(212,160,23,0.2)` }}>
              {fmtMonth(month)}
            </span>
            <button onClick={prevMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: GOLD, background: "rgba(212,160,23,0.08)" }}>
              <ChevronDown size={14} />
            </button>
          </div>
          <button onClick={() => { refetchDash(); refetchSubs(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: "rgba(212,160,23,0.1)", color: GOLD, border: `1px solid rgba(212,160,23,0.2)` }}>
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>
      </header>

      <main className="container py-8 space-y-8" style={{ maxWidth: "1400px" }}>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp} label="الإيرادات" iconColor="#22c55e"
            value={dashboard ? fmt$(dashboard.revenue.totalCents) : "—"}
            sub={dashboard ? `${dashboard.revenue.transactions} معاملة` : ""}
            loading={dashLoading}
          />
          <KpiCard
            icon={TrendingDown} label="التكاليف الإجمالية" iconColor="#f87171"
            value={dashboard ? fmt$(dashboard.costs.total) : "—"}
            sub={dashboard ? `${dashboard.costs.items.length} بند` : ""}
            loading={dashLoading}
          />
          <KpiCard
            icon={DollarSign}
            label="صافي الربح / الخسارة"
            iconColor={dashboard && dashboard.profitMarginCents >= 0 ? "#22c55e" : "#f87171"}
            value={dashboard ? fmt$(Math.abs(dashboard.profitMarginCents)) : "—"}
            sub={dashboard ? (dashboard.profitMarginCents >= 0 ? "ربح ✅" : "خسارة ⚠️") : ""}
            loading={dashLoading}
            highlight={dashboard ? (dashboard.profitMarginCents >= 0 ? "green" : "red") : undefined}
          />
          <KpiCard
            icon={Users} label="المشتركون" iconColor={GOLD}
            value={dashboard ? String(dashboard.subscribers.total) : "—"}
            sub={dashboard ? `${dashboard.subscribers.active} نشط هذا الشهر` : ""}
            loading={dashLoading}
          />
        </div>

        {/* ── Credit KPIs ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            icon={Zap} label="كريدت مُصدَر" iconColor={GOLD}
            value={dashboard ? dashboard.credits.totalIssued.toLocaleString() : "—"}
            sub="هذا الشهر"
            loading={dashLoading}
          />
          <KpiCard
            icon={Activity} label="كريدت مُستهلَك" iconColor="#f97316"
            value={dashboard ? dashboard.credits.totalConsumed.toLocaleString() : "—"}
            sub="عبر جميع المنصات"
            loading={dashLoading}
          />
          <KpiCard
            icon={BarChart3} label="معدل الاستهلاك" iconColor="#a855f7"
            value={dashboard && dashboard.credits.totalIssued > 0
              ? `${Math.round((dashboard.credits.totalConsumed / dashboard.credits.totalIssued) * 100)}%`
              : "—"}
            sub="من الكريدت المُصدَر"
            loading={dashLoading}
          />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost by Category */}
          <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: TEXT_MAIN }}>
              <DollarSign size={16} style={{ color: GOLD }} />
              التكاليف حسب الفئة
            </h3>
            {dashLoading ? <ChartSkeleton /> : costByCategoryChartData.length === 0 ? (
              <EmptyChart msg="لا توجد تكاليف مسجّلة لهذا الشهر" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={costByCategoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.08)" />
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: TEXT_MUTED, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fill: TEXT_MUTED, fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "التكلفة"]} contentStyle={{ background: "#0d1b2a", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                  <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cost by Platform */}
          <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: TEXT_MAIN }}>
              <Globe size={16} style={{ color: GOLD }} />
              التكاليف حسب المنصة
            </h3>
            {dashLoading ? <ChartSkeleton /> : costByPlatformChartData.length === 0 ? (
              <EmptyChart msg="لا توجد تكاليف مسجّلة لهذا الشهر" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={costByPlatformChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: $${value.toFixed(2)}`} labelLine={false}>
                    {costByPlatformChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "التكلفة"]} contentStyle={{ background: "#0d1b2a", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                  <Legend formatter={(v) => <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Credit Consumption by Platform */}
        <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: TEXT_MAIN }}>
            <Zap size={16} style={{ color: GOLD }} />
            استهلاك الكريدت حسب المنصة
          </h3>
          {dashLoading ? <ChartSkeleton /> : creditByPlatformChartData.length === 0 ? (
            <EmptyChart msg="لا يوجد استهلاك مسجّل لهذا الشهر" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={creditByPlatformChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.08)" />
                <XAxis dataKey="name" tick={{ fill: TEXT_MUTED, fontSize: 12 }} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "كريدت"]} contentStyle={{ background: "#0d1b2a", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                <Bar dataKey="credits" radius={[4, 4, 0, 0]}>
                  {creditByPlatformChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Subscriber Consumption Table ──────────────────────────────────── */}
        <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold flex items-center gap-2" style={{ color: TEXT_MAIN }}>
              <Users size={16} style={{ color: GOLD }} />
              استهلاك المشتركين
            </h3>
            <span className="text-sm" style={{ color: TEXT_MUTED }}>{subscribers?.length ?? 0} مشترك نشط</span>
          </div>
          {subLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(212,160,23,0.05)" }} />)}
            </div>
          ) : !subscribers?.length ? (
            <EmptyChart msg="لا يوجد مشتركون نشطون هذا الشهر" />
          ) : (
            <div className="space-y-2">
              {subscribers.map(sub => (
                <div key={sub.userId}>
                  <button
                    onClick={() => setExpandedUser(expandedUser === sub.userId ? null : sub.userId)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-right"
                    style={{ background: expandedUser === sub.userId ? "rgba(212,160,23,0.08)" : "rgba(13,27,42,0.4)", border: `1px solid ${expandedUser === sub.userId ? "rgba(212,160,23,0.2)" : "rgba(212,160,23,0.06)"}` }}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,160,23,0.12)", color: GOLD, fontWeight: 700, fontSize: "0.85rem" }}>
                      {(sub.userName ?? "؟").charAt(0)}
                    </div>
                    {/* Name & Email */}
                    <div className="flex-1 text-right">
                      <div style={{ color: TEXT_MAIN, fontWeight: 600, fontSize: "0.9rem" }}>{sub.userName ?? "مستخدم مجهول"}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: "0.75rem" }}>{sub.userEmail ?? "—"}</div>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div style={{ color: GOLD, fontWeight: 700, fontSize: "0.95rem" }}>{sub.totalCreditsUsed.toLocaleString()}</div>
                        <div style={{ color: TEXT_MUTED, fontSize: "0.7rem" }}>كريدت مستهلك</div>
                      </div>
                      <div className="text-center">
                        <div style={{ color: TEXT_MAIN, fontWeight: 600, fontSize: "0.95rem" }}>{sub.totalSessions}</div>
                        <div style={{ color: TEXT_MUTED, fontSize: "0.7rem" }}>جلسة</div>
                      </div>
                      <div className="text-center">
                        <div style={{ color: "#22c55e", fontWeight: 600, fontSize: "0.95rem" }}>{sub.walletBalance.toLocaleString()}</div>
                        <div style={{ color: TEXT_MUTED, fontSize: "0.7rem" }}>رصيد متبقي</div>
                      </div>
                      <div style={{ color: TEXT_MUTED }}>
                        {expandedUser === sub.userId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </button>
                  {/* Expanded: per-platform breakdown */}
                  {expandedUser === sub.userId && (
                    <div className="mt-1 p-4 rounded-xl" style={{ background: "rgba(8,14,26,0.6)", border: `1px solid rgba(212,160,23,0.08)` }}>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(sub.byPlatform).map(([platform, data]) => (
                          <div key={platform} className="rounded-lg p-3 text-center" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${PLATFORM_COLORS[platform] ?? BORDER}22` }}>
                            <div className="text-xs font-bold mb-1" style={{ color: PLATFORM_COLORS[platform] ?? GOLD }}>{PLATFORM_NAMES[platform] ?? platform}</div>
                            <div style={{ color: TEXT_MAIN, fontWeight: 700 }}>{data.credits}</div>
                            <div style={{ color: TEXT_MUTED, fontSize: "0.7rem" }}>كريدت</div>
                            <div style={{ color: TEXT_MUTED, fontSize: "0.7rem" }}>{data.sessions} جلسة</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-4 text-xs" style={{ color: TEXT_MUTED }}>
                        <span>إجمالي المنفق: <strong style={{ color: TEXT_MAIN }}>{sub.walletTotalSpent.toLocaleString()} كريدت</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Cost Log Table ────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold flex items-center gap-2" style={{ color: TEXT_MAIN }}>
              <DollarSign size={16} style={{ color: GOLD }} />
              سجل التكاليف التفصيلي
            </h3>
            <button
              onClick={() => setShowAddCost(!showAddCost)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "rgba(212,160,23,0.12)", color: GOLD, border: `1px solid rgba(212,160,23,0.25)` }}
            >
              + إضافة تكلفة
            </button>
          </div>

          {/* Add Cost Form */}
          {showAddCost && (
            <div className="mb-5 p-5 rounded-xl" style={{ background: "rgba(8,14,26,0.8)", border: `1px solid rgba(212,160,23,0.15)` }}>
              <h4 className="font-semibold mb-4 text-sm" style={{ color: GOLD }}>إضافة تكلفة جديدة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>المنصة</label>
                  <select value={newCost.platform} onChange={e => setNewCost(p => ({ ...p, platform: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }}>
                    {Object.entries(PLATFORM_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>الفئة</label>
                  <select value={newCost.category} onChange={e => setNewCost(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }}>
                    {Object.entries(CATEGORY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>المبلغ (دولار)</label>
                  <input type="number" step="0.01" min="0" placeholder="مثال: 20.00"
                    value={newCost.amountCents}
                    onChange={e => setNewCost(p => ({ ...p, amountCents: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>تاريخ البداية</label>
                  <input type="date" value={newCost.periodStart} onChange={e => setNewCost(p => ({ ...p, periodStart: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>تاريخ النهاية</label>
                  <input type="date" value={newCost.periodEnd} onChange={e => setNewCost(p => ({ ...p, periodEnd: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>الوصف (اختياري)</label>
                  <input type="text" placeholder="مثال: استضافة mousa.ai - مارس 2026"
                    value={newCost.description}
                    onChange={e => setNewCost(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(13,27,42,0.8)", border: `1px solid ${BORDER}`, color: TEXT_MAIN }} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    const cents = Math.round(parseFloat(newCost.amountCents) * 100);
                    if (!cents || cents <= 0) return;
                    addCostMutation.mutate({
                      platform: newCost.platform as "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal" | "mousa_main" | "shared",
                      category: newCost.category as "manus_hosting" | "sub_platform_hosting" | "llm_api" | "tts_api" | "stt_api" | "storage" | "database" | "stripe_fees" | "domain" | "email_service" | "other",
                      amountCents: cents,
                      description: newCost.description || undefined,
                      periodStart: newCost.periodStart,
                      periodEnd: newCost.periodEnd,
                    });
                  }}
                  disabled={addCostMutation.isPending || !newCost.amountCents}
                  className="px-5 py-2 rounded-lg text-sm font-medium"
                  style={{ background: GOLD, color: "#080E1A" }}
                >
                  {addCostMutation.isPending ? "جاري الحفظ..." : "حفظ التكلفة"}
                </button>
                <button onClick={() => setShowAddCost(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: TEXT_MUTED }}>إلغاء</button>
              </div>
            </div>
          )}

          {/* Cost items list */}
          {dashLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(212,160,23,0.05)" }} />)}
            </div>
          ) : !dashboard?.costs.items.length ? (
            <EmptyChart msg="لا توجد تكاليف مسجّلة لهذا الشهر — أضف تكلفة جديدة" />
          ) : (
            <div className="space-y-2">
              {dashboard.costs.items.map(item => {
                const Icon = CATEGORY_ICONS[item.category] ?? DollarSign;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(13,27,42,0.4)", border: `1px solid rgba(212,160,23,0.06)` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,160,23,0.1)" }}>
                      <Icon size={14} style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${PLATFORM_COLORS[item.platform] ?? "#64748b"}22`, color: PLATFORM_COLORS[item.platform] ?? TEXT_MUTED }}>
                          {PLATFORM_NAMES[item.platform] ?? item.platform}
                        </span>
                        <span className="text-xs" style={{ color: TEXT_MUTED }}>{CATEGORY_NAMES[item.category] ?? item.category}</span>
                      </div>
                      {item.description && <div className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{item.description}</div>}
                      <div className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{item.periodStart} → {item.periodEnd}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: "#f87171", fontSize: "1rem" }}>{fmt$(item.amountCents)}</div>
                    </div>
                    <button
                      onClick={() => { if (confirm("حذف هذه التكلفة؟")) deleteCostMutation.mutate({ id: item.id }); }}
                      className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: "#f87171" }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {/* Total */}
              <div className="flex items-center justify-between p-4 rounded-xl mt-2" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}>
                <span className="font-bold" style={{ color: TEXT_MAIN }}>الإجمالي</span>
                <span className="font-bold text-lg" style={{ color: "#f87171" }}>{fmt$(dashboard.costs.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Cost Breakdown Note ───────────────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(212,160,23,0.04)", border: `1px solid rgba(212,160,23,0.1)` }}>
          <h4 className="font-semibold mb-3 text-sm" style={{ color: GOLD }}>💡 كيفية تسجيل التكاليف</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: TEXT_MUTED, lineHeight: 1.7 }}>
            <div>
              <strong style={{ color: TEXT_MAIN }}>استضافة mousa.ai ($20/شهر):</strong> سجّل تحت "استضافة mousa.ai" → منصة "موسى (رئيسي)"
              <br /><strong style={{ color: TEXT_MAIN }}>ElevenLabs:</strong> سجّل تحت "TTS API" → المنصة المستهلِكة
              <br /><strong style={{ color: TEXT_MAIN }}>Stripe Fees:</strong> سجّل تحت "رسوم Stripe" → "مشترك"
            </div>
            <div>
              <strong style={{ color: TEXT_MAIN }}>المنصات الفرعية (فضاء/خيال/...):</strong> سجّل تحت "استضافة المنصات الفرعية"
              <br /><strong style={{ color: TEXT_MAIN }}>قاعدة البيانات:</strong> سجّل تحت "قاعدة البيانات" → "مشترك"
              <br /><strong style={{ color: TEXT_MAIN }}>النطاق:</strong> سجّل تحت "النطاق" → "موسى (رئيسي)"
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, loading, iconColor, highlight }: {
  icon: React.ElementType; label: string; value: string; sub: string;
  loading?: boolean; iconColor?: string; highlight?: "green" | "red";
}) {
  const borderColor = highlight === "green" ? "rgba(34,197,94,0.2)" : highlight === "red" ? "rgba(248,113,113,0.2)" : BORDER;
  return (
    <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${borderColor}` }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${iconColor ?? GOLD}18` }}>
          <Icon size={16} style={{ color: iconColor ?? GOLD }} />
        </div>
        <span className="text-sm" style={{ color: TEXT_MUTED }}>{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "rgba(212,160,23,0.08)" }} />
      ) : (
        <div className="font-bold" style={{ color: TEXT_MAIN, fontSize: "1.6rem", letterSpacing: "-0.02em" }}>{value}</div>
      )}
      <div className="text-xs mt-1" style={{ color: TEXT_MUTED }}>{sub}</div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-48 rounded-xl animate-pulse" style={{ background: "rgba(212,160,23,0.04)" }} />;
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="h-32 flex items-center justify-center rounded-xl" style={{ background: "rgba(212,160,23,0.03)", border: `1px dashed rgba(212,160,23,0.15)` }}>
      <p className="text-sm" style={{ color: TEXT_MUTED }}>{msg}</p>
    </div>
  );
}
