/**
 * CreditsWidget.tsx — مؤشر رصيد MOUSA.AI في منصة خيال
 * يعرض رصيد الكريدتس الحالي وتكلفة كل جلسة
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Coins, AlertTriangle, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditsWidgetProps {
  compact?: boolean;
  className?: string;
}

export default function CreditsWidget({ compact = false, className = "" }: CreditsWidgetProps) {
  const { user } = useAuth();
  
  const { data: status } = trpc.credits.getStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: balanceData, isLoading } = trpc.credits.getBalance.useQuery(
    { userId: user?.id?.toString() },
    {
      enabled: !!user?.id && status?.enabled === true,
      staleTime: 30_000,
      refetchInterval: 60_000,
    }
  );

  // إذا لم يكن التكامل مفعلاً، لا تُظهر شيئاً
  if (!status?.enabled) return null;

  // إذا لم يكن المستخدم مسجلاً
  if (!user) return null;

  const balance = balanceData?.balance ?? null;
  const canGenerate = balanceData?.canGenerate ?? true;
  const isLow = balance !== null && balance < 50;
  const isEmpty = balance !== null && balance < 25;

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
      <div className="flex items-center justify-between gap-3">
        {/* الأيقونة والرصيد */}
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
              <span className="text-xs text-white/50 font-medium">رصيد خيال</span>
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
              <span className="text-sm text-white/40">غير متاح</span>
            )}
          </div>
        </div>

        {/* تكلفة الجلسة */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Zap className="w-3 h-3 text-white/30" />
            <span className="text-[10px] text-white/30">كل جلسة</span>
          </div>
          <span className="text-sm font-bold font-mono text-white/60">25</span>
        </div>
      </div>

      {/* تحذير نفاد الرصيد */}
      {isEmpty && (
        <div className="mt-2 pt-2 border-t border-red-500/20">
          <p className="text-xs text-red-300/80 mb-2">رصيدك غير كافٍ لإنشاء خيال جديد</p>
          <Button
            size="sm"
            className="w-full h-7 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
            onClick={() => window.open("https://www.mousa.ai/pricing?ref=khayal", "_blank")}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            شحن الرصيد على MOUSA.AI
          </Button>
        </div>
      )}

      {/* تحذير رصيد منخفض */}
      {isLow && !isEmpty && (
        <div className="mt-2 pt-2 border-t border-yellow-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-yellow-300/70">رصيد منخفض</span>
            <button
              className="text-[10px] text-yellow-400/70 hover:text-yellow-400 underline"
              onClick={() => window.open("https://www.mousa.ai/pricing?ref=khayal", "_blank")}
            >
              شحن الرصيد ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
