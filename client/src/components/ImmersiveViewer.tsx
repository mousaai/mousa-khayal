/**
 * ImmersiveViewer.tsx — وضع "أنا هناك"
 * عارض الجولة الغمرية 360° — 6 زوايا سينمائية من داخل أي بيئة
 */
import { useState, useEffect, useCallback } from "react";
import type { ImmersiveResult, ImmersiveAngle } from "@/types/khayal";

// أيقونات الزوايا
const ANGLE_ICONS: Record<string, string> = {
  eye_level: "👁",
  look_up: "⬆",
  look_down: "⬇",
  look_back: "🔄",
  close_detail: "🔍",
  panoramic: "🌐",
};

// تسميات الزوايا بالعربية
const ANGLE_LABELS_AR: Record<string, string> = {
  eye_level: "أمامك",
  look_up: "فوقك",
  look_down: "تحتك",
  look_back: "خلفك",
  close_detail: "تفصيل",
  panoramic: "بانوراما",
};

// ألوان الزوايا
const ANGLE_COLORS: Record<string, string> = {
  eye_level: "#4488ff",
  look_up: "#aa44ff",
  look_down: "#44aaff",
  look_back: "#ff8844",
  close_detail: "#44ffaa",
  panoramic: "#ffdd44",
};

interface ImmersiveViewerProps {
  result: ImmersiveResult;
  onBack: () => void;
}

export default function ImmersiveViewer({ result, onBack }: ImmersiveViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showCompass, setShowCompass] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const angles = result.angles;
  const current = angles[activeIdx];

  // انتقال تلقائي كل 6 ثوانٍ
  useEffect(() => {
    if (!autoPlay || angles.length === 0) return;
    const t = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % angles.length);
        setIsTransitioning(false);
      }, 400);
    }, 6000);
    return () => clearInterval(t);
  }, [autoPlay, angles.length]);

  const goTo = useCallback((idx: number) => {
    if (idx === activeIdx) return;
    setAutoPlay(false);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setIsTransitioning(false);
    }, 300);
  }, [activeIdx]);

  const handleImageLoad = (idx: number) => {
    setLoadedImages(prev => new Set(Array.from(prev).concat(idx)));
  };

  if (!current) return null;

  const accentColor = ANGLE_COLORS[current.type] || "#4488ff";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#050810", fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
      dir="rtl"
    >
      {/* ── الصورة الرئيسية ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* صورة الخلفية المعتمة */}
        {angles.map((angle, idx) => (
          <div
            key={idx}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: idx === activeIdx ? 1 : 0 }}
          >
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(angle.imageUrl)}`}
              alt={angle.label_ar}
              className="w-full h-full object-cover"
              style={{
                filter: "brightness(0.85) saturate(1.1)",
                transform: isTransitioning && idx === activeIdx ? "scale(1.02)" : "scale(1)",
                transition: "transform 0.5s ease",
              }}
              onLoad={() => handleImageLoad(idx)}
            />
            {/* تدرج سفلي */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(5,8,16,0.95) 0%, rgba(5,8,16,0.4) 40%, rgba(5,8,16,0.1) 70%, transparent 100%)",
              }}
            />
          </div>
        ))}

        {/* ── شريط علوي ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2">
          {/* زر الرجوع */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ fontSize: "16px" }}>←</span>
            <span>خروج</span>
          </button>

          {/* العنوان */}
          <div className="text-center flex-1 mx-4">
            <div className="text-white font-bold text-lg leading-tight">{result.title}</div>
            <div className="text-xs mt-0.5" style={{ color: accentColor, opacity: 0.9 }}>
              أنا هناك — جولة غمر 360°
            </div>
          </div>

          {/* تبديل التشغيل التلقائي */}
          <button
            onClick={() => setAutoPlay(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
            style={{
              background: autoPlay ? `${accentColor}22` : "rgba(255,255,255,0.06)",
              color: autoPlay ? accentColor : "rgba(255,255,255,0.5)",
              border: `1px solid ${autoPlay ? accentColor + "44" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            {autoPlay ? "⏸ إيقاف" : "▶ تشغيل"}
          </button>
        </div>

        {/* ── البوصلة الغمرية (مؤشر الاتجاه) ── */}
        {showCompass && (
          <div
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(5,8,16,0.7)",
                border: `1px solid ${accentColor}44`,
                backdropFilter: "blur(12px)",
                color: accentColor,
              }}
            >
              <span style={{ fontSize: "14px" }}>{ANGLE_ICONS[current.type] || "👁"}</span>
              <span>{current.label_ar || ANGLE_LABELS_AR[current.type]}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>•</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{activeIdx + 1} / {angles.length}</span>
            </div>
          </div>
        )}

        {/* ── التعليق الشعري ── */}
        {current.caption_ar && (
          <div
            className="absolute bottom-32 left-0 right-0 z-20 px-6 text-center"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transition: "opacity 0.4s ease",
            }}
          >
            <p
              className="text-lg font-medium leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 2px 20px rgba(0,0,0,0.8)",
              }}
            >
              {current.caption_ar}
            </p>
          </div>
        )}

        {/* ── أزرار التنقل اليسار/اليمين ── */}
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "18px",
          }}
          onClick={() => goTo((activeIdx - 1 + angles.length) % angles.length)}
        >
          ‹
        </button>
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "18px",
          }}
          onClick={() => goTo((activeIdx + 1) % angles.length)}
        >
          ›
        </button>
      </div>

      {/* ── شريط الزوايا السفلي ── */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{ background: "rgba(5,8,16,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* شريط التقدم */}
        <div className="flex gap-1 mb-3 px-1">
          {angles.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-0.5 rounded-full transition-all duration-300"
              style={{
                background: idx === activeIdx ? accentColor : "rgba(255,255,255,0.15)",
                transform: idx === activeIdx ? "scaleY(2)" : "scaleY(1)",
              }}
            />
          ))}
        </div>

        {/* بطاقات الزوايا */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {angles.map((angle, idx) => {
            const color = ANGLE_COLORS[angle.type] || "#4488ff";
            const isActive = idx === activeIdx;
            const isLoaded = loadedImages.has(idx);
            return (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  width: isActive ? "100px" : "72px",
                  height: "64px",
                  border: isActive ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.08)",
                  opacity: isActive ? 1 : 0.65,
                  position: "relative",
                }}
              >
                {/* الصورة المصغرة */}
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(angle.imageUrl)}`}
                  alt={angle.label_ar}
                  className="w-full h-full object-cover"
                  style={{ filter: isActive ? "none" : "brightness(0.6)" }}
                />
                {/* تدرج */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }}
                />
                {/* الأيقونة والتسمية */}
                <div className="absolute bottom-1 left-0 right-0 flex flex-col items-center">
                  <span style={{ fontSize: "10px", lineHeight: 1 }}>{ANGLE_ICONS[angle.type] || "👁"}</span>
                  <span
                    className="text-center leading-tight mt-0.5"
                    style={{
                      fontSize: "8px",
                      color: isActive ? color : "rgba(255,255,255,0.7)",
                      fontWeight: isActive ? "700" : "400",
                    }}
                  >
                    {angle.label_ar || ANGLE_LABELS_AR[angle.type]}
                  </span>
                </div>
                {/* مؤشر التحميل */}
                {!isLoaded && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(5,8,16,0.6)" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${color}44`, borderTopColor: color }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* وصف البيئة */}
        <div className="mt-2 px-1">
          <p
            className="text-xs leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {result.environment}
          </p>
        </div>
      </div>
    </div>
  );
}
