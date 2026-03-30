/*
 * mousa.ai — Admin Dashboard v2
 * Protected: admin role only
 * Features: clickable KPIs, inline user search, direct credit management
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Users, Zap, BarChart3, TrendingUp, ShieldAlert,
  CreditCard, ChevronRight, Plus, Minus, Home as HomeIcon,
  DollarSign, Activity, RefreshCw, LogOut, RotateCcw, CheckCircle, XCircle,
  X, Search, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import FeedbackAdmin from "./FeedbackAdmin";
import CostDashboard from "./CostDashboard";
import PricingRulesAdmin from "./PricingRulesAdmin";
import PlatformMonitor from "./PlatformMonitor";
import GitHubManager from "./GitHubManager";

function FeedbackAdminEmbed() {
  return <FeedbackAdmin />;
}
function CostDashboardEmbed() {
  return <CostDashboard />;
}
function PricingRulesEmbed() {
  return <PricingRulesAdmin />;
}

const PLATFORM_NAMES: Record<string, string> = {
  fada: "فضاء", raqaba: "رقابة", harara: "حرارة", maskan: "مسكن", code: "كود",
  khayal: "خيال", widget: "ثاني الذكي",
};

const PACKAGE_NAMES: Record<string, string> = {
  starter: "Starter 500", pro: "Pro 2000", enterprise: "Enterprise 5000",
};

type DetailModal = {
  type: "users" | "sessions" | "credits" | "revenue";
  title: string;
};

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  openId: string;
  role: string;
  createdAt: Date;
  wallet?: { balance: number } | null;
  subscription?: { packageId: string; status: string } | null;
};

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "payments" | "refunds" | "analytics" | "partners" | "feedback" | "coupons" | "costs" | "pricing" | "monitoring" | "github">("overview");
  const [refundNote, setRefundNote] = useState<Record<number, string>>({});

  // Credit management state
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string | null } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditAction, setCreditAction] = useState<"grant" | "deduct">("grant");
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Detail modal state
  const [detailModal, setDetailModal] = useState<DetailModal | null>(null);

  // Expanded user detail in users tab
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(undefined, { enabled: isAuthenticated });
  const { data: payments, isLoading: paymentsLoading } = trpc.admin.getAllPayments.useQuery({ limit: 100 }, { enabled: isAuthenticated && activeTab === "payments" });
  const { data: refundRequests, isLoading: refundsLoading, refetch: refetchRefunds } = trpc.admin.getAllRefundRequests.useQuery(undefined, { enabled: isAuthenticated && activeTab === "refunds" });
  const { data: sessionRefundRequests, isLoading: sessionRefundsLoading, refetch: refetchSessionRefunds } = trpc.sessions.allRefunds.useQuery(undefined, { enabled: isAuthenticated && activeTab === "refunds" });
  const [sessionRefundNote, setSessionRefundNote] = useState<Record<number, string>>({});
  const { data: pendingPartners, refetch: refetchPartners } = trpc.admin.getPendingPartners.useQuery(undefined, { enabled: isAuthenticated && activeTab === "partners" });
  const isAnalyticsTab = isAuthenticated && activeTab === "analytics";
  const { data: enhancedStats } = trpc.admin.getEnhancedStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dailyRegs } = trpc.admin.getDailyRegistrations.useQuery({ days: 30 }, { enabled: isAnalyticsTab });
  const { data: platformUsage } = trpc.admin.getPlatformUsage.useQuery(undefined, { enabled: isAnalyticsTab });
  const { data: dailyRevenue } = trpc.admin.getDailyRevenue.useQuery({ days: 30 }, { enabled: isAnalyticsTab });
  const { data: revenueSummary } = trpc.admin.getRevenueSummary.useQuery(undefined, { enabled: isAuthenticated });

  const utils = trpc.useUtils();

  // Mutations
  const reviewSessionRefundMutation = trpc.sessions.reviewRefund.useMutation({
    onSuccess: (data) => {
      const d = data as { success: boolean; action: string; creditsRefunded: number };
      if (d.action === "approve") toast.success(`تم استرداد ${d.creditsRefunded.toLocaleString()} كريدت ✅`);
      else toast.success("تم رفض طلب الاسترداد");
      refetchSessionRefunds();
    },
    onError: (e) => toast.error(e.message),
  });

  const reviewRefundMutation = trpc.admin.reviewRefund.useMutation({
    onSuccess: (data) => {
      const d = data as { success: boolean; message?: string; amountRefunded?: number };
      if (d.amountRefunded) toast.success(`تم استرداد $${(d.amountRefunded / 100).toFixed(2)} بنجاح`);
      else toast.success(d.message ?? "تم تحديث الطلب");
      refetchRefunds();
    },
    onError: (e) => toast.error(e.message),
  });

  const grantMutation = trpc.admin.grantCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`تم منح الكريدت. الرصيد الجديد: ${data.newBalance.toLocaleString("ar")}`);
      setCreditAmount(""); setCreditDesc(""); setSelectedUser(null); setUserSearch("");
      utils.admin.getUsers.invalidate();
      utils.admin.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deductMutation = trpc.admin.deductCredits.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`تم خصم الكريدت. الرصيد الجديد: ${data.newBalance.toLocaleString("ar")}`);
      else toast.error(data.error ?? "فشل الخصم");
      setCreditAmount(""); setCreditDesc(""); setSelectedUser(null); setUserSearch("");
      utils.admin.getUsers.invalidate();
      utils.admin.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreditAction = () => {
    if (!selectedUser || !creditAmount || !creditDesc) { toast.error("يرجى تعبئة جميع الحقول"); return; }
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount < 1) { toast.error("المبلغ غير صالح"); return; }
    if (creditAction === "grant") grantMutation.mutate({ userId: selectedUser.id, amount, description: creditDesc });
    else deductMutation.mutate({ userId: selectedUser.id, amount, description: creditDesc });
  };

  // Filtered users for search dropdown
  const filteredUsers = useMemo(() => {
    if (!users || !userSearch.trim()) return users ?? [];
    const q = userSearch.toLowerCase();
    return users.filter((u: UserRow) =>
      (u.name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      u.openId.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const totalRevenue = payments?.filter((p: { status: string }) => p.status === "completed").reduce((sum: number, p: { amountCents: number }) => sum + p.amountCents, 0) ?? 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(212,160,23,0.3)", borderTopColor: "#d4a017" }} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="glass-card p-10 text-center max-w-sm mx-4">
          <ShieldAlert size={32} className="text-gold mx-auto mb-4" />
          <h2 className="text-platinum font-bold text-xl mb-2">تسجيل الدخول مطلوب</h2>
          <a href={getLoginUrl()} className="btn-gold w-full justify-center block mt-4">تسجيل الدخول</a>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="glass-card p-10 text-center max-w-sm mx-4">
          <ShieldAlert size={32} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-platinum font-bold text-xl mb-2">غير مصرح</h2>
          <p className="text-steel text-sm mb-6">هذه الصفحة مخصصة للمشرفين فقط</p>
          <Link href="/dashboard"><span className="btn-gold w-full justify-center block cursor-pointer">العودة للوحة التحكم</span></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "#080E1A" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,14,26,0.95)", borderColor: "rgba(212,160,23,0.08)", backdropFilter: "blur(12px)" }}>
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/"><span className="text-gold font-bold text-lg tracking-tight cursor-pointer">mousa.ai</span></Link>
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,160,23,0.2)", color: "#d4a017" }}>أدمن</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <span className="flex items-center gap-1.5 text-steel text-sm cursor-pointer hover:text-platinum transition-colors">
                <HomeIcon size={14} /> لوحة المستخدم
              </span>
            </Link>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><LogOut size={16} className="text-steel" /></button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-platinum font-bold mb-1" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>لوحة الإدارة</h1>
          <p className="text-steel text-sm">إدارة المستخدمين والكريدت والإيرادات — mousa.ai</p>
        </div>

        {/* -- KPI Cards (Clickable) -- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "إجمالي المستخدمين",
              value: statsLoading ? "..." : stats?.totalUsers?.toLocaleString("ar") ?? "0",
              icon: Users, color: "#3b82f6", bg: "rgba(59,130,246,0.1)",
              modal: { type: "users" as const, title: "قائمة جميع المستخدمين" },
            },
            {
              label: "إجمالي الجلسات",
              value: statsLoading ? "..." : stats?.totalSessions?.toLocaleString("ar") ?? "0",
              icon: Activity, color: "#22c55e", bg: "rgba(34,197,94,0.1)",
              modal: { type: "sessions" as const, title: "تفاصيل الجلسات" },
            },
            {
              label: "كريدت مستهلك",
              value: statsLoading ? "..." : stats?.totalCreditsSpent?.toLocaleString("ar") ?? "0",
              icon: Zap, color: "#d4a017", bg: "rgba(212,160,23,0.1)",
              modal: { type: "credits" as const, title: "تفاصيل استهلاك الكريدت" },
            },
            {
              label: "إجمالي الإيرادات",
              value: `$${(totalRevenue / 100).toFixed(2)}`,
              icon: DollarSign, color: "#a855f7", bg: "rgba(168,85,247,0.1)",
              modal: { type: "revenue" as const, title: "تفاصيل الإيرادات" },
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => setDetailModal(card.modal)}
                className="glass-card p-5 text-right w-full transition-all hover:scale-[1.02] hover:border-opacity-30 group"
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                    <Icon size={15} style={{ color: card.color }} />
                  </div>
                  <span className="text-steel text-xs flex-1">{card.label}</span>
                  <ChevronRight size={12} className="text-steel opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-platinum font-bold text-xl">{card.value}</div>
                <div className="text-steel text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">اضغط للتفاصيل</div>
              </button>
            );
          })}
        </div>

        {/* -- Tabs -- */}
        <div className="glass-card overflow-hidden">
          <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(212,160,23,0.08)" }}>
            {([
              ["overview", "نظرة عامة"],
              ["analytics", "التحليلات"],
              ["users", "المستخدمون"],
              ["payments", "المدفوعات"],
              ["refunds", "طلبات الاسترداد"],
              ["feedback", "آراء وأخطاء"],
              ["partners", "الشركاء"],
              ["coupons", "كوبونات"],
              ["costs", "التكاليف"],
              ["pricing", "معادلات التسعير"],
              ["monitoring", "🛡️ مراقبة المنصات"],
              ["github", "🐝 GitHub"],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: activeTab === id ? "#d4a017" : "rgba(255,255,255,0.4)",
                  borderBottom: activeTab === id ? "2px solid #d4a017" : "2px solid transparent",
                  background: "transparent",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* -- Overview Tab -- */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Stats */}
                <div>
                  <h3 className="text-platinum font-semibold mb-4">إحصائيات سريعة</h3>
                  <div className="space-y-3">
                    {[
                      { label: "المستخدمون النشطون", value: stats?.totalUsers ?? 0, icon: Users, modal: { type: "users" as const, title: "قائمة جميع المستخدمين" } },
                      { label: "إجمالي الجلسات", value: stats?.totalSessions ?? 0, icon: BarChart3, modal: { type: "sessions" as const, title: "تفاصيل الجلسات" } },
                      { label: "الكريدت المستهلك", value: stats?.totalCreditsSpent ?? 0, icon: Zap, modal: { type: "credits" as const, title: "تفاصيل استهلاك الكريدت" } },
                    ].map(({ label, value, icon: Icon, modal }) => (
                      <button
                        key={label}
                        onClick={() => setDetailModal(modal)}
                        className="flex items-center justify-between p-3 rounded-xl w-full transition-all hover:bg-white/5 group"
                        style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} className="text-steel" />
                          <span className="text-steel text-sm">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-platinum font-bold">{statsLoading ? "..." : value.toLocaleString("ar")}</span>
                          <ChevronRight size={12} className="text-steel opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Credit Management — inline user search */}
                <div>
                  <h3 className="text-platinum font-semibold mb-4">إدارة الكريدت</h3>
                  <div className="space-y-3">
                    {/* User Search */}
                    <div className="relative">
                      <label className="text-steel text-xs mb-1 block">المستخدم</label>
                      {selectedUser ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)" }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
                            {selectedUser.name?.charAt(0) ?? "م"}
                          </div>
                          <span className="text-platinum text-sm flex-1">{selectedUser.name ?? "مستخدم"} <span className="text-steel text-xs">(#{selectedUser.id})</span></span>
                          <button onClick={() => { setSelectedUser(null); setUserSearch(""); }} className="text-steel hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Search size={13} className="text-steel flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="ابحث بالاسم أو البريد..."
                              value={userSearch}
                              onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                              onFocus={() => setShowUserDropdown(true)}
                              className="flex-1 bg-transparent text-sm text-platinum outline-none placeholder:text-steel/40"
                            />
                          </div>
                          {showUserDropdown && userSearch && (
                            <div className="absolute top-full mt-1 w-full z-20 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto" style={{ background: "#0d1b2a", border: "1px solid rgba(212,160,23,0.15)" }}>
                              {usersLoading ? (
                                <div className="p-3 text-steel text-sm text-center">جارٍ التحميل...</div>
                              ) : filteredUsers.length === 0 ? (
                                <div className="p-3 text-steel text-sm text-center">لا نتائج</div>
                              ) : (
                                filteredUsers.slice(0, 8).map((u: UserRow) => (
                                  <button
                                    key={u.id}
                                    onClick={() => { setSelectedUser({ id: u.id, name: u.name }); setShowUserDropdown(false); setUserSearch(""); }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-right"
                                  >
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
                                      {u.name?.charAt(0) ?? "م"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-platinum text-sm font-medium truncate">{u.name ?? "مستخدم"}</div>
                                      <div className="text-steel text-xs truncate">{u.email ?? u.openId}</div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Zap size={10} className="text-gold" />
                                      <span className="text-gold text-xs font-bold">{u.wallet?.balance?.toLocaleString("ar") ?? "0"}</span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount + Action */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-steel text-xs mb-1 block">الكمية</label>
                        <input
                          type="number"
                          placeholder="مثال: 500"
                          value={creditAmount}
                          onChange={e => setCreditAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        />
                      </div>
                      <div>
                        <label className="text-steel text-xs mb-1 block">الإجراء</label>
                        <select
                          value={creditAction}
                          onChange={e => setCreditAction(e.target.value as "grant" | "deduct")}
                          className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                          style={{ background: "rgba(8,14,26,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <option value="grant">منح كريدت</option>
                          <option value="deduct">خصم كريدت</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-steel text-xs mb-1 block">الوصف</label>
                      <input
                        type="text"
                        placeholder="سبب المنح أو الخصم"
                        value={creditDesc}
                        onChange={e => setCreditDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleCreditAction}
                      disabled={!selectedUser || !creditAmount || !creditDesc || grantMutation.isPending || deductMutation.isPending}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      style={{
                        background: creditAction === "grant" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        border: `1px solid ${creditAction === "grant" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: creditAction === "grant" ? "#22c55e" : "#ef4444",
                        opacity: (!selectedUser || !creditAmount || !creditDesc) ? 0.5 : 1,
                        cursor: (!selectedUser || !creditAmount || !creditDesc) ? "not-allowed" : "pointer",
                      }}
                    >
                      {creditAction === "grant" ? <Plus size={14} /> : <Minus size={14} />}
                      {grantMutation.isPending || deductMutation.isPending ? "جارٍ التنفيذ..." : creditAction === "grant" ? "منح الكريدت" : "خصم الكريدت"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -- Users Tab -- */}
          {activeTab === "users" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-platinum font-semibold">قائمة المستخدمين ({users?.length ?? 0})</h3>
                <button onClick={() => refetchUsers()} className="flex items-center gap-1.5 text-steel text-xs hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>
              {usersLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !users?.length ? (
                <div className="text-center py-12 text-steel">لا يوجد مستخدمون بعد</div>
              ) : (
                <div className="space-y-2">
                  {(users as UserRow[]).map((u) => (
                    <div key={u.id}>
                      {/* User Row */}
                      <div
                        onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                        style={{ border: `1px solid ${expandedUserId === u.id ? "rgba(212,160,23,0.3)" : "rgba(255,255,255,0.04)"}`, background: expandedUserId === u.id ? "rgba(212,160,23,0.03)" : "transparent" }}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
                          {u.name?.charAt(0) ?? "م"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-platinum text-sm font-medium truncate">{u.name ?? "مستخدم"}</div>
                          <div className="text-steel text-xs truncate">{u.email ?? u.openId}</div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {u.role === "admin" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}>أدمن</span>
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-1">
                              <Zap size={11} className="text-gold" />
                              <span className="text-gold text-sm font-bold">{u.wallet?.balance?.toLocaleString("ar") ?? "0"}</span>
                            </div>
                            <div className="text-steel text-xs">كريدت</div>
                          </div>
                          {expandedUserId === u.id ? <ChevronUp size={14} className="text-steel" /> : <ChevronDown size={14} className="text-steel" />}
                        </div>
                      </div>

                      {/* Expanded User Detail */}
                      {expandedUserId === u.id && (
                        <div className="mx-2 mb-2 rounded-b-xl p-4 space-y-4" style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.1)", borderTop: "none" }}>
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { label: "المعرف", value: `#${u.id}` },
                              { label: "الدور", value: u.role === "admin" ? "مشرف" : "مستخدم" },
                              { label: "الرصيد", value: `${u.wallet?.balance?.toLocaleString("ar") ?? "0"} كريدت` },
                              { label: "الاشتراك", value: u.subscription ? PACKAGE_NAMES[u.subscription.packageId] ?? u.subscription.packageId : "لا يوجد" },
                              { label: "حالة الاشتراك", value: u.subscription?.status === "active" ? "نشط" : u.subscription?.status ?? "—" },
                              { label: "تاريخ التسجيل", value: new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                            ].map(({ label, value }) => (
                              <div key={label} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <div className="text-steel text-xs mb-0.5">{label}</div>
                                <div className="text-platinum text-sm font-medium">{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Quick Credit Action for this user */}
                          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            <button
                              onClick={() => { setSelectedUser({ id: u.id, name: u.name }); setActiveTab("overview"); toast.success(`تم تحديد ${u.name ?? "المستخدم"} — أدخل الكمية في نظرة عامة`); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
                            >
                              <Plus size={12} /> منح كريدت
                            </button>
                            <button
                              onClick={() => { setSelectedUser({ id: u.id, name: u.name }); setCreditAction("deduct"); setActiveTab("overview"); toast.success(`تم تحديد ${u.name ?? "المستخدم"} للخصم`); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                            >
                              <Minus size={12} /> خصم كريدت
                            </button>
                            <span className="text-steel text-xs mr-auto">البريد: {u.email ?? "—"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Payments Tab -- */}
          {activeTab === "payments" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-platinum font-semibold">سجل المدفوعات</h3>
                <div className="flex items-center gap-2">
                  <span className="text-steel text-xs">إجمالي الإيرادات:</span>
                  <span className="text-gold font-bold text-sm">${(totalRevenue / 100).toFixed(2)}</span>
                </div>
              </div>
              {paymentsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !payments?.length ? (
                <div className="text-center py-12 text-steel">لا توجد مدفوعات بعد</div>
              ) : (
                <div className="space-y-2">
                  {(payments as { id: number; packageId: string; status: string; createdAt: Date; creditsGranted: number; amountCents: number }[]).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: p.status === "completed" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
                        <CreditCard size={15} style={{ color: p.status === "completed" ? "#22c55e" : "#ef4444" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-platinum text-sm font-medium">{PACKAGE_NAMES[p.packageId] ?? p.packageId}</div>
                        <div className="text-steel text-xs">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-left">
                        <div>
                          <div className="flex items-center gap-1 justify-end">
                            <Zap size={11} className="text-gold" />
                            <span className="text-gold text-sm font-bold">{p.creditsGranted.toLocaleString("ar")}</span>
                          </div>
                          <div className="text-platinum text-xs font-semibold">${(p.amountCents / 100).toFixed(2)}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: p.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: p.status === "completed" ? "#22c55e" : "#ef4444",
                          border: `1px solid ${p.status === "completed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                        }}>
                          {p.status === "completed" ? "مكتمل" : p.status === "pending" ? "معلق" : "فاشل"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* -- Analytics Tab -- */}
          {activeTab === "analytics" && (
            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-platinum font-semibold mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-gold" /> ملخص الإيرادات
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "إجمالي الإيرادات", value: `$${(revenueSummary?.totalRevenue ?? 0).toFixed(2)}`, color: "#d4a017" },
                    { label: "آخر 30 يوم", value: `$${(revenueSummary?.monthlyRevenue ?? 0).toFixed(2)}`, color: "#22c55e" },
                    { label: "متوسط الطلب", value: `$${(revenueSummary?.avgOrderValue ?? 0).toFixed(2)}`, color: "#3b82f6" },
                    { label: "عدد المدفوعات", value: (revenueSummary?.totalPayments ?? 0).toLocaleString("ar"), color: "#a78bfa" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-steel text-xs mb-1">{label}</div>
                      <div className="font-bold text-xl" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "مسجلون اليوم", value: enhancedStats?.newUsersToday ?? 0, color: "#22c55e" },
                  { label: "مسجلون هذا الأسبوع", value: enhancedStats?.newUsersThisWeek ?? 0, color: "#d4a017" },
                  { label: "جلسات اليوم", value: enhancedStats?.sessionsToday ?? 0, color: "#3b82f6" },
                  { label: "كريدت الإجمالي", value: enhancedStats?.totalCreditsSpent ?? 0, color: "#f97316" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-steel text-xs mb-1">{label}</div>
                    <div className="font-bold text-2xl" style={{ color }}>{value.toLocaleString("ar")}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-platinum font-semibold mb-4 flex items-center gap-2"><Users size={16} className="text-gold" /> التسجيلات اليومية (آخر 30 يوم)</h3>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dailyRegs ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4a017" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#d4a017" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: "#8A9BB0", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: "#8A9BB0", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid rgba(212,160,23,0.2)", borderRadius: "8px", color: "#e2e8f0" }} labelStyle={{ color: "#d4a017" }} />
                      <Area type="monotone" dataKey="count" stroke="#d4a017" strokeWidth={2} fill="url(#regGrad)" name="مسجلون جدد" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="text-platinum font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-gold" /> الإيرادات اليومية (آخر 30 يوم)</h3>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(dailyRevenue ?? []).map((d: { date: string; amountUsd: number; count: number }) => ({ ...d, usd: +d.amountUsd.toFixed(2) }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: "#8A9BB0", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: "#8A9BB0", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid rgba(212,160,23,0.2)", borderRadius: "8px", color: "#e2e8f0" }} labelStyle={{ color: "#d4a017" }} formatter={(v: number) => [`$${v}`, "إيراد"]} />
                      <Bar dataKey="usd" fill="#d4a017" radius={[4, 4, 0, 0]} name="إيراد ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-platinum font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-gold" /> استخدام المنصات</h3>
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {platformUsage && platformUsage.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={platformUsage} dataKey="sessions" nameKey="platform" cx="50%" cy="50%" outerRadius={90} label={({ platform, percent }: { platform: string; percent: number }) => `${PLATFORM_NAMES[platform] ?? platform} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {platformUsage.map((_: unknown, index: number) => (
                              <Cell key={index} fill={["#d4a017", "#3b82f6", "#22c55e", "#f97316", "#a78bfa", "#ec4899"][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid rgba(212,160,23,0.2)", borderRadius: "8px", color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString("ar"), "جلسة"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-steel text-center py-12">لا توجد بيانات بعد</div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-platinum font-semibold mb-4 flex items-center gap-2"><Activity size={16} className="text-gold" /> تفاصيل المنصات</h3>
                  <div className="space-y-3">
                    {(platformUsage ?? []).map((p: { platform: string; sessions: number; creditsUsed: number }) => (
                      <div key={p.platform} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <div className="text-platinum font-medium text-sm">{PLATFORM_NAMES[p.platform] ?? p.platform}</div>
                          <div className="text-steel text-xs">{p.sessions.toLocaleString("ar")} جلسة</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold font-semibold text-sm">{p.creditsUsed.toLocaleString("ar")}</div>
                          <div className="text-steel text-xs">كريدت</div>
                        </div>
                      </div>
                    ))}
                    {(!platformUsage || platformUsage.length === 0) && (
                      <div className="text-steel text-center py-8">لا توجد بيانات بعد</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl flex items-center justify-between" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.2)" }}>
                <div>
                  <div className="text-platinum font-semibold flex items-center gap-2"><BarChart3 size={16} className="text-gold" /> لوحة تحليلات التكاليف الشاملة</div>
                  <div className="text-steel text-xs mt-1">تتبع تكاليف الاستضافة، LLM، TTS، Stripe — مع P&L شهري</div>
                </div>
                <a href="/admin/costs" className="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: "#D4A017", color: "#080E1A" }}>
                  فتح داشبورد التكاليف →
                </a>
              </div>
            </div>
          )}

          {/* -- Refunds Tab -- */}
          {activeTab === "refunds" && (
            <>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-platinum font-semibold">طلبات الاسترداد</h3>
                <button onClick={() => refetchRefunds()} className="flex items-center gap-1.5 text-steel text-xs hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>
              {refundsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !refundRequests?.length ? (
                <div className="text-center py-12">
                  <RotateCcw size={32} className="text-steel mx-auto mb-3 opacity-40" />
                  <p className="text-steel">لا توجد طلبات استرداد حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(refundRequests as { id: number; status: string; userName?: string | null; amountCents: number; creditsToDeduct: number; reason: string; createdAt: Date; adminNote?: string | null }[]).map((req) => (
                    <div key={req.id} className="rounded-xl p-5" style={{
                      border: req.status === "pending" ? "1px solid rgba(212,160,23,0.25)" : "1px solid rgba(255,255,255,0.05)",
                      background: req.status === "pending" ? "rgba(212,160,23,0.03)" : "rgba(255,255,255,0.01)",
                    }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-platinum font-semibold text-sm">طلب #{req.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                              background: req.status === "refunded" ? "rgba(34,197,94,0.1)" : req.status === "rejected" ? "rgba(239,68,68,0.1)" : req.status === "approved" ? "rgba(59,130,246,0.1)" : "rgba(212,160,23,0.1)",
                              color: req.status === "refunded" ? "#22c55e" : req.status === "rejected" ? "#ef4444" : req.status === "approved" ? "#60a5fa" : "#d4a017",
                              border: `1px solid ${req.status === "refunded" ? "rgba(34,197,94,0.2)" : req.status === "rejected" ? "rgba(239,68,68,0.2)" : req.status === "approved" ? "rgba(59,130,246,0.2)" : "rgba(212,160,23,0.2)"}`
                            }}>
                              {req.status === "pending" ? "قيد المراجعة" : req.status === "approved" ? "موافق" : req.status === "rejected" ? "مرفوض" : "تم الاسترداد"}
                            </span>
                          </div>
                          <div className="text-steel text-xs">المستخدم: {req.userName ?? "غير معروف"} · ${(req.amountCents / 100).toFixed(2)} · {req.creditsToDeduct.toLocaleString()} كريدت</div>
                          <div className="text-steel text-xs">{new Date(req.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                        </div>
                      </div>
                      <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-steel text-xs mb-1">سبب الطلب:</div>
                        <p className="text-platinum text-sm leading-relaxed">{req.reason}</p>
                      </div>
                      {req.status === "pending" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-steel text-xs mb-1 block">ملاحظة الإدارة (اختياري)</label>
                            <input
                              type="text"
                              placeholder="سبب القبول أو الرفض..."
                              value={refundNote[req.id] ?? ""}
                              onChange={(e) => setRefundNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={reviewRefundMutation.isPending}
                              onClick={() => reviewRefundMutation.mutate({ refundRequestId: req.id, action: "approve", adminNote: refundNote[req.id] })}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
                            >
                              {reviewRefundMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              موافقة وتنفيذ الاسترداد
                            </button>
                            <button
                              disabled={reviewRefundMutation.isPending}
                              onClick={() => reviewRefundMutation.mutate({ refundRequestId: req.id, action: "reject", adminNote: refundNote[req.id] })}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                            >
                              {reviewRefundMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
                              رفض
                            </button>
                          </div>
                        </div>
                      )}
                      {req.adminNote && (
                        <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "#8A9BB0" }}>
                          ملاحظة الإدارة: {req.adminNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* -- Session Credit Refunds Section -- */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-platinum font-semibold">استرداد كريدت الجلسات</h3>
                  <p className="text-steel text-xs mt-0.5">طلبات المستخدمين لاسترداد كريدت جلسات لم يستفيدوا منها</p>
                </div>
                <button onClick={() => refetchSessionRefunds()} className="flex items-center gap-1.5 text-xs text-steel hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> تحديث
                </button>
              </div>

              {sessionRefundsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !sessionRefundRequests?.length ? (
                <div className="text-center py-8 rounded-xl" style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <RotateCcw size={24} className="text-steel mx-auto mb-2 opacity-30" />
                  <p className="text-steel text-sm">لا توجد طلبات استرداد جلسات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(sessionRefundRequests as { id: number; status: string; userId: number; sessionId: number; platform: string; creditsToRefund: number; reason: string; adminNote?: string | null; createdAt: Date }[]).map((req) => (
                    <div key={req.id} className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-platinum text-sm font-medium">طلب #ج{req.id} — جلسة #{req.sessionId}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                              background: req.status === "approved" ? "rgba(34,197,94,0.1)" : req.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(212,160,23,0.1)",
                              color: req.status === "approved" ? "#22c55e" : req.status === "rejected" ? "#ef4444" : "#d4a017",
                              border: `1px solid ${req.status === "approved" ? "rgba(34,197,94,0.2)" : req.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(212,160,23,0.2)"}`
                            }}>
                              {req.status === "pending" ? "قيد المراجعة" : req.status === "approved" ? "تم الاسترداد" : "مرفوض"}
                            </span>
                          </div>
                          <div className="text-steel text-xs mt-1">منصة: {PLATFORM_NAMES[req.platform] ?? req.platform} · <span className="text-gold font-semibold">{req.creditsToRefund.toLocaleString()} كريدت</span> · {new Date(req.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                        </div>
                      </div>
                      <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-steel text-xs mb-1">سبب الطلب:</div>
                        <p className="text-platinum text-sm leading-relaxed">{req.reason}</p>
                      </div>
                      {req.status === "pending" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-steel text-xs mb-1 block">ملاحظة الإدارة (اختياري)</label>
                            <input
                              type="text"
                              placeholder="سبب القبول أو الرفض..."
                              value={sessionRefundNote[req.id] ?? ""}
                              onChange={(e) => setSessionRefundNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={reviewSessionRefundMutation.isPending}
                              onClick={() => reviewSessionRefundMutation.mutate({ refundId: req.id, action: "approve", adminNote: sessionRefundNote[req.id] })}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
                            >
                              {reviewSessionRefundMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              موافقة وإعادة الكريدت
                            </button>
                            <button
                              disabled={reviewSessionRefundMutation.isPending}
                              onClick={() => reviewSessionRefundMutation.mutate({ refundId: req.id, action: "reject", adminNote: sessionRefundNote[req.id] })}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                            >
                              {reviewSessionRefundMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
                              رفض
                            </button>
                          </div>
                        </div>
                      )}
                      {req.adminNote && (
                        <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "#8A9BB0" }}>
                          ملاحظة الإدارة: {req.adminNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
          )}
        </div>
        {/* Feedback & Errors Tab */}
        {activeTab === "feedback" && (
          <div className="glass-card mt-0 p-0 overflow-hidden">
            <FeedbackAdminEmbed />
          </div>
        )}
        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div className="glass-card mt-0 p-0 overflow-hidden">
            <CouponsAdminTab />
          </div>
        )}
        {/* Costs Tab */}
        {activeTab === "costs" && (
          <div className="mt-0 overflow-hidden">
            <CostDashboardEmbed />
          </div>
        )}
        {/* Pricing Rules Tab */}
        {activeTab === "pricing" && (
          <div className="mt-0 overflow-hidden">
            <PricingRulesEmbed />
          </div>
        )}
        {/* Platform Monitoring Tab */}
        {activeTab === "monitoring" && (
          <div className="mt-0 overflow-hidden">
            <PlatformMonitor />
          </div>
        )}
        {/* GitHub Management Tab */}
        {activeTab === "github" && (
          <div className="mt-0 overflow-hidden">
            <GitHubManager />
          </div>
        )}
        {/* Partners Tab — outside glass-card */}
        {activeTab === "partners" && (
          <div className="glass-card mt-0 p-6">
            <PartnersAdminTab partners={pendingPartners ?? []} onRefresh={() => refetchPartners()} />
          </div>
        )}
      </main>

      {/* -- Detail Modal -- */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl" style={{ background: "#0d1b2a", border: "1px solid rgba(212,160,23,0.15)" }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b sticky top-0" style={{ borderColor: "rgba(212,160,23,0.08)", background: "#0d1b2a" }}>
              <h3 className="text-platinum font-bold text-lg">{detailModal.title}</h3>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><X size={18} className="text-steel" /></button>
            </div>

            {/* Modal Content */}
            <div className="p-5">
              {/* Users Detail */}
              {detailModal.type === "users" && (
                <div className="space-y-2">
                  <div className="text-steel text-sm mb-4">إجمالي المستخدمين: <span className="text-gold font-bold">{users?.length ?? 0}</span></div>
                  {usersLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
                  ) : (users as UserRow[] ?? []).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
                        {u.name?.charAt(0) ?? "م"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-platinum text-sm font-medium truncate">{u.name ?? "مستخدم"}</div>
                        <div className="text-steel text-xs truncate">{u.email ?? u.openId} · {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Zap size={11} className="text-gold" />
                        <span className="text-gold text-sm font-bold">{u.wallet?.balance?.toLocaleString("ar") ?? "0"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions Detail */}
              {detailModal.type === "sessions" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "إجمالي الجلسات", value: stats?.totalSessions?.toLocaleString("ar") ?? "0", color: "#22c55e" },
                      { label: "جلسات اليوم", value: enhancedStats?.sessionsToday?.toLocaleString("ar") ?? "0", color: "#3b82f6" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-steel text-xs mb-2">{label}</div>
                        <div className="font-bold text-2xl" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-steel text-sm text-center">تفاصيل الجلسات حسب المنصة متاحة في تبويب التحليلات</p>
                    <button onClick={() => { setDetailModal(null); setActiveTab("analytics"); }} className="mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}>
                      فتح التحليلات →
                    </button>
                  </div>
                </div>
              )}

              {/* Credits Detail */}
              {detailModal.type === "credits" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "إجمالي الكريدت المستهلك", value: stats?.totalCreditsSpent?.toLocaleString("ar") ?? "0", color: "#d4a017" },
                      { label: "متوسط الاستهلاك", value: users?.length ? Math.round((stats?.totalCreditsSpent ?? 0) / users.length).toLocaleString("ar") : "0", color: "#f97316" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-steel text-xs mb-2">{label}</div>
                        <div className="font-bold text-2xl" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-platinum text-sm font-semibold mb-2">أعلى المستخدمين استهلاكاً</div>
                    {(users as UserRow[] ?? [])
                      .sort((a, b) => (b.wallet?.balance ?? 0) - (a.wallet?.balance ?? 0))
                      .slice(0, 5)
                      .map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(212,160,23,0.15)", color: "#d4a017" }}>
                            {u.name?.charAt(0) ?? "م"}
                          </div>
                          <span className="text-platinum text-sm flex-1">{u.name ?? "مستخدم"}</span>
                          <div className="flex items-center gap-1">
                            <Zap size={11} className="text-gold" />
                            <span className="text-gold text-sm font-bold">{u.wallet?.balance?.toLocaleString("ar") ?? "0"}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Revenue Detail */}
              {detailModal.type === "revenue" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "إجمالي الإيرادات", value: `$${(revenueSummary?.totalRevenue ?? 0).toFixed(2)}`, color: "#d4a017" },
                      { label: "آخر 30 يوم", value: `$${(revenueSummary?.monthlyRevenue ?? 0).toFixed(2)}`, color: "#22c55e" },
                      { label: "متوسط الطلب", value: `$${(revenueSummary?.avgOrderValue ?? 0).toFixed(2)}`, color: "#3b82f6" },
                      { label: "عدد المدفوعات", value: (revenueSummary?.totalPayments ?? 0).toLocaleString("ar"), color: "#a78bfa" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-steel text-xs mb-2">{label}</div>
                        <div className="font-bold text-xl" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setDetailModal(null); setActiveTab("payments"); }} className="w-full py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}>
                    عرض سجل المدفوعات الكامل →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Partners Admin Tab --------------------------------------------
const PARTNER_TYPE_AR: Record<string, string> = {
  supplier: "مورد", contractor: "مقاول", developer: "مطور",
  consultant: "استشاري", subcontractor: "مقاول باطن", manufacturer: "مصنّع",
};

function PartnersAdminTab({ partners, onRefresh }: { partners: Record<string, unknown>[]; onRefresh: () => void }) {
  const verifyMutation = trpc.admin.verifyPartner.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الشريك"); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  if (partners.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "#4ade80" }} />
        <p style={{ color: "#8A9BB0" }}>لا توجد طلبات شراكة معلقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 style={{ color: "#F0EDE6", fontWeight: 700 }}>طلبات الشراكة المعلقة ({partners.length})</h3>
        <button onClick={onRefresh} style={{ color: "#d4a017", fontSize: "0.8rem" }}>تحديث</button>
      </div>
      {partners.map(p => (
        <div key={p.id as number} className="rounded-xl p-5" style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.1)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div style={{ color: "#F0EDE6", fontWeight: 700, fontSize: "1rem" }}>{String(p.nameAr)}</div>
              {p.nameEn != null && <div style={{ color: "#8A9BB0", fontSize: "0.8rem" }}>{String(p.nameEn)}</div>}
              <div className="flex gap-2 mt-1">
                <span style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "9999px", border: "1px solid rgba(212,160,23,0.2)" }}>
                  {PARTNER_TYPE_AR[p.partnerType as string] ?? String(p.partnerType)}
                </span>
                {p.tradeLicenseNo != null && (
                  <span style={{ color: "#8A9BB0", fontSize: "0.75rem" }}>رخصة: {String(p.tradeLicenseNo)}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => verifyMutation.mutate({ partnerId: p.id as number, status: "verified" })}
                disabled={verifyMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
              >
                <CheckCircle size={12} /> قبول
              </button>
              <button
                onClick={() => verifyMutation.mutate({ partnerId: p.id as number, status: "rejected" })}
                disabled={verifyMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <XCircle size={12} /> رفض
              </button>
            </div>
          </div>
          {p.profileAr != null && (
            <p className="mt-3 text-sm" style={{ color: "#8A9BB0", lineHeight: 1.6 }}>{String(p.profileAr)}</p>
          )}
          <div className="mt-3 flex gap-4 text-xs" style={{ color: "#8A9BB0" }}>
            {p.phone != null && <span>📞 {String(p.phone)}</span>}
            {p.email != null && <span>✉️ {String(p.email)}</span>}
            {p.primarySpecialization != null && <span>🔧 {String(p.primarySpecialization)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Coupons Admin Tab ----------------------------------------------------------
function CouponsAdminTab() {
  const { data: codes, isLoading, refetch } = trpc.marketing.getAllCodes.useQuery();
  const createCode = trpc.marketing.createCode.useMutation({ onSuccess: () => { toast.success("تم إنشاء الكوبون!"); refetch(); resetForm(); } });
  const toggleCode = trpc.marketing.toggleCode.useMutation({ onSuccess: () => { toast.success("تم تحديث حالة الكوبون"); refetch(); } });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "credits",
    discountValue: 10,
    maxUses: 100,
    expiresAt: "",
    description: "",
  });

  const resetForm = () => {
    setForm({ code: "", discountType: "percent", discountValue: 10, maxUses: 100, expiresAt: "", description: "" });
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!form.code.trim()) { toast.error("أدخل كود الخصم"); return; }
    createCode.mutate({
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: form.discountValue,
      maxUses: form.maxUses,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      description: form.description || undefined,
    });
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-platinum font-bold text-lg">إدارة كوبونات الخصم</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
        >
          <Plus size={15} />
          كوبون جديد
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="p-5 rounded-2xl mb-6" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.2)" }}>
          <h4 className="font-semibold text-white mb-4">إنشاء كوبون جديد</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>كود الخصم *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="مثال: WELCOME20"
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", direction: "ltr" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>نوع الخصم</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "percent" | "credits" })}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <option value="percent">نسبة مئوية (%)</option>
                <option value="credits">كريدت مجاني</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>
                {form.discountType === "percent" ? "نسبة الخصم (%)" : "عدد الكريدت المجاني"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                min={1}
                max={form.discountType === "percent" ? 100 : 10000}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>الحد الأقصى للاستخدام</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                min={1}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>تاريخ الانتهاء (اختياري)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#8A9BB0" }}>وصف (اختياري)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="مثال: عرض الإطلاق"
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={createCode.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
            >
              {createCode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              إنشاء الكوبون
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm" style={{ color: "#8A9BB0" }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Codes List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
      ) : !codes?.length ? (
        <div className="text-center py-12" style={{ color: "#8A9BB0" }}>
          <div className="text-4xl mb-3">🎟️</div>
          <p>لا توجد كوبونات بعد — أنشئ أول كوبون خصم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((c: any) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
              style={{
                background: c.isActive ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${c.isActive ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.05)"}`,
                opacity: c.isActive ? 1 : 0.6,
              }}
            >
              <span
                className="font-mono font-bold px-2 py-1 rounded-lg text-sm"
                style={{ background: "rgba(212,160,23,0.1)", color: "#D4A017", border: "1px solid rgba(212,160,23,0.2)" }}
              >
                {c.code}
              </span>
              <span className="text-sm" style={{ color: "#B0C0D4" }}>
                {c.discountType === "percent" ? `خصم ${c.discountValue}%` : `+${c.discountValue} كريدت`}
              </span>
              {c.description && <span className="text-xs" style={{ color: "#8A9BB0" }}>{c.description}</span>}
              <span className="text-xs" style={{ color: "#8A9BB0" }}>
                {c.usedCount}/{c.maxUses} استخدام
              </span>
              {c.expiresAt && (
                <span className="text-xs" style={{ color: "#8A9BB0" }}>
                  ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-SA")}
                </span>
              )}
              <div className="mr-auto flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: c.isActive ? "rgba(74,155,127,0.1)" : "rgba(255,255,255,0.05)",
                    color: c.isActive ? "#4A9B7F" : "#8A9BB0",
                    border: `1px solid ${c.isActive ? "rgba(74,155,127,0.3)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {c.isActive ? "نشط" : "معطّل"}
                </span>
                {c.isActive && (
                  <button
                    onClick={() => toggleCode.mutate({ id: c.id, isActive: false })}
                    className="text-xs px-2 py-0.5 rounded-full transition-all"
                    style={{ color: "#E2724A", border: "1px solid rgba(226,114,74,0.3)" }}
                  >
                    إلغاء تفعيل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
