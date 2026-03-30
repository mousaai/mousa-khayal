/*
 * mousa.ai — Home Page v4.0
 * Design: Obsidian + Gold, IBM Plex Arabic, RTL-First
 * i18n: Full multi-language support (ar, en, ur, fr, hi)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DiamondHero from "@/components/DiamondHero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformIntroPopup from "@/components/PlatformIntroPopup";
import GuestTrialWidget from "@/components/GuestTrialWidget";
import InsufficientBalanceDialog from "@/components/InsufficientBalanceDialog";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  Building2,
  Thermometer,
  Home as HomeIcon,
  BookOpen,
  Zap,
  Shield,
  BarChart3,
  Star,
  Users,
  Clock,
  PlayCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const PLATFORM_IDS = ["fada", "raqaba", "harara", "maskan", "code", "khayal"] as const;

const PLATFORM_META: Record<string, { nameEn: string; img: string; credits: string; href: string; icon: any; color: string }> = {
  fada: {
    nameEn: "FADA",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-fada-v5-oBLwHF6AVy4AnByv8vacTD.webp",
    credits: "15–40",
    href: "https://fada.mousa.ai/",
    icon: HomeIcon,
    color: "from-amber-900/30 to-transparent",
  },
  raqaba: {
    nameEn: "RAQABA",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-raqaba-v4-A3SG5qghCFsoV3cSxGWNVq.webp",
    credits: "20–50",
    href: "https://raqaba.mousa.ai/",
    icon: Shield,
    color: "from-blue-900/30 to-transparent",
  },
  harara: {
    nameEn: "HARARA",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-harara-v4-CqyMWeKA2jiw37spnp7Coi.webp",
    credits: "25–60",
    href: "https://harara.mousa.ai/",
    icon: Thermometer,
    color: "from-orange-900/30 to-transparent",
  },
  maskan: {
    nameEn: "MASKAN",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-maskan-v4-J4Yjop7vyyrYgoGp3PPRnK.webp",
    credits: "10–30",
    href: "https://maskan.mousa.ai/",
    icon: Building2,
    color: "from-green-900/30 to-transparent",
  },
  code: {
    nameEn: "CODE",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-code-v5-5Nik9oy8MYQMCekzTu9z69.webp",
    credits: "5–15",
    href: "https://code.mousa.ai/",
    icon: BookOpen,
    color: "from-purple-900/30 to-transparent",
  },
  khayal: {
    nameEn: "KHAYAL",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-khayal-v1-Y6yamL9A8dfAh8NJLDQtf4.webp",
    credits: "20–60",
    href: "https://khayal.mousa.ai/",
    icon: Sparkles,
    color: "from-violet-900/30 to-transparent",
  },
};

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Auto-open platform after login: if URL has ?openPlatform=fada, redirect there
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const platformToOpen = params.get("openPlatform");
    if (platformToOpen && PLATFORM_META[platformToOpen]) {
      // Clean the URL first
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      // Open the platform in a new tab
      window.open(`/redirect?platform=${platformToOpen}`, "_blank", "noopener,noreferrer");
    }
  }, [isAuthenticated]);

  // Video-only popup state
  const [videoOnlyPopup, setVideoOnlyPopup] = useState<{ platform: string; url: string } | null>(null);
  // Guest trial state
  const [guestTrialPlatform, setGuestTrialPlatform] = useState<{ id: string; name: string } | null>(null);
  // Insufficient balance dialog state
  const [insufficientDialog, setInsufficientDialog] = useState<{
    platformName: string;
    platformNameEn: string;
    platformCost: number;
    currentBalance: number;
  } | null>(null);

  // Fetch user balance (only when authenticated)
  const { data: wallet } = trpc.credits.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const userBalance = wallet?.balance ?? 0;

  // جلب التكاليف الديناميكية من DB (تتحدث تلقائياً عند تغيير جدول الأسعار)
  const { data: platformCostsData } = trpc.pricing.getPublicCosts.useQuery();
  // القيم الاحتياطية إذا لم تنتهِ بعد جلب البيانات
  const PLATFORM_COSTS_FALLBACK: Record<string, number> = {
    fada: 5, raqaba: 5, harara: 5, maskan: 5, code: 3, tashkila: 5, khayal: 5,
  };
  // دالة للحصول على التكلفة الدنيا لمنصة معينة (minCost من DB)
  const getMinCost = (platformId: string): number => {
    const id = platformId === "tashkila" ? "khayal" : platformId;
    return platformCostsData?.[id]?.minCost ?? PLATFORM_COSTS_FALLBACK[platformId] ?? 5;
  };

  // Token generation mutation for platform handoff (so sub-platforms can authenticate the user)
  const generateTokenMutation = trpc.platform.generateToken.useMutation();
  const [openingPlatform, setOpeningPlatform] = useState<string | null>(null);

  const VALID_PLATFORMS = ["fada", "raqaba", "harara", "maskan", "code", "khayal"] as const;
  type ValidPlatform = typeof VALID_PLATFORMS[number];

  async function handlePlatformCardClick(e: React.MouseEvent, platformId: string, platformName: string, platformNameEn: string, directUrl: string) {
    e.preventDefault();
    if (!isAuthenticated) {
      // Show guest trial popup — login button inside will redirect to platform after auth
      setGuestTrialPlatform({ id: platformId, name: platformName });
    } else {
      // فتح صفحة /redirect?platform=X — تعمل على جميع المتصفحات بما فيها Safari iOS
      // الصفحة الوسيطة تحصل على token وتُحوّل المستخدم للمنصة تلقائياً
      const isValidPlatform = (VALID_PLATFORMS as readonly string[]).includes(platformId);
      if (isValidPlatform) {
        window.open(`/redirect?platform=${platformId}`, "_blank", "noopener,noreferrer");
      } else {
        window.open(directUrl, "_blank", "noopener,noreferrer");
      }
    }
  }

  const STATS = [
    { num: "6", label: t("stats.platforms") },
    { num: "700+", label: t("stats.codes") },
    { num: "200", label: t("stats.freeCredits") },
    { num: "24/7", label: t("stats.available") },
  ];

  const FEATURES = [
    { icon: Cpu, title: t("features.ai.title"), desc: t("features.ai.desc") },
    { icon: Zap, title: t("features.speed.title"), desc: t("features.speed.desc") },
    { icon: Shield, title: t("features.accuracy.title"), desc: t("features.accuracy.desc") },
    { icon: BarChart3, title: t("features.export.title"), desc: t("features.export.desc") },
  ];

  const HOW_STEPS = [
    { num: t("howItWorks.step1.num"), title: t("howItWorks.step1.title"), desc: t("howItWorks.step1.desc") },
    { num: t("howItWorks.step2.num"), title: t("howItWorks.step2.title"), desc: t("howItWorks.step2.desc") },
    { num: t("howItWorks.step3.num"), title: t("howItWorks.step3.title"), desc: t("howItWorks.step3.desc") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#080E1A" }}>
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

      {/* Guest trial modal */}
      {guestTrialPlatform && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(8,14,26,0.92)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setGuestTrialPlatform(null); }}
        >
          <div className="w-full max-w-2xl">
            <GuestTrialWidget
              platform={guestTrialPlatform.id as any}
              platformName={guestTrialPlatform.name}
              onClose={() => setGuestTrialPlatform(null)}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <Navbar />

      {/* ══════════════════════════════════════════
          PROMO BANNER (non-authenticated only)
      ══════════════════════════════════════════ */}
      {!isAuthenticated && (
        <div
          className="w-full py-2.5 px-4 flex flex-wrap items-center justify-center gap-3 text-xs"
          style={{ background: "linear-gradient(90deg, rgba(212,160,23,0.18), rgba(212,160,23,0.08), rgba(212,160,23,0.18))", borderBottom: "1px solid rgba(212,160,23,0.2)" }}
        >
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#D4A017" }}>
            <Sparkles size={13} />
            {t("hero.freeCredits")}
          </span>
          <span style={{ color: "rgba(212,160,23,0.4)" }}>|</span>
          <Link href="/pricing">
            <span className="underline cursor-pointer" style={{ color: "#B0C0D4" }}>{t("nav.pricing")}</span>
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DIAMOND HERO SECTION
      ══════════════════════════════════════════ */}
      <DiamondHero isAuthenticated={isAuthenticated} />

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="py-12" style={{ background: "rgba(13,27,42,0.6)", borderTop: "1px solid rgba(212,160,23,0.08)", borderBottom: "1px solid rgba(212,160,23,0.08)" }}>
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className={`stat-block anim-fade-up d-${(i + 1) * 100}`}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PLATFORMS SECTION
      ══════════════════════════════════════════ */}
      <section id="platforms" className="py-24 relative" style={{ scrollMarginTop: "2rem" }}>
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="container relative z-10">

          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="badge-mono mb-4 inline-flex">{t("platforms.sectionBadge")}</div>
            <h2 className="section-title mb-4">
              {t("platforms.sectionTitle")}{" "}
              <span className="text-gold-gradient">{t("platforms.sectionTitleHighlight")}</span>
            </h2>
            <p className="text-steel mx-auto" style={{ maxWidth: "520px", lineHeight: 1.75 }}>
              {t("platforms.sectionSubtitle")}
            </p>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_IDS.map((id, i) => {
              const meta = PLATFORM_META[id];
              const Icon = meta.icon;
              const name = t(`platforms.${id}.name` as any, { defaultValue: meta.nameEn });
              const tagline = t(`platforms.${id}.tagline` as any);
              const desc = t(`platforms.${id}.desc` as any);
              return (
                <a
                  key={id}
                  href={meta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                  onClick={(e) => handlePlatformCardClick(e, id, name, meta.nameEn, meta.href)}
                  data-mousa={id}
                  data-mousa-platform={id}
                >
                  <div className={`platform-card anim-fade-up d-${(i + 1) * 100}`}>
                    {/* Image */}
                    <div className="relative overflow-hidden" style={{ height: "220px" }}>
                      <img
                        src={meta.img}
                        alt={name}
                        className="platform-card-img"
                        loading={i < 2 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={i === 0 ? "high" : "low"}
                      />
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(180deg, transparent 30%, rgba(8,14,26,0.9) 100%)`
                      }} />
                      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-2">
                        <span className="text-gold" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.12em", opacity: 0.8 }}>
                          {meta.nameEn}
                        </span>
                        <span className="text-platinum font-bold" style={{ fontSize: "1.4rem", letterSpacing: "-0.02em" }}>
                          {name}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="platform-card-body">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="feature-icon-box" style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem" }}>
                          <Icon size={14} />
                        </div>
                        <span className="text-gold" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                          {tagline}
                        </span>
                      </div>
                      <p className="text-steel mb-4" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                        {desc}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="credit-chip">
                          <Zap size={11} />
                          {platformCostsData?.[id]
                            ? `${platformCostsData[id].minCost}–${platformCostsData[id].maxCost}`
                            : meta.credits
                          } {t("platforms.credits")}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Watch video button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setVideoOnlyPopup({ platform: id, url: meta.href });
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:opacity-80 active:scale-95"
                            style={{
                              background: "rgba(212,160,23,0.08)",
                              border: "1px solid rgba(212,160,23,0.2)",
                              color: "rgba(212,160,23,0.8)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                            title={t("chat.uploadImage")}
                          >
                            <PlayCircle size={13} />
                            {isRTL ? "الفيديو" : "Video"}
                          </button>
                          <span className="text-gold flex items-center gap-1" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                            {openingPlatform === id ? (
                              <><Loader2 size={14} className="animate-spin" /> {isRTL ? "جارٍ الفتح..." : "Opening..."}</>
                            ) : (
                              <>{t("platforms.startNow")}<ArrowIcon size={14} /></>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "rgba(13,27,42,0.4)" }}>
        <div className="container">
          <div className="text-center mb-14">
            <div className="badge-mono mb-4 inline-flex">{t("howItWorks.badge")}</div>
            <h2 className="section-title">
              {t("howItWorks.title")}{" "}
              <span className="text-gold-gradient">{t("howItWorks.titleHighlight")}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {HOW_STEPS.map((step, i) => (
              <div key={step.num} className={`text-center anim-fade-up d-${(i + 1) * 200}`}>
                <div className="step-circle mx-auto mb-4">{step.num}</div>
                <h3 className="text-platinum font-bold mb-2" style={{ fontSize: "1.1rem" }}>
                  {step.title}
                </h3>
                <p className="text-steel" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 relative">
        <div className="absolute inset-0 grid-bg opacity-15" />
        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Text */}
            <div>
              <div className="badge-mono mb-5 inline-flex">{t("features.badge")}</div>
              <h2 className="section-title mb-6">
                {t("features.title")}{" "}
                <br />
                <span className="text-gold-gradient">{t("features.titleHighlight")}</span>
              </h2>
              <p className="text-steel mb-8" style={{ lineHeight: 1.8 }}>
                {t("features.subtitle")}
              </p>
              <div className="space-y-3">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className={`feature-row anim-fade-up d-${(i + 1) * 100}`}>
                      <div className="feature-icon-box">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-platinum font-semibold mb-1" style={{ fontSize: "0.95rem" }}>
                          {f.title}
                        </div>
                        <div className="text-steel" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                          {f.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Card */}
            <div className="glass-card p-8 anim-fade-up d-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)" }}>
                  <Cpu size={20} className="text-gold" />
                </div>
                <div>
                  <div className="text-platinum font-bold">{t("chat.thinking")}</div>
                  <div className="text-steel" style={{ fontSize: "0.78rem" }}>AI</div>
                </div>
                <div className="mr-auto">
                  <span className="badge-mono" style={{ fontSize: "0.65rem" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    {t("common.loading").replace("...", "")}
                  </span>
                </div>
              </div>

              {[
                { label: t("platforms.fada.tagline"), val: t("common.view"), ok: true },
                { label: t("platforms.raqaba.tagline"), val: "4", ok: true },
                { label: t("platforms.harara.tagline"), val: "3", ok: true },
                { label: t("platforms.maskan.tagline"), val: t("common.view"), ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(212,160,23,0.07)" }}>
                  <span className="text-steel" style={{ fontSize: "0.875rem" }}>{item.label}</span>
                  <span className="flex items-center gap-1.5 text-gold" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    <CheckCircle2 size={13} className="text-green-400" />
                    {item.val}
                  </span>
                </div>
              ))}

              <div className="mt-6 p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Star size={14} className="text-gold" />
                  <span className="text-gold font-semibold" style={{ fontSize: "0.82rem" }}>{t("features.ai.title")}</span>
                </div>
                <p className="text-steel" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
                  {t("features.ai.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CREDIT SYSTEM SECTION
      ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "rgba(13,27,42,0.5)", borderTop: "1px solid rgba(212,160,23,0.07)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="badge-mono mb-4 inline-flex">{t("credits.badge")}</div>
            <h2 className="section-title mb-3">
              {t("credits.title")}{" "}
              <span className="text-gold-gradient">{t("credits.titleHighlight")}</span>
            </h2>
            <p className="text-steel" style={{ maxWidth: "480px", margin: "0 auto", lineHeight: 1.75 }}>
              {t("credits.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
            {[
              { plan: t("credits.free"), credits: "200", desc: t("credits.freeDesc"), highlight: false },
              { plan: t("pricing.packages.pro.name"), credits: "2,000", desc: t("pricing.packages.pro.hint"), highlight: true },
              { plan: t("pricing.packages.team.name"), credits: t("common.noData"), desc: t("pricing.packages.team.hint"), highlight: false },
            ].map((pkg) => (
              <div key={pkg.plan} className={`glass-card p-6 text-center ${pkg.highlight ? "border-gold/40" : ""}`}
                style={pkg.highlight ? { borderColor: "rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.05)" } : {}}>
                <div className="text-steel mb-1" style={{ fontSize: "0.8rem", letterSpacing: "0.08em" }}>{pkg.plan}</div>
                <div className="stat-num mb-2">{pkg.credits}</div>
                <div className="text-steel" style={{ fontSize: "0.8rem" }}>{pkg.desc}</div>
                {pkg.highlight && (
                  <div className="mt-3">
                    <span className="badge-mono" style={{ fontSize: "0.65rem" }}>{t("pricing.popular")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/pricing">
              <button className="btn-gold">
                {t("credits.buyNow")}
                <ArrowIcon size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS SECTION
      ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "rgba(13,27,42,0.5)", borderTop: "1px solid rgba(212,160,23,0.07)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="badge-mono mb-4 inline-flex">{t("testimonials.badge")}</div>
            <h2 className="section-title">{t("testimonials.title")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(["t1", "t2", "t3", "t4"] as const).map((key, i) => (
              <div
                key={key}
                className={`glass-card p-5 flex flex-col anim-fade-up d-${(i + 1) * 100}`}
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={12} fill="#D4A017" className="text-gold" />
                  ))}
                  <span className="mr-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,160,23,0.1)", color: "#D4A017" }}>
                    {t(`testimonials.${key}.platform` as any)}
                  </span>
                </div>
                <p className="text-steel flex-1 mb-4" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
                  "{t(`testimonials.${key}.text` as any)}"
                </p>
                <div>
                  <div className="font-semibold text-platinum text-sm">{t(`testimonials.${key}.name` as any)}</div>
                  <div className="text-xs text-steel">{t(`testimonials.${key}.role` as any)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%)",
          }} />
        </div>

        <div className="container relative z-10 text-center">
          <div className="badge-mono mb-6 inline-flex">
            <Users size={12} />
            {t("cta.badge")}
          </div>
          <h2 className="section-title mb-4" style={{ fontSize: "clamp(1.75rem, 5vw, 3.25rem)" }}>
            {t("cta.title")}{" "}
            <span className="text-gold-gradient">{t("cta.titleHighlight")}</span>
            <br />
            {t("cta.titleEnd")}
          </h2>
          <p className="text-steel mb-10 mx-auto" style={{ maxWidth: "500px", lineHeight: 1.8, fontSize: "1.05rem" }}>
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <button className="btn-gold w-full sm:w-auto justify-center" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>
                {t("cta.primary")}
                <ArrowIcon size={18} />
              </button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="btn-ghost w-full sm:w-auto justify-center" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>
                {t("cta.secondary")}
              </button>
            </Link>
          </div>
          <p className="text-steel mt-6" style={{ fontSize: "0.8rem" }}>
            <Clock size={12} className="inline ml-1 opacity-60" />
            {t("cta.noCard")}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
