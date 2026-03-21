/**
 * KhayalCinematicViewer.tsx — العارض السينمائي الاحترافي لمنصة خيال
 * إصلاحات:
 * 1. الشاشة السوداء: استخدام proxy للصور بدلاً من crossOrigin المباشر
 * 2. الموسيقى: هادئة وطبيعية دائماً بشكل افتراضي
 * 3. فشل تسجيل الفيديو: fallback ذكي للمتصفحات غير المدعومة
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { GenerationResult, GeneratedScene } from "@/types/khayal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { musicEngine, selectMusicMood } from "@/lib/musicEngine";
import type { MusicMood } from "@/lib/musicEngine";

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

// ── الموسيقى الافتراضية دائماً هادئة وطبيعية ──
// القاعدة: peaceful/ambient هو الافتراضي دائماً
// تتغير فقط إذا طلب المستخدم صراحةً أو إذا كان السيناريو يستدعيها
function getDefaultMood(scenarioType: string, atmosphere?: string): MusicMood {
  const lower = (atmosphere || "").toLowerCase();

  // الطبيعة والهدوء دائماً هي الأساس
  if (!scenarioType || scenarioType === "imagine") return "peaceful";
  if (scenarioType === "design") return "peaceful";
  if (scenarioType === "compare") return "peaceful";

  // فقط في حالات محددة جداً تتغير الموسيقى
  if (scenarioType === "develop") {
    // تطوير: ambient هادئ وليس epic مزعج
    return "ambient";
  }
  if (scenarioType === "deteriorate") {
    // تدهور: mysterious لكن هادئ
    return "mysterious";
  }

  // الجو يؤثر فقط إذا كان صريحاً جداً
  if (/peaceful|serene|calm|هادئ|سلمي|طبيعة|nature/.test(lower)) return "peaceful";
  if (/joyful|vibrant|مبهج|احتفال|celebration/.test(lower)) return "joyful";

  // الافتراضي دائماً: هادئ
  return "peaceful";
}

interface Props {
  result: GenerationResult;
  onBack: () => void;
  onRefine?: (feedback: string) => void;
  musicMood?: MusicMood;
}

export default function KhayalCinematicViewer({ result, onBack, onRefine, musicMood }: Props) {
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
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  // ── حالة شاشة تقدم تصدير الفيديو ──
  // ── حالة المحادثة الذكية ──
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: "user" | "assistant"; text: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const trpcUtils = trpc.useUtils();
  const chatMutation = trpc.chat.chatWithContext.useMutation();
  const exportMutation = trpc.export.export.useMutation();

  // ── تصدير احترافي عبر السيرفر ──
  const exportProfessional = async (format: "pdf" | "pptx" | "docx") => {
    setIsDownloading(format);
    setShowDownloadMenu(false);
    const toastId = toast.loading(`جارٍ إنشاء ${format.toUpperCase()} الاحترافي...`);
    try {
      const res = await exportMutation.mutateAsync({
        title: result.title || "خيال — مشروع سينمائي",
        titleEn: result.titleEn,
        synopsis: result.synopsis,
        synopsisEn: result.synopsisEn,
        description: result.description,
        domain: result.domain,
        filmTone: result.filmTone,
        cinematicStyle: result.cinematicStyle,
        atmosphere: result.atmosphere,
        mainElements: result.mainElements,
        scenes: scenes.map(s => ({
          label: s.label,
          imageUrl: s.imageUrl,
          arabicCaption: s.arabicCaption,
          prompt: s.prompt,
        })),
        format,
      });
      // تحميل الملف
      const a = document.createElement("a");
      a.href = res.url;
      a.download = res.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`تم إنشاء ${format.toUpperCase()} بنجاح! اضغط هنا للتحميل`, { id: toastId, action: { label: "تحميل", onClick: () => window.open(res.url, "_blank") } });
    } catch (err) {
      console.error(err);
      toast.error(`فشل إنشاء ${format.toUpperCase()}`, { id: toastId });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    setChatInput("");
    const userMsg = { role: "user" as const, text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);
    try {
      const history = [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.text }));
      const res = await chatMutation.mutateAsync({
        message: text,
        history,
        productionContext: {
          status: "done",
          progress: 100,
          outputType: "image" as const,
          description: result.description,
          sceneCount: result.scenes.length,
        },
      });
      setChatMessages(prev => [...prev, { role: "assistant", text: res.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", text: "عذراً، حدث خطأ. حاول مجدداً." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const [videoExport, setVideoExport] = useState<{
    phase: "loading" | "recording" | "encoding" | "done";
    currentScene: number;
    totalScenes: number;
    progressPct: number;
    totalSeconds: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressValueRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scenes = result.scenes;
  const currentScene = scenes[currentIndex];
  const accentColor = SCENARIO_COLORS[result.scenarioType] || "#c084fc";
  const kb = KEN_BURNS[currentIndex % KEN_BURNS.length];

  // ── الموسيقى: هادئة وطبيعية بشكل افتراضي ──
  const activeMood: MusicMood = musicMood || getDefaultMood(result.scenarioType, result.atmosphere);

  // ── تشغيل الموسيقى عند فتح العارض (هادئة دائماً) ──
  useEffect(() => {
    // تأخير بسيط لضمان تفاعل المستخدم (متطلب المتصفح)
    const startMusic = () => {
      musicEngine.play(activeMood, 0.08); // حجم منخفض جداً — هادئ
      setIsMusicOn(true);
    };

    const handler = () => {
      startMusic();
      document.removeEventListener("click", handler);
    };
    document.addEventListener("click", handler, { once: true });

    return () => {
      musicEngine.stop();
      document.removeEventListener("click", handler);
    };
  }, [activeMood]);

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

  const toggleMusic = () => {
    if (isMusicOn) {
      musicEngine.stop();
      setIsMusicOn(false);
    } else {
      musicEngine.play(activeMood, 0.08);
      setIsMusicOn(true);
    }
  };

  // ── تحميل الصورة مع معالجة CORS ──
  // نستخدم URL مباشر بدون crossOrigin لتجنب مشاكل CORS في المتصفح
  const getImageSrc = (url: string) => {
    if (!url) return "";
    // إذا كان URL من نفس الأصل أو data URL، نستخدمه مباشرة
    if (url.startsWith("data:") || url.startsWith("/")) return url;
    // للروابط الخارجية: نضيف proxy عبر الخادم لتجنب CORS
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // ── تحميل صورة واحدة ──
  const downloadSingleImage = async (scene: GeneratedScene, idx: number) => {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`;
      const res = await fetch(proxyUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khayal_scene_${idx + 1}_${(scene.label || "scene").replace(/\s+/g, "_")}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الصورة!");
    } catch {
      // Fallback: open in new tab
      window.open(scene.imageUrl, "_blank");
    }
  };

  // ── تحميل كل الصور كـ ZIP ──
  const downloadAllImagesZip = async () => {
    setIsDownloading("zip");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("khayal_scenes")!;

      await Promise.all(scenes.map(async (scene: GeneratedScene, i: number) => {
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`;
          const res = await fetch(proxyUrl);
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

  // ── تسجيل الفيديو مع fallback ذكي ──
  const downloadVideoMP4 = async () => {
    setIsDownloading("mp4");
    setShowDownloadMenu(false);

    // تحقق من دعم MediaRecorder
    const isRecordingSupported = typeof MediaRecorder !== "undefined" &&
      (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ||
       MediaRecorder.isTypeSupported("video/webm"));

    if (!isRecordingSupported) {
      // Fallback: تحميل الصور كـ ZIP بدلاً من الفيديو
      toast.info("تسجيل الفيديو غير مدعوم في هذا المتصفح. جارٍ تحميل الصور...");
      setIsDownloading(null);
      await downloadAllImagesZip();
      return;
    }

    // حساب مدة كل مشهد بدقة من المدة الإجمالية المطلوبة
    // إذا طلب المستخدم 30 ثانية وعندنا 5 مشاهد → كل مشهد = 6 ثوانٍ
    const requestedDuration = result.filmRequirements?.sceneCount
      ? result.filmRequirements.sceneCount * result.filmRequirements.sceneDurationSec
      : null;
    const totalVideoSeconds = requestedDuration || scenes.length * 6;
    const perSceneSeconds = Math.max(3, totalVideoSeconds / scenes.length);
    const estimatedTotalSec = Math.round(perSceneSeconds * scenes.length);

    // فتح شاشة التقدم الكاملة
    setVideoExport({
      phase: "loading",
      currentScene: 0,
      totalScenes: scenes.length,
      progressPct: 0,
      totalSeconds: estimatedTotalSec,
    });

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5_000_000, // جودة أعلى
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(100);

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const img = new Image();
        // لا نستخدم crossOrigin لتجنب CORS — نستخدم proxy
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = proxyUrl;
        });

        // مدة كل مشهد محسوبة بدقة من المدة الإجمالية المطلوبة
        const DURATION_MS = Math.round(perSceneSeconds * 1000);
        const FPS = 30;
        const FRAMES = (DURATION_MS / 1000) * FPS;

        // تحديث شاشة التقدم
        setVideoExport(prev => prev ? {
          ...prev,
          phase: "recording",
          currentScene: i + 1,
          progressPct: Math.round(((i) / scenes.length) * 85), // 0-85% للتسجيل
        } : null);

        for (let f = 0; f < FRAMES; f++) {
          const t = f / FRAMES;
          const scale = 1 + t * 0.08;
          const tx = -t * 20;
          const ty = -t * 10;
          const fadeIn = Math.min(1, t * 8);
          const fadeOut = Math.min(1, (1 - t) * 8);
          const alpha = Math.min(fadeIn, fadeOut);

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(canvas.width / 2 + tx, canvas.height / 2 + ty);
          ctx.scale(scale, scale);
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          }
          ctx.restore();

          const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
          grad.addColorStop(0, "rgba(0,0,0,0.5)");
          grad.addColorStop(0.4, "rgba(0,0,0,0.05)");
          grad.addColorStop(0.7, "rgba(0,0,0,0.1)");
          grad.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "rgba(0,0,0,0.9)";
          ctx.fillRect(0, 0, canvas.width, 40);
          ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

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

          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.font = "bold 18px Arial";
          ctx.fillStyle = "#a78bfa";
          ctx.textAlign = "left";
          ctx.fillText("خيال · KHAYAL AI", 20, 30);
          ctx.restore();

          await new Promise(r => setTimeout(r, 1000 / FPS));
        }
      }

      // مرحلة الترميز
      setVideoExport(prev => prev ? { ...prev, phase: "encoding", progressPct: 88 } : null);
      recorder.stop();
      await new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
      const webmBlob = new Blob(chunks, { type: "video/webm" });
      const safeTitle = (result.title || "khayal").replace(/\s+/g, "_").slice(0, 60);

      // ── تحويل إلى MP4 H.264 عبر الخادم (مدعوم على iOS/Android) ──
      setVideoExport(prev => prev ? { ...prev, phase: "encoding", progressPct: 92 } : null);
      const formData = new FormData();
      formData.append("video", webmBlob, `${safeTitle}.webm`);
      formData.append("title", safeTitle);

      let mp4Blob: Blob | null = null;
      let mp4ObjectUrl: string | null = null;
      try {
        const convertRes = await fetch("/api/convert-video", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (convertRes.ok) {
          mp4Blob = await convertRes.blob();
          mp4ObjectUrl = URL.createObjectURL(mp4Blob);
        }
      } catch (convErr) {
        console.warn("[Video] MP4 conversion failed, falling back to WebM", convErr);
      }

      setVideoExport(prev => prev ? { ...prev, phase: "done", progressPct: 100 } : null);

      if (mp4ObjectUrl && mp4Blob) {
        // ── تحميل MP4 ──
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && typeof navigator.share === "function" && mp4Blob) {
          // على iOS/Android: استخدام Share Sheet لحفظ الفيديو في المكتبة
          try {
            const file = new File([mp4Blob], `${safeTitle}.mp4`, { type: "video/mp4" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: safeTitle });
            } else {
              throw new Error("canShare returned false");
            }
          } catch {
            // fallback: فتح رابط مباشر
            const a = document.createElement("a");
            a.href = mp4ObjectUrl;
            a.download = `${safeTitle}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          const a = document.createElement("a");
          a.href = mp4ObjectUrl;
          a.download = `${safeTitle}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(mp4ObjectUrl);
        toast.success(`✅ فيديو MP4 جاهز (${estimatedTotalSec} ثانية) — يعمل على جميع الأجهزة!`);
      } else {
        // fallback: WebM للمتصفحات التي تدعمه
        const webmUrl = URL.createObjectURL(webmBlob);
        const a = document.createElement("a");
        a.href = webmUrl;
        a.download = `${safeTitle}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(webmUrl);
        toast.success(`✅ تم إنشاء الفيديو (${estimatedTotalSec} ثانية)`);
      }

      await new Promise(r => setTimeout(r, 1500));
      setVideoExport(null);
    } catch (err) {
      console.error("Video recording failed:", err);
      setVideoExport(null);
      toast.error("فشل إنشاء الفيديو. جارٍ تحميل الصور بدلاً منه...");
      await downloadAllImagesZip();
    } finally {
      setIsDownloading(null);
    }
  };

  // ── تحميل PDF ──
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

        doc.setFillColor(2, 4, 8);
        doc.rect(0, 0, W, H, "F");

        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`;
          const res = await fetch(proxyUrl);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const imgWidth = 240;
          const imgHeight = 135;
          const imgX = (W - imgWidth) / 2;
          const imgY = 15;
          doc.addImage(dataUrl, "JPEG", imgX, imgY, imgWidth, imgHeight);
        } catch {
          // skip image if fails
        }

        // Cinematic gradient overlay
        doc.setFillColor(2, 4, 8);
        doc.setGState(doc.GState({ opacity: 0.6 }));
        doc.rect(0, H - 55, W, 55, "F");
        doc.setGState(doc.GState({ opacity: 1 }));

        // Scene label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(scene.label || "", W - 20, H - 35, { align: "right" });

        if (scene.arabicCaption) {
          doc.setFontSize(11);
          doc.setTextColor(200, 200, 200);
          doc.text(scene.arabicCaption, W - 20, H - 24, { align: "right" });
        }

        // Scene number
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`${String(i + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`, 20, H - 10);

        // Watermark
        doc.setFontSize(8);
        doc.setTextColor(100, 80, 180);
        doc.text("KHAYAL AI · خيال", W / 2, H - 5, { align: "center" });
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

  // ── تحميل GIF ──
  const downloadGIF = async () => {
    setIsDownloading("gif");
    setShowDownloadMenu(false);
    try {
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
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`;
        await new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = proxyUrl;
        });

        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, 640, 360);
          ctx.globalAlpha = f === 0 ? 0.5 : f === 1 ? 1 : 0.5;
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, 640, 360);
          }
          ctx.globalAlpha = 1;

          const grad = ctx.createLinearGradient(0, 0, 0, 360);
          grad.addColorStop(0.6, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0.8)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 360);

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
      toast.error("GIF غير مدعوم في هذا المتصفح");
      setIsDownloading(null);
    }
  };

  const handleRefine = () => {
    if (!refineFeedback.trim() || !result.projectId) return;
    setIsRefining(true);
    refineMutation.mutate({ projectId: result.projectId, feedback: refineFeedback });
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // ── شاشة تقدم تصدير الفيديو ──
  if (videoExport) {
    const phaseLabels: Record<string, string> = {
      loading:   "جارٍ تحميل المشاهد...",
      recording: `تسجيل المشهد ${videoExport.currentScene} من ${videoExport.totalScenes}`,
      encoding:  "جارٍ ترميز الفيديو...",
      done:      `✅ تم إنشاء فيديو ${videoExport.totalSeconds} ثانية!`,
    };
    const phaseIcons: Record<string, string> = {
      loading: "⏳", recording: "🎥", encoding: "⚡", done: "✅",
    };
    const steps = [
      { key: "loading",   label: "تحميل الصور" },
      { key: "recording", label: "تسجيل الفيديو" },
      { key: "encoding",  label: "ترميز وحفظ" },
      { key: "done",      label: "اكتمل" },
    ];
    const stepOrder = ["loading", "recording", "encoding", "done"];
    const currentStepIdx = stepOrder.indexOf(videoExport.phase);

    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "#020408", fontFamily: "'Cairo','Tajawal',sans-serif" }}
      >
        {/* خلفية تدرجية */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(124,58,237,0.18) 0%, transparent 70%)" }} />

        {/* أيقونة الفيلم */}
        <div
          className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center mb-8"
          style={{
            background: videoExport.phase === "done"
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #7c3aed, #ec4899)",
            boxShadow: videoExport.phase === "done"
              ? "0 0 60px rgba(16,185,129,0.5)"
              : "0 0 60px rgba(124,58,237,0.5)",
            animation: videoExport.phase !== "done" ? "pulse 2s infinite" : "none",
          }}
        >
          <span className="text-4xl">{phaseIcons[videoExport.phase]}</span>
        </div>

        {/* العنوان */}
        <h2 className="relative z-10 text-2xl font-bold text-white mb-2">
          {videoExport.phase === "done" ? "تم إنشاء الفيديو" : "جارٍ إنشاء الفيديو"}
        </h2>
        <p className="relative z-10 text-purple-300 text-sm mb-8">
          {phaseLabels[videoExport.phase]}
        </p>

        {/* شريط التقدم */}
        <div className="relative z-10 w-full max-w-md px-6 mb-6">
          <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${videoExport.progressPct}%`,
                background: videoExport.phase === "done"
                  ? "linear-gradient(90deg, #10b981, #059669)"
                  : "linear-gradient(90deg, #7c3aed, #ec4899, #0ea5e9)",
                boxShadow: "0 0 12px rgba(124,58,237,0.6)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{videoExport.totalSeconds} ثانية</span>
            <span className="font-bold text-purple-300">{videoExport.progressPct}%</span>
          </div>
        </div>

        {/* خطوات التقدم */}
        <div className="relative z-10 flex gap-4 mb-8">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
                style={{
                  background: idx < currentStepIdx
                    ? "rgba(124,58,237,0.8)"
                    : idx === currentStepIdx
                    ? "linear-gradient(135deg, #7c3aed, #ec4899)"
                    : "rgba(255,255,255,0.08)",
                  border: idx === currentStepIdx ? "2px solid #ec4899" : "2px solid transparent",
                  boxShadow: idx === currentStepIdx ? "0 0 20px rgba(236,72,153,0.5)" : "none",
                  transform: idx === currentStepIdx ? "scale(1.2)" : "scale(1)",
                  color: idx <= currentStepIdx ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              >
                {idx < currentStepIdx ? "✓" : idx + 1}
              </div>
              <span
                className="text-xs"
                style={{ color: idx <= currentStepIdx ? "#a78bfa" : "rgba(255,255,255,0.3)" }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* معاينة المشهد الحالي */}
        {videoExport.currentScene > 0 && videoExport.currentScene <= scenes.length && (
          <div className="relative z-10 w-full max-w-xs px-6">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.2)" }}>
              <img
                src={scenes[videoExport.currentScene - 1]?.imageUrl || ""}
                alt="المشهد الحالي"
                className="w-full aspect-video object-cover opacity-70"
              />
              <div className="px-3 py-2 text-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                <p className="text-white/70 text-xs">
                  {scenes[videoExport.currentScene - 1]?.label || ""}
                </p>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }`}</style>
      </div>
    );
  }

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
          {imageErrors[currentIndex] ? (
            // Fallback: عرض لون خلفية مع اسم المشهد عند فشل تحميل الصورة
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `radial-gradient(ellipse at center, ${accentColor}20 0%, #000 70%)`,
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🏛</div>
                <p className="text-white/40 text-sm">{currentScene.label}</p>
              </div>
            </div>
          ) : (
            <img
              key={`${currentScene.imageUrl}-${currentIndex}`}
              src={getImageSrc(currentScene.imageUrl)}
              alt={currentScene.label}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: kbActive ? kb.end : kb.start,
                transition: kbActive ? `transform ${SCENE_DURATION}ms ease-out` : "none",
                transformOrigin: "center center",
              }}
              onError={() => {
                // عند فشل proxy، جرب الرابط المباشر
                setImageErrors(prev => {
                  if (prev[currentIndex]) return prev; // already failed
                  return { ...prev, [currentIndex]: false }; // will retry with direct URL
                });
              }}
            />
          )}
        </div>
      )}

      {/* Cinematic gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/20 pointer-events-none" />

      {/* Letterbox bars removed — full cinematic view */}

      {/* Fade to black */}
      <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: fadeOpacity, transition: "opacity 0.6s ease-in-out", zIndex: 10 }} />

      {/* ── HUD top bar ── */}
      {showHUD && (
        <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-3 pb-4 flex items-center justify-between"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }}>
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

            {/* Music toggle */}
            <button
              onClick={toggleMusic}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
              style={{
                background: isMusicOn ? `${accentColor}25` : "rgba(255,255,255,0.05)",
                border: `1px solid ${isMusicOn ? accentColor + "50" : "rgba(255,255,255,0.1)"}`,
                color: isMusicOn ? accentColor : "rgba(255,255,255,0.3)",
              }}
              title={isMusicOn ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
            >
              {isMusicOn ? "♪" : "♩"}
            </button>
          </div>
        </div>
      )}

      {/* ── Caption area ── */}
      <div className="absolute bottom-28 right-0 left-0 px-8 z-20"
        style={{ opacity: showCaption ? 1 : 0, transform: showCaption ? "translateY(0)" : "translateY(24px)", transition: "opacity 1.2s ease-out, transform 1.2s ease-out" }}>
        <div className="max-w-3xl">
          {/* مؤشر نوع المحتوى */}
          {(result.domain || result.culturalContext) && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-px" style={{ background: accentColor }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: accentColor }}>
                {result.domain || result.culturalContext}
              </span>
            </div>
          )}

          {/* عنوان المشهد */}
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 leading-tight" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
            {currentScene?.label}
          </h2>

          {/* النص التعليمي/القصصي من السيناريو */}
          {(() => {
            const scriptScene = result.script?.scenes?.[currentIndex];
            const educFact = scriptScene?.educationalFact?.ar;
            const storyText = scriptScene?.storyText?.ar;
            const caption = currentScene?.arabicCaption;
            const displayText = educFact || storyText || caption;
            return displayText ? (
              <p className="text-base font-medium mb-1 max-w-2xl leading-relaxed"
                style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}>
                {displayText}
              </p>
            ) : null;
          })()}

          {/* التعليق السردي */}
          {(() => {
            const scriptScene = result.script?.scenes?.[currentIndex];
            const narration = scriptScene?.narration?.ar;
            return narration ? (
              <p className="text-sm text-white/40 max-w-xl leading-relaxed line-clamp-2"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)", fontStyle: "italic" }}>
                {narration}
              </p>
            ) : (
              <p className="text-sm text-white/35 max-w-xl leading-relaxed line-clamp-2"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                {result.description}
              </p>
            );
          })()}
        </div>
      </div>

      {/* ── Bottom control bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
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
                className="flex-shrink-0 rounded overflow-hidden transition-all duration-300 bg-white/5"
                style={{ width: "40px", height: "27px",
                  border: i === currentIndex ? `2px solid ${accentColor}` : "2px solid rgba(255,255,255,0.08)",
                  opacity: i === currentIndex ? 1 : 0.4,
                  transform: i === currentIndex ? "scale(1.05)" : "scale(1)" }}>
                <img
                  src={getImageSrc(scene.imageUrl)}
                  alt={scene.label}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </button>
            ))}
          </div>

          {/* Tool buttons */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: showDownloadMenu ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.1)",
                  border: `1px solid ${showDownloadMenu ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.25)"}`,
                  color: "#34d399",
                }}
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

              {showDownloadMenu && (
                 <div className="absolute bottom-10 left-0 rounded-2xl overflow-hidden z-50 shadow-2xl"
                   style={{ background: "rgba(5,7,15,0.98)", border: "1px solid rgba(167,139,250,0.2)", minWidth: 240, backdropFilter: "blur(24px)" }}>

                   {/* قسم: الصور */}
                   <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                     <p className="text-xs font-bold" style={{ color: "rgba(167,139,250,0.5)" }}>صور</p>
                   </div>

                   <button onClick={() => { downloadSingleImage(currentScene, currentIndex); setShowDownloadMenu(false); }}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left"
                     style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                     <span className="text-base w-6 text-center">🖼️</span>
                     <div>
                       <div className="font-semibold text-xs">صورة المشهد الحالي</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>JPG عالي الدقة</div>
                     </div>
                   </button>

                   <button onClick={downloadAllImagesZip} disabled={!!isDownloading}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                     style={{ color: "rgba(255,255,255,0.8)" }}>
                     <span className="text-base w-6 text-center">📦</span>
                     <div>
                       <div className="font-semibold text-xs">كل الصور (ZIP)</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{scenes.length} صورة مضغوطة</div>
                     </div>
                   </button>

                   {/* قسم: وثائق احترافية */}
                   <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                     <p className="text-xs font-bold" style={{ color: "rgba(167,139,250,0.5)" }}>وثائق احترافية</p>
                   </div>

                   <button onClick={() => exportProfessional("pdf")} disabled={!!isDownloading}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                     style={{ color: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                     <span className="text-base w-6 text-center" style={{ color: "#f87171" }}>📄</span>
                     <div>
                       <div className="font-semibold text-xs">PDF سينمائي احترافي</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>غلاف + صور كاملة + شعار خيال</div>
                     </div>
                     {isDownloading === "pdf" && <span className="mr-auto text-xs animate-spin">⧗</span>}
                   </button>

                   <button onClick={() => exportProfessional("pptx")} disabled={!!isDownloading}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                     style={{ color: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                     <span className="text-base w-6 text-center" style={{ color: "#fb923c" }}>📊</span>
                     <div>
                       <div className="font-semibold text-xs">PowerPoint PPTX</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>شرائح جاهزة للعرض</div>
                     </div>
                     {isDownloading === "pptx" && <span className="mr-auto text-xs animate-spin">⧗</span>}
                   </button>

                   <button onClick={() => exportProfessional("docx")} disabled={!!isDownloading}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                     style={{ color: "rgba(255,255,255,0.9)" }}>
                     <span className="text-base w-6 text-center" style={{ color: "#60a5fa" }}>📝</span>
                     <div>
                       <div className="font-semibold text-xs">Word DOCX</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>سيناريو + صور + أوصاف</div>
                     </div>
                     {isDownloading === "docx" && <span className="mr-auto text-xs animate-spin">⧗</span>}
                   </button>

                   {/* قسم: فيديو */}
                   <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                     <p className="text-xs font-bold" style={{ color: "rgba(167,139,250,0.5)" }}>فيديو</p>
                   </div>

                   <button onClick={downloadVideoMP4} disabled={!!isDownloading}
                     className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5 text-left disabled:opacity-40"
                     style={{ color: "rgba(255,255,255,0.8)" }}>
                     <span className="text-base w-6 text-center" style={{ color: "#a78bfa" }}>🎬</span>
                     <div>
                       <div className="font-semibold text-xs">فيديو سينمائي</div>
                       <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>MP4 مع حركة Ken Burns</div>
                     </div>
                     {isDownloading === "mp4" && <span className="mr-auto text-xs animate-spin">⧗</span>}
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

      {/* ── Chat overlay ── */}
      {/* زر فتح المحادثة */}
      {!showChat && (
        <button
          onClick={() => {
            setShowChat(true);
            if (chatMessages.length === 0) {
              setChatMessages([{ role: "assistant", text: `مرحباً! أنا خيال 🌟 يمكنك سؤالي عن أي شيء — تعديل المشاهد، إضافة عناصر، تغيير الأجواء، أو أي سؤال آخر.` }]);
            }
          }}
          className="absolute bottom-20 left-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${accentColor}cc, #60a5fa99)`, backdropFilter: "blur(16px)", border: `1px solid ${accentColor}40`, boxShadow: `0 4px 24px ${accentColor}30` }}
        >
          <span style={{ fontSize: "16px" }}>✦</span>
          <span>تحدّث مع خيال</span>
        </button>
      )}

      {/* نافذة المحادثة */}
      {showChat && (
        <div
          className="absolute bottom-20 left-6 z-30 flex flex-col rounded-2xl overflow-hidden"
          style={{ width: "340px", height: "420px", background: "rgba(6,7,14,0.97)", border: `1px solid ${accentColor}30`, backdropFilter: "blur(24px)", boxShadow: `0 8px 48px ${accentColor}20` }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${accentColor}20` }}>
            <div className="flex items-center gap-2">
              <span style={{ color: accentColor, fontSize: "16px" }}>✦</span>
              <span className="text-white font-bold text-sm">خيال — مساعدك الذكي</span>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white text-xs transition-colors">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                  style={msg.role === "user"
                    ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderRadius: "16px 16px 4px 16px" }
                    : { background: `linear-gradient(135deg, ${accentColor}25, #60a5fa15)`, color: "white", border: `1px solid ${accentColor}20`, borderRadius: "16px 16px 16px 4px" }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-end">
                <div className="px-3 py-2 rounded-2xl text-xs" style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}20` }}>
                  <span className="animate-pulse">يفكّر...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: `1px solid ${accentColor}15` }}>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                placeholder="اسأل أو اطلب تعديلاً..."
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accentColor}20` }}
                dir="rtl"
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatLoading}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #60a5fa)` }}
              >
                ✦
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info panel ── */}
      {showInfo && (
        <div className="absolute top-16 left-6 z-30 rounded-2xl p-5 w-80 overflow-y-auto"
          style={{ background: "rgba(8,9,15,0.96)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", maxHeight: "80vh" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">معلومات الفيلم</h3>
            <button onClick={() => setShowInfo(false)} className="text-white/30 hover:text-white text-xs">✕</button>
          </div>

          {/* المحركات الجديدة */}
          {result.domain && (
            <div className="mb-3 p-2 rounded-lg" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}25` }}>
              <p className="text-white/30 text-xs mb-1">نوع المحتوى</p>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: accentColor }}>●</span>
                <p className="text-white text-sm font-semibold">{result.domain}</p>
              </div>
              {result.filmTone && <p className="text-white/50 text-xs mt-1">أسلوب: {result.filmTone} · جمهور: {result.audienceLevel}</p>}
            </div>
          )}

          {/* السينوبسيس */}
          {result.synopsis && (
            <div className="mb-3">
              <p className="text-white/30 text-xs mb-1">ملخص الفيلم</p>
              <p className="text-white/70 text-xs leading-relaxed">{result.synopsis}</p>
            </div>
          )}

          {result.title && <div className="mb-2"><p className="text-white/30 text-xs">العنوان</p><p className="text-white text-sm font-medium">{result.title}</p></div>}
          {result.titleEn && <div className="mb-2"><p className="text-white/30 text-xs">English Title</p><p className="text-white/70 text-sm" dir="ltr">{result.titleEn}</p></div>}
          {result.culturalContext && <div className="mb-2"><p className="text-white/30 text-xs">السياق</p><p style={{ color: accentColor }} className="text-sm">{result.culturalContext}</p></div>}
          {result.atmosphere && <div className="mb-2"><p className="text-white/30 text-xs">الأجواء</p><p className="text-white/70 text-sm">{result.atmosphere}</p></div>}

          {/* Music mood indicator */}
          <div className="mb-2">
            <p className="text-white/30 text-xs">الموسيقى التصويرية</p>
            <p style={{ color: accentColor }} className="text-sm">
              {activeMood === "peaceful" ? "🌿 سلمية هادئة" :
               activeMood === "ambient" ? "🌊 محيطية" :
               activeMood === "mysterious" ? "🌙 غامضة" :
               activeMood === "joyful" ? "☀️ مبهجة" :
               activeMood === "epic" ? "⚡ ملحمية" : "🎵 درامية"}
            </p>
          </div>

          {/* السيناريو الكامل */}
          {result.script?.educationalSummary?.keyFacts?.length > 0 && (
            <div className="mb-3">
              <p className="text-white/30 text-xs mb-2">حقائق تعليمية</p>
              <div className="flex flex-col gap-1.5">
                {result.script.educationalSummary.keyFacts.slice(0, 3).map((fact: any, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span style={{ color: accentColor }}>▸</span>
                    <span className="text-white/60">{fact.ar}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
