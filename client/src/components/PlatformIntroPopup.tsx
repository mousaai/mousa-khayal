/**
 * PlatformIntroPopup — نافذة الفيديو التعريفي للمنصات (v4.1)
 *
 * التدفق الافتراضي (videoOnly=false):
 * 1. تُفتح المنصة الفرعية فوراً في تبويب جديد
 * 2. تظهر هذه النافذة لعرض الفيديو
 * 3. بعد انتهاء الفيديو أو تخطيه → يتم التركيز على تبويب المنصة
 *
 * وضع الفيديو فقط (videoOnly=true):
 * - لا تُفتح المنصة — يُعرض الفيديو فقط ثم تُغلق النافذة
 *
 * يدعم العربية (RTL) والإنجليزية (LTR) بشكل كامل
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, SkipForward, Volume2, VolumeX, Maximize, Minimize, ExternalLink } from "lucide-react";

// ─── Platform Config ──────────────────────────────────────────────────────────

const PLATFORM_NAMES: Record<string, { ar: string; en: string }> = {
  fada:     { ar: "فضاء",  en: "FADA"   },
  raqaba:   { ar: "رقابة", en: "RAQABA" },
  harara:   { ar: "حرارة", en: "HARARA" },
  maskan:   { ar: "مسكن",  en: "MASKAN" },
  code:     { ar: "كود",   en: "CODE"   },
  tashkila: { ar: "خيال",  en: "KHAYAL" },
  khayal:   { ar: "خيال",  en: "KHAYAL" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoData {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  language: string;
  title: string;
}

export interface PlatformIntroPopupProps {
  platform: string;
  targetUrl: string;
  /** تمرير مرجع للتبويب المفتوح مسبقاً (اختياري) */
  platformWindow?: Window | null;
  /** عرض الفيديو فقط دون فتح المنصة */
  videoOnly?: boolean;
  onClose: () => void;
}

// ─── Language Detection ───────────────────────────────────────────────────────

function isArabicLang(i18nLang: string): boolean {
  if (i18nLang && i18nLang !== "cimode") return i18nLang.startsWith("ar");
  const stored = localStorage.getItem("mousa_lang");
  if (stored) return stored.startsWith("ar");
  if (document.documentElement.dir === "rtl") return true;
  if (document.documentElement.dir === "ltr") return false;
  return true;
}

