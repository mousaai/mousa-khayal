/**
 * Home.tsx — منصة خيال
 * تحوّل أي وصف أو مستند أو صورة إلى مشهد سينمائي فوتوريالستيك احترافي
 */
import { useState, useRef, useCallback } from "react";
import KhayalInput from "@/components/KhayalInput";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";

export type GeneratedScene = {
  type: string;
  label: string;
  imageUrl: string;
  prompt: string;
  order: number;
};

export type GenerationResult = {
  projectId: number | null;
  scenes: GeneratedScene[];
  description: string;
  scenarioType: string;
};

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "input" | "generating" | "viewing">("landing");
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleStartCreate = () => setPhase("input");

  const handleGenerated = (data: GenerationResult) => {
    setResult(data);
    setPhase("viewing");
  };

  const handleGenerating = () => setPhase("generating");

  const handleBack = () => {
    setResult(null);
    setPhase("input");
  };

  // ===== شاشة البداية =====
  if (phase === "landing") {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#050608] flex flex-col items-center justify-center relative overflow-hidden"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        {/* خلفية نجوم */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 1 + "px",
                height: Math.random() * 2 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                opacity: Math.random() * 0.6 + 0.1,
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: Math.random() * 3 + "s",
              }}
            />
          ))}
        </div>

        {/* توهج مركزي */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(120,60,200,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(60,120,255,0.08)_0%,transparent_60%)]" />

        {/* المحتوى */}
        <div className="relative z-10 text-center max-w-3xl px-6">
          {/* الشعار */}
          <div className="mb-10 flex justify-center">
            <div className="relative w-28 h-28">
              <div
                className="absolute inset-0 rounded-full border border-purple-500/30"
                style={{ animation: "spin 12s linear infinite" }}
              />
              <div
                className="absolute inset-2 rounded-full border border-blue-400/20"
                style={{ animation: "spin 8s linear infinite reverse" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-5xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #60a5fa, #f0abfc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  خ
                </span>
              </div>
            </div>
          </div>

          {/* العنوان */}
          <h1
            className="text-7xl font-black mb-4 tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e2d9f3 0%, #a78bfa 40%, #60a5fa 70%, #f0abfc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            خيال
          </h1>

          <p className="text-purple-200/70 text-xl mb-3 font-light">
            من الخيال إلى المشهد السينمائي
          </p>
          <p className="text-blue-300/40 text-sm mb-12 max-w-lg mx-auto leading-relaxed">
            صف فكرتك بكلماتك، أو أرفع صورة أو مستنداً، أو شارك رابطاً —
            وشاهد خيالك يتحول إلى مشهد سينمائي فوتوريالستيك احترافي
          </p>

          {/* بطاقات القدرات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {[
              { icon: "🏛️", title: "مباني وعمارة", desc: "فلل، برج، مسجد" },
              { icon: "🌿", title: "حدائق وطبيعة", desc: "أحياء، منتزهات" },
              { icon: "🏭", title: "صناعة وبنية", desc: "مصانع، مجمعات" },
              { icon: "⏳", title: "سيناريوهات زمنية", desc: "تطور أو تدهور" },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl p-4 text-center border border-white/5"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="text-white/80 text-sm font-semibold mb-1">{c.title}</div>
                <div className="text-white/30 text-xs">{c.desc}</div>
              </div>
            ))}
          </div>

          {/* زر البدء */}
          <button
            onClick={handleStartCreate}
            className="group relative px-14 py-5 rounded-2xl text-white font-bold text-lg transition-all duration-500 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)",
              boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(79,70,229,0.2)",
            }}
          >
            <span className="relative z-10">ابدأ الإبداع</span>
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)" }}
            />
          </button>

          <p className="text-white/20 text-xs mt-6">
            مدعوم بالذكاء الاصطناعي · توليد صور فوتوريالستيك · إخراج سينمائي
          </p>
        </div>

        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.3); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ===== شاشة الإدخال =====
  if (phase === "input" || phase === "generating") {
    return (
      <KhayalInput
        isGenerating={phase === "generating"}
        onGenerating={handleGenerating}
        onGenerated={handleGenerated}
      />
    );
  }

  // ===== العارض السينمائي =====
  if (phase === "viewing" && result) {
    return (
      <KhayalCinematicViewer
        result={result}
        onBack={handleBack}
      />
    );
  }

  return null;
}
