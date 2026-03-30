/**
 * OnboardingChecklist — قائمة مهام الإعداد للمستخدمين الجدد
 * تظهر فقط للمستخدمين الجدد الذين لم يكملوا الإعداد بعد
 * تختفي تلقائياً عند إكمال جميع المهام
 */
import { useState, useEffect } from "react";
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, Zap, Gift, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type ChecklistItem = {
  id: string;
  label: string;
  desc: string;
  href?: string;
  done: boolean;
};

type Props = {
  hasUsedPlatform: boolean;
  hasSubscription: boolean;
  hasReferral?: boolean;
  sessionCount: number;
};

const STORAGE_KEY = "mousa_onboarding_dismissed";

export default function OnboardingChecklist({ hasUsedPlatform, hasSubscription, hasReferral, sessionCount }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setDismissed(true);
  }, []);

  const items: ChecklistItem[] = [
    {
      id: "register",
      label: "إنشاء الحساب",
      desc: "أنشأت حسابك بنجاح وحصلت على 200 كريدت ترحيبية",
      done: true,
    },
    {
      id: "first_session",
      label: "جرّب أول منصة",
      desc: "استخدم إحدى المنصات الست لأول مرة",
      href: "#platforms",
      done: hasUsedPlatform || sessionCount > 0,
    },
    {
      id: "subscribe",
      label: "اشترك في باقة شهرية",
      desc: "احصل على كريدت شهري تلقائي وميزات إضافية",
      href: "/pricing",
      done: hasSubscription,
    },
    {
      id: "referral",
      label: "ادعُ زميلاً",
      desc: "شارك رابط الإحالة واكسب 100 كريدت إضافي",
      href: "/referral",
      done: !!hasReferral,
    },
  ];

  const completedCount = items.filter(i => i.done).length;
  const allDone = completedCount === items.length;
  const progress = Math.round((completedCount / items.length) * 100);

  // Auto-dismiss if all done
  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => {
        setDismissed(true);
        localStorage.setItem(STORAGE_KEY, "1");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{
        background: "rgba(13,27,42,0.8)",
        border: "1px solid rgba(212,160,23,0.2)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,160,23,0.12)" }}
        >
          <Zap size={16} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-platinum font-semibold text-sm">
              {allDone ? "🎉 أكملت الإعداد!" : "ابدأ رحلتك مع mousa.ai"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(212,160,23,0.12)", color: "#D4A017" }}
            >
              {completedCount}/{items.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: allDone
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : "linear-gradient(90deg, #D4A017, #F0C040)",
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded ? <ChevronUp size={16} className="text-steel" /> : <ChevronDown size={16} className="text-steel" />}
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded-lg transition-colors hover:bg-white/5"
          >
            <X size={14} className="text-steel" />
          </button>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl transition-all"
              style={{
                background: item.done ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${item.done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)"}`,
                opacity: item.done ? 0.8 : 1,
              }}
            >
              {item.done ? (
                <CheckCircle size={18} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
              ) : (
                <Circle size={18} style={{ color: "rgba(212,160,23,0.4)", flexShrink: 0, marginTop: 1 }} />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium"
                  style={{ color: item.done ? "#4ade80" : "#E8EDF2", textDecoration: item.done ? "line-through" : "none" }}
                >
                  {item.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#8A9BB0" }}>{item.desc}</div>
              </div>
              {!item.done && item.href && (
                item.href.startsWith("#") ? (
                  <a
                    href={item.href}
                    className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: "#D4A017" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    ابدأ
                    <ArrowLeft size={12} />
                  </a>
                ) : (
                  <Link href={item.href}>
                    <span
                      className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 cursor-pointer transition-opacity hover:opacity-70"
                      style={{ color: "#D4A017" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      ابدأ
                      <ArrowLeft size={12} />
                    </span>
                  </Link>
                )
              )}
            </div>
          ))}

          {/* Reward hint */}
          {!allDone && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mt-1"
              style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.12)" }}
            >
              <Gift size={14} className="text-gold flex-shrink-0" />
              <p className="text-xs" style={{ color: "#8A9BB0" }}>
                أكمل جميع الخطوات واكسب <span className="text-gold font-bold">100 كريدت إضافي</span> كمكافأة إعداد
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
