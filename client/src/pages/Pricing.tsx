/*
 * Pricing — صفحة الأسعار والباقات
 * Design: Blueprint Intelligence | Obsidian #0D1B2A | Amber #D4A017 | RTL
 * Segments: أفراد / مهندسون مستقلون / مكاتب صغيرة / شركات كبيرة
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { CheckCircle, Coins, Zap, Star, ArrowLeft, Users, Building2, User, Briefcase, CreditCard, Loader2, ShieldCheck, Tag, Clock, Gift, CheckCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Pricing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  // Plans data using translations
  const plans = [
    {
      id: "free",
      name: t("pricing.plans.free.name"),
      nameEn: "FREE",
      segment: t("pricing.plans.free.segment"),
      segmentIcon: <User size={14} />,
      price: 0,
      period: t("pricing.plans.free.period"),
      credits: 200,
      color: "#8A9BB0",
      colorRgb: "138,155,176",
      features: [
        t("pricing.plans.free.features.0"),
        t("pricing.plans.free.features.1"),
        t("pricing.plans.free.features.2"),
        t("pricing.plans.free.features.3"),
      ],
      cta: t("pricing.plans.free.cta"),
      featured: false,
    },
    {
      id: "starter",
      name: t("pricing.plans.starter.name"),
      nameEn: "STARTER",
      segment: t("pricing.plans.starter.segment"),
      segmentIcon: <User size={14} />,
      price: 13.99,
      period: t("pricing.plans.starter.period"),
      currency: "$",
      credits: 600,
      color: "#4A9B7F",
      colorRgb: "74,155,127",
      features: [
        t("pricing.plans.starter.features.0"),
        t("pricing.plans.starter.features.1"),
        t("pricing.plans.starter.features.2"),
        t("pricing.plans.starter.features.3"),
        t("pricing.plans.starter.features.4"),
      ],
      cta: t("pricing.plans.starter.cta"),
      featured: false,
    },
    {
      id: "pro",
      name: t("pricing.plans.pro.name"),
      nameEn: "PRO",
      segment: t("pricing.plans.pro.segment"),
      segmentIcon: <Briefcase size={14} />,
      price: 39.99,
      period: t("pricing.plans.pro.period"),
      currency: "$",
      credits: 2000,
      color: "#D4A017",
      colorRgb: "212,160,23",
      features: [
        t("pricing.plans.pro.features.0"),
        t("pricing.plans.pro.features.1"),
        t("pricing.plans.pro.features.2"),
        t("pricing.plans.pro.features.3"),
        t("pricing.plans.pro.features.4"),
        t("pricing.plans.pro.features.5"),
        t("pricing.plans.pro.features.6"),
      ],
      cta: t("pricing.plans.pro.cta"),
      featured: true,
    },
    {
      id: "office",
      name: t("pricing.plans.office.name"),
      nameEn: "OFFICE",
      segment: t("pricing.plans.office.segment"),
      segmentIcon: <Building2 size={14} />,
      price: 94.99,
      period: t("pricing.plans.office.period"),
      currency: "$",
      credits: 6000,
      color: "#5B8DD9",
      colorRgb: "91,141,217",
      features: [
        t("pricing.plans.office.features.0"),
        t("pricing.plans.office.features.1"),
        t("pricing.plans.office.features.2"),
        t("pricing.plans.office.features.3"),
        t("pricing.plans.office.features.4"),
        t("pricing.plans.office.features.5"),
      ],
      cta: t("pricing.plans.office.cta"),
      featured: false,
    },
    {
      id: "enterprise",
      name: t("pricing.plans.enterprise.name"),
      nameEn: "ENTERPRISE",
      segment: t("pricing.plans.enterprise.segment"),
      segmentIcon: <Users size={14} />,
      price: 0,
      period: t("pricing.plans.enterprise.period"),
      credits: 0,
      color: "#9B7FE2",
      colorRgb: "155,127,226",
      features: [
        t("pricing.plans.enterprise.features.0"),
        t("pricing.plans.enterprise.features.1"),
        t("pricing.plans.enterprise.features.2"),
        t("pricing.plans.enterprise.features.3"),
        t("pricing.plans.enterprise.features.4"),
        t("pricing.plans.enterprise.features.5"),
        t("pricing.plans.enterprise.features.6"),
      ],
      cta: t("pricing.plans.enterprise.cta"),
      featured: false,
    },
  ];

  const creditPacks = [
    { id: "starter_500",  nameKey: "pricing.packs.starter",  credits: 500,   priceUsd: 9.99,   popular: false, badgeKey: null,                     hintKey: "pricing.packs.hints.starter" },
    { id: "pro_2000",     nameKey: "pricing.packs.pro",      credits: 2000,  priceUsd: 34.99,  popular: true,  badgeKey: "pricing.packs.badges.popular", hintKey: "pricing.packs.hints.pro" },
    { id: "studio_5000",  nameKey: "pricing.packs.studio",   credits: 5000,  priceUsd: 74.99,  popular: false, badgeKey: "pricing.packs.badges.value",   hintKey: "pricing.packs.hints.studio" },
    { id: "team_15000",   nameKey: "pricing.packs.team",     credits: 15000, priceUsd: 179.99, popular: false, badgeKey: "pricing.packs.badges.team",    hintKey: "pricing.packs.hints.team" },
  ];

  const platformCosts = [
    { platformKey: "pricing.platformCosts.fada.name",   icon: "🏛️", descKey: "pricing.platformCosts.fada.desc",   min: 15, max: 40,  color: "#D4A017" },
    { platformKey: "pricing.platformCosts.raqaba.name", icon: "🔍", descKey: "pricing.platformCosts.raqaba.desc", min: 20, max: 60,  color: "#4A9B7F" },
    { platformKey: "pricing.platformCosts.harara.name", icon: "🌡️", descKey: "pricing.platformCosts.harara.desc", min: 25, max: 80,  color: "#E2724A" },
    { platformKey: "pricing.platformCosts.maskan.name", icon: "🏠", descKey: "pricing.platformCosts.maskan.desc", min: 10, max: 30,  color: "#5B8DD9" },
    { platformKey: "pricing.platformCosts.code.name",   icon: "📋", descKey: "pricing.platformCosts.code.desc",   min: 5,  max: 20,  color: "#9B7FE2" },
  ];

  const testimonials = [
    { nameKey: "pricing.testimonials.0.name", roleKey: "pricing.testimonials.0.role", textKey: "pricing.testimonials.0.text", stars: 5 },
    { nameKey: "pricing.testimonials.1.name", roleKey: "pricing.testimonials.1.role", textKey: "pricing.testimonials.1.text", stars: 5 },
    { nameKey: "pricing.testimonials.2.name", roleKey: "pricing.testimonials.2.role", textKey: "pricing.testimonials.2.text", stars: 5 },
    { nameKey: "pricing.testimonials.3.name", roleKey: "pricing.testimonials.3.role", textKey: "pricing.testimonials.3.text", stars: 5 },
  ];

  // Urgency timer — countdown to midnight
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.floor((midnight.getTime() - now.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft({ h, m, s });
    };
    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Discount code state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "percent" | "credits";
    discountValue: number;
    description: string | null;
  } | null>(null);

  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);

  const validateCoupon = trpc.marketing.validateCode.useQuery(
    { code: couponCode, amountCents: 999, packageId: selectedPkgId ?? undefined },
    { enabled: false }
  );

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setCouponLoading(true);
    try {
      const result = await validateCoupon.refetch();
      if (result.data) {
        setAppliedCoupon({ code: couponCode.toUpperCase(), ...result.data });
        const msg = result.data.discountType === "percent"
          ? t("pricing.coupon.successPercent", { value: result.data.discountValue })
          : t("pricing.coupon.successCredits", { value: result.data.discountValue });
        toast.success(msg);
      }
    } catch (err: any) {
      toast.error(err.message || t("pricing.coupon.invalid"));
    } finally {
      setCouponLoading(false);
    }
  };

  // Show payment result toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const credits = params.get("credits");
    if (payment === "success" && credits) {
      toast.success(t("pricing.payment.success", { credits: Number(credits).toLocaleString() }));
      window.history.replaceState({}, "", "/pricing");
    } else if (payment === "cancelled") {
      toast.error(t("pricing.payment.cancelled"));
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  const createCheckout = trpc.payments.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.success(t("pricing.payment.redirecting"));
      window.location.href = data.checkoutUrl;
    },
    onError: (err) => {
      toast.error(err.message);
      setLoadingPackageId(null);
    },
  });

  const createSubscription = trpc.subscriptions.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.success(t("pricing.payment.redirectingSubscription"));
      window.location.href = data.checkoutUrl;
    },
    onError: (err) => {
      toast.error(err.message);
      setLoadingPackageId(null);
    },
  });

  const handleStripePurchase = (packageId: string) => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingPackageId(packageId);
    createCheckout.mutate({ packageId, origin: window.location.origin });
  };

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingPackageId(planId);
    createSubscription.mutate({ planId, origin: window.location.origin });
  };

  const comparisonRows = [
    { labelKey: "pricing.comparison.monthlyCredits",  values: [t("pricing.comparison.values.freeCredits"), "600", "2,000", "6,000", t("pricing.comparison.values.unlimited")] },
    { labelKey: "pricing.comparison.allPlatforms",    values: ["✓", "✓", "✓", "✓", "✓"] },
    { labelKey: "pricing.comparison.pdfExport",       values: ["—", "✓", "✓", "✓", "✓"] },
    { labelKey: "pricing.comparison.excelExport",     values: ["—", "—", "✓", "✓", "✓"] },
    { labelKey: "pricing.comparison.subAccounts",     values: ["—", "—", "—", "5", t("pricing.comparison.values.unlimited")] },
    { labelKey: "pricing.comparison.customApi",       values: ["—", "—", "—", "—", "✓"] },
    { labelKey: "pricing.comparison.accountManager",  values: ["—", "—", "—", "✓", "✓"] },
    { labelKey: "pricing.comparison.support247",      values: ["—", "—", "✓", "✓", "✓"] },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0D1B2A" }}>
      <Navbar />

      {/* Urgency Banner */}
      <div
        className="w-full py-3 px-4 flex flex-wrap items-center justify-center gap-3 text-sm"
        style={{ background: "linear-gradient(90deg, rgba(212,160,23,0.15), rgba(212,160,23,0.08), rgba(212,160,23,0.15))", borderBottom: "1px solid rgba(212,160,23,0.2)" }}
      >
        <span className="flex items-center gap-1.5" style={{ color: "#D4A017" }}>
          <Gift size={15} />
          <strong>{t("pricing.urgency.freeCredits")}</strong> {t("pricing.urgency.onSignup")}
        </span>
        <span style={{ color: "rgba(212,160,23,0.4)" }}>|</span>
        <span className="flex items-center gap-1.5" style={{ color: "#8A9BB0" }}>
          <Clock size={13} />
          {t("pricing.urgency.offerEnds")}
          <span className="font-mono font-bold" style={{ color: "#F0C040" }}>
            {String(timeLeft.h).padStart(2, "0")}:{String(timeLeft.m).padStart(2, "0")}:{String(timeLeft.s).padStart(2, "0")}
          </span>
        </span>
      </div>

      {/* Hero */}
      <section className="pt-28 pb-16 geo-pattern">
        <div className="container text-center">
          <div className="platform-badge mb-5 inline-flex">{t("pricing.hero.badge")}</div>
          <h1 className="font-bold text-white mb-4" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
            {t("pricing.hero.title")}
          </h1>
          <p className="text-base max-w-2xl mx-auto mb-3" style={{ color: "#8A9BB0" }}>
            {t("pricing.hero.subtitle")}
          </p>
          <p className="text-sm font-mono" style={{ color: "#D4A017" }}>
            {t("pricing.hero.creditRate")}
          </p>
          {/* Social proof counter */}
          {/* GAP-W001-008 FIX: Updated stats to reflect actual launch phase */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="font-mono text-2xl font-bold" style={{ color: "#D4A017" }}>6</div>
              <div className="text-xs" style={{ color: "#8A9BB0" }}>{t("pricing.hero.platforms", "منصة متخصصة")}</div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(212,160,23,0.2)" }} />
            <div className="text-center">
              <div className="font-mono text-2xl font-bold" style={{ color: "#4A9B7F" }}>200</div>
              <div className="text-xs" style={{ color: "#8A9BB0" }}>{t("pricing.hero.freeCredits", "كريدت مجاني عند التسجيل")}</div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(212,160,23,0.2)" }} />
            <div className="text-center">
              <div className="font-mono text-2xl font-bold" style={{ color: "#5B8DD9" }}>24/7</div>
              <div className="text-xs" style={{ color: "#8A9BB0" }}>{t("pricing.hero.available", "خدمة متواصلة")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Segment Tabs Info */}
      <section className="py-6" style={{ background: "rgba(212,160,23,0.04)", borderTop: "1px solid rgba(212,160,23,0.1)", borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {[
              { icon: <User size={14} />, labelKey: "pricing.segments.individuals", color: "#8A9BB0" },
              { icon: <Briefcase size={14} />, labelKey: "pricing.segments.freelancers", color: "#D4A017" },
              { icon: <Building2 size={14} />, labelKey: "pricing.segments.offices", color: "#5B8DD9" },
              { icon: <Users size={14} />, labelKey: "pricing.segments.enterprises", color: "#9B7FE2" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2" style={{ color: s.color }}>
                {s.icon}
                <span>{t(s.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl p-5 flex flex-col relative transition-transform hover:-translate-y-1"
                style={{
                  background: plan.featured ? `rgba(${plan.colorRgb},0.08)` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${plan.featured ? `rgba(${plan.colorRgb},0.4)` : "rgba(255,255,255,0.07)"}`,
                  boxShadow: plan.featured ? `0 0 40px rgba(${plan.colorRgb},0.12)` : "none",
                }}
              >
                {plan.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{ background: "#D4A017", color: "#0D1B2A" }}
                  >
                    <Star size={11} fill="currentColor" />
                    {t("pricing.plans.mostPopular")}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mb-4">
                  <span style={{ color: plan.color }}>{plan.segmentIcon}</span>
                  <span className="text-xs" style={{ color: plan.color }}>{plan.segment}</span>
                </div>

                <div className="mb-4">
                  <div className="font-bold text-lg text-white mb-1">{plan.name}</div>
                  {plan.price > 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-sm font-bold" style={{ color: plan.color }}>{(plan as any).currency || ''}</span>
                      <span className="font-mono text-3xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                      <span className="text-sm" style={{ color: "#8A9BB0" }}>/ {plan.period}</span>
                    </div>
                  ) : plan.id === "free" ? (
                    <div className="font-mono text-3xl font-bold" style={{ color: plan.color }}>{t("pricing.plans.free.name")}</div>
                  ) : (
                    <div className="font-bold text-lg" style={{ color: plan.color }}>{t("pricing.plans.enterprise.period")}</div>
                  )}
                </div>

                {plan.credits > 0 && (
                  <div
                    className="flex items-center gap-2 p-2.5 rounded-lg mb-4"
                    style={{ background: `rgba(${plan.colorRgb},0.1)` }}
                  >
                    <Coins size={14} style={{ color: plan.color }} />
                    <span className="font-mono font-bold text-sm" style={{ color: plan.color }}>
                      {plan.credits.toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: "#8A9BB0" }}>
                      {plan.id === "free" ? t("pricing.plans.free.creditsLabel") : t("pricing.plans.creditsPerMonth")}
                    </span>
                  </div>
                )}

                <ul className="space-y-2.5 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#B0C0D4" }}>
                      <CheckCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={loadingPackageId === plan.id}
                  onClick={() => {
                    if (plan.id === "enterprise") {
                      toast.info(t("pricing.plans.enterprise.comingSoon"));
                    } else if (plan.id === "free") {
                      window.location.href = getLoginUrl();
                    } else {
                      handleSubscribe(plan.id);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                >
                  {loadingPackageId === plan.id ? (
                    <><Loader2 size={14} className="animate-spin" /> {t("pricing.payment.loading")}</>
                  ) : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Stripe Credit Packages */}
      <section className="py-16 geo-pattern">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="section-title mb-3">{t("pricing.packs.title")}</h2>
            <p style={{ color: "#8A9BB0" }}>{t("pricing.packs.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {creditPacks.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl p-7 flex flex-col relative transition-all hover:-translate-y-1"
                style={{
                  background: pkg.popular ? "rgba(212,160,23,0.06)" : "rgba(255,255,255,0.03)",
                  border: pkg.popular ? "1px solid rgba(212,160,23,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: pkg.popular ? "0 0 40px rgba(212,160,23,0.1)" : "none",
                }}
              >
                {pkg.badgeKey && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                      style={{ background: "#D4A017", color: "#0D1B2A" }}
                    >
                      {t(pkg.badgeKey)}
                    </span>
                  </div>
                )}
                <div className="text-center mb-4">
                  <div className="text-sm mb-1" style={{ color: "#8A9BB0" }}>{t(pkg.nameKey)}</div>
                  <div className="font-mono text-4xl font-bold mb-1" style={{ color: "#D4A017" }}>
                    {pkg.credits.toLocaleString()}
                  </div>
                  <div className="text-sm" style={{ color: "#8A9BB0" }}>{t("pricing.packs.credits")}</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-white">${pkg.priceUsd}</div>
                  <div className="text-xs mt-1" style={{ color: "#8A9BB0" }}>
                    ${((pkg.priceUsd / pkg.credits) * 100).toFixed(2)} {t("pricing.packs.per100")}
                  </div>
                </div>
                {pkg.hintKey && (
                  <div className="text-center text-xs mb-4 px-2 py-1.5 rounded-lg" style={{ background: "rgba(212,160,23,0.06)", color: "#8A9BB0" }}>
                    {t(pkg.hintKey)}
                  </div>
                )}
                <button
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  style={
                    pkg.popular
                      ? { background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }
                      : { background: "transparent", border: "1px solid rgba(212,160,23,0.4)", color: "#D4A017" }
                  }
                  onClick={() => handleStripePurchase(pkg.id)}
                  disabled={loadingPackageId === pkg.id}
                >
                  {loadingPackageId === pkg.id ? (
                    <><Loader2 size={16} className="animate-spin" /> {t("pricing.payment.loading")}</>
                  ) : (
                    <><CreditCard size={16} /> {t("pricing.packs.buyNow")}</>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Coupon Code Input */}
          <div className="max-w-md mx-auto mt-8 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} style={{ color: "#D4A017" }} />
              <span className="text-sm font-semibold text-white">{t("pricing.coupon.label")}</span>
            </div>
            {appliedCoupon ? (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(74,155,127,0.1)", border: "1px solid rgba(74,155,127,0.3)" }}>
                <CheckCheck size={16} style={{ color: "#4A9B7F" }} />
                <span className="text-sm" style={{ color: "#4A9B7F" }}>
                  {t("pricing.coupon.applied", { code: appliedCoupon.code })} — {
                    appliedCoupon.discountType === "percent"
                      ? t("pricing.coupon.discountPercent", { value: appliedCoupon.discountValue })
                      : t("pricing.coupon.discountCredits", { value: appliedCoupon.discountValue })
                  }
                </span>
                <button onClick={() => setAppliedCoupon(null)} className="mr-auto text-xs" style={{ color: "#8A9BB0" }}>{t("pricing.coupon.change")}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder={t("pricing.coupon.placeholder")}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", direction: "ltr" }}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                >
                  {couponLoading ? <Loader2 size={14} className="animate-spin" /> : t("pricing.coupon.apply")}
                </button>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {[
              { icon: <ShieldCheck size={14} />, textKey: "pricing.trust.secure" },
              { icon: <Zap size={14} />, textKey: "pricing.trust.instant" },
              // GAP-W001-002 FIX: testCard hidden — platform is live, not sandbox
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#8A9BB0" }}>
                <span style={{ color: "#D4A017" }}>{b.icon}</span>
                {t(b.textKey)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16" style={{ background: "rgba(13,27,42,0.6)" }}>
        <div className="container">
          <div className="text-center mb-10">
            <div className="platform-badge mb-4 inline-flex">{t("pricing.testimonials.badge")}</div>
            <h2 className="section-title">{t("pricing.testimonials.title")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {testimonials.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl flex flex-col"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <Star key={j} size={12} fill="#D4A017" style={{ color: "#D4A017" }} />
                  ))}
                </div>
                <p className="text-sm flex-1 mb-4" style={{ color: "#B0C0D4", lineHeight: 1.7 }}>"{t(item.textKey)}"</p>
                <div>
                  <div className="font-semibold text-sm text-white">{t(item.nameKey)}</div>
                  <div className="text-xs" style={{ color: "#8A9BB0" }}>{t(item.roleKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Costs Table */}
      <section className="py-16" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="section-title mb-3">{t("pricing.platformCosts.title")}</h2>
            <p style={{ color: "#8A9BB0" }}>{t("pricing.platformCosts.subtitle")}</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                className="grid grid-cols-4 px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold min-w-[400px]"
                style={{ background: "rgba(255,255,255,0.05)", color: "#8A9BB0" }}
              >
                <span className="col-span-2">{t("pricing.platformCosts.colPlatform")}</span>
                <span className="text-center">{t("pricing.platformCosts.colMin")}</span>
                <span className="text-center">{t("pricing.platformCosts.colMax")}</span>
              </div>
              {platformCosts.map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 px-4 sm:px-6 py-4 items-center min-w-[400px]"
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{t(p.platformKey)}</div>
                      <div className="text-xs" style={{ color: "#8A9BB0" }}>{t(p.descKey)}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="font-mono font-bold" style={{ color: p.color }}>{p.min}</span>
                    <span className="text-xs mr-1" style={{ color: "#8A9BB0" }}>{t("pricing.platformCosts.credits")}</span>
                  </div>
                  <div className="text-center">
                    <span className="font-mono font-bold" style={{ color: p.color }}>{p.max}</span>
                    <span className="text-xs mr-1" style={{ color: "#8A9BB0" }}>{t("pricing.platformCosts.credits")}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mt-4" style={{ color: "#8A9BB0" }}>
              {t("pricing.platformCosts.note")}
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 geo-pattern">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="section-title mb-3">{t("pricing.comparison.title")}</h2>
            <p style={{ color: "#8A9BB0" }}>{t("pricing.comparison.subtitle")}</p>
          </div>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: "#8A9BB0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{t("pricing.comparison.feature")}</th>
                  {["pricing.plans.free.name", "pricing.plans.starter.name", "pricing.plans.pro.name", "pricing.plans.office.name", "pricing.plans.enterprise.name"].map((key) => (
                    <th key={key} className="px-3 py-3 text-center font-semibold text-white" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{t(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td className="px-4 py-3" style={{ color: "#B0C0D4", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{t(row.labelKey)}</td>
                    {row.values.map((v, j) => (
                      <td
                        key={j}
                        className="px-3 py-3 text-center font-mono text-xs"
                        style={{
                          color: v === "✓" ? "#4A9B7F" : v === "—" ? "#4A5568" : j === 2 ? "#D4A017" : "#B0C0D4",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          fontWeight: j === 2 ? 700 : 400,
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Referral */}
      <section className="py-16" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.25)" }}
            >
              <Zap size={32} style={{ color: "#D4A017" }} />
            </div>
            <h2 className="section-title mb-4">{t("pricing.referral.title")}</h2>
            <p className="text-base mb-6" style={{ color: "#8A9BB0" }}>
              {t("pricing.referral.description")}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { stepKey: "pricing.referral.step1", icon: "🔗" },
                { stepKey: "pricing.referral.step2", icon: "👤" },
                { stepKey: "pricing.referral.step3", icon: "🎁" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-xs font-mono mb-1" style={{ color: "#D4A017" }}>{t("pricing.referral.stepLabel", { num: i + 1 })}</div>
                  <div className="text-sm text-white">{t(s.stepKey)}</div>
                </div>
              ))}
            </div>
            <Link href="/dashboard">
              <button className="btn-gold flex items-center gap-2 mx-auto">
                {t("pricing.referral.cta")}
                <ArrowLeft size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
