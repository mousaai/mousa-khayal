/**
 * WelcomeCreditsBanner — Shown to new users after first login
 * Celebrates the 200 welcome credits and guides them to start
 */
import { useState } from "react";
import { Sparkles, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface WelcomeCreditsBannerProps {
  userName?: string;
}

const BANNER_KEY = "mousa_welcome_dismissed";

export default function WelcomeCreditsBanner({ userName }: WelcomeCreditsBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(BANNER_KEY, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div
      className="relative rounded-2xl p-5 mb-6 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(212,160,23,0.15) 0%, rgba(212,160,23,0.05) 100%)",
        border: "1px solid rgba(212,160,23,0.3)",
      }}
      dir="rtl"
    >
      {/* Background sparkle */}
      <div
        className="absolute top-0 left-0 w-32 h-32 opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(212,160,23,0.6) 0%, transparent 70%)",
          transform: "translate(-30%, -30%)",
        }}
      />

      <button
        onClick={handleDismiss}
        className="absolute top-3 left-3 text-steel hover:text-platinum transition-colors"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,160,23,0.2)" }}
        >
          <Sparkles size={22} className="text-gold" />
        </div>
        <div className="flex-1">
          <div className="text-platinum font-bold text-base mb-1">
            مرحباً{userName ? ` ${userName}` : ""}! 🎉 حصلت على 200 كريدت مجاناً
          </div>
          <div className="text-steel text-sm mb-3 leading-relaxed">
            كريدتك الترحيبية جاهزة للاستخدام في جميع منصات mousa.ai.
            ابدأ بتجربة أي منصة الآن — التحليل الأول مجاناً تماماً.
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/fada">
              <span className="credit-chip cursor-pointer hover:bg-gold/20 transition-colors">
                فضاء — ديكور
              </span>
            </Link>
            <Link href="/raqaba">
              <span className="credit-chip cursor-pointer hover:bg-gold/20 transition-colors">
                رقابة — إشراف
              </span>
            </Link>
            <Link href="/harara">
              <span className="credit-chip cursor-pointer hover:bg-gold/20 transition-colors">
                حرارة — طاقة
              </span>
            </Link>
            <Link href="/dashboard">
              <span
                className="flex items-center gap-1 text-gold text-xs font-semibold cursor-pointer hover:underline"
              >
                عرض لوحة التحكم
                <ArrowLeft size={12} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
