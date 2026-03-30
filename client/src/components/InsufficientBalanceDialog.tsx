/**
 * InsufficientBalanceDialog — نافذة "رصيدك غير كافٍ"
 *
 * تظهر عند محاولة فتح منصة فرعية بدون رصيد كافٍ.
 * تعرض:
 * - الرصيد الحالي
 * - تكلفة المنصة المطلوبة
 * - الفرق المطلوب
 * - زر "اشحن الكريدت" يوجه للصفحة المناسبة
 * - زر "إلغاء"
 *
 * يدعم العربية (RTL) والإنجليزية (LTR)
 */
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Zap, X, ShoppingCart, AlertTriangle } from "lucide-react";

interface InsufficientBalanceDialogProps {
  platformName: string;
  platformNameEn: string;
  platformCost: number;
  currentBalance: number;
  onClose: () => void;
}

function isArabicLang(i18nLang: string): boolean {
  if (i18nLang && i18nLang !== "cimode") return i18nLang.startsWith("ar");
  const stored = localStorage.getItem("mousa_lang");
  if (stored) return stored.startsWith("ar");
  if (document.documentElement.dir === "rtl") return true;
  if (document.documentElement.dir === "ltr") return false;
  return true;
}

export default function InsufficientBalanceDialog({
  platformName,
  platformNameEn,
  platformCost,
  currentBalance,
  onClose,
}: InsufficientBalanceDialogProps) {
  const { i18n } = useTranslation();
  const isArabic = isArabicLang(i18n.language);
  const isRTL = isArabic;

  const needed = Math.max(0, platformCost - currentBalance);

  const texts = isArabic
    ? {
        title: "رصيدك غير كافٍ",
        subtitle: `تحتاج إلى ${platformCost} كريدت لفتح منصة ${platformName}`,
        currentBalance: "رصيدك الحالي",
        required: "المطلوب",
        missing: "الناقص",
        recharge: "اشحن الكريدت",
        cancel: "إلغاء",
        hint: "احصل على كريدت إضافي عبر باقات الاشتراك أو الشراء المباشر",
        creditsUnit: "كريدت",
      }
    : {
        title: "Insufficient Balance",
        subtitle: `You need ${platformCost} credits to open ${platformNameEn}`,
        currentBalance: "Your Balance",
        required: "Required",
        missing: "Missing",
        recharge: "Get Credits",
        cancel: "Cancel",
        hint: "Get more credits via subscription plans or direct purchase",
        creditsUnit: "credits",
      };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,16,0.92)", backdropFilter: "blur(10px)" }}
      dir={isRTL ? "rtl" : "ltr"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: "420px",
          background: "linear-gradient(160deg, #0D1B2A 0%, #080E1A 100%)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "1.25rem",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(239,68,68,0.05)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 p-2 rounded-full transition-all hover:bg-white/10 active:scale-95 z-10"
          style={{
            [isRTL ? "left" : "right"]: "1rem",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-5 text-center">
          {/* Warning icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <AlertTriangle size={28} style={{ color: "#ef4444" }} />
          </div>

          <h2
            className="font-bold mb-2"
            style={{ color: "#f1f5f9", fontSize: "1.25rem" }}
          >
            {texts.title}
          </h2>
          <p style={{ color: "rgba(176,190,197,0.7)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {texts.subtitle}
          </p>
        </div>

        {/* Balance breakdown */}
        <div
          className="mx-6 mb-5 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Current balance */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <span style={{ color: "rgba(176,190,197,0.6)", fontSize: "0.82rem" }}>
              {texts.currentBalance}
            </span>
            <div className="flex items-center gap-1.5">
              <Zap size={13} style={{ color: "#d4a017" }} />
              <span style={{ color: "#d4a017", fontWeight: 700, fontSize: "0.95rem" }}>
                {currentBalance.toLocaleString()}
              </span>
              <span style={{ color: "rgba(176,190,197,0.4)", fontSize: "0.72rem" }}>
                {texts.creditsUnit}
              </span>
            </div>
          </div>

          {/* Required */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <span style={{ color: "rgba(176,190,197,0.6)", fontSize: "0.82rem" }}>
              {texts.required}
            </span>
            <div className="flex items-center gap-1.5">
              <Zap size={13} style={{ color: "rgba(176,190,197,0.4)" }} />
              <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "0.95rem" }}>
                {platformCost.toLocaleString()}
              </span>
              <span style={{ color: "rgba(176,190,197,0.4)", fontSize: "0.72rem" }}>
                {texts.creditsUnit}
              </span>
            </div>
          </div>

          {/* Missing */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "rgba(239,68,68,0.04)" }}
          >
            <span style={{ color: "rgba(176,190,197,0.6)", fontSize: "0.82rem" }}>
              {texts.missing}
            </span>
            <div className="flex items-center gap-1.5">
              <Zap size={13} style={{ color: "#ef4444" }} />
              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.95rem" }}>
                {needed.toLocaleString()}
              </span>
              <span style={{ color: "rgba(239,68,68,0.5)", fontSize: "0.72rem" }}>
                {texts.creditsUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p
          className="text-center px-6 mb-5"
          style={{ color: "rgba(176,190,197,0.45)", fontSize: "0.75rem", lineHeight: 1.6 }}
        >
          {texts.hint}
        </p>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {/* Recharge button */}
          <Link href="/pricing" onClick={onClose}>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #D4A017, #F0C040)",
                color: "#0D1B2A",
                fontSize: "0.95rem",
              }}
            >
              <ShoppingCart size={18} />
              {texts.recharge}
            </button>
          </Link>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-medium transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{
              color: "rgba(176,190,197,0.6)",
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: "0.875rem",
            }}
          >
            {texts.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
