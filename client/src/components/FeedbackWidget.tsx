/*
 * FeedbackWidget — نافذة جمع آراء المستخدمين
 * تظهر كزر عائم في أسفل الشاشة، تدعم التقييم بالنجوم والتعليق النصي
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Star, MessageSquare, X, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "session" | "general" | "feature" | "bug";

interface FeedbackWidgetProps {
  platform?: string;
  sessionId?: number;
  /** إذا كان true يظهر الزر العائم، وإلا يظهر مضمناً */
  floating?: boolean;
  onClose?: () => void;
  /** إذا كان مفتوحاً بشكل مبدئي */
  defaultOpen?: boolean;
}

export default function FeedbackWidget({
  platform = "general",
  sessionId,
  floating = true,
  onClose,
  defaultOpen = false,
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("شكراً لك! تم إرسال تقييمك بنجاح");
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setRating(0);
        setComment("");
        onClose?.();
      }, 2000);
    },
    onError: (e) => toast.error(e.message || "فشل إرسال التقييم"),
  });

  const handleSubmit = () => {
    if (rating === 0) { toast.error("يرجى اختيار تقييم من 1 إلى 5 نجوم"); return; }
    submitMutation.mutate({
      platform,
      rating,
      feedbackType,
      comment: comment.trim() || undefined,
      sessionId,
      metadata: {
        url: window.location.pathname,
        userAgent: navigator.userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
      },
    });
  };

  const FEEDBACK_TYPES: { id: FeedbackType; label: string; emoji: string }[] = [
    { id: "general", label: "عام", emoji: "💬" },
    { id: "feature", label: "ميزة", emoji: "✨" },
    { id: "bug", label: "خطأ", emoji: "🐛" },
    { id: "session", label: "جلسة", emoji: "🤖" },
  ];

  const STAR_LABELS = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

  const content = (
    <div
      dir="rtl"
      className="rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: "rgba(8,14,26,0.97)",
        border: "1px solid rgba(212,160,23,0.2)",
        backdropFilter: "blur(20px)",
        width: "320px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(212,160,23,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: "#d4a017" }} />
          <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
            شاركنا رأيك
          </span>
        </div>
        <button
          onClick={() => { setIsOpen(false); onClose?.(); }}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={14} style={{ color: "#64748b" }} />
        </button>
      </div>

      {submitted ? (
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-semibold" style={{ color: "#e2e8f0" }}>شكراً جزيلاً!</p>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>رأيك يساعدنا على التحسين</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Feedback Type */}
          <div>
            <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>نوع الملاحظة</p>
            <div className="flex gap-2 flex-wrap">
              {FEEDBACK_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFeedbackType(t.id)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{
                    background: feedbackType === t.id ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${feedbackType === t.id ? "rgba(212,160,23,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: feedbackType === t.id ? "#d4a017" : "#94a3b8",
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>
              التقييم العام{" "}
              {(hoverRating || rating) > 0 && (
                <span style={{ color: "#d4a017" }}>— {STAR_LABELS[hoverRating || rating]}</span>
              )}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    fill={(hoverRating || rating) >= star ? "#d4a017" : "transparent"}
                    stroke={(hoverRating || rating) >= star ? "#d4a017" : "#334155"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>تعليق (اختياري)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أخبرنا بتجربتك أو اقتراحاتك..."
              rows={3}
              maxLength={500}
              className="text-sm resize-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,160,23,0.15)",
                color: "#e2e8f0",
                fontSize: "0.8rem",
              }}
            />
            <p className="text-xs mt-1 text-left" style={{ color: "#475569" }}>
              {comment.length}/500
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitMutation.isPending}
            className="w-full gap-2"
            style={{
              background: rating > 0 ? "#d4a017" : "rgba(212,160,23,0.2)",
              color: rating > 0 ? "#080e1a" : "#64748b",
              fontWeight: 600,
            }}
          >
            <Send size={14} />
            {submitMutation.isPending ? "جارٍ الإرسال..." : "إرسال التقييم"}
          </Button>
        </div>
      )}
    </div>
  );

  if (!floating) return content;

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="ltr">
      {isOpen && (
        <div className="mb-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {content}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105"
        style={{
          background: isOpen ? "rgba(212,160,23,0.15)" : "#d4a017",
          border: "1px solid rgba(212,160,23,0.3)",
          color: isOpen ? "#d4a017" : "#080e1a",
          fontWeight: 600,
          fontSize: "0.85rem",
        }}
      >
        {isOpen ? (
          <>
            <ChevronDown size={16} />
            <span>إغلاق</span>
          </>
        ) : (
          <>
            <MessageSquare size={16} />
            <span>شاركنا رأيك</span>
          </>
        )}
      </button>
    </div>
  );
}
