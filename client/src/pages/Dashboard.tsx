/*
 * mousa.ai — Real User Dashboard
 * Connected to live user data via tRPC
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useState as useStateForm } from "react";
import PlatformIntroPopup from "@/components/PlatformIntroPopup";
import WelcomeCreditsBanner from "@/components/WelcomeCreditsBanner";
import InsufficientBalanceDialog from "@/components/InsufficientBalanceDialog";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import {
  Zap, Home as HomeIcon, Shield, Thermometer, Building2, BookOpen, Sparkles,
  TrendingDown, TrendingUp, BarChart3, User, ChevronRight, Plus, Clock, LogOut, CreditCard,
  RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink, RotateCcw, Send, PlayCircle, Loader2,
} from "lucide-react";

const PLATFORMS = [
  { id: "fada", nameKey: "fada", taglineKey: "fada", href: "https://fada.mousa.ai/", icon: HomeIcon, cost: 20, color: "#d4a017", bg: "rgba(212,160,23,0.08)" },
  { id: "raqaba", nameKey: "raqaba", taglineKey: "raqaba", href: "https://raqaba.mousa.ai/", icon: Shield, cost: 30, color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  { id: "harara", nameKey: "harara", taglineKey: "harara", href: "https://harara.mousa.ai/", icon: Thermometer, cost: 35, color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  { id: "maskan", nameKey: "maskan", taglineKey: "maskan", href: "https://maskan.mousa.ai/", icon: Building2, cost: 15, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  { id: "code", nameKey: "code", taglineKey: "code", href: "https://code.mousa.ai/", icon: BookOpen, cost: 10, color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
  { id: "tashkila", nameKey: "khayal", taglineKey: "khayal", href: "https://khayal.mousa.ai/", icon: Sparkles, cost: 25, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
];

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"subscription" | "overview" | "history" | "sessions" | "payments" | "refunds">("overview");
  const [refundReason, setRefundReason] = useStateForm("");
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useStateForm<{ id: number; stripePaymentIntentId?: string; amountCents: number; creditsGranted: number } | null>(null);

  const utils = trpc.useUtils();

  // Token generation mutation for platform handoff
  const generateTokenMutation = trpc.platform.generateToken.useMutation();
  const [openingPlatform, setOpeningPlatform] = useState<string | null>(null);

  const VALID_PLATFORMS_DASH = ["fada", "raqaba", "harara", "maskan", "code", "khayal"] as const;
  type ValidPlatformDash = typeof VALID_PLATFORMS_DASH[number];

  // Video-only popup state: watch video without opening platform
  const [videoOnlyPopup, setVideoOnlyPopup] = useState<{ platform: string; url: string } | null>(null);
  const [insufficientDialog, setInsufficientDialog] = useState<{
    platformName: string;
    platformNameEn: string;
    platformCost: number;
    currentBalance: number;
  } | null>(null);

  const isArabic = i18n.language?.startsWith("ar") ||
    localStorage.getItem("mousa_lang")?.startsWith("ar") ||
    document.documentElement.dir === "rtl";

  const { data: wallet, isLoading: walletLoading } = trpc.credits.getBalance.useQuery(undefined, { enabled: isAuthenticated });

  // جلب التكاليف الديناميكية من DB (تتحدث تلقائياً عند تغيير جدول الأسعار)
  const { data: platformCostsData } = trpc.pricing.getPublicCosts.useQuery();
  const getMinCostDash = (platformId: string): number => {
    const id = platformId === "tashkila" ? "khayal" : platformId;
    return platformCostsData?.[id]?.minCost ?? PLATFORMS.find(p => p.id === platformId)?.cost ?? 5;
  };

  async function handlePlatformClick(e: React.MouseEvent, platformId: string) {
    e.preventDefault();
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (!platform) return;
    // فتح صفحة /redirect?platform=X — تعمل على جميع المتصفحات بما فيها Safari iOS
    // الصفحة الوسيطة تحصل على token وتُحوّل المستخدم للمنصة تلقائياً
    const tokenPlatformId = platformId === "tashkila" ? "khayal" : platformId;
    const isValidPlatform = (VALID_PLATFORMS_DASH as readonly string[]).includes(tokenPlatformId);
    if (isValidPlatform) {
      window.open(`/redirect?platform=${tokenPlatformId}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(platform.href, "_blank", "noopener,noreferrer");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const credits = params.get("credits");
    if (payment === "success" && credits) {
      toast.success(`✅ ${Number(credits).toLocaleString()} ${t("dashboard.credit")} ${t("dashboard.creditAvailable")}`);
      window.history.replaceState({}, "", "/dashboard");
      setTimeout(() => utils.credits.getBalance.invalidate(), 1500);
    }
  }, []);

  const { data: history, isLoading: historyLoading } = trpc.credits.getHistory.useQuery({ limit: 30 }, { enabled: isAuthenticated && activeTab === "history" });
  const { data: sessions, isLoading: sessionsLoading } = trpc.sessions.list.useQuery({ limit: 20 }, { enabled: isAuthenticated });
  const { data: paymentHistory, isLoading: paymentsLoading } = trpc.payments.getHistory.useQuery({ limit: 20 }, { enabled: isAuthenticated && activeTab === "payments" });
  const { data: mySubscription, isLoading: subLoading, refetch: refetchSub } = trpc.subscriptions.getMy.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myRefundRequests, isLoading: refundsLoading, refetch: refetchRefunds } = trpc.refunds.getMyRequests.useQuery(undefined, { enabled: isAuthenticated && activeTab === "refunds" });

  const submitRefund = trpc.refunds.submitRequest.useMutation({
    onSuccess: () => {
      toast.success(t("dashboard.sendRefundRequest") + " ✅");
      setRefundReason("");
      setSelectedPaymentForRefund(null);
      refetchRefunds();
    },
    onError: (err) => toast.error(err.message),
  });

  // Session credit refund state
  const [sessionRefundDialog, setSessionRefundDialog] = useState<{ sessionId: number; sessionTitle: string; creditsUsed: number; platform: string } | null>(null);
  const [sessionRefundReason, setSessionRefundReason] = useState("");
  const { data: mySessionRefunds, refetch: refetchSessionRefunds } = trpc.sessions.myRefunds.useQuery(undefined, { enabled: isAuthenticated && activeTab === "sessions" });
  const requestSessionRefund = trpc.sessions.requestRefund.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم طلب الاسترداد — سيتم مراجعته خلال 24 ساعة ✅");
      setSessionRefundDialog(null);
      setSessionRefundReason("");
      refetchSessionRefunds();
    },
    onError: (err) => toast.error(err.message),
  });

  const managePortal = trpc.subscriptions.managePortal.useMutation({
    onSuccess: (data) => {
      toast.success(t("dashboard.manageSub") + "...");
      window.location.href = data.portalUrl;
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4" style={{ borderColor: "rgba(212,160,23,0.3)", borderTopColor: "#d4a017" }} />
          <p className="text-steel">{t("dashboard.verifyingIdentity")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="glass-card p-10 text-center max-w-sm mx-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.2)" }}>
            <User size={28} className="text-gold" />
          </div>
          <h2 className="text-platinum font-bold text-xl mb-2">{t("dashboard.loginRequired")}</h2>
          <p className="text-steel mb-6 text-sm leading-relaxed">{t("dashboard.loginRequiredDesc")}</p>
          <a href={getLoginUrl()} className="btn-gold w-full justify-center block">{t("dashboard.login")}</a>
        </div>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const totalEarned = wallet?.totalEarned ?? 0;
  const totalSpent = wallet?.totalSpent ?? 0;
  const recentSessions = sessions?.slice(0, 5) ?? [];
  const platformUsage = sessions?.reduce((acc, s) => { acc[s.platform] = (acc[s.platform] ?? 0) + 1; return acc; }, {} as Record<string, number>) ?? {};
  const mostUsed = Object.entries(platformUsage).sort((a, b) => b[1] - a[1])[0];

  const tabLabels: Record<string, string> = {
    subscription: `⭐ ${t("dashboard.monthlySubscription")}`,
    overview: t("dashboard.overview"),
    history: t("dashboard.transactionHistory"),
    sessions: t("dashboard.allSessions"),
    payments: t("dashboard.paymentHistory"),
    refunds: t("dashboard.refundRequests"),
  };

  const txLabels: Record<string, string> = {
    welcome_bonus: t("dashboard.txLabels.welcome_bonus"),
    purchase: t("dashboard.txLabels.purchase"),
    usage: t("dashboard.txLabels.usage"),
    admin_grant: t("dashboard.txLabels.admin_grant"),
    admin_deduct: t("dashboard.txLabels.admin_deduct"),
    refund: t("dashboard.txLabels.refund"),
  };

  const statusLabels: Record<string, string> = {
    pending: t("dashboard.statusLabels.pending"),
    approved: t("dashboard.statusLabels.approved"),
    rejected: t("dashboard.statusLabels.rejected"),
    refunded: t("dashboard.statusLabels.refunded"),
  };

  return (
    <div className="min-h-screen" dir={isArabic ? "rtl" : "ltr"} style={{ background: "#080E1A" }}>
      {/* Video-only popup */}
      {videoOnlyPopup && (
        <PlatformIntroPopup
          platform={videoOnlyPopup.platform}
          targetUrl=""
          videoOnly
          onClose={() => setVideoOnlyPopup(null)}
        />
      )}

      {/* Insufficient balance dialog */}
      {insufficientDialog && (
        <InsufficientBalanceDialog
          platformName={insufficientDialog.platformName}
          platformNameEn={insufficientDialog.platformNameEn}
          platformCost={insufficientDialog.platformCost}
          currentBalance={insufficientDialog.currentBalance}
          onClose={() => setInsufficientDialog(null)}
        />
      )}

      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,14,26,0.95)", borderColor: "rgba(212,160,23,0.08)", backdropFilter: "blur(12px)" }}>
        <div className="container flex items-center justify-between h-16">
          <Link href="/"><span className="text-gold font-bold text-lg tracking-tight cursor-pointer">mousa.ai</span></Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("subscription")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                background: mySubscription?.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(212,160,23,0.08)",
                border: mySubscription?.status === "active" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(212,160,23,0.2)",
                color: mySubscription?.status === "active" ? "#22c55e" : "#d4a017",
              }}
            >
              <CreditCard size={13} />
              <span className="text-xs font-semibold">
                {subLoading ? "..." : mySubscription?.status === "active" ? mySubscription.planNameAr : t("dashboard.noSubscription")}
              </span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.2)" }}>
              <Zap size={13} className="text-gold" />
              <span className="text-gold font-bold text-sm">{walletLoading ? "..." : balance.toLocaleString()}</span>
              <span className="text-steel text-xs">{t("dashboard.credit")}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(212,160,23,0.2)", color: "#d4a017" }}>{user.name?.charAt(0) ?? "م"}</div>
              <span className="text-platinum text-sm">{user.name ?? t("dashboard.login")}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-lg transition-colors hover:bg-white/5"><LogOut size={16} className="text-steel" /></button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <WelcomeCreditsBanner userName={user.name?.split(" ")[0]} />

        <OnboardingChecklist
          hasUsedPlatform={(sessions?.length ?? 0) > 0}
          hasSubscription={mySubscription?.status === "active"}
          sessionCount={sessions?.length ?? 0}
        />

        <div className="mb-8">
          <h1 className="text-platinum font-bold mb-1" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>{t("dashboard.welcome")}، {user.name?.split(" ")[0] ?? t("dashboard.login")} 👋</h1>
          <p className="text-steel text-sm">mousa.ai</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 sm:col-span-2 lg:col-span-1" style={{ borderColor: "rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.04)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,160,23,0.15)" }}><Zap size={15} className="text-gold" /></div>
              <span className="text-steel text-xs">{t("dashboard.currentBalance")}</span>
            </div>
            <div className="stat-num" style={{ fontSize: "2rem" }}>{walletLoading ? "..." : balance.toLocaleString()}</div>
            <div className="text-steel text-xs mt-1">{t("dashboard.creditAvailable")}</div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}><TrendingUp size={15} style={{ color: "#22c55e" }} /></div>
              <span className="text-steel text-xs">{t("dashboard.totalEarned")}</span>
            </div>
            <div className="text-platinum font-bold text-xl">{walletLoading ? "..." : totalEarned.toLocaleString()}</div>
            <div className="text-steel text-xs mt-1">{t("dashboard.credit")}</div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}><TrendingDown size={15} style={{ color: "#ef4444" }} /></div>
              <span className="text-steel text-xs">{t("dashboard.totalSpent")}</span>
            </div>
            <div className="text-platinum font-bold text-xl">{walletLoading ? "..." : totalSpent.toLocaleString()}</div>
            <div className="text-steel text-xs mt-1">{t("dashboard.credit")}</div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)" }}><BarChart3 size={15} style={{ color: "#a855f7" }} /></div>
              <span className="text-steel text-xs">{t("dashboard.sessions")}</span>
            </div>
            <div className="text-platinum font-bold text-xl">{sessionsLoading ? "..." : (sessions?.length ?? 0)}</div>
            <div className="text-steel text-xs mt-1">
              {mostUsed
                ? `${t("dashboard.mostUsed")}: ${t(`dashboard.platformNames.${mostUsed[0]}`, mostUsed[0])}`
                : t("dashboard.noSessions")}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-platinum font-bold text-lg">{t("dashboard.sixPlatforms")}</h2>
            <span className="text-steel text-xs">{t("dashboard.choosePlatform")}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const usageCount = platformUsage[p.id] ?? 0;
              const dynamicMinCost = getMinCostDash(p.id);
              const canAfford = balance >= dynamicMinCost;
              const platformName = t(`dashboard.platformNames.${p.nameKey}`, p.nameKey);
              const platformTagline = t(`platforms.${p.nameKey}.tagline`, p.nameKey);
              return (
                <a
                  key={p.id}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                  onClick={(e) => handlePlatformClick(e, p.id)}
                  data-mousa={p.id}
                  data-mousa-platform={p.id}
                >
                  <div className="glass-card p-4 cursor-pointer transition-all hover:scale-[1.02] text-center" style={{ opacity: canAfford ? 1 : 0.6 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: p.bg, border: `1px solid ${p.color}22` }}>
                      <Icon size={18} style={{ color: p.color }} />
                    </div>
                    <div className="text-platinum font-bold text-sm mb-0.5">{platformName}</div>
                    <div className="text-steel text-xs mb-2">{platformTagline}</div>
                    <div className="flex items-center justify-center gap-1">
                      <Zap size={10} className="text-gold" />
                      <span className="text-gold text-xs font-semibold">
                        {platformCostsData?.[p.id === "tashkila" ? "khayal" : p.id]
                          ? `${platformCostsData[p.id === "tashkila" ? "khayal" : p.id].minCost}–${platformCostsData[p.id === "tashkila" ? "khayal" : p.id].maxCost}`
                          : p.cost
                        }
                      </span>
                    </div>
                    {usageCount > 0 && <div className="mt-2 text-xs" style={{ color: p.color, opacity: 0.7 }}>{usageCount} {t("dashboard.sessionCount")}</div>}
                    {!canAfford && <div className="mt-2 text-xs text-red-400 opacity-70">{t("dashboard.insufficientBalance")}</div>}
                    {openingPlatform === p.id && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color: p.color }}>
                        <Loader2 size={11} className="animate-spin" />
                        {isArabic ? "جارٍ الفتح..." : "Opening..."}
                      </div>
                    )}
                    {/* Watch video button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVideoOnlyPopup({ platform: p.id, url: p.href });
                      }}
                      className="mt-2 flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg transition-all hover:opacity-80 active:scale-95"
                      style={{
                        background: "rgba(212,160,23,0.07)",
                        border: "1px solid rgba(212,160,23,0.18)",
                        color: "rgba(212,160,23,0.75)",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                      }}
                    >
                      <PlayCircle size={11} />
                      {isArabic ? "الفيديو" : "Video"}
                    </button>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex border-b overflow-x-auto scrollbar-none" style={{ borderColor: "rgba(212,160,23,0.08)", WebkitOverflowScrolling: "touch" }}>
            {(["subscription", "overview", "history", "sessions", "payments", "refunds"] as const).map((id) => (
              <button key={id} onClick={() => setActiveTab(id)} className="px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                style={{ color: activeTab === id ? "#d4a017" : "rgba(255,255,255,0.4)", borderBottom: activeTab === id ? "2px solid #d4a017" : "2px solid transparent", background: "transparent" }}>
                {tabLabels[id]}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="p-6">
              <div
                className="flex items-center justify-between p-4 rounded-xl mb-6 cursor-pointer transition-all hover:opacity-90"
                style={{
                  background: mySubscription?.status === "active" ? "rgba(34,197,94,0.06)" : "rgba(212,160,23,0.05)",
                  border: mySubscription?.status === "active" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(212,160,23,0.2)",
                }}
                onClick={() => setActiveTab("subscription")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: mySubscription?.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(212,160,23,0.1)" }}>
                    <CreditCard size={16} style={{ color: mySubscription?.status === "active" ? "#22c55e" : "#d4a017" }} />
                  </div>
                  <div>
                    <div className="text-platinum text-sm font-semibold">
                      {subLoading ? t("common.loading") : mySubscription?.status === "active"
                        ? mySubscription.planNameAr
                        : t("dashboard.noActiveSubscription")}
                    </div>
                    <div className="text-steel text-xs mt-0.5">
                      {mySubscription?.status === "active"
                        ? `${t("dashboard.autoRenewal")}: ${new Date(mySubscription.currentPeriodEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                        : t("dashboard.subscribeForMonthly")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mySubscription?.status === "active" ? (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>{t("dashboard.active")}</span>
                  ) : (
                    <Link href="/pricing">
                      <span className="text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer"
                        style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                        onClick={(e) => e.stopPropagation()}>
                        {t("dashboard.subscribeNow")}
                      </span>
                    </Link>
                  )}
                  <ChevronRight size={14} className="text-steel" style={{ transform: "rotate(180deg)" }} />
                </div>
              </div>

              <h3 className="text-platinum font-semibold mb-4">{t("dashboard.recentSessions")}</h3>
              {sessionsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.1)" }}><Plus size={24} className="text-gold opacity-50" /></div>
                  <p className="text-steel mb-2">{t("dashboard.noSessions")}</p>
                  <p className="text-steel text-xs">{t("dashboard.choosePlatform")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session) => {
                    const platform = PLATFORMS.find(p => p.id === session.platform);
                    const Icon = platform?.icon ?? HomeIcon;
                    return (
                      <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: platform?.bg ?? "rgba(212,160,23,0.08)" }}><Icon size={15} style={{ color: platform?.color ?? "#d4a017" }} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-platinum text-sm font-medium truncate">{session.title ?? t("dashboard.sessionWithoutTitle")}</div>
                          <div className="text-steel text-xs">
                            {platform ? t(`dashboard.platformNames.${platform.nameKey}`, platform.nameKey) : session.platform}
                            {" · "}{new Date(session.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0"><Zap size={11} className="text-gold" /><span className="text-gold text-xs">{session.creditsUsed}</span></div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === "completed" ? "bg-green-400" : session.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(212,160,23,0.08)" }}>
                <h3 className="text-platinum font-semibold mb-3">{t("dashboard.quickActions")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/pricing">
                    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ border: "1px solid rgba(212,160,23,0.15)", background: "rgba(212,160,23,0.04)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)" }}><Plus size={16} className="text-gold" /></div>
                      <div><div className="text-platinum text-sm font-medium">{t("dashboard.buyCredit")}</div><div className="text-steel text-xs">{t("dashboard.topUpBalance")}</div></div>
                      <ChevronRight size={14} className="text-steel mr-auto" style={{ transform: "rotate(180deg)" }} />
                    </div>
                  </Link>
                  <a href="https://fada.mousa.ai/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,160,23,0.08)" }}><HomeIcon size={16} className="text-gold" /></div>
                      <div>
                        <div className="text-platinum text-sm font-medium">{t("dashboard.platformNames.fada")}</div>
                        <div className="text-steel text-xs">{t("platforms.fada.tagline")}</div>
                      </div>
                      <ChevronRight size={14} className="text-steel mr-auto" style={{ transform: "rotate(180deg)" }} />
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-6">
              <h3 className="text-platinum font-semibold mb-4">{t("dashboard.transactionHistory")}</h3>
              {historyLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-12"><Clock size={32} className="text-steel mx-auto mb-3 opacity-40" /><p className="text-steel">{t("dashboard.noTransactions")}</p></div>
              ) : (
                <div className="space-y-2">
                  {history.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isPositive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                          {isPositive ? <TrendingUp size={15} style={{ color: "#22c55e" }} /> : <TrendingDown size={15} style={{ color: "#ef4444" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-platinum text-sm font-medium">
                            {txLabels[tx.type] ?? tx.type}
                            {tx.platform && ` — ${t(`dashboard.platformNames.${tx.platform}`, tx.platform)}`}
                          </div>
                          <div className="text-steel text-xs">{new Date(tx.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm" style={{ color: isPositive ? "#22c55e" : "#ef4444" }}>{isPositive ? "+" : ""}{tx.amount.toLocaleString()}</div>
                          <div className="text-steel text-xs">{tx.balanceAfter.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="p-6">
              <h3 className="text-platinum font-semibold mb-4">{t("dashboard.paymentHistory")}</h3>
              {paymentsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !paymentHistory || paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard size={32} className="text-steel mx-auto mb-3 opacity-40" />
                  <p className="text-steel mb-2">{t("dashboard.noPayments")}</p>
                  <p className="text-steel text-xs mb-4">{t("dashboard.buyFromPricing")}</p>
                  <Link href="/pricing"><span className="btn-gold cursor-pointer">{t("dashboard.buyCredit")}</span></Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: p.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                        <CreditCard size={15} style={{ color: p.status === "completed" ? "#22c55e" : "#ef4444" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-platinum text-sm font-medium">{p.packageId}</div>
                        <div className="text-steel text-xs">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 justify-end"><Zap size={11} className="text-gold" /><span className="text-gold text-sm font-bold">{p.creditsGranted.toLocaleString()}</span></div>
                        <div className="text-platinum text-xs font-semibold">${(p.amountCents / 100).toFixed(2)}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{
                        background: p.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: p.status === "completed" ? "#22c55e" : "#ef4444",
                        border: `1px solid ${p.status === "completed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
                      }}>
                        {p.status === "completed" ? t("dashboard.paymentStatus.completed") : p.status === "pending" ? t("dashboard.paymentStatus.pending") : t("dashboard.paymentStatus.failed")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="p-6">
              <h3 className="text-platinum font-semibold mb-4">{t("dashboard.monthlySubscription")}</h3>
              {subLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !mySubscription ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.1)" }}>
                    <CreditCard size={28} className="text-gold opacity-50" />
                  </div>
                  <p className="text-platinum font-semibold mb-2">{t("dashboard.noActiveSubscription")}</p>
                  <p className="text-steel text-sm mb-6">{t("dashboard.subscribeForMonthly")}</p>
                  <Link href="/pricing"><span className="btn-gold cursor-pointer">{t("dashboard.viewPackages")}</span></Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl p-5" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-gold font-bold text-lg">{mySubscription.planNameAr}</div>
                        <div className="text-steel text-sm mt-1">{mySubscription.creditsPerMonth.toLocaleString()} {t("dashboard.credit")} / {t("dashboard.cycleStart")}</div>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{
                        background: mySubscription.status === "active" ? "rgba(34,197,94,0.1)" : mySubscription.status === "past_due" ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)",
                        color: mySubscription.status === "active" ? "#22c55e" : mySubscription.status === "past_due" ? "#ef4444" : "#a78bfa",
                        border: `1px solid ${mySubscription.status === "active" ? "rgba(34,197,94,0.2)" : mySubscription.status === "past_due" ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.2)"}`
                      }}>
                        {mySubscription.status === "active" ? (<><CheckCircle size={11} /> {t("dashboard.subStatus.active")}</>) :
                         mySubscription.status === "past_due" ? (<><AlertCircle size={11} /> {t("dashboard.subStatus.past_due")}</>) :
                         mySubscription.status === "trialing" ? (<><RefreshCw size={11} /> {t("dashboard.subStatus.trialing")}</>) :
                         (<><XCircle size={11} /> {t("dashboard.subStatus.canceled")}</>)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-steel text-xs mb-1">{t("dashboard.cycleStart")}</div>
                        <div className="text-platinum text-sm font-semibold">{new Date(mySubscription.currentPeriodStart).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-steel text-xs mb-1">{t("dashboard.autoRenewal")}</div>
                        <div className="text-platinum text-sm font-semibold">{new Date(mySubscription.currentPeriodEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                    </div>

                    {mySubscription.cancelAtPeriodEnd ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <AlertCircle size={14} style={{ color: "#ef4444" }} />
                        <span className="text-sm" style={{ color: "#ef4444" }}>
                          {t("dashboard.cancelWarning")} {new Date(mySubscription.currentPeriodEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} — {t("dashboard.cancelNote")}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        onClick={() => managePortal.mutate({ origin: window.location.origin })}
                        disabled={managePortal.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                      >
                        {managePortal.isPending ? <RefreshCw size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                        {t("dashboard.manageSub")}
                      </button>
                      <button
                        onClick={() => refetchSub()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8A9BB0" }}
                      >
                        <RefreshCw size={13} />
                        {t("dashboard.refresh")}
                      </button>
                    </div>
                  </div>

                  {mySubscription.status === "active" && (
                    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Zap size={16} className="text-gold flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-platinum text-sm font-medium">{t("dashboard.wantMoreCredits")}</div>
                        <div className="text-steel text-xs">{t("dashboard.buyExtraCredits")}</div>
                      </div>
                      <Link href="/pricing"><span className="text-gold text-xs font-semibold cursor-pointer hover:underline">{t("dashboard.buyCreditsLink")} ←</span></Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "refunds" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-platinum font-semibold">{t("dashboard.refundRequests")}</h3>
                <button onClick={() => refetchRefunds()} className="flex items-center gap-1.5 text-xs text-steel hover:text-platinum transition-colors">
                  <RefreshCw size={12} /> {t("dashboard.refresh")}
                </button>
              </div>

              <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-platinum text-sm font-semibold mb-1">{t("dashboard.refundPolicy")}</div>
                    <p className="text-steel text-xs leading-relaxed">{t("dashboard.refundPolicyText")}</p>
                  </div>
                </div>
              </div>

              {paymentHistory && paymentHistory.filter(p => p.status === "completed").length > 0 && (
                <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h4 className="text-platinum font-semibold text-sm mb-4">{t("dashboard.newRefundRequest")}</h4>

                  <div className="mb-4">
                    <label className="text-steel text-xs mb-2 block">{t("dashboard.choosePayment")}</label>
                    <div className="space-y-2">
                      {paymentHistory.filter(p => p.status === "completed").map(p => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPaymentForRefund(
                            selectedPaymentForRefund?.id === p.id ? null :
                            { id: p.id, stripePaymentIntentId: p.stripePaymentIntentId ?? undefined, amountCents: p.amountCents, creditsGranted: p.creditsGranted }
                          )}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{
                            border: selectedPaymentForRefund?.id === p.id ? "1px solid rgba(212,160,23,0.4)" : "1px solid rgba(255,255,255,0.05)",
                            background: selectedPaymentForRefund?.id === p.id ? "rgba(212,160,23,0.06)" : "transparent",
                          }}
                        >
                          <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                            style={{ borderColor: selectedPaymentForRefund?.id === p.id ? "#d4a017" : "rgba(255,255,255,0.2)" }}>
                            {selectedPaymentForRefund?.id === p.id && <div className="w-2 h-2 rounded-full" style={{ background: "#d4a017" }} />}
                          </div>
                          <div className="flex-1">
                            <div className="text-platinum text-sm">{p.packageId} — {p.creditsGranted.toLocaleString()} {t("dashboard.credit")}</div>
                            <div className="text-steel text-xs">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${(p.amountCents / 100).toFixed(2)}</div>
                          </div>
                          <div className="text-gold text-sm font-bold">${(p.amountCents / 100).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-steel text-xs mb-2 block">{t("dashboard.refundReason")} <span className="text-red-400">*</span></label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder={t("dashboard.refundReasonPlaceholder")}
                      rows={3}
                      className="w-full rounded-xl p-3 text-sm resize-none outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#E2E8F0",
                      }}
                    />
                    <div className="text-steel text-xs mt-1">{refundReason.length}/1000</div>
                  </div>

                  <button
                    disabled={!selectedPaymentForRefund || refundReason.length < 10 || submitRefund.isPending}
                    onClick={() => {
                      if (!selectedPaymentForRefund) return;
                      submitRefund.mutate({
                        paymentId: selectedPaymentForRefund.id,
                        stripePaymentIntentId: selectedPaymentForRefund.stripePaymentIntentId,
                        amountCents: selectedPaymentForRefund.amountCents,
                        creditsToDeduct: selectedPaymentForRefund.creditsGranted,
                        reason: refundReason,
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                  >
                    {submitRefund.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    {t("dashboard.sendRefundRequest")}
                  </button>
                </div>
              )}

              <h4 className="text-platinum font-semibold text-sm mb-3">{t("dashboard.myPreviousRequests")}</h4>
              {refundsLoading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !myRefundRequests || myRefundRequests.length === 0 ? (
                <div className="text-center py-8">
                  <RotateCcw size={28} className="text-steel mx-auto mb-3 opacity-40" />
                  <p className="text-steel text-sm">{t("dashboard.noRefundRequests")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRefundRequests.map((req) => (
                    <div key={req.id} className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-platinum text-sm font-medium">{t("dashboard.refundRequest")} #{req.id}</div>
                          <div className="text-steel text-xs mt-0.5">{new Date(req.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${(req.amountCents / 100).toFixed(2)}</div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                          background: req.status === "refunded" ? "rgba(34,197,94,0.1)" : req.status === "rejected" ? "rgba(239,68,68,0.1)" : req.status === "approved" ? "rgba(59,130,246,0.1)" : "rgba(212,160,23,0.1)",
                          color: req.status === "refunded" ? "#22c55e" : req.status === "rejected" ? "#ef4444" : req.status === "approved" ? "#60a5fa" : "#d4a017",
                          border: `1px solid ${req.status === "refunded" ? "rgba(34,197,94,0.2)" : req.status === "rejected" ? "rgba(239,68,68,0.2)" : req.status === "approved" ? "rgba(59,130,246,0.2)" : "rgba(212,160,23,0.2)"}`
                        }}>
                          {statusLabels[req.status] ?? req.status}
                        </span>
                      </div>
                      <p className="text-steel text-xs leading-relaxed line-clamp-2">{req.reason}</p>
                      {req.adminNote && (
                        <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "#8A9BB0" }}>
                          {t("dashboard.adminNote")}: {req.adminNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="p-6">
              {/* Session Refund Dialog */}
              {sessionRefundDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.1)" }}>
                        <RotateCcw size={18} className="text-gold" />
                      </div>
                      <div>
                        <div className="text-platinum font-bold">طلب استرداد كريدت</div>
                        <div className="text-steel text-xs">{sessionRefundDialog.sessionTitle} — <span className="text-gold">{sessionRefundDialog.creditsUsed} كريدت</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
                      <p className="text-steel text-xs leading-relaxed">يمكنك طلب استرداد الكريدت إذا لم تستفد من هذه الجلسة. سيتم مراجعة طلبك خلال 24 ساعة. مدة الطلب المتاحة: 72 ساعة من إنشاء الجلسة.</p>
                    </div>
                    <div className="mb-4">
                      <label className="text-steel text-xs mb-2 block">سبب طلب الاسترداد <span className="text-red-400">*</span></label>
                      <textarea
                        value={sessionRefundReason}
                        onChange={e => setSessionRefundReason(e.target.value)}
                        placeholder="اشرح لماذا لم تستفد من هذه الجلسة..."
                        rows={3}
                        className="w-full rounded-xl p-3 text-sm text-platinum resize-none outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <div className="text-steel text-xs mt-1">{sessionRefundReason.length}/500 حرف (الحد الأدنى 10)</div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => requestSessionRefund.mutate({ sessionId: sessionRefundDialog.sessionId, reason: sessionRefundReason })}
                        disabled={sessionRefundReason.length < 10 || requestSessionRefund.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                      >
                        {requestSessionRefund.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        إرسال الطلب
                      </button>
                      <button
                        onClick={() => { setSessionRefundDialog(null); setSessionRefundReason(""); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8A9BB0" }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-platinum font-semibold">{t("dashboard.allSessions")}</h3>
                <div className="text-steel text-xs">يمكنك طلب استرداد الكريدت خلال 72 ساعة من الجلسة</div>
              </div>
              {sessionsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
              ) : !sessions || sessions.length === 0 ? (
                <div className="text-center py-12"><BarChart3 size={32} className="text-steel mx-auto mb-3 opacity-40" /><p className="text-steel mb-2">{t("dashboard.noSessions")}</p></div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const platform = PLATFORMS.find(p => p.id === session.platform);
                    const Icon = platform?.icon ?? HomeIcon;
                    const existingRefund = mySessionRefunds?.find(r => r.sessionId === session.id);
                    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
                    const canRefund = !existingRefund && (session.creditsUsed ?? 0) > 0 && sessionAge < 72 * 60 * 60 * 1000;
                    return (
                      <div key={session.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: platform?.bg ?? "rgba(212,160,23,0.08)" }}><Icon size={16} style={{ color: platform?.color ?? "#d4a017" }} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-platinum text-sm font-medium truncate">{session.title ?? t("dashboard.sessionWithoutTitle")}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-steel text-xs">{platform ? t(`dashboard.platformNames.${platform.nameKey}`, platform.nameKey) : session.platform}</span>
                            <span className="text-steel text-xs opacity-50">·</span>
                            <span className="text-steel text-xs">{new Date(session.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end"><Zap size={11} className="text-gold" /><span className="text-gold text-xs font-semibold">{session.creditsUsed}</span></div>
                            <div className={`text-xs mt-1 ${session.status === "completed" ? "text-green-400" : session.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
                              {session.status === "completed" ? t("dashboard.completed") : session.status === "failed" ? t("dashboard.failed") : t("dashboard.active")}
                            </div>
                          </div>
                          {existingRefund ? (
                            <span className="text-xs px-2 py-1 rounded-full" style={{
                              background: existingRefund.status === "approved" ? "rgba(34,197,94,0.1)" : existingRefund.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(212,160,23,0.1)",
                              color: existingRefund.status === "approved" ? "#22c55e" : existingRefund.status === "rejected" ? "#ef4444" : "#d4a017",
                              border: `1px solid ${existingRefund.status === "approved" ? "rgba(34,197,94,0.2)" : existingRefund.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(212,160,23,0.2)"}`
                            }}>
                              {existingRefund.status === "approved" ? "✅ مُسترد" : existingRefund.status === "rejected" ? "❌ مرفوض" : "⏳ قيد المراجعة"}
                            </span>
                          ) : canRefund ? (
                            <button
                              onClick={() => setSessionRefundDialog({ sessionId: session.id, sessionTitle: session.title ?? "جلسة", creditsUsed: session.creditsUsed ?? 0, platform: session.platform })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                              style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.2)", color: "#d4a017" }}
                            >
                              <RotateCcw size={11} />
                              استرداد
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Tools Section */}
        <div className="mt-8 mb-6">
          <h3 className="text-platinum font-semibold mb-4 text-sm" style={{ opacity: 0.7 }}>{t("dashboard.systemTools")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/digital-twin", icon: "🏗️", titleKey: "tools.digitalTwin", descKey: "tools.digitalTwinDesc" },
              { href: "/gigs", icon: "💼", titleKey: "tools.gigs", descKey: "tools.gigsDesc" },
              { href: "/corrections", icon: "✏️", titleKey: "tools.corrections", descKey: "tools.correctionsDesc" },
              { href: "/archive", icon: "📁", titleKey: "tools.archive", descKey: "tools.archiveDesc" },
            ].map(tool => (
              <Link key={tool.href} href={tool.href}>
                <div className="p-4 rounded-xl cursor-pointer transition-all hover:border-gold/30" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-2xl mb-2">{tool.icon}</div>
                  <div className="text-platinum text-sm font-semibold">{t(`dashboard.${tool.titleKey}`, tool.titleKey)}</div>
                  <div className="text-steel text-xs mt-0.5">{t(`dashboard.${tool.descKey}`, tool.descKey)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-steel text-xs leading-relaxed" style={{ maxWidth: "600px", margin: "0 auto" }}>
            {t("dashboard.aiDisclaimer")}
          </p>
        </div>
      </main>
    </div>
  );
}
