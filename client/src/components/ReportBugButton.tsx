/*
 * ReportBugButton — زر إبلاغ عن خطأ يدوي
 * يمكن وضعه في أي صفحة لإتاحة الإبلاغ اليدوي عن المشاكل
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bug, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ErrorType = "ui" | "api" | "voice" | "payment" | "performance" | "other";

interface ReportBugButtonProps {
  platform?: string;
  className?: string;
  variant?: "icon" | "text" | "full";
}

export default function ReportBugButton({
  platform = "general",
  className,
  variant = "text",
}: ReportBugButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [errorType, setErrorType] = useState<ErrorType>("other");

  const reportMutation = trpc.errors.report.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال تقرير الخطأ. شكراً لمساعدتنا!");
      setIsOpen(false);
      setDescription("");
    },
    onError: (e) => toast.error(e.message || "فشل إرسال التقرير"),
  });

  const handleSubmit = () => {
    if (!description.trim()) { toast.error("يرجى وصف المشكلة"); return; }
    reportMutation.mutate({
      platform,
      errorType,
      userDescription: description.trim(),
      pageUrl: window.location.pathname,
      metadata: {
        userAgent: navigator.userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
        manual: true,
      },
    });
  };

  const ERROR_TYPES: { id: ErrorType; label: string; emoji: string }[] = [
    { id: "ui", label: "واجهة المستخدم", emoji: "🖥️" },
    { id: "api", label: "استجابة الذكاء الاصطناعي", emoji: "🤖" },
    { id: "voice", label: "الصوت والتسجيل", emoji: "🎙️" },
    { id: "payment", label: "الدفع والكريدت", emoji: "💳" },
    { id: "performance", label: "بطء الأداء", emoji: "⚡" },
    { id: "other", label: "أخرى", emoji: "❓" },
  ];

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${className}`}
          title="الإبلاغ عن خطأ"
        >
          <Bug size={16} style={{ color: "#64748b" }} />
        </button>
      ) : variant === "full" ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 ${className}`}
          style={{ color: "#64748b" }}
        >
          <Bug size={14} />
          الإبلاغ عن مشكلة
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`text-xs flex items-center gap-1 transition-colors hover:opacity-80 ${className}`}
          style={{ color: "#475569" }}
        >
          <Bug size={12} />
          الإبلاغ عن مشكلة
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-md"
          style={{
            background: "rgba(8,14,26,0.97)",
            border: "1px solid rgba(212,160,23,0.2)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#e2e8f0" }}>
              <Bug size={18} style={{ color: "#d4a017" }} />
              الإبلاغ عن مشكلة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Error Type */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>نوع المشكلة</p>
              <div className="grid grid-cols-2 gap-2">
                {ERROR_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setErrorType(t.id)}
                    className="px-3 py-2 rounded-lg text-xs text-right transition-all"
                    style={{
                      background: errorType === t.id ? "rgba(212,160,23,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${errorType === t.id ? "rgba(212,160,23,0.35)" : "rgba(255,255,255,0.07)"}`,
                      color: errorType === t.id ? "#d4a017" : "#94a3b8",
                    }}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>
                وصف المشكلة <span style={{ color: "#ef4444" }}>*</span>
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="صف المشكلة التي واجهتها بالتفصيل..."
                rows={4}
                maxLength={1000}
                className="text-sm resize-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(212,160,23,0.15)",
                  color: "#e2e8f0",
                }}
              />
              <p className="text-xs mt-1 text-left" style={{ color: "#475569" }}>
                {description.length}/1000
              </p>
            </div>

            <p className="text-xs" style={{ color: "#475569", lineHeight: 1.6 }}>
              سيتم إرسال معلومات تقنية تلقائياً (الصفحة، المتصفح) لمساعدتنا في حل المشكلة.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!description.trim() || reportMutation.isPending}
                className="flex-1 gap-2"
                style={{ background: "#d4a017", color: "#080e1a", fontWeight: 600 }}
              >
                <Send size={14} />
                {reportMutation.isPending ? "جارٍ الإرسال..." : "إرسال التقرير"}
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="gap-2"
                style={{ color: "#64748b" }}
              >
                <X size={14} />
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
