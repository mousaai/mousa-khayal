/**
 * KhayalCinematicViewer.tsx — العارض السينمائي الاحترافي لمنصة خيال
 * Ken Burns + HUD + نصوص شعرية + انتقالات سينمائية
 * تحميل: صور ZIP / فيديو MP4 / PDF / GIF
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

const KEN_BURNS = [
  { start: "scale(1) translate(0%, 0%)",    end: "scale(1.18) translate(-3%, -2%)" },
  { start: "scale(1.05) translate(3%, 2%)", end: "scale(1.2) translate(-2%, -3%)" },
  { start: "scale(1) translate(-2%, 0%)",   end: "scale(1.15) translate(2%, -3%)" },
  { start: "scale(1.08) translate(0%, 3%)", end: "scale(1.22) translate(-3%, 0%)" },
  { start: "scale(1) translate(2%, -2%)",   end: "scale(1.16) translate(-1%, 2%)" },
];

const SCENE_DURATION = 9000;

interface Props {
  result: GenerationResult;
  onBack: () => void;
  onRefine?: (feedback: string) => void;
}

export default function KhayalCinematicViewer({ result, onBack, onRefine }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [showCaption, setShowCaption] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [kbActive, setKbActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressValueRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scenes = result.scenes;
  const currentScene = scenes[currentIndex];
  const accentColor = SCENARIO_COLORS[result.scenarioType] || "#c084fc";
  const kb = KEN_BURNS[currentIndex % KEN_BURNS.length];

  const refineMutation = trpc.khayal.refineScene.useMutation({
    onSuccess: () => {
      toast.success("تم تحسين المشهد!");
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

  // ── Scene transition ──
  const goToScene = useCallback((index: number) => {
    if (index < 0 || index >= scenes.length) return;
    setFadeOpacity(1);
    setShowCaption(false);
    setKbActive(false);
    progressValueRef.current = 0;
    setProgress(0);
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => {
        setFadeOpacity(0);
        setKbActive(true);
        setTimeout(() => setShowCaption(true), 1200);
      }, 400);
    }, 600);
  }, [scenes.length]);

  useEffect(() => {
    setTimeout(() => {
      setFadeOpacity(0);
      setKbActive(true);
      setTimeout(() => setShowCaption(true), 1500);
    }, 500);
  }, []);

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

  // ══════════════════════════════════════════════════════════════
  // DOWNLOAD FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  /** تحميل صورة واحدة */
  const downloadSingleImage = async (scene: GeneratedScene, idx: number) => {
    try {
      const res = await fetch(scene.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khayal_scene_${idx + 1}_${scene.label?.replace(/\s+/g, "_") || idx + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("فشل تحميل الصورة");
    }
  };

  /** تحميل كل الصور كـ ZIP */
  const downloadAllImagesZip = async () => {
    setIsDownloading("zip");
    try {
      // Dynamic import for JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("khayal_scenes")!;

      await Promise.all(scenes.map(async (scene: GeneratedScene, i: number) => {
        try {
          const res = await fetch(scene.imageUrl);
          const blob = await res.blob();
          folder.file(`scene_${i + 1}_${(scene.label || "scene").replace(/\s+/g, "_")}.jpg`, blob);
        } catch {
          // skip failed images
        }
      }));

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khayal_${(result.title || "scenes").replace(/\s+/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الصور بنجاح!");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الصور");
    } finally {
      setIsDownloading(null);
      setShowDownloadMenu(false);
    }
  };

  /** تسجيل الشاشة كفيديو MP4 */
  const downloadVideoMP4 = async () => {
    setIsDownloading("mp4");
    setShowDownloadMenu(false);
    toast.info("جارٍ تسجيل الفيديو... سيستغرق حوالي " + (scenes.length * 4) + " ثوانٍ");

    try {
      // Use canvas-based recording
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 4_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.start(100);

      // Render each scene
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = scene.imageUrl;
        });

        const DURATION_MS = 4000;
        const FPS = 30;
        const FRAMES = (DURATION_MS / 1000) * FPS;

        for (let f = 0; f < FRAMES; f++) {
          const t = f / FRAMES; // 0..1
          // Ken Burns: subtle zoom
          const scale = 1 + t * 0.08;
          const tx = -t * 20;
          const ty = -t * 10;

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Fade in/out
          const fadeIn = Math.min(1, t * 8);
          const fadeOut = Math.min(1, (1 - t) * 8);
          const alpha = Math.min(fadeIn, fadeOut);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(canvas.width / 2 + tx, canvas.height / 2 + ty);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          ctx.restore();

          // Cinematic gradient overlay
          const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
          grad.addColorStop(0, "rgba(0,0,0,0.5)");
          grad.addColorStop(0.4, "rgba(0,0,0,0.05)");
          grad.addColorStop(0.7, "rgba(0,0,0,0.1)");
          grad.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Letterbox bars
          ctx.fillStyle = "rgba(0,0,0,0.9)";
          ctx.fillRect(0, 0, canvas.width, 40);
          ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

          // Scene label
          if (scene.label && alpha > 0.5) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (t - 0.1) * 4) * Math.min(1, (0.9 - t) * 4);
            ctx.font = "bold 32px Arial";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "right";
            ctx.direction = "rtl";
            ctx.fillText(scene.label, canvas.width - 60, canvas.height - 80);
            ctx.restore();
          }

          // Watermark
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.font = "bold 18px Arial";
          ctx.fillStyle = "#a78bfa";
          ctx.textAlign = "left";
          ctx.fillText("خيال · KHAYAL AI", 20, 30);
          ctx.restore();

          // Wait for next frame
          await new Promise(r => setTimeout(r, 1000 / FPS));
        }
      }

      recorder.stop();

      await new Promise<void>(resolve => { recorder.onstop = () => resolve(); });

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khayal_${(result.title || "cinematic").replace(/\s+/g, "_")}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الفيديو بنجاح!");
    } catch (err) {
      console.error(err);
      toast.error("فشل تسجيل الفيديو");
    } finally {
      setIsDownloading(null);
    }
  };

  /** تحميل PDF */
  const downloadPDF = async () => {
    setIsDownloading("pdf");
    setShowDownloadMenu(false);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297, H = 210;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (i > 0) doc.addPage();

        // Black background
        doc.setFillColor(2, 4, 8);
        doc.rect(0, 0, W, H, "F");

        // Try to add image
        try {
          const res = await fetch(scene.imageUrl);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(dataUrl, "JPEG", 0, 0, W, H);
        } catch {
          // skip image if failed
        }

        // Cinematic gradient overlay (simulate with rectangles)
        doc.setFillColor(0, 0, 0);
        doc.setGState(doc.GState({ opacity: 0.6 }));
        doc.rect(0, H - 60, W, 60, "F");
        doc.setGState(doc.GState({ opacity: 1 }));

        // Scene number
        doc.setTextColor(167, 139, 250);
        doc.setFontSize(10);
        doc.text(`${String(i + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`, W - 15, 12, { align: "right" });

        // Watermark
        doc.setTextColor(167, 139, 250);
        doc.setFontSize(12);
        doc.text("KHAYAL AI", 10, 12);

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text(scene.label || `مشهد ${i + 1}`, W - 10, H - 35, { align: "right" });

        // Caption
        if (scene.arabicCaption) {
          doc.setTextColor(200, 200, 200);
          doc.setFontSize(11);
          doc.text(scene.arabicCaption.slice(0, 80), W - 10, H - 22, { align: "right" });
        }

        // Description
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text(result.description?.slice(0, 100) || "", W - 10, H - 12, { align: "right" });
      }

      doc.save(`khayal_${(result.title || "presentation").replace(/\s+/g, "_")}.pdf`);
      toast.success("تم تحميل PDF بنجاح!");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل PDF");
    } finally {
      setIsDownloading(null);
    }
  };

  /** تحميل GIF متحرك */
  const downloadGIF = async () => {
    setIsDownloading("gif");
    setShowDownloadMenu(false);
    toast.info("جارٍ إنشاء GIF...");

    try {
      // Use canvas frames approach - create a simple animated GIF via canvas
      // We'll create a series of frames and use gif.js or similar
      const { default: GIF } = await import("gif.js");

      const gif = new GIF({
        workers: 2,
        quality: 8,
        width: 640,
        height: 360,
        workerScript: "/gif.worker.js",
      });

      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;

      for (let i = 0; i < Math.min(scenes.length, 5); i++) {
        const scene = scenes[i];
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = scene.imageUrl;
        });

        // Draw 3 frames per scene (fade in, hold, fade out)
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, 640, 360);
          ctx.globalAlpha = f === 0 ? 0.5 : f === 1 ? 1 : 0.5;
          ctx.drawImage(img, 0, 0, 640, 360);
          ctx.globalAlpha = 1;

          // Overlay
          const grad = ctx.createLinearGradient(0, 0, 0, 360);
          grad.addColorStop(0.6, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0.8)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 360);

          // Label
          ctx.font = "bold 20px Arial";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "right";
          ctx.direction = "rtl";
          ctx.fillText(scene.label || "", 620, 330);

          gif.addFrame(canvas, { copy: true, delay: f === 1 ? 1500 : 400 });
        }
      }

      gif.on("finished", (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `khayal_${(result.title || "animated").replace(/\s+/g, "_")}.gif`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("تم تحميل GIF بنجاح!");
        setIsDownloading(null);
      });

      gif.render();
    } catch (err) {
      console.error(err);
      // Fallback: download first image as GIF (actually JPEG)
      toast.error("GIF غير مدعوم في هذا المتصفح، جارٍ تحميل الصورة...");
      await downloadSingleImage(scenes[0], 0);
      setIsDownloading(null);
    }
  };

  const handleRefine = () => {
    if (!refineFeedback.trim() || !result.projectId) return;
    setIsRefining(true);
    refineMutation.mutate({ projectId: result.projectId, feedback: refineFeedback });
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Main image with Ken Burns ── */}
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

      {/* Cinematic gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/20 pointer-events-none" />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-black pointer-events-none z-5" />
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-black pointer-events-none z-5" />

      {/* Fade to black */}
      <div className="absolute inset-0 bg-black pointer-events-none z-10" style={{ opacity: fadeOpacity, transition: "opacity 0.6s ease-in-out" }} />

      {/* ── HUD top bar ── */}
      {showHUD && (
        <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-3 pb-4 flex items-center justify-between"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }}>
          {/* Logo + scenario */}
          <div className="flex items-center gap-3">
            <span className="font-black text-2xl leading-none" style={{
              background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>خيال</span>
            <div className="h-6 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}60, transparent)` }} />
            <span className="text-sm font-semibold" style={{ color: accentColor }}>
              {SCENARIO_LABELS[result.scenarioType] || "خيال"}
            </span>
          </div>

          {/* Scene dots + counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {scenes.map((_: GeneratedScene, i: number) => (
                <button key={i} onClick={() => goToScene(i)} className="rounded-full transition-all duration-500"
                  style={{ width: i === currentIndex ? "24px" : "5px", height: "5px",
                    background: i === currentIndex ? `linear-gradient(90deg, ${accentColor}, #60a5fa)` : "rgba(255,255,255,0.25)" }} />
              ))}
            </div>
            <div className="text-right">
              <span className="text-white/30 text-xs">مشهد </span>
              <span className="text-white font-black text-lg leading-none">{String(currentIndex + 1).padStart(2, "0")}</span>
              <span className="text-white/30 text-sm"> / {String(scenes.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Caption area ── */}
      <div className="absolute bottom-28 right-0 left-0 px-8 z-20"
        style={{ opacity: showCaption ? 1 : 0, transform: showCaption ? "translateY(0)" : "translateY(24px)", transition: "opacity 1.2s ease-out, transform 1.2s ease-out" }}>
        <div className="max-w-3xl">
          {result.culturalContext && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-px" style={{ background: accentColor }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: accentColor }}>{result.culturalContext}</span>
            </div>
          )}
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
            {currentScene?.label}
          </h2>
          {currentScene?.arabicCaption && (
            <p className="text-lg font-light mb-1" style={{ color: "rgba(255,255,255,0.72)", textShadow: "0 1px 10px rgba(0,0,0,0.9)", fontStyle: "italic" }}>
              {currentScene.arabicCaption}
            </p>
          )}
          <p className="text-sm text-white/35 max-w-xl leading-relaxed line-clamp-2" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
            {result.description}
          </p>
        </div>
      </div>

      {/* ── Bottom control bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/10 relative overflow-hidden">
          <div className="h-full absolute top-0 left-0" style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${accentColor}, #60a5fa)`,
            boxShadow: `0 0 8px ${accentColor}`,
            transition: "width 0.05s linear",
          }} />
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between gap-3"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6))" }}>

          {/* Playback controls */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => goToScene(currentIndex - 1)} disabled={currentIndex === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 text-base">‹</button>
            <button onClick={() => setIsPlaying(p => !p)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all text-sm"
              style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}50` }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => goToScene(currentIndex + 1)} disabled={currentIndex === scenes.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 text-base">›</button>
          </div>

          {/* Scene thumbnails */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 max-w-xs mx-2">
            {scenes.map((scene: GeneratedScene, i: number) => (
              <button key={i} onClick={() => goToScene(i)}
                className="flex-shrink-0 rounded overflow-hidden transition-all duration-300"
                style={{ width: "40px", height: "27px",
                  border: i === currentIndex ? `2px solid ${accentColor}` : "2px solid rgba(255,255,255,0.08)",
                  opacity: i === currentIndex ? 1 : 0.4,
                  transform: i === currentIndex ? "scale(1.05)" : "scale(1)" }}>
                <img src={scene.imageUrl} alt={scene.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Tool buttons */}
          <div className="flex items-center gap-1.5">

            {/* Download menu */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: showDownloadMenu ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.1)",
                  border: `1px solid ${showDownloadMenu ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.25)"}`,
                  color: "#34d399",
                }}
                title="تحميل المشهد"
              >
                {isDownloading ? (
                  <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                )}
                <span>تحميل</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {/* Download dropdown */}
              {showDownloadMenu && (
                <div className="absolute bottom-10 left-0 rounded-xl overflow-hidden z-50 shadow-2xl"
                  style={{ background: "rgba(5,7,15,0.97)", border: "1px solid rgba(52,211,153,0.2)", minWidth: 200 }}>

                  {/* Current scene image */}
                  <button onClick={() => { downloadSingleImage(currentScene, currentIndex); setShowDownloadMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 text-left"
                    style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg">🖼</span>
                    <div>
                      <div className="font-semibold">صورة المشهد الحالي</div>
                      <div className="text-xs text-white/30">JPG عالي الدقة</div>
                    </div>
                  </button>

                  {/* All images ZIP */}
                  <button onClick={downloadAllImagesZip} disabled={!!isDownloading}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg">📦</span>
                    <div>
                      <div className="font-semibold">كل الصور (ZIP)</div>
                      <div className="text-xs text-white/30">{scenes.length} صور مضغوطة</div>
                    </div>
                  </button>

                  {/* Video MP4 */}
                  <button onClick={downloadVideoMP4} disabled={!!isDownloading}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg">🎬</span>
                    <div>
                      <div className="font-semibold">فيديو سينمائي</div>
                      <div className="text-xs text-white/30">WebM/MP4 مع Ken Burns</div>
                    </div>
                  </button>

                  {/* PDF */}
                  <button onClick={downloadPDF} disabled={!!isDownloading}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-lg">📄</span>
                    <div>
                      <div className="font-semibold">عرض تقديمي PDF</div>
                      <div className="text-xs text-white/30">A4 أفقي مع النصوص</div>
                    </div>
                  </button>

                  {/* GIF */}
                  <button onClick={downloadGIF} disabled={!!isDownloading}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.8)" }}>
                    <span className="text-lg">✨</span>
                    <div>
                      <div className="font-semibold">GIF متحرك</div>
                      <div className="text-xs text-white/30">للمشاركة السريعة</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setShowInfo(s => !s)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-all text-xs" title="معلومات">ⓘ</button>
            <button onClick={() => setShowHUD(h => !h)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-all text-xs">
              {showHUD ? "◉" : "○"}
            </button>
            <button onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-all text-xs">
              {isFullscreen ? "⊡" : "⛶"}
            </button>
            <button onClick={() => setShowRefinePanel(r => !r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35`, color: accentColor }}>
              ✦ تحسين
            </button>
            <button onClick={onBack}
              className="px-3 py-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-all text-xs">
              خيال جديد
            </button>
          </div>
        </div>
      </div>

      {/* ── Refine panel ── */}
      {showRefinePanel && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 rounded-2xl p-5 w-full max-w-md"
          style={{ background: "rgba(8,9,15,0.96)", border: `1px solid ${accentColor}30`, backdropFilter: "blur(24px)", boxShadow: `0 0 40px ${accentColor}15` }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: accentColor }}>✦</span>
            <h3 className="text-white font-bold text-sm">تحسين المشهد بالذكاء الاصطناعي</h3>
          </div>
          <textarea value={refineFeedback} onChange={e => setRefineFeedback(e.target.value)}
            placeholder="مثال: أريد إضاءة أكثر دراماتيكية، أو أضف عناصر يابانية..."
            className="w-full rounded-xl p-3 text-sm text-white placeholder-white/20 resize-none outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", minHeight: "80px" }}
            dir="rtl" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleRefine} disabled={!refineFeedback.trim() || isRefining}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #60a5fa)` }}>
              {isRefining ? "جارٍ التحسين..." : "✦ طبّق التحسين"}
            </button>
            <button onClick={() => setShowRefinePanel(false)}
              className="px-4 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-sm">إلغاء</button>
          </div>
        </div>
      )}

      {/* ── Info panel ── */}
      {showInfo && (
        <div className="absolute top-16 left-6 z-30 rounded-2xl p-5 w-72"
          style={{ background: "rgba(8,9,15,0.96)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">معلومات المشروع</h3>
            <button onClick={() => setShowInfo(false)} className="text-white/30 hover:text-white text-xs">✕</button>
          </div>
          {result.title && <div className="mb-2"><p className="text-white/30 text-xs">العنوان</p><p className="text-white text-sm font-medium">{result.title}</p></div>}
          {result.culturalContext && <div className="mb-2"><p className="text-white/30 text-xs">السياق الثقافي</p><p style={{ color: accentColor }} className="text-sm">{result.culturalContext}</p></div>}
          {result.atmosphere && <div className="mb-2"><p className="text-white/30 text-xs">الأجواء</p><p className="text-white/70 text-sm">{result.atmosphere}</p></div>}
          {result.cinematicStyle && <div className="mb-2"><p className="text-white/30 text-xs">الأسلوب السينمائي</p><p className="text-white/70 text-sm">{result.cinematicStyle}</p></div>}
          {result.mainElements && result.mainElements.length > 0 && (
            <div>
              <p className="text-white/30 text-xs mb-1">العناصر الرئيسية</p>
              <div className="flex flex-wrap gap-1">
                {result.mainElements.map((el: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>{el}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
