/**
 * KhayalCinematicViewer.tsx
 * العارض السينمائي لمنصة خيال
 * يعرض المشاهد المولّدة كفيلم سينمائي احترافي مع:
 * - حركة Ken Burns على الصور
 * - انتقالات fade to black
 * - تراكب HUD بيانات
 * - نصوص عربية احترافية
 * - شريط تحكم سينمائي
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { GenerationResult, GeneratedScene } from "@/pages/Home";

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
  imagine:     "#a78bfa",
};

// تأثيرات Ken Burns المختلفة
const KEN_BURNS_EFFECTS = [
  { transform: "scale(1.15) translate(-3%, -2%)", transition: "transform 8s ease-out" },
  { transform: "scale(1.2) translate(3%, 2%)",   transition: "transform 8s ease-out" },
  { transform: "scale(1.1) translate(0%, -4%)",  transition: "transform 8s ease-out" },
  { transform: "scale(1.18) translate(-2%, 3%)", transition: "transform 8s ease-out" },
  { transform: "scale(1.12) translate(4%, -1%)", transition: "transform 8s ease-out" },
];

interface Props {
  result: GenerationResult;
  onBack: () => void;
}

export default function KhayalCinematicViewer({ result, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeState, setFadeState] = useState<"visible" | "fading" | "black">("black");
  const [showHUD, setShowHUD] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [kbEffect, setKbEffect] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenes = result.scenes;
  const currentScene = scenes[currentIndex];
  const accentColor = SCENARIO_COLORS[result.scenarioType] || "#a78bfa";

  // تشغيل المشهد التالي
  const goToScene = useCallback((index: number) => {
    if (index < 0 || index >= scenes.length) return;
    setFadeState("fading");
    setTimeout(() => {
      setFadeState("black");
      setCurrentIndex(index);
      setKbEffect(index % KEN_BURNS_EFFECTS.length);
      setProgress(0);
      setShowTitle(true);
      setTimeout(() => {
        setFadeState("visible");
        setTimeout(() => setShowTitle(false), 4000);
      }, 600);
    }, 500);
  }, [scenes.length]);

  // التشغيل التلقائي
  useEffect(() => {
    if (fadeState === "black" && currentIndex === 0) {
      setTimeout(() => {
        setFadeState("visible");
        setShowTitle(true);
        setTimeout(() => setShowTitle(false), 4000);
      }, 800);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    const SCENE_DURATION = 8000;
    const PROGRESS_INTERVAL = 50;

    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + (PROGRESS_INTERVAL / SCENE_DURATION) * 100, 100));
    }, PROGRESS_INTERVAL);

    timerRef.current = setTimeout(() => {
      const next = (currentIndex + 1) % scenes.length;
      goToScene(next);
    }, SCENE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, currentIndex, goToScene, scenes.length]);

  const togglePlay = () => setIsPlaying(p => !p);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const kb = KEN_BURNS_EFFECTS[kbEffect];

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="relative w-screen h-screen bg-black overflow-hidden"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* ===== الصورة الرئيسية مع Ken Burns ===== */}
      {currentScene?.imageUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            key={currentScene.imageUrl}
            src={currentScene.imageUrl}
            alt={currentScene.label}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: fadeState === "visible" ? kb.transform : "scale(1)",
              transition: fadeState === "visible" ? kb.transition : "none",
              transformOrigin: "center center",
            }}
          />
        </div>
      )}

      {/* ===== تدرج لوني سينمائي ===== */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

      {/* ===== Fade to Black ===== */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500 pointer-events-none"
        style={{ opacity: fadeState === "visible" ? 0 : fadeState === "fading" ? 0.7 : 1 }}
      />

      {/* ===== HUD — شريط علوي ===== */}
      {showHUD && (
        <div className="absolute top-0 left-0 right-0 p-6 flex items-start justify-between z-20">
          {/* اسم المنصة */}
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-black"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #60a5fa)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              خيال
            </span>
            <div
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              {SCENARIO_LABELS[result.scenarioType]}
            </div>
          </div>

          {/* عداد المشاهد */}
          <div className="flex items-center gap-2">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => goToScene(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? "24px" : "6px",
                  height: "6px",
                  background: i === currentIndex ? accentColor : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== عنوان المشهد (يظهر ويختفي) ===== */}
      <div
        className="absolute bottom-32 right-0 left-0 px-8 z-20 transition-all duration-1000"
        style={{ opacity: showTitle ? 1 : 0, transform: showTitle ? "translateY(0)" : "translateY(20px)" }}
      >
        <div className="max-w-2xl">
          <p
            className="text-xs font-medium mb-2 tracking-widest uppercase"
            style={{ color: accentColor }}
          >
            {String(currentIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
            {currentScene?.label}
          </h2>
          <p className="text-white/50 text-sm max-w-lg leading-relaxed line-clamp-2">
            {result.description}
          </p>
        </div>
      </div>

      {/* ===== شريط التحكم السفلي ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* شريط التقدم */}
        <div className="w-full h-0.5 bg-white/10">
          <div
            className="h-full transition-none"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentColor}, #60a5fa)` }}
          />
        </div>

        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}
        >
          {/* أزرار التنقل */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToScene(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              ‹
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all"
              style={{ background: `${accentColor}30`, border: `1px solid ${accentColor}50` }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => goToScene(currentIndex + 1)}
              disabled={currentIndex === scenes.length - 1}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {/* مصغرات المشاهد */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-xs md:max-w-md">
            {scenes.map((scene, i) => (
              <button
                key={i}
                onClick={() => goToScene(i)}
                className="flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
                style={{
                  width: "48px",
                  height: "32px",
                  border: i === currentIndex ? `2px solid ${accentColor}` : "2px solid transparent",
                  opacity: i === currentIndex ? 1 : 0.5,
                }}
              >
                <img src={scene.imageUrl} alt={scene.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* أزرار الأدوات */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHUD(h => !h)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
              title="إخفاء/إظهار HUD"
            >
              {showHUD ? "◉" : "○"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              {isFullscreen ? "⊡" : "⛶"}
            </button>
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              خيال جديد
            </button>
          </div>
        </div>
      </div>

      {/* ===== شاشة المشهد الفردي (عند الإيقاف) ===== */}
      {!isPlaying && currentScene && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-2xl p-6 max-w-sm w-full mx-4"
          style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}
        >
          <p className="text-white/40 text-xs mb-1">{currentScene.type}</p>
          <h3 className="text-white font-bold text-lg mb-2">{currentScene.label}</h3>
          <p className="text-white/40 text-xs leading-relaxed line-clamp-4">{currentScene.prompt}</p>
          <button
            onClick={togglePlay}
            className="mt-4 w-full py-2 rounded-xl text-white text-sm font-medium transition-all"
            style={{ background: `${accentColor}30`, border: `1px solid ${accentColor}50` }}
          >
            ▶ استمرار العرض
          </button>
        </div>
      )}
    </div>
  );
}
