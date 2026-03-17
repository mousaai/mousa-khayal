/**
 * Home.tsx — منصة خيال الرئيسية
 * ميكروفون تفاعلي حي + بوابة كونية + دعم متعدد اللغات + بدون تصنيفات يدوية
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";
import type { GenerationResult } from "@/types/khayal";

// ── صور الخلفية ──────────────────────────────────────────────────────────────
const PORTAL_SCENES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg1_arabic_city-8Wa5PtssoJfMK2RA5MW2cT.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg2_japan-6xDFhodE3d7QLwCUpaVEhe.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg3_future-HL7rh3UKxbcdCBogEhTRiN.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_bg4_nature-3KN8mPQzqMAnzE5Kkg9WMT.webp",
];
const SPACE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_portal_bg-oHnxyxTZx3h9RPmBuw3ZWw.webp";

// ── أمثلة بعدة لغات ──────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { text: "مسجد عثماني فاخر في إسطنبول، قباب ذهبية تحت ضوء الغروب", lang: "AR" },
  { text: "A futuristic skyscraper in Dubai with hanging gardens and neon lights", lang: "EN" },
  { text: "京都の静かな竹林に囲まれた古い日本の神社", lang: "JA" },
  { text: "Une villa méditerranéenne sur les falaises d'Amalfi au coucher du soleil", lang: "FR" },
  { text: "مدينة خيال علمي طائرة فوق السحاب بتقنية Avatar", lang: "AR" },
  { text: "Un palazzo rinascimentale italiano con giardini segreti e fontane", lang: "IT" },
  { text: "A decaying Soviet-era brutalist complex reclaimed by nature", lang: "EN" },
  { text: "上海外滩的未来主义摩天大楼群，霓虹灯倒映在黄浦江上", lang: "ZH" },
];

// ── نصوص الواجهة متعددة اللغات ───────────────────────────────────────────────
const UI_LANGS: Record<string, {
  placeholder: string; btn: string; listening: string; processing: string;
  examples: string; tagline: string; sub: string;
}> = {
  AR: {
    placeholder: "صِف ما تتخيله... مبنى، حديقة، مدينة، مشهد طبيعي، عالم خيالي...",
    btn: "شكّل الخيال",
    listening: "يستمع...",
    processing: "يُحلّل...",
    examples: "أمثلة للإلهام",
    tagline: "خيال",
    sub: "حوّل أي وصف إلى مشهد سينمائي",
  },
  EN: {
    placeholder: "Describe what you imagine... a building, garden, city, sci-fi world...",
    btn: "Visualize",
    listening: "Listening...",
    processing: "Analyzing...",
    examples: "Inspiration examples",
    tagline: "Khayal",
    sub: "Transform any description into a cinematic scene",
  },
  JA: {
    placeholder: "想像するものを説明してください... 建物、庭園、都市、SF世界...",
    btn: "可視化",
    listening: "聴いています...",
    processing: "分析中...",
    examples: "インスピレーション例",
    tagline: "خيال",
    sub: "あらゆる説明を映画的シーンに変換",
  },
  FR: {
    placeholder: "Décrivez ce que vous imaginez... un bâtiment, jardin, ville, monde SF...",
    btn: "Visualiser",
    listening: "Écoute...",
    processing: "Analyse...",
    examples: "Exemples d'inspiration",
    tagline: "خيال",
    sub: "Transformez toute description en scène cinématographique",
  },
  ZH: {
    placeholder: "描述您想象的内容... 建筑、花园、城市、科幻世界...",
    btn: "可视化",
    listening: "聆听中...",
    processing: "分析中...",
    examples: "灵感示例",
    tagline: "خيال",
    sub: "将任何描述转化为电影场景",
  },
  IT: {
    placeholder: "Descrivi cosa immagini... un edificio, giardino, città, mondo fantascientifico...",
    btn: "Visualizza",
    listening: "Ascolta...",
    processing: "Analizza...",
    examples: "Esempi di ispirazione",
    tagline: "خيال",
    sub: "Trasforma qualsiasi descrizione in una scena cinematografica",
  },
  ES: {
    placeholder: "Describe lo que imaginas... un edificio, jardín, ciudad, mundo de ciencia ficción...",
    btn: "Visualizar",
    listening: "Escuchando...",
    processing: "Analizando...",
    examples: "Ejemplos de inspiración",
    tagline: "خيال",
    sub: "Transforma cualquier descripción en una escena cinematográfica",
  },
  HI: {
    placeholder: "वर्णन करें जो आप कल्पना करते हैं... एक इमारत, बगीचा, शहर, काल्पनिक दुनिया...",
    btn: "कल्पना करें",
    listening: "सुन रहा है...",
    processing: "विश्लेषण...",
    examples: "प्रेरणा के उदाहरण",
    tagline: "خيال",
    sub: "किसी भी विवरण को सिनेमाई दृश्य में बदलें",
  },
};

const LANG_KEYS = Object.keys(UI_LANGS);

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Mic state
  const [isRecording, setIsRecording] = useState(false);
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [volume, setVolume] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(28).fill(0.5));

  // File / URL
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // UI
  const [bgIdx, setBgIdx] = useState(0);
  const [portalIdx, setPortalIdx] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; opacity: number }>>([]);
  const [activeLang, setActiveLang] = useState("AR");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [portalGlow, setPortalGlow] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const waveAnimRef = useRef<number>(0);

  const lang = UI_LANGS[activeLang] || UI_LANGS.AR;
  const isRTL = activeLang === "AR";

  const generateMutation = trpc.khayal.generateScene.useMutation();

  // ── Particles ──
  useEffect(() => {
    setParticles(Array.from({ length: 80 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5, speed: Math.random() * 0.015 + 0.005,
      opacity: Math.random() * 0.7 + 0.2,
    })));
  }, []);

  useEffect(() => {
    let f: number;
    const animate = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y - p.speed < -2 ? 102 : p.y - p.speed,
        x: p.x + Math.sin(Date.now() * 0.0003 + p.id) * 0.02,
        opacity: 0.2 + Math.abs(Math.sin(Date.now() * 0.001 + p.id)) * 0.6,
      })));
      f = requestAnimationFrame(animate);
    };
    f = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(f);
  }, []);

  // ── Scene rotation ──
  useEffect(() => {
    const t = setInterval(() => setPortalIdx(i => (i + 1) % PORTAL_SCENES.length), 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setBgIdx(i => (i + 1) % PORTAL_SCENES.length), 8000);
    return () => clearInterval(t);
  }, []);

  // ── Portal glow on typing ──
  useEffect(() => { setPortalGlow(prompt.length > 0); }, [prompt]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [prompt]);

  // ── Live waveform animation ──
  const startWaveAnimation = useCallback(() => {
    const draw = () => {
      if (!analyserRef.current) return;
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setVolume(rms);

      // Build 28-bar waveform
      const barCount = 28;
      const step = Math.floor(bufferLength / barCount);
      const bars = Array.from({ length: barCount }, (_, i) => {
        const val = dataArray[i * step] / 128.0; // 0..2
        return Math.max(0.05, Math.min(1, Math.abs(val - 1) * 2.5 + 0.05));
      });
      setWaveData(bars);

      waveAnimRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const stopWaveAnimation = useCallback(() => {
    cancelAnimationFrame(waveAnimRef.current);
    setVolume(0);
    setWaveData(Array(28).fill(0.05));
  }, []);

  // ── Microphone ──
  const handleVoiceRecord = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setMicState("processing");
      stopWaveAnimation();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect Web Audio API for live visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
        analyserRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data.text) setPrompt(prev => prev ? prev + " " + data.text : data.text);
        } catch {
          // silently ignore
        } finally {
          setMicState("idle");
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setMicState("listening");
      startWaveAnimation();
    } catch {
      alert("يرجى السماح بالوصول للميكروفون");
    }
  }, [isRecording, startWaveAnimation, stopWaveAnimation]);

  // ── File upload ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0 && !urlInput) return;
    setIsGenerating(true);
    setPortalGlow(true);

    try {
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
        scenarioType: "imagine", // AI infers automatically from description
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

  const glowIntensity = Math.min(volume * 8, 1);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#020408]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
    >
      {/* ═══════════════════════════════════════════════════════════
          COSMIC BACKGROUND
      ═══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${SPACE_BG})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
        {PORTAL_SCENES.map((src, i) => (
          <div key={i} className="absolute inset-0" style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === bgIdx ? 0.12 : 0, transition: "opacity 2s ease" }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-transparent to-[#020408] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020408] via-transparent to-[#020408] opacity-60" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(120,60,220,0.15) 0%, transparent 70%)" }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FLOATING PARTICLES
      ═══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div key={p.id} className="absolute rounded-full" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            background: p.id % 3 === 0 ? "#a78bfa" : p.id % 3 === 1 ? "#60a5fa" : "#f0e6ff",
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${p.id % 3 === 0 ? "rgba(167,139,250,0.4)" : "rgba(96,165,250,0.3)"}`,
          }} />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LANGUAGE SELECTOR (top corner)
      ═══════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 z-30">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
            </svg>
            <span>{activeLang}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          {showLangMenu && (
            <div className="absolute top-10 left-0 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: "rgba(8,9,20,0.97)", border: "1px solid rgba(167,139,250,0.2)", minWidth: 120 }}>
              {LANG_KEYS.map(lk => (
                <button
                  key={lk}
                  onClick={() => { setActiveLang(lk); setShowLangMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-purple-500/10 text-left"
                  style={{ color: lk === activeLang ? "#a78bfa" : "rgba(255,255,255,0.6)" }}
                >
                  <span className="font-bold w-6">{lk}</span>
                  <span>{{AR:"العربية",EN:"English",JA:"日本語",FR:"Français",ZH:"中文",IT:"Italiano",ES:"Español",HI:"हिन्दी"}[lk]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">

        {/* ── COSMIC PORTAL ── */}
        <div className="relative flex items-center justify-center mb-6 mt-8" style={{ width: 260, height: 260 }}>
          {/* Outer rings */}
          <div className="absolute rounded-full border border-purple-500/15" style={{ width: 260, height: 260, animation: "spin 22s linear infinite" }} />
          <div className="absolute rounded-full border border-blue-500/10" style={{ width: 230, height: 230, animation: "spin 16s linear infinite reverse" }} />

          {/* Portal glow halo */}
          {portalGlow && (
            <div className="absolute rounded-full pointer-events-none" style={{
              width: 280, height: 280,
              background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
              animation: "portalPulse 2s ease-in-out infinite",
            }} />
          )}

          {/* Portal circle */}
          <div className="absolute rounded-full overflow-hidden" style={{
            width: 200, height: 200,
            border: `2px solid ${portalGlow ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.25)"}`,
            boxShadow: portalGlow
              ? "0 0 40px rgba(139,92,246,0.4), inset 0 0 40px rgba(139,92,246,0.15)"
              : "0 0 20px rgba(139,92,246,0.15)",
            transition: "all 0.6s ease",
          }}>
            {/* Scene images inside portal */}
            {PORTAL_SCENES.map((src, i) => (
              <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: i === portalIdx ? 0.85 : 0, transition: "opacity 1.5s ease" }} />
            ))}
            {/* Portal overlay */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(139,92,246,0.2) 0%, rgba(2,4,8,0.5) 100%)" }} />
          </div>

          {/* Orbiting dots */}
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute w-2.5 h-2.5 rounded-full" style={{
              background: ["#a78bfa", "#60a5fa", "#34d399"][i],
              boxShadow: `0 0 8px ${["rgba(167,139,250,0.8)", "rgba(96,165,250,0.8)", "rgba(52,211,153,0.8)"][i]}`,
              animation: `orbit${i} ${[12, 9, 15][i]}s linear infinite`,
            }} />
          ))}
        </div>

        {/* ── TITLE ── */}
        <div className="text-center mb-8">
          <h1 className="font-black leading-none mb-2" style={{
            fontSize: "clamp(3rem, 8vw, 5rem)",
            background: "linear-gradient(135deg, #fff 0%, #c084fc 50%, #60a5fa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            {lang.tagline}
          </h1>
          <p className="text-sm font-light" style={{ color: "rgba(196,181,253,0.6)", letterSpacing: "0.05em" }}>
            {lang.sub}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════
            INPUT BOX
        ══════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-3xl">
          <div
            className="relative rounded-2xl transition-all duration-300"
            style={{
              background: "rgba(10,11,20,0.85)",
              border: `1px solid ${portalGlow ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.2)"}`,
              backdropFilter: "blur(24px)",
              boxShadow: portalGlow
                ? "0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang.placeholder}
              dir={isRTL ? "rtl" : "ltr"}
              className="w-full bg-transparent text-white placeholder-white/20 resize-none outline-none px-5 pt-4 pb-2 text-base leading-relaxed"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", minHeight: 72, maxHeight: 180 }}
            />

            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="px-5 pb-2 flex flex-wrap gap-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-white/30 hover:text-white/70">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* URL input */}
            {showUrlInput && (
              <div className="px-5 pb-3">
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full bg-transparent text-white/70 placeholder-white/20 outline-none text-sm border-t border-white/5 pt-2"
                  style={{ fontFamily: "monospace" }}
                />
              </div>
            )}

            {/* ── BOTTOM BAR ── */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-3">

              {/* Left: mic + upload + url */}
              <div className="flex items-center gap-2">

                {/* ── MICROPHONE with live waveform ── */}
                <div className="flex items-center gap-1.5">
                  {/* Waveform bars */}
                  <div
                    className="flex items-center gap-[2px] overflow-hidden rounded-lg transition-all duration-300"
                    style={{
                      width: isRecording ? 90 : 0,
                      height: 28,
                      opacity: isRecording ? 1 : 0,
                      background: "rgba(139,92,246,0.08)",
                      border: isRecording ? "1px solid rgba(167,139,250,0.25)" : "none",
                      padding: isRecording ? "0 6px" : 0,
                      transition: "width 0.3s ease, opacity 0.3s ease, padding 0.3s ease",
                    }}
                  >
                    {waveData.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 2,
                          height: `${Math.max(4, h * 24)}px`,
                          background: `hsl(${260 + i * 3 + volume * 40}, ${70 + volume * 30}%, ${55 + volume * 20}%)`,
                          boxShadow: volume > 0.1 ? `0 0 4px hsl(${260 + i * 3}, 80%, 70%)` : "none",
                          transition: "height 0.05s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Mic button */}
                  <button
                    onClick={handleVoiceRecord}
                    className="relative flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                    style={{
                      width: 34, height: 34,
                      background: isRecording
                        ? `rgba(239,68,68,${0.15 + glowIntensity * 0.25})`
                        : "rgba(167,139,250,0.1)",
                      border: `1px solid ${isRecording
                        ? `rgba(239,68,68,${0.5 + glowIntensity * 0.5})`
                        : "rgba(167,139,250,0.25)"}`,
                      color: isRecording ? "#ef4444" : "#a78bfa",
                      boxShadow: isRecording
                        ? `0 0 ${8 + glowIntensity * 20}px rgba(239,68,68,${0.3 + glowIntensity * 0.5})`
                        : "none",
                    }}
                    title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
                  >
                    {/* Pulse rings */}
                    {isRecording && (
                      <>
                        <div className="absolute rounded-xl pointer-events-none" style={{ inset: -4, border: "1px solid rgba(239,68,68,0.4)", animation: "micPulse 1.2s ease-out infinite" }} />
                        <div className="absolute rounded-xl pointer-events-none" style={{ inset: -8, border: "1px solid rgba(239,68,68,0.2)", animation: "micPulse 1.2s ease-out infinite 0.4s" }} />
                      </>
                    )}
                    {micState === "processing" ? (
                      <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                    )}
                  </button>

                  {/* Mic status label */}
                  {micState !== "idle" && (
                    <span className="text-xs" style={{ color: micState === "listening" ? "#ef4444" : "#a78bfa", animation: "fadeIn 0.3s ease" }}>
                      {micState === "listening" ? lang.listening : lang.processing}
                    </span>
                  )}
                </div>

                {/* Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[34px] h-[34px] rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}
                  title="رفع صور أو مستندات"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

                {/* URL */}
                <button
                  onClick={() => setShowUrlInput(v => !v)}
                  className="w-[34px] h-[34px] rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: showUrlInput ? "rgba(96,165,250,0.18)" : "rgba(96,165,250,0.08)",
                    border: `1px solid ${showUrlInput ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.2)"}`,
                    color: "#60a5fa"
                  }}
                  title="إضافة رابط"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                </button>
              </div>

              {/* Right: generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && uploadedFiles.length === 0 && !urlInput)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
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
                    <span style={{ fontSize: 15 }}>✦</span>
                    <span>{lang.btn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── GENERATING ANIMATION ── */}
        {isGenerating && (
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="rounded-full" style={{
                  width: 7, height: 7, background: "#a78bfa",
                  animation: `bounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
            <p style={{ color: "rgba(196,181,253,0.7)", fontSize: 14 }}>
              يُحلّل الخيال ويُشكّل المشاهد السينمائية...
            </p>
          </div>
        )}

        {/* ── EXAMPLE PROMPTS ── */}
        {!isGenerating && (
          <div className="mt-8 w-full max-w-3xl">
            <p className="text-center text-xs mb-3" style={{ color: "rgba(148,163,184,0.45)" }}>
              {lang.examples}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex.text)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{
                    background: "rgba(139,92,246,0.07)",
                    border: "1px solid rgba(139,92,246,0.18)",
                    color: "rgba(196,181,253,0.65)",
                  }}
                >
                  <span className="text-[10px] font-bold opacity-50">{ex.lang}</span>
                  <span dir={ex.lang === "AR" ? "rtl" : "ltr"}>
                    {ex.text.length > 48 ? ex.text.slice(0, 48) + "…" : ex.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CAPABILITIES ROW ── */}
        <div className="mt-10 flex items-center justify-center gap-5 flex-wrap">
          {[
            { icon: "🏛", label: "معمارة" },
            { icon: "🌿", label: "حدائق" },
            { icon: "🕌", label: "تراث" },
            { icon: "🚀", label: "خيال علمي" },
            { icon: "🌆", label: "مدن" },
            { icon: "🏭", label: "صناعة" },
            { icon: "⏳", label: "محاكاة زمنية" },
            { icon: "🌍", label: "كل الحضارات" },
          ].map((cap, i) => (
            <div key={i} className="flex items-center gap-1 text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
              <span>{cap.icon}</span>
              <span>{cap.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          CSS ANIMATIONS
      ═══════════════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&family=Cairo:wght@300;400;600;700;900&display=swap');

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes micPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes portalPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbit0 {
          from { transform: rotate(0deg) translateX(115px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(115px) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: rotate(120deg) translateX(115px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(115px) rotate(-480deg); }
        }
        @keyframes orbit2 {
          from { transform: rotate(240deg) translateX(115px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(115px) rotate(-600deg); }
        }
      `}</style>
    </div>
  );
}
