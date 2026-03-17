import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";
import type { GenerationResult } from "@/types/khayal";

// Cinematic background scenes from AI-generated images
const PORTAL_SCENES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg1_arabic_city-8Wa5PtssoJfMK2RA5MW2cT.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg2_japan-6xDFhodE3d7QLwCUpaVEhe.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg3_future-HL7rh3UKxbcdCBogEhTRiN.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg4_nature-3KN8mPQzqMAnzE5Kkg9WMT.webp",
];

const SPACE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_portal_bg-oHnxyxTZx3h9RPmBuw3ZWw.webp";

const EXAMPLE_PROMPTS = [
  "مسجد عثماني فاخر في قلب إسطنبول، قباب ذهبية تلمع تحت ضوء الغروب",
  "ناطحة سحاب مستقبلية في دبي تعلوها حدائق معلقة وأضواء نيون",
  "قرية يابانية هادئة على ضفاف بحيرة في موسم الخريف",
  "مدينة خيال علمي طائرة فوق السحاب بتقنية Avatar",
  "قصر أندلسي بحدائق الحمراء وأنهار تتدفق بين الأروقة",
  "حي سكني إيطالي قديم على تل مطل على البحر المتوسط",
];

const SCENARIOS = [
  { id: "new", label: "✦ تصميم جديد", color: "#a78bfa" },
  { id: "develop", label: "◈ تطوير وازدهار", color: "#34d399" },
  { id: "decay", label: "◉ تدهور وتقادم", color: "#f87171" },
  { id: "future", label: "⟡ مستقبل متخيل", color: "#60a5fa" },
  { id: "compare", label: "⊞ مقارنة زمنية", color: "#fbbf24" },
  { id: "free", label: "∞ خيال حر", color: "#e879f9" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [scenario, setScenario] = useState("free");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [portalSceneIdx, setPortalSceneIdx] = useState(0);
  const [portalPulse, setPortalPulse] = useState(false);
  const [bgSceneIdx, setBgSceneIdx] = useState(0);
  const [particles, setParticles] = useState<Array<{id:number;x:number;y:number;size:number;speed:number;opacity:number}>>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const generateMutation = trpc.khayal.generateScene.useMutation();

  // Initialize particles
  useEffect(() => {
    const pts = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 0.015 + 0.005,
      opacity: Math.random() * 0.7 + 0.2,
    }));
    setParticles(pts);
  }, []);

  // Animate particles
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y - p.speed < -2 ? 102 : p.y - p.speed,
        x: p.x + Math.sin(Date.now() * 0.0003 + p.id) * 0.02,
        opacity: 0.2 + Math.abs(Math.sin(Date.now() * 0.001 + p.id)) * 0.6,
      })));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Rotate portal scene every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setPortalSceneIdx(i => (i + 1) % PORTAL_SCENES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Rotate background every 8s
  useEffect(() => {
    const t = setInterval(() => {
      setBgSceneIdx(i => (i + 1) % PORTAL_SCENES.length);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  // Pulse portal when typing
  useEffect(() => {
    if (prompt.length > 0) {
      setPortalPulse(true);
    } else {
      setPortalPulse(false);
    }
  }, [prompt]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  const handleVoiceRecord = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data.text) setPrompt(prev => prev ? prev + " " + data.text : data.text);
        } catch {
          // fallback: show placeholder
          setPrompt(prev => prev + " [جارٍ التحويل...]");
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      alert("يرجى السماح بالوصول للميكروفون");
    }
  }, [isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0 && !urlInput) return;
    setIsGenerating(true);
    setPortalPulse(true);

    try {
      // Upload files if any
      let fileUrls: string[] = [];
      for (const file of uploadedFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) fileUrls.push(data.url);
      }

      const res = await generateMutation.mutateAsync({
        description: prompt || "خيال حر",
        scenarioType: scenario === "new" ? "design" : scenario === "develop" ? "develop" : scenario === "decay" ? "deteriorate" : scenario === "compare" ? "compare" : "imagine",
        referenceImageUrl: fileUrls[0] || urlInput || undefined,
        title: prompt.slice(0, 60) || "خيال",
      });

      setResult(res as GenerationResult);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (result) {
    return (
      <KhayalCinematicViewer
        result={result}
        onBack={() => setResult(null)}
        onRefine={(feedback) => {
          setPrompt(prev => prev + "\n\nتحسين: " + feedback);
          setResult(null);
        }}
      />
    );
  }

  const activeScenario = SCENARIOS.find(s => s.id === scenario);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020408]" dir="rtl">

      {/* === COSMIC BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        {/* Space nebula base */}
        <div
          className="absolute inset-0 transition-opacity duration-3000"
          style={{
            backgroundImage: `url(${SPACE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.4,
          }}
        />
        {/* Rotating scene overlay */}
        {PORTAL_SCENES.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-2000"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === bgSceneIdx ? 0.12 : 0,
            }}
          />
        ))}
        {/* Deep dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-transparent to-[#020408] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020408] via-transparent to-[#020408] opacity-60" />
        {/* Radial glow center */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(120,60,220,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* === FLOATING PARTICLES === */}
      <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.id % 3 === 0 ? "#a78bfa" : p.id % 3 === 1 ? "#60a5fa" : "#f0e6ff",
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${p.id % 3 === 0 ? "rgba(167,139,250,0.4)" : "rgba(96,165,250,0.3)"}`,
            }}
          />
        ))}
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">

        {/* === COSMIC PORTAL === */}
        <div className="relative flex items-center justify-center mb-6 mt-4" style={{ width: 280, height: 280 }}>

          {/* Outer rotating rings */}
          <div
            className="absolute rounded-full border border-purple-500/20"
            style={{
              width: 280, height: 280,
              animation: "spin 20s linear infinite",
              boxShadow: "0 0 40px rgba(139,92,246,0.15)",
            }}
          />
          <div
            className="absolute rounded-full border border-blue-400/15"
            style={{
              width: 250, height: 250,
              animation: "spin 15s linear infinite reverse",
            }}
          />

          {/* Pulsing glow rings */}
          {[1,2,3].map(i => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 220 + i * 20,
                height: 220 + i * 20,
                border: `1px solid rgba(139,92,246,${0.15 - i * 0.04})`,
                animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}

          {/* Portal circle with scene */}
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: 200,
              height: 200,
              boxShadow: portalPulse
                ? "0 0 60px 20px rgba(139,92,246,0.5), 0 0 120px 40px rgba(96,165,250,0.3), inset 0 0 40px rgba(139,92,246,0.3)"
                : "0 0 40px 10px rgba(139,92,246,0.3), 0 0 80px 20px rgba(96,165,250,0.15), inset 0 0 20px rgba(139,92,246,0.2)",
              transition: "box-shadow 0.5s ease",
              border: "2px solid rgba(139,92,246,0.6)",
            }}
          >
            {/* Scene images cycling */}
            {PORTAL_SCENES.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1500"
                style={{
                  opacity: i === portalSceneIdx ? 1 : 0,
                  transform: `scale(${portalPulse ? 1.08 : 1.03})`,
                  transition: "opacity 1.5s ease, transform 4s ease",
                }}
              />
            ))}
            {/* Portal overlay gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle at center, transparent 40%, rgba(2,4,8,0.6) 100%)",
              }}
            />
            {/* Center glow */}
            {portalPulse && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "pulse 1s ease-in-out infinite" }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: 60, height: 60,
                    background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Orbiting dots */}
          {[0, 120, 240].map((deg, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: 8, height: 8,
                animation: `orbit${i} ${6 + i}s linear infinite`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: i === 0 ? "#a78bfa" : i === 1 ? "#60a5fa" : "#f0abfc",
                  boxShadow: `0 0 8px 3px ${i === 0 ? "rgba(167,139,250,0.8)" : i === 1 ? "rgba(96,165,250,0.8)" : "rgba(240,171,252,0.8)"}`,
                }}
              />
            </div>
          ))}
        </div>

        {/* === TITLE === */}
        <div className="text-center mb-8">
          <h1
            className="text-7xl font-bold mb-3"
            style={{
              fontFamily: "'Tajawal', sans-serif",
              background: "linear-gradient(135deg, #e2d9f3 0%, #a78bfa 40%, #60a5fa 70%, #f0abfc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              letterSpacing: "0.05em",
              filter: "drop-shadow(0 0 30px rgba(139,92,246,0.5))",
            }}
          >
            خيال
          </h1>
          <p
            className="text-lg"
            style={{
              fontFamily: "'Tajawal', sans-serif",
              color: "rgba(196,181,253,0.8)",
              letterSpacing: "0.15em",
            }}
          >
            حوّل أي فكرة إلى مشهد سينمائي
          </p>
          <div
            className="flex items-center justify-center gap-3 mt-2 text-xs"
            style={{ color: "rgba(148,163,184,0.6)", fontFamily: "'Tajawal', sans-serif" }}
          >
            <span>معمارة</span>
            <span className="text-purple-400">◆</span>
            <span>حضارات</span>
            <span className="text-blue-400">◆</span>
            <span>خيال علمي</span>
            <span className="text-pink-400">◆</span>
            <span>طبيعة</span>
            <span className="text-purple-400">◆</span>
            <span>مستقبل</span>
          </div>
        </div>

        {/* === MAIN INPUT BOX — ChatGPT style === */}
        <div
          className="w-full max-w-3xl"
          style={{
            background: "rgba(15,10,30,0.85)",
            border: `1px solid ${portalPulse ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.25)"}`,
            borderRadius: 20,
            backdropFilter: "blur(20px)",
            boxShadow: portalPulse
              ? "0 0 40px rgba(139,92,246,0.2), 0 20px 60px rgba(0,0,0,0.5)"
              : "0 0 20px rgba(139,92,246,0.1), 0 20px 60px rgba(0,0,0,0.4)",
            transition: "all 0.4s ease",
          }}
        >
          {/* Uploaded files preview */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 pb-0">
              {uploadedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <span>{f.type.startsWith("image/") ? "🖼" : "📄"}</span>
                  <span style={{ fontFamily: "'Tajawal', sans-serif" }}>{f.name.slice(0, 20)}</span>
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="mr-1 opacity-60 hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          )}

          {/* URL input */}
          {showUrlInput && (
            <div className="px-4 pt-3">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="أدخل رابط موقع أو صورة..."
                className="w-full bg-transparent outline-none text-sm"
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  color: "#a78bfa",
                  borderBottom: "1px solid rgba(139,92,246,0.3)",
                  paddingBottom: 8,
                }}
              />
            </div>
          )}

          {/* Main textarea */}
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="صف خيالك... مبنى، حديقة، مدينة، مسجد، عالم خيال علمي، أي شيء تتخيله"
              rows={2}
              className="w-full bg-transparent outline-none resize-none text-base leading-relaxed"
              style={{
                fontFamily: "'Tajawal', sans-serif",
                color: "rgba(226,214,255,0.9)",
                minHeight: 56,
                maxHeight: 200,
              }}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 gap-2">

            {/* Left: scenario chips */}
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className="px-2 py-1 rounded-full text-xs transition-all"
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    background: scenario === s.id ? `${s.color}22` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${scenario === s.id ? s.color : "rgba(255,255,255,0.08)"}`,
                    color: scenario === s.id ? s.color : "rgba(148,163,184,0.7)",
                    transform: scenario === s.id ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}
                title="رفع صور أو مستندات"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

              {/* URL */}
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: showUrlInput ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.1)",
                  border: `1px solid ${showUrlInput ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.2)"}`,
                  color: "#60a5fa"
                }}
                title="إضافة رابط"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              </button>

              {/* Microphone */}
              <button
                onClick={handleVoiceRecord}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: isRecording ? "rgba(239,68,68,0.2)" : "rgba(167,139,250,0.1)",
                  border: `1px solid ${isRecording ? "rgba(239,68,68,0.6)" : "rgba(167,139,250,0.2)"}`,
                  color: isRecording ? "#ef4444" : "#a78bfa",
                  animation: isRecording ? "pulse 1s ease-in-out infinite" : "none",
                }}
                title="تسجيل صوتي"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </button>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && uploadedFiles.length === 0 && !urlInput)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  background: isGenerating
                    ? "rgba(139,92,246,0.3)"
                    : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)",
                  color: "white",
                  boxShadow: isGenerating ? "none" : "0 0 20px rgba(124,58,237,0.4)",
                  minWidth: 110,
                }}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>يُشكّل...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 16 }}>✦</span>
                    <span>شكّل الخيال</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* === GENERATING ANIMATION === */}
        {isGenerating && (
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {[0,1,2,3,4].map(i => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 8, height: 8,
                    background: "#a78bfa",
                    animation: `bounce 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: "'Tajawal', sans-serif", color: "rgba(196,181,253,0.7)", fontSize: 14 }}>
              يُحلّل الخيال ويُشكّل المشاهد السينمائية...
            </p>
          </div>
        )}

        {/* === EXAMPLE PROMPTS === */}
        {!isGenerating && (
          <div className="mt-8 w-full max-w-3xl">
            <p
              className="text-center text-xs mb-3"
              style={{ fontFamily: "'Tajawal', sans-serif", color: "rgba(148,163,184,0.5)" }}
            >
              أمثلة للإلهام
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all hover:scale-105"
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: "rgba(196,181,253,0.7)",
                  }}
                >
                  {ex.length > 45 ? ex.slice(0, 45) + "..." : ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === CAPABILITIES ROW === */}
        <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: "🏛", label: "معمارة" },
            { icon: "🌿", label: "حدائق وطبيعة" },
            { icon: "🕌", label: "مساجد وتراث" },
            { icon: "🚀", label: "خيال علمي" },
            { icon: "🌆", label: "أحياء ومدن" },
            { icon: "🏭", label: "صناعة وبنية" },
            { icon: "⏳", label: "محاكاة زمنية" },
            { icon: "🌍", label: "كل حضارات العالم" },
          ].map((cap, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs"
              style={{ fontFamily: "'Tajawal', sans-serif", color: "rgba(148,163,184,0.5)" }}
            >
              <span>{cap.icon}</span>
              <span>{cap.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* === CSS ANIMATIONS === */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes orbit0 {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: rotate(120deg) translateX(120px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(120px) rotate(-480deg); }
        }
        @keyframes orbit2 {
          from { transform: rotate(240deg) translateX(120px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(120px) rotate(-600deg); }
        }
        .transition-opacity { transition-property: opacity; }
        .duration-1500 { transition-duration: 1500ms; }
        .duration-2000 { transition-duration: 2000ms; }
        .duration-3000 { transition-duration: 3000ms; }
      `}</style>
    </div>
  );
}