// ─── NOTE ─────────────────────────────────────────────────────────────────────
// The platform window is ALWAYS opened by the caller (Home.tsx / Dashboard.tsx)
// synchronously within the user gesture, then passed via platformWindow prop.
// This component NEVER opens the platform window itself — it only plays the intro video.

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlatformIntroPopup({
  platform,
  targetUrl,
  platformWindow: externalWindow,
  videoOnly = false,
  onClose,
}: PlatformIntroPopupProps) {
  const { i18n } = useTranslation();
  // Support all 4 languages: ar | en | ur | fr
  const rawLang = (i18n.language && i18n.language !== "cimode")
    ? i18n.language
    : (localStorage.getItem("mousa_lang") || "ar");
  const lang = (["ar", "en", "ur", "fr"].includes(rawLang) ? rawLang : "ar") as "ar" | "en" | "ur" | "fr";
  const isRTL = lang === "ar" || lang === "ur";

  const platformWindowRef = useRef<Window | null>(externalWindow ?? null);

  const [phase, setPhase] = useState<"loading" | "playing" | "error">("loading");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const platformName = PLATFORM_NAMES[platform];

  // ── Translations (ar | en | ur | fr) ──────────────────────────────────────────────────────────────────────────
  const textsMap = {
    ar: {
      loading:      "جاري تحميل الفيديو التعريفي...",
      videoError:   "تعذّر تحميل الفيديو",
      skip:         "تخطي",
      openPlatform: "فتح المنصة",
      autoFocus:    "سيتم التركيز على المنصة بعد انتهاء الفيديو",
      videoOnly:    "شاهد الفيديو التعريفي",
      platformOpen: "المنصة مفتوحة في تبويب جديد",
      watchingFor:  "تشاهد الفيديو التعريفي لـ",
    },
    en: {
      loading:      "Loading intro video...",
      videoError:   "Failed to load video",
      skip:         "Skip",
      openPlatform: "Open Platform",
      autoFocus:    "Platform will be focused when video ends",
      videoOnly:    "Watch Intro Video",
      platformOpen: "Platform is open in a new tab",
      watchingFor:  "Watching intro for",
    },
    ur: {
      loading:      "تعارفی ویڈیو لوڈ ہو رہی ہے...",
      videoError:   "ویڈیو لوڈ کرنے میں ناکامی",
      skip:         "چھوڑیں",
      openPlatform: "پلیٹ فارم کھولیں",
      autoFocus:    "ویڈیو ختم ہونے پر پلیٹ فارم پر توجہ مرکوز ہوگی",
      videoOnly:    "تعارفی ویڈیو دیکھیں",
      platformOpen: "پلیٹ فارم نئے ٹیب میں کھلا ہے",
      watchingFor:  "تعارفی ویڈیو دیکھ رہے ہیں:",
    },
    fr: {
      loading:      "Chargement de la vidéo d'introduction...",
      videoError:   "Échec du chargement de la vidéo",
      skip:         "Passer",
      openPlatform: "Ouvrir la plateforme",
      autoFocus:    "La plateforme sera mise en focus à la fin de la vidéo",
      videoOnly:    "Regarder la vidéo d'introduction",
      platformOpen: "La plateforme est ouverte dans un nouvel onglet",
      watchingFor:  "Regarder l'intro de",
    },
  };
  const texts = textsMap[lang] ?? textsMap["ar"];

  // ── تحديث مرجع النافذة عند تغيير externalWindow ──────────────────────────
  useEffect(() => {
    if (externalWindow) {
      platformWindowRef.current = externalWindow;
    }
  }, [externalWindow]);

  // ── جلب بيانات الفيديو ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchVideo = async () => {
      try {
        const res = await fetch(
          `/api/video-intro?slug=${encodeURIComponent(platform)}&lang=${encodeURIComponent(lang)}`
        );
        const data = await res.json();
        const video = data?.result?.data?.json;
        if (!cancelled) {
          if (video?.videoUrl) {
            setVideoData(video);
            setPhase("playing");
          } else {
            handleFinishRef.current();
          }
        }
      } catch {
        if (!cancelled) handleFinishRef.current();
      }
    };
    fetchVideo();
    return () => { cancelled = true; };
  }, [platform, lang]);

  // ── تشغيل الفيديو تلقائياً عند جاهزيته ───────────────────────────────────
  useEffect(() => {
    if (phase === "playing" && videoRef.current && videoData) {
      videoRef.current.play().catch(() => setPhase("error"));
    }
  }, [phase, videoData]);

  // ── تتبع حالة fullscreen ───────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // ── الإنهاء: إغلاق النافذة + التركيز على المنصة (إذا لم يكن videoOnly) ───
  const handleFinish = useCallback(() => {
    if (closing) return;
    setClosing(true);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (!videoOnly) {
      try {
        if (platformWindowRef.current && !platformWindowRef.current.closed) {
          platformWindowRef.current.focus();
        }
      } catch {
        // قد يُمنع focus() في بعض المتصفحات
      }
    }

    onClose();
  }, [closing, videoOnly, onClose]);

  // ref للاستخدام في useEffect بدون dependency loop
  const handleFinishRef = useRef(handleFinish);
  useEffect(() => { handleFinishRef.current = handleFinish; }, [handleFinish]);

  // ── إغلاق بـ Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleFinishRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── تحديث شريط التقدم ─────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) setProgress((currentTime / duration) * 100);
    }
  };

  // ── Fullscreen toggle ──────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    try {
      const el = videoRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitEnterFullscreen) (el as any).webkitEnterFullscreen();
        else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(4,8,16,0.92)", backdropFilter: "blur(10px)" }}
      dir={isRTL ? "rtl" : "ltr"}
      onClick={(e) => { if (e.target === e.currentTarget) handleFinish(); }}
    >
      <div
        className="relative w-full mx-4 overflow-hidden"
        style={{
          maxWidth: "680px",
          background: "linear-gradient(160deg, #0D1B2A 0%, #080E1A 100%)",
          border: "1px solid rgba(212,160,23,0.3)",
          borderRadius: "1.25rem",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(212,160,23,0.06)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(212,160,23,0.1)" }}
        >
          {/* Platform badge */}
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.25)" }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.6rem",
                  color: "#D4A017",
                  letterSpacing: "0.15em",
                  opacity: 0.8,
                }}
              >
                {platformName?.en}
              </span>
              <span style={{ color: "#D4A017", fontSize: "0.9rem", fontWeight: 700 }}>
                {/* Show API title if available, fallback to static name */}
                {videoData?.title
                  ? videoData.title.split("—")[0].trim()
                  : platformName?.ar}
              </span>
            </div>
            <span
              className="hidden sm:inline"
              style={{ color: "rgba(176,190,197,0.5)", fontSize: "0.78rem" }}
            >
              {videoOnly ? texts.videoOnly : texts.watchingFor}
            </span>
          </div>

          {/* Platform open indicator (only when not videoOnly) + close */}
          <div className="flex items-center gap-2">
            {!videoOnly && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
                  style={{ display: "inline-block" }}
                />
                <span style={{ color: "#4ade80", fontSize: "0.72rem", fontWeight: 600 }}>
                  {texts.platformOpen}
                </span>
                <ExternalLink size={11} style={{ color: "#4ade80" }} />
              </div>
            )}

            <button
              onClick={handleFinish}
              className="p-2 rounded-full transition-all hover:bg-white/10 active:scale-95"
              style={{ color: "rgba(255,255,255,0.6)" }}
              title={texts.skip}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Video Area ── */}
        <div
          className="relative w-full bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          {/* Loading */}
          {phase === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(212,160,23,0.2)", borderTopColor: "#D4A017" }}
              />
              <p style={{ color: "rgba(176,190,197,0.5)", fontSize: "0.82rem" }}>{texts.loading}</p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p style={{ color: "rgba(176,190,197,0.5)", fontSize: "0.85rem" }}>{texts.videoError}</p>
              <button
                onClick={handleFinish}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(212,160,23,0.15)",
                  border: "1px solid rgba(212,160,23,0.3)",
                  color: "#D4A017",
                }}
              >
                <ExternalLink size={14} className="inline me-1.5" />
                {texts.openPlatform}
              </button>
            </div>
          )}

          {/* Video */}
          {phase === "playing" && videoData && (
            <>
              <video
                ref={videoRef}
                src={videoData.videoUrl}
                poster={videoData.thumbnailUrl}
                muted={muted}
                playsInline
                controls={false}
                onEnded={handleFinish}
                onTimeUpdate={handleTimeUpdate}
                onError={() => setPhase("error")}
                className="w-full h-full object-cover"
                style={{ display: "block" }}
              />

              {/* Progress bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #D4A017, #F0C040)",
                  }}
                />
              </div>

              {/* Controls overlay */}
              <div
                className="absolute bottom-3 flex items-center gap-2 px-3"
                style={{ [isRTL ? "right" : "left"]: "0" }}
              >
                <button
                  onClick={() => setMuted(!muted)}
                  className="p-1.5 rounded-full transition-all active:scale-95"
                  style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.9)" }}
                >
                  {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                {videoData.duration > 0 && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      fontSize: "0.7rem",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {formatDuration(videoData.duration)}
                  </span>
                )}
              </div>

              {/* Fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 p-2 rounded-full transition-all active:scale-95"
                style={{
                  [isRTL ? "left" : "right"]: "3rem",
                  background: "rgba(0,0,0,0.55)",
                  color: "rgba(255,255,255,0.9)",
                }}
                title={isRTL ? "ملء الشاشة" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            </>
          )}
        </div>

        {/* ── Video Title & Description from API ── */}
        {videoData?.title && (
          <div
            className="px-5 pt-3 pb-1"
            style={{ borderTop: "1px solid rgba(212,160,23,0.06)" }}
          >
            <p
              style={{
                color: "rgba(212,160,23,0.85)",
                fontSize: "0.82rem",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {videoData.title}
            </p>
          </div>
        )}
        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }}
        >
          {/* Hint */}
          <p style={{ color: "rgba(176,190,197,0.45)", fontSize: "0.75rem" }}>
            {videoOnly ? "" : texts.autoFocus}
          </p>

          {/* Skip button */}
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "rgba(212,160,23,0.1)",
              border: "1px solid rgba(212,160,23,0.25)",
              color: "#D4A017",
            }}
          >
            <SkipForward size={14} />
            {texts.skip}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if user should see the intro popup for a platform
 */
export function useShouldShowIntro(platform: string): boolean {
  return localStorage.getItem(`mousa_intro_${platform}`) !== "seen";
}
