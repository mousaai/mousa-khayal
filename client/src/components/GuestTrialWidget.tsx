/**
 * GuestTrialWidget — Free trial experience for unregistered visitors
 * Shows a form to enter their query, generates a 30% preview,
 * then prompts registration to unlock the full report.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Loader2, Sparkles, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Platform = "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal";

interface GuestTrialWidgetProps {
  platform: Platform;
  platformName: string;
  placeholder?: string;
  onClose?: () => void;
  /** After login, redirect to this URL (defaults to the platform subdomain) */
  returnUrl?: string;
}

/** Generate a stable browser fingerprint (no library needed) */
function getBrowserFingerprint(): string {
  const key = "mousa_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = [
      navigator.userAgent.slice(0, 40),
      screen.width,
      screen.height,
      navigator.language,
      new Date().getTimezoneOffset(),
      Math.random().toString(36).slice(2),
    ].join("_");
    localStorage.setItem(key, fp);
  }
  return fp;
}

const PLATFORM_URLS: Record<string, string> = {
  fada:   "https://fada.mousa.ai/",
  raqaba: "https://raqaba.mousa.ai/",
  harara: "https://harara.mousa.ai/",
  maskan: "https://maskan.mousa.ai/",
  code:   "https://code.mousa.ai/",
  khayal: "https://khayal.mousa.ai/",
};

export default function GuestTrialWidget({
  platform,
  platformName,
  placeholder,
  onClose,
  returnUrl,
}: GuestTrialWidgetProps) {
  // After login, redirect to the platform subdomain so user lands directly on the platform
  const platformReturnUrl = returnUrl ?? PLATFORM_URLS[platform] ?? "/";
  const [fingerprint] = useState(() => getBrowserFingerprint());
  const [userInput, setUserInput] = useState("");
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [trialDone, setTrialDone] = useState(false);

  // Check if trial already used
  const { data: trialStatus, isLoading: checkingTrial } = trpc.guestTrial.checkTrial.useQuery(
    { fingerprint, platform },
    { retry: false }
  );

  const startTrial = trpc.guestTrial.startTrial.useMutation({
    onSuccess: (data) => {
      if (data.success && data.previewContent) {
        setPreviewContent(data.previewContent);
        setTrialDone(true);
      } else if (data.previewContent) {
        // Already used — show existing preview
        setPreviewContent(data.previewContent);
        setTrialDone(true);
      }
    },
  });

  // If trial was already used, show existing preview
  useEffect(() => {
    if (trialStatus && !trialStatus.hasTrialAvailable && trialStatus.previewContent) {
      setPreviewContent(trialStatus.previewContent);
      setTrialDone(true);
    }
  }, [trialStatus]);

  if (checkingTrial) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="feature-icon-box">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="text-platinum font-bold text-lg">تجربة مجانية — {platformName}</div>
          <div className="text-steel text-sm">جلسة واحدة مجانية بدون تسجيل</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="mr-auto text-steel hover:text-platinum text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {!trialDone ? (
        /* Input form */
        <div className="space-y-4">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={placeholder ?? `اكتب استفسارك أو وصف مشروعك لـ ${platformName}...`}
            className="min-h-[120px] bg-transparent border-gold/20 text-platinum placeholder:text-steel/60 resize-none focus:border-gold/50"
            maxLength={2000}
            dir="rtl"
          />
          <div className="flex items-center justify-between">
            <span className="text-steel text-xs">{userInput.length}/2000 حرف</span>
            <Button
              onClick={() =>
                startTrial.mutate({
                  fingerprint,
                  platform,
                  userInput,
                  ipAddress: undefined,
                })
              }
              disabled={userInput.trim().length < 10 || startTrial.isPending}
              className="btn-gold gap-2"
            >
              {startTrial.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  ابدأ التجربة المجانية
                </>
              )}
            </Button>
          </div>
          {startTrial.isError && (
            <p className="text-red-400 text-sm text-center">
              حدث خطأ أثناء التحليل. حاول مرة أخرى.
            </p>
          )}
        </div>
      ) : (
        /* Preview result + paywall */
        <div className="space-y-4">
          {/* Preview content */}
          <div
            className="rounded-xl p-5 text-platinum leading-relaxed text-sm"
            style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.12)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-gold text-xs font-semibold">معاينة التقرير (30%)</span>
            </div>
            <p dir="rtl">{previewContent}</p>
          </div>

          {/* Paywall blur overlay */}
          <div className="relative rounded-xl overflow-hidden">
            <div
              className="p-5 text-steel text-sm leading-relaxed select-none"
              style={{
                background: "rgba(13,27,42,0.6)",
                border: "1px solid rgba(212,160,23,0.08)",
                filter: "blur(4px)",
                userSelect: "none",
              }}
            >
              يتضمن التقرير الكامل تحليلاً معمقاً للبيانات المدخلة مع توصيات تفصيلية وخطوات تنفيذية
              واضحة مبنية على أفضل الممارسات الهندسية والمعايير الدولية المعتمدة في قطاع البناء والعمران.
              كما يشمل مقارنة بالمشاريع المماثلة وتقديرات التكلفة والجدول الزمني المقترح.
            </div>
            {/* Unlock CTA */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
              style={{ background: "rgba(8,14,26,0.85)" }}
            >
              <div className="text-center">
                <Lock size={28} className="text-gold mx-auto mb-2" />
                <div className="text-platinum font-bold text-base mb-1">
                  أنجزنا 30% — أكمل التقرير مجاناً
                </div>
                <div className="text-steel text-sm">
                  سجّل الآن واحصل على <span className="text-gold font-semibold">200 كريدت ترحيبي</span> لإتمام التقرير
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Link href="/register" className="flex-1">
                  <Button className="btn-gold w-full gap-2">
                    <Sparkles size={14} />
                    سجّل مجاناً
                  </Button>
                </Link>
                <a href={getLoginUrl(platformReturnUrl)} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 border-gold/30 text-gold hover:bg-gold/10">
                    <ArrowLeft size={14} />
                    تسجيل الدخول
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Already have account? */}
          <p className="text-center text-steel text-xs">
            لديك حساب بالفعل؟{" "}
            <a href={getLoginUrl(platformReturnUrl)} className="text-gold hover:underline">
              سجّل دخولك لرؤية التقرير كاملاً
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
