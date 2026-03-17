/**
 * KhayalCinematicViewer.tsx — العارض السينمائي الاحترافي لمنصة خيال
 * بمستوى فيديوهات mousa.ai: Ken Burns + HUD + نصوص شعرية + انتقالات سينمائية
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { GenerationResult, GeneratedScene } from "@/types/khayal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SCENARIO_LABELS: Record<string, string> = {
  design:      "تصميم جديد",
  develop:     "تطوير وازدهار",
  deteriorate: "تدهور وتقادم",
  compare:     "مقارنة زمنية",
  imagine:     "خيال حر",
};

const SCENARIO_COLORS: Record<string, string> = {
  design:      "#60a5fa",
  develop:     "#34d399",
  deteriorate: "#f87171",
  compare:     "#fbbf24",
  imagine:     "#c084fc",
};

const KEN_BURNS_EFFECTS = [
  { start: "scale(1) translate(0%, 0%)",    end: "scale(1.18) translate(-3%, -2%)" },
  { start: "scale(1.05) translate(3%, 2%)", end: "scale(1.2) translate(-2%, -3%)" },
  { start: "scale(1) translate(-2%, 0%)",   end: "scale(1.15) translate(2%, -3%)" },
  { start: "scale(1.08) translate(0%, 3%)", end: "scale(1.22) translate(-3%, 0%)" },
  { start: "scale(1) translate(2%, -2%)",   end: "scale(1.16) translate(-1%, 2%)" },
];

const SCENE_DURATION = 9000; // 9 ثوانٍ لكل مشهد

interface Props {
  result: GenerationResult;
  onBack: () => void;
  onRefine?: (feedback: string) => void;
}

export default function KhayalCinematicViewer({ result, onBack, onRefine }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1); // 1 = black, 0 = visible
  const [showCaption, setShowCaption] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [kbActive, setKbActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressValueRef = useRef(0);

  const scenes = result.scenes;
  const currentScene = scenes[currentIndex];
  const accentColor = SCENARIO_COLORS[result.scenarioType] || "#c084fc";
  const kb = KEN_BURNS_EFFECTS[currentIndex % KEN_BURNS_EFFECTS.length];

  const refineMutation = trpc.khayal.refineScene.useMutation({
    onSuccess: () => {
      toast.success("تم تحسين المشهد! سيتم تحديث العرض قريباً");
      setShowRefinePanel(false);
      setRefineFeedback("");
      setIsRefining(false);
      if (onRefine) onRefine(refineFeedback);
    },
    onError: () => {
      toast.error("فشل التحسين، حاول مجدداً");
      setIsRefining(false);
    },
  });

  // الانتقال إلى مشهد جديد
  const goToScene = useCallback((index: number) => {
    if (index < 0 || index >= scenes.length) return;

    // fade to black
    setFadeOpacity(1);
    setShowCaption(false);
    setKbActive(false);
    progressValueRef.current = 0;
    setProgress(0);

    setTimeout(() => {
      setCurrentIndex(index);
      // fade in
      setTimeout(() => {
        setFadeOpacity(0);
        setKbActive(true);
        setTimeout(() => setShowCaption(true), 1200);
      }, 400);
    }, 600);
  }, [scenes.length]);

  // بدء العرض
  useEffect(() => {
    setTimeout(() => {
      setFadeOpacity(0);
      setKbActive(true);
      setTimeout(() => setShowCaption(true), 1500);
    }, 500);
  }, []);

  // التشغيل التلقائي
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    const INTERVAL = 50;
    progressRef.current = setInterval(() => {
      progressValueRef.current = Math.min(progressValueRef.current + (INTERVAL / SCENE_DURATION) * 100, 100);
      setProgress(progressValueRef.current);
    }, INTERVAL);

    timerRef.current = setTimeout(() => {
      goToScene((currentIndex + 1) % scenes.length);
    }, SCENE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, currentIndex, goToScene, scenes.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRefine = () => {
    if (!refineFeedback.trim() || !result.projectId) return;
    setIsRefining(true);
    refineMutation.mutate({
      projectId: result.projectId,
      feedback: refineFeedback,
    });
  };

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* ===== الصورة الرئيسية مع Ken Burns ===== */}
      {currentScene?.imageUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            key={`${currentScene.imageUrl}-${currentIndex}`}
            src={currentScene.imageUrl}
            alt={currentScene.label}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: kbActive ? kb.end : kb.start,
              transition: kbActive ? `transform ${SCENE_DURATION}ms ease-out` : "none",
              transformOrigin: "center center",
            }}
          />
        </div>
      )}

      {/* ===== تدرجات سينمائية ===== */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/20 pointer-events-none" />

      {/* ===== Fade to Black ===== */}
      <div
        className="absolute inset-0 bg-black pointer-events-none z-10"
        style={{ opacity: fadeOpacity, transition: "opacity 0.6s ease-in-out" }}
      />

      {/* ===== HUD — شريط علوي ===== */}
      {showHUD && (
        <div
          className="absolute top-0 left-0 right-0 z-20 px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}
        >
          {/* الشعار والسيناريو */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span
                className="text-3xl font-black leading-none"
                style={{
                  background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  letterSpacing: "-0.02em",
                }}
              >
                خيال
              </span>
              <span className="text-white/30 text-xs tracking-widest uppercase mt-0.5">KHAYAL AI</span>
            </div>
            <div
              className="h-8 w-px"
              style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}60, transparent)` }}
            />
            <div className="flex flex-col">
              <span className="text-white/40 text-xs">السيناريو</span>
              <span className="text-white text-sm font-semibold" style={{ color: accentColor }}>
                {SCENARIO_LABELS[result.scenarioType]}
              </span>
            </div>
          </div>

          {/* معلومات المشهد + عداد */}
          <div className="flex items-center gap-4">
            {/* نقاط التنقل */}
            <div className="flex items-center gap-1.5">
              {scenes.map((_: GeneratedScene, i: number) => (
                <button
                  key={i}
                  onClick={() => goToScene(i)}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: i === currentIndex ? "28px" : "6px",
                    height: "6px",
                    background: i === currentIndex
                      ? `linear-gradient(90deg, ${accentColor}, #60a5fa)`
                      : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>

            {/* رقم المشهد */}
            <div className="text-right">
              <span className="text-white/30 text-xs">مشهد</span>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-black text-xl leading-none">{String(currentIndex + 1).padStart(2, "0")}</span>
                <span className="text-white/30 text-sm">/ {String(scenes.length).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== النص الشعري والعنوان ===== */}
      <div
        className="absolute bottom-28 right-0 left-0 px-8 z-20"
        style={{
          opacity: showCaption ? 1 : 0,
          transform: showCaption ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
        }}
      >
        <div className="max-w-3xl">
          {/* السياق الثقافي */}
          {result.culturalContext && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-px" style={{ background: accentColor }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: accentColor }}>
                {result.culturalContext}
              </span>
            </div>
          )}

          {/* عنوان المشهد */}
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
          >
            {currentScene?.label}
          </h2>

          {/* النص الشعري */}
          {currentScene?.arabicCaption && (
            <p
              className="text-lg md:text-xl font-light mb-2"
              style={{
                color: "rgba(255,255,255,0.75)",
                textShadow: "0 1px 10px rgba(0,0,0,0.9)",
                fontStyle: "italic",
              }}
            >
              {currentScene.arabicCaption}
            </p>
          )}

          {/* الوصف المختصر */}
          <p
            className="text-sm text-white/40 max-w-xl leading-relaxed line-clamp-2"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
          >
            {result.description}
          </p>
        </div>
      </div>

      {/* ===== شريط التحكم السفلي ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* شريط التقدم */}
        <div className="w-full h-0.5 bg-white/10 relative overflow-hidden">
          <div
            className="h-full absolute top-0 right-0"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${accentColor}, #60a5fa)`,
              boxShadow: `0 0 8px ${accentColor}`,
              transition: "width 0.05s linear",
              left: 0,
            }}
          />
        </div>

        <div
          className="px-6 py-3 flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 100%)" }}
        >
          {/* أزرار التشغيل */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToScene(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 text-lg"
            >
              ‹
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all text-sm"
              style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}50` }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => goToScene(currentIndex + 1)}
              disabled={currentIndex === scenes.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 text-lg"
            >
              ›
            </button>
          </div>

          {/* مصغرات المشاهد */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 max-w-sm mx-4">
            {scenes.map((scene: GeneratedScene, i: number) => (
              <button
                key={i}
                onClick={() => goToScene(i)}
                className="flex-shrink-0 rounded overflow-hidden transition-all duration-300"
                style={{
                  width: "44px",
                  height: "30px",
                  border: i === currentIndex ? `2px solid ${accentColor}` : "2px solid rgba(255,255,255,0.1)",
                  opacity: i === currentIndex ? 1 : 0.45,
                  transform: i === currentIndex ? "scale(1.05)" : "scale(1)",
                }}
              >
                <img src={scene.imageUrl} alt={scene.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* أزرار الأدوات */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowInfo(s => !s)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
              title="معلومات المشروع"
            >
              ⓘ
            </button>
            <button
              onClick={() => setShowHUD(h => !h)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
              title="إخفاء/إظهار HUD"
            >
              {showHUD ? "◉" : "○"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              {isFullscreen ? "⊡" : "⛶"}
            </button>
            <button
              onClick={() => setShowRefinePanel(r => !r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: `${accentColor}20`,
                border: `1px solid ${accentColor}40`,
                color: accentColor,
              }}
            >
              ✦ تحسين
            </button>
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              خيال جديد
            </button>
          </div>
        </div>
      </div>

      {/* ===== لوحة التحسين الذاتي ===== */}
      {showRefinePanel && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 rounded-2xl p-5 w-full max-w-md"
          style={{
            background: "rgba(8,9,15,0.95)",
            border: `1px solid ${accentColor}30`,
            backdropFilter: "blur(24px)",
            boxShadow: `0 0 40px ${accentColor}15`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: accentColor }}>✦</span>
            <h3 className="text-white font-bold text-sm">تحسين المشهد بالذكاء الاصطناعي</h3>
          </div>
          <p className="text-white/40 text-xs mb-3">
            أخبر الذكاء الاصطناعي بما تريد تغييره أو تحسينه في المشاهد
          </p>
          <textarea
            value={refineFeedback}
            onChange={e => setRefineFeedback(e.target.value)}
            placeholder="مثال: أريد إضاءة أكثر دراماتيكية، أو أضف عناصر يابانية، أو اجعل المشهد أكثر مستقبلية..."
            className="w-full rounded-xl p-3 text-sm text-white placeholder-white/20 resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              minHeight: "80px",
            }}
            dir="rtl"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRefine}
              disabled={!refineFeedback.trim() || isRefining}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #60a5fa)` }}
            >
              {isRefining ? "جارٍ التحسين..." : "✦ طبّق التحسين"}
            </button>
            <button
              onClick={() => setShowRefinePanel(false)}
              className="px-4 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ===== لوحة معلومات المشروع ===== */}
      {showInfo && (
        <div
          className="absolute top-20 left-6 z-30 rounded-2xl p-5 w-72"
          style={{
            background: "rgba(8,9,15,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">معلومات المشروع</h3>
            <button onClick={() => setShowInfo(false)} className="text-white/30 hover:text-white text-xs">✕</button>
          </div>
          {result.title && (
            <div className="mb-2">
              <p className="text-white/30 text-xs">العنوان</p>
              <p className="text-white text-sm font-medium">{result.title}</p>
            </div>
          )}
          {result.culturalContext && (
            <div className="mb-2">
              <p className="text-white/30 text-xs">السياق الثقافي</p>
              <p style={{ color: accentColor }} className="text-sm">{result.culturalContext}</p>
            </div>
          )}
          {result.atmosphere && (
            <div className="mb-2">
              <p className="text-white/30 text-xs">الأجواء</p>
              <p className="text-white/70 text-sm">{result.atmosphere}</p>
            </div>
          )}
          {result.cinematicStyle && (
            <div className="mb-2">
              <p className="text-white/30 text-xs">الأسلوب السينمائي</p>
              <p className="text-white/70 text-sm">{result.cinematicStyle}</p>
            </div>
          )}
          {result.mainElements && result.mainElements.length > 0 && (
            <div>
              <p className="text-white/30 text-xs mb-1">العناصر الرئيسية</p>
              <div className="flex flex-wrap gap-1">
                {result.mainElements.map((el: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
                  >
                    {el}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
