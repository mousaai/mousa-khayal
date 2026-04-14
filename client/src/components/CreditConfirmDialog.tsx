/**
 * CreditConfirmDialog.tsx
 * نافذة تأكيد قبل بدء عملية التوليد — تعرض تكلفة الكريدت ورصيد المستخدم
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Zap, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export type GenerationMode = "images" | "fast" | "pro" | "immersive" | "auto";

interface CreditConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  mode: GenerationMode;
  sceneCount?: number;
  creditBalance: number;
  isFallback?: boolean;
}

// حساب التكلفة بناءً على وضع التوليد وعدد المشاهد
function calcCost(mode: GenerationMode, sceneCount = 5): { cost: number; label: string; labelEn: string } {
  switch (mode) {
    case "auto":
      return { cost: 200, label: "خيال تقرر — جلسة ذاتية", labelEn: "AI Decides — Autonomous Session" };
    case "immersive":
      return { cost: sceneCount * 20, label: `جولة 360° — ${sceneCount} مشاهد`, labelEn: `360° Tour — ${sceneCount} scenes` };
    case "fast":
      return { cost: sceneCount * 20, label: `فيلم سريع — ${sceneCount} مشاهد`, labelEn: `Fast Film — ${sceneCount} scenes` };
    case "pro":
      return { cost: sceneCount * 30, label: `فيلم احترافي — ${sceneCount} مشاهد`, labelEn: `Pro Film — ${sceneCount} scenes` };
    case "images":
    default:
      return { cost: sceneCount * 20, label: `${sceneCount} مشاهد سينمائية`, labelEn: `${sceneCount} Cinematic Scenes` };
  }
}

export default function CreditConfirmDialog({
  open,
  onConfirm,
  onCancel,
  mode,
  sceneCount = 5,
  creditBalance,
  isFallback = false,
}: CreditConfirmDialogProps) {
  const { lang } = useLanguage();
  const isAr = lang === "AR";
  const { cost, label, labelEn } = calcCost(mode, sceneCount);
  const afterBalance = creditBalance - cost;
  const hasEnough = isFallback || creditBalance >= cost;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="max-w-sm border border-white/10 bg-[#0a0f1e]/95 backdrop-blur-xl text-white"
        dir={isAr ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Zap className="w-4 h-4 text-yellow-400" />
            {isAr ? "تأكيد بدء التوليد" : "Confirm Generation"}
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs">
            {isAr ? "سيُخصم من رصيدك في mousa.ai" : "Will be deducted from your mousa.ai balance"}
          </DialogDescription>
        </DialogHeader>

        {/* تفاصيل العملية */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 my-1">
          {/* نوع العملية */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{isAr ? "العملية" : "Operation"}</span>
            <span className="font-medium text-white/90">{isAr ? label : labelEn}</span>
          </div>

          {/* التكلفة */}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">{isAr ? "التكلفة" : "Cost"}</span>
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-bold font-mono text-yellow-300">{cost}</span>
              <span className="text-xs text-white/40">{isAr ? "كريدت" : "credits"}</span>
            </div>
          </div>

          {/* الرصيد الحالي */}
          {!isFallback && (
            <>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{isAr ? "رصيدك الحالي" : "Your Balance"}</span>
                <span className="font-mono text-white/80">{creditBalance.toLocaleString()}</span>
              </div>

              {/* الرصيد بعد الخصم */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{isAr ? "بعد التوليد" : "After Generation"}</span>
                <span
                  className={`font-mono font-bold ${
                    afterBalance < 0
                      ? "text-red-400"
                      : afterBalance < 50
                      ? "text-orange-400"
                      : "text-emerald-400"
                  }`}
                >
                  {afterBalance.toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* تحذير رصيد غير كافٍ */}
          {!hasEnough && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">
                {isAr
                  ? `رصيدك غير كافٍ. تحتاج ${cost - creditBalance} كريدت إضافي.`
                  : `Insufficient balance. You need ${cost - creditBalance} more credits.`}
              </p>
            </div>
          )}

          {/* وضع مجاني */}
          {isFallback && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 mt-1">
              <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                {isAr ? "وضع تجريبي مجاني — لا يُخصم من رصيدك" : "Free trial mode — no credits deducted"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1 border-white/10 bg-transparent text-white/70 hover:bg-white/5"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!hasEnough}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            {isAr ? "ابدأ التوليد" : "Start Generation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
