/**
 * CreditsWidget.tsx — مؤشر رصيد MOUSA.AI في منصة خيال
 * التسعيرة المعتمدة (مارس 2026):
 *   مشهد: 30 | سيناريو: 5 | فيلم قصير: 450 | فيلم متوسط: 1100 | فيلم طويل: 3200
 *   خيال تقرر / فاجئني: 400
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Coins, AlertTriangle, ExternalLink, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";

interface CreditsWidgetProps {
  compact?: boolean;
  className?: string;
}

// التسعيرة المعتمدة للعرض في الواجهة
const PRICING_TABLE = [
  { key: "scene",       labelAr: "مشهد سينمائي",     labelEn: "Cinematic Scene",    cost: 30,   tier: "standard" },
  { key: "script_only", labelAr: "سيناريو نصي",       labelEn: "Script Only",        cost: 5,    tier: "standard" },
  { key: "film_short",  labelAr: "فيلم قصير (15–60ث)", labelEn: "Short Film",        cost: 450,  tier: "cinema"   },
  { key: "film_medium", labelAr: "فيلم متوسط (1–3د)",  labelEn: "Medium Film",       cost: 1100, tier: "cinema"   },
  { key: "film_long",   labelAr: "فيلم طويل (3–10د)",  labelEn: "Long Film",         cost: 3200, tier: "cinema"   },
  { key: "autonomous",  labelAr: "خيال تقرر",          labelEn: "AI Decides",        cost: 400,  tier: "cinema"   },
  { key: "surprise",    labelAr: "فاجئني",             labelEn: "Surprise Me",       cost: 400,  tier: "cinema"   },
] as const;

export default function CreditsWidget({ compact = false, className = "" }: CreditsWidgetProps) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [showPricing, setShowPricing] = useState(false);

  const { data: status } = trpc.credits.getStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: balanceData, isLoading } = trpc.credits.getBalance.useQuery(
    { userId: user?.id },
    {
      enabled: !!user?.id && status?.enabled === true,
      staleTime: 30_000,
      refetchInterval: 60_000,
    }
  );

  if (!status?.enabled) return null;
  if (!user) return null;

  const balance = balanceData?.balance ?? null;
  const canGenerate = balanceData?.canGenerate ?? true;
  const minCost = 5; // script_only
  const isLow = balance !== null && balance < 450; // أقل من فيلم قصير
  const isEmpty = balance !== null && balance < 30; // أقل من مشهد واحد

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Coins className={`w-3.5 h-3.5 ${isEmpty ? "text-red-400" : isLow ? "text-yellow-400" : "text-blue-400"}`} />
        {isLoading ? (
          <span className="text-xs text-white/40 font-mono">...</span>
        ) : balance !== null ? (
          <span className={`text-xs font-mono font-bold ${isEmpty ? "text-red-400" : isLow ? "text-yellow-400" : "text-white/80"}`}>
            {balance.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-white/40 font-mono">—</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${isEmpty ? "border-red-500/30 bg-red-950/20" : isLow ? "border-yellow-500/30 bg-yellow-950/20" : "border-blue-500/20 bg-blue-950/10"} p-3 ${className}`}>
      {/* الصف الرئيسي: الرصيد + زر التسعيرة */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEmpty ? "bg-red-500/20" : isLow ? "bg-yellow-500/20" : "bg-blue-500/20"}`}>
            {isEmpty ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <Coins className={`w-4 h-4 ${isLow ? "text-yellow-400" : "text-blue-400"}`} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/50 font-medium">{t.creditsBalance}</span>
              <span className="text-[10px] text-white/30 font-mono">MOUSA.AI</span>
            </div>
            {isLoading ? (
              <div className="h-5 w-16 bg-white/10 rounded animate-pulse mt-0.5" />
            ) : balance !== null ? (
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-bold font-mono ${isEmpty ? "text-red-400" : isLow ? "text-yellow-400" : "text-white"}`}>
                  {balance.toLocaleString()}
                </span>
                <span className="text-xs text-white/40">كريدت</span>
              </div>
            ) : (
              <span className="text-sm text-white/40">—</span>
            )}
          </div>
        </div>

        {/* زر عرض التسعيرة */}
        <button
          onClick={() => setShowPricing(!showPricing)}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          <Zap className="w-3 h-3" />
          {lang === "AR" ? "التسعيرة" : lang === "FR" ? "Tarifs" : lang === "UR" ? "قیمتیں" : "Pricing"}
          {showPricing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* جدول التسعيرة المتدرجة */}
      {showPricing && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="space-y-1">
            {/* Standard */}
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">
              {lang === "AR" ? "Standard — صور" : "Standard — Images"}
            </div>
            {PRICING_TABLE.filter(p => p.tier === "standard").map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">
                  {lang === "AR" ? p.labelAr : p.labelEn}
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-300/70">{p.cost}</span>
              </div>
            ))}
            {/* Cinema */}
            <div className="text-[9px] text-white/30 uppercase tracking-widest mt-2 mb-1">
              {lang === "AR" ? "Cinema — فيديو Runway" : "Cinema — Runway Video"}
            </div>
            {PRICING_TABLE.filter(p => p.tier === "cinema").map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">
                  {lang === "AR" ? p.labelAr : p.labelEn}
                </span>
                <span className="text-[11px] font-mono font-bold text-purple-300/70">{p.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[9px] text-white/20 text-center">
            1 كريدت = $0.01 USD
          </div>
        </div>
      )}

      {/* تحذير نفاد الرصيد */}
      {isEmpty && (
        <div className="mt-2 pt-2 border-t border-red-500/20">
          <p className="text-xs text-red-300/80 mb-2">{t.creditsInsufficient}</p>
          <Button
            size="sm"
            className="w-full h-7 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
            onClick={() => window.open("https://www.mousa.ai/pricing?ref=khayal", "_blank")}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            {t.creditsTopUp} — MOUSA.AI
          </Button>
        </div>
      )}

      {/* تحذير رصيد منخفض */}
      {isLow && !isEmpty && (
        <div className="mt-2 pt-2 border-t border-yellow-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-yellow-300/70">{t.creditsInsufficient}</span>
            <button
              className="text-[10px] text-yellow-400/70 hover:text-yellow-400 underline"
              onClick={() => window.open("https://www.mousa.ai/pricing?ref=khayal", "_blank")}
            >
              {t.creditsTopUp} ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
