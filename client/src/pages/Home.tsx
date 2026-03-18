/**
 * Home.tsx — منصة خيال الرئيسية v4.0
 * واجهة موحدة: وصف واحد → خيارات أسفله → إنتاج في نفس الصفحة
 * لا انتقالات، لا صفحات منفصلة
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";
import DocumentUploader from "@/components/DocumentUploader";
import type { GenerationResult, DocumentAnalysis } from "@/types/khayal";
import { musicEngine, selectMusicMood, type MusicMood } from "@/lib/musicEngine";

// ── صور الخلفية ──────────────────────────────────────────────────────────────
const PORTAL_SCENES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg1_arabic_b191f500.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg2_japan_f80bdd07.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg3_future_25da11b8.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg4_nature_75d33de9.webp",
];
const SPACE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/space_bg_f67dfcac.webp";

// ── أنواع الفيلم الـ 12 ──────────────────────────────────────────────────────
const FILM_GENRES = [
  { id: "cinematic",    icon: "🎬", label: "سينمائي",    labelEn: "Cinematic",    color: "#a78bfa" },
  { id: "documentary",  icon: "📽️", label: "وثائقي",     labelEn: "Documentary",  color: "#60a5fa" },
  { id: "marketing",    icon: "📣", label: "تسويقي",     labelEn: "Marketing",    color: "#f472b6" },
  { id: "educational",  icon: "🎓", label: "تعليمي",     labelEn: "Educational",  color: "#34d399" },
  { id: "horror",       icon: "👻", label: "رعب",        labelEn: "Horror",       color: "#ef4444" },
  { id: "comedy",       icon: "😄", label: "كوميدي",     labelEn: "Comedy",       color: "#fbbf24" },
  { id: "romantic",     icon: "💖", label: "رومانسي",    labelEn: "Romantic",     color: "#fb7185" },
  { id: "scifi",        icon: "🚀", label: "خيال علمي",  labelEn: "Sci-Fi",       color: "#38bdf8" },
  { id: "nature",       icon: "🌿", label: "طبيعة",      labelEn: "Nature",       color: "#4ade80" },
  { id: "historical",   icon: "🏛️", label: "تاريخي",     labelEn: "Historical",   color: "#d97706" },
  { id: "action",       icon: "⚡", label: "أكشن",       labelEn: "Action",       color: "#f97316" },
  { id: "spiritual",    icon: "✨", label: "روحاني",     labelEn: "Spiritual",    color: "#c084fc" },
];

// ── أصوات ElevenLabs الـ 11 ──────────────────────────────────────────────────
const ELEVEN_VOICES_LIST = [
  { id: "ar_male_formal",      label: "عربي ذكر رسمي",      icon: "🎙️", lang: "ar" },
  { id: "ar_male_energetic",   label: "عربي ذكر حماسي",     icon: "🔥", lang: "ar" },
  { id: "ar_male_calm",        label: "عربي ذكر هادئ",      icon: "🌊", lang: "ar" },
  { id: "ar_female_formal",    label: "عربي أنثى رسمي",     icon: "👩‍💼", lang: "ar" },
  { id: "ar_female_emotional", label: "عربي أنثى عاطفي",    icon: "💫", lang: "ar" },
  { id: "ar_female_marketing", label: "عربي أنثى تسويقي",   icon: "📢", lang: "ar" },
  { id: "en_male_formal",      label: "English Male Formal", icon: "🎙️", lang: "en" },
  { id: "en_male_energetic",   label: "English Male Energetic", icon: "🔥", lang: "en" },
  { id: "en_female_formal",    label: "English Female Formal", icon: "👩‍💼", lang: "en" },
  { id: "en_female_emotional", label: "English Female Emotional", icon: "💫", lang: "en" },
  { id: "documentary_narrator", label: "راوٍ وثائقي",        icon: "📽️", lang: "en" },
];

// ── أمثلة ────────────────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { text: "مسجد عثماني فاخر في إسطنبول، قباب ذهبية تحت ضوء الغروب", lang: "AR" },
  { text: "A futuristic skyscraper in Dubai with hanging gardens and neon lights", lang: "EN" },
  { text: "京都の静かな竹林に囲まれた古い日本の神社", lang: "JA" },
  { text: "Une villa méditerranéenne sur les falaises d'Amalfi au coucher du soleil", lang: "FR" },
  { text: "مدينة خيال علمي طائرة فوق السحاب بتقنية Avatar", lang: "AR" },
  { text: "A decaying Soviet-era brutalist complex reclaimed by nature", lang: "EN" },
  { text: "上海外滩的未来主义摩天大楼群，霓虹灯倒映在黄浦江上", lang: "ZH" },
  { text: "جبل وكهف فيه سرير نوم مريح وكلب على باب الكهف", lang: "AR" },
];

// ── نصوص الواجهة ─────────────────────────────────────────────────────────────
const UI_LANGS: Record<string, {
  placeholder: string; btn: string; listening: string; processing: string;
  examples: string; tagline: string; sub: string; docBtn: string;
  filmProgress: string; modeImage: string; modeVideo: string; modeScript: string;
}> = {
  AR: {
    placeholder: "صِف ما تتخيله... مبنى، حديقة، مدينة، مشهد طبيعي، عالم خيالي...",
    btn: "شكّل الخيال",
    listening: "يستمع...",
    processing: "يُحلّل...",
    examples: "أمثلة للإلهام",
    tagline: "خيال",
    sub: "حوّل أي وصف إلى مشهد سينمائي",
    docBtn: "مستند / مخطط",
    filmProgress: "جاري تصوير الفيلم...",
    modeImage: "صورة",
    modeVideo: "فيديو",
    modeScript: "سيناريو",
  },
  EN: {
    placeholder: "Describe what you imagine... a building, garden, city, sci-fi world...",
    btn: "Visualize",
    listening: "Listening...",
    processing: "Analyzing...",
    examples: "Inspiration examples",
    tagline: "Khayal",
    sub: "Transform any description into a cinematic scene",
    docBtn: "Document / Plan",
    filmProgress: "Filming in progress...",
    modeImage: "Image",
    modeVideo: "Video",
    modeScript: "Script",
  },
  JA: {
    placeholder: "想像するものを説明してください...",
    btn: "可視化",
    listening: "聴いています...",
    processing: "分析中...",
    examples: "インスピレーション例",
    tagline: "خيال",
    sub: "あらゆる説明を映画的シーンに変換",
    docBtn: "ドキュメント",
    filmProgress: "撮影中...",
    modeImage: "画像",
    modeVideo: "動画",
    modeScript: "脚本",
  },
  FR: {
    placeholder: "Décrivez ce que vous imaginez...",
    btn: "Visualiser",
    listening: "Écoute...",
    processing: "Analyse...",
    examples: "Exemples d'inspiration",
    tagline: "خيال",
    sub: "Transformez toute description en scène cinématographique",
    docBtn: "Document / Plan",
    filmProgress: "Tournage en cours...",
    modeImage: "Image",
    modeVideo: "Vidéo",
    modeScript: "Scénario",
  },
  ZH: {
    placeholder: "描述您想象的内容...",
    btn: "可视化",
    listening: "聆听中...",
    processing: "分析中...",
    examples: "灵感示例",
    tagline: "خيال",
    sub: "将任何描述转化为电影场景",
    docBtn: "文档 / 图纸",
    filmProgress: "拍摄中...",
    modeImage: "图像",
    modeVideo: "视频",
    modeScript: "剧本",
  },
  IT: {
    placeholder: "Descrivi cosa immagini...",
    btn: "Visualizza",
    listening: "Ascolta...",
    processing: "Analizza...",
    examples: "Esempi di ispirazione",
    tagline: "خيال",
    sub: "Trasforma qualsiasi descrizione in una scena cinematografica",
    docBtn: "Documento / Pianta",
    filmProgress: "Riprese in corso...",
    modeImage: "Immagine",
    modeVideo: "Video",
    modeScript: "Sceneggiatura",
  },
  ES: {
    placeholder: "Describe lo que imaginas...",
    btn: "Visualizar",
    listening: "Escuchando...",
    processing: "Analizando...",
    examples: "Ejemplos de inspiración",
    tagline: "خيال",
    sub: "Transforma cualquier descripción en una escena cinematográfica",
    docBtn: "Documento / Plano",
    filmProgress: "Rodando...",
    modeImage: "Imagen",
    modeVideo: "Video",
    modeScript: "Guión",
  },
  HI: {
    placeholder: "वर्णन करें जो आप कल्पना करते हैं...",
    btn: "कल्पना करें",
    listening: "सुन रहा है...",
    processing: "विश्लेषण...",
    examples: "प्रेरणा के उदाहरण",
    tagline: "خيال",
    sub: "किसी भी विवरण को सिनेमाई दृश्य में बदलें",
    docBtn: "दस्तावेज़ / योजना",
    filmProgress: "फिल्मांकन जारी है...",
    modeImage: "छवि",
    modeVideo: "वीडियो",
    modeScript: "पटकथा",
  },
};

const LANG_KEYS = Object.keys(UI_LANGS);

// ── نوع الإنتاج ───────────────────────────────────────────────────────────────
type ProductionMode = "image" | "video" | "script";

// ── حالة إنتاج الفيديو ────────────────────────────────────────────────────────
interface VideoJobState {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  error?: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // ── وضع الإنتاج المختار ──
  const [selectedMode, setSelectedMode] = useState<ProductionMode | null>(null);
  const [showModeOptions, setShowModeOptions] = useState(false);

  // ── خيارات الفيديو ──
  const [selectedGenre, setSelectedGenre] = useState<string>("cinematic");
  const [selectedVoice, setSelectedVoice] = useState<string>("ar_male_formal");
  const [showGenrePanel, setShowGenrePanel] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJobState | null>(null);
  const [videoSceneCount, setVideoSceneCount] = useState(5);

  // ── سيناريو نصي ──
  const [scriptResult, setScriptResult] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // ── Mic state ──
  const [isRecording, setIsRecording] = useState(false);
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [volume, setVolume] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(28).fill(0.5));

  // ── File / URL ──
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // ── Document analysis ──
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [showDocUploader, setShowDocUploader] = useState(false);

  // ── Film progress ──
  const [filmProgress, setFilmProgress] = useState<{
    isActive: boolean;
    totalScenes: number;
    completedScenes: number;
    currentBatch: number;
    totalBatches: number;
    durationSeconds: number;
    durationLabel: string;
    accumulatedScenes: GenerationResult["scenes"];
    projectId: number | null;
    isComplete: boolean;
  } | null>(null);

  // ── UI ──
  const [bgIdx, setBgIdx] = useState(0);
  const [portalIdx, setPortalIdx] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; opacity: number }>>([]);
  const [activeLang, setActiveLang] = useState("AR");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [portalGlow, setPortalGlow] = useState(false);

  // ── Refs ──
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const waveAnimRef = useRef<number>(0);
  const videoPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lang = UI_LANGS[activeLang] || UI_LANGS.AR;
  const isRTL = ["AR", "FA", "UR", "HE"].includes(activeLang);

  const generateMutation = trpc.khayal.generateScene.useMutation();
  const generateFilmMutation = trpc.khayal.generateFilm.useMutation();
  const checkContentMutation = trpc.khayal.checkContent.useMutation();
  const quickProduceMutation = trpc.video.quickProduce.useMutation();
  const generateScriptMutation = trpc.video.generateScript.useMutation();
  const jobStatusQuery = trpc.video.getJobStatus.useQuery(
    { jobId: videoJob?.jobId ?? "" },
    {
      enabled: !!videoJob?.jobId && videoJob.status !== "done" && videoJob.status !== "failed",
      refetchInterval: 2000,
    }
  );

  // ── مزامنة حالة الوظيفة ──
  useEffect(() => {
    if (!jobStatusQuery.data || !videoJob) return;
    const d = jobStatusQuery.data;
    if (d.status === "not_found") return;
    setVideoJob(prev => prev ? {
      ...prev,
      status: d.status as VideoJobState["status"],
      progress: d.progress,
      currentStep: d.currentStep,
      videoUrl: d.videoUrl,
      error: d.error,
    } : null);
  }, [jobStatusQuery.data]);

  // ── تنظيف الموسيقى عند الخروج ──
  useEffect(() => {
    return () => {
      musicEngine.stop();
      if (videoPollingRef.current) clearInterval(videoPollingRef.current);
    };
  }, []);

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

  useEffect(() => {
    const t = setInterval(() => setPortalIdx(i => (i + 1) % PORTAL_SCENES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBgIdx(i => (i + 1) % PORTAL_SCENES.length), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setPortalGlow(prompt.length > 0 || !!documentAnalysis); }, [prompt, documentAnalysis]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [prompt]);

  // ── إظهار الخيارات عند الكتابة ──
  useEffect(() => {
    if (prompt.length > 2 || documentAnalysis) {
      setShowModeOptions(true);
    } else {
      setShowModeOptions(false);
      setSelectedMode(null);
    }
  }, [prompt, documentAnalysis]);

  // ── Live waveform animation ──
  const startWaveAnimation = useCallback(() => {
    const draw = () => {
      if (!analyserRef.current) return;
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setVolume(rms);
      const barCount = 28;
      const step = Math.floor(bufferLength / barCount);
      const bars = Array.from({ length: barCount }, (_, i) => {
        const val = dataArray[i * step] / 128.0;
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
          if (data.text) {
            setPrompt(prev => prev ? prev + " " + data.text : data.text);
            if (data.language) {
              const detectedLang = data.language.toUpperCase().slice(0, 2);
              const ISO_MAP: Record<string, string> = {
                AR: "AR", EN: "EN", JA: "JA", FR: "FR",
                ZH: "ZH", IT: "IT", ES: "ES", HI: "HI",
                DE: "EN", PT: "ES", RU: "EN", KO: "JA",
                TR: "EN", FA: "AR", UR: "HI", BN: "HI",
              };
              const mappedLang = ISO_MAP[detectedLang] || "EN";
              if (mappedLang in UI_LANGS) setActiveLang(mappedLang);
            }
          }
        } catch { /* ignore */ } finally {
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

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setUploadedImageUrl(data.url);
    } catch { /* ignore */ }
  };

  // ── فحص المحتوى الأخلاقي ──
  const checkAndGenerate = async (desc: string, onPass: () => void) => {
    if (!desc.trim()) { onPass(); return; }
    try {
      const filterResult = await checkContentMutation.mutateAsync({ text: desc });
      if (!filterResult.allowed) {
        alert(filterResult.message || "❗ محتوى غير لائق");
        return;
      }
    } catch { /* allow on error */ }
    onPass();
  };

  // ── توليد صورة ──
  const handleGenerateImage = async () => {
    const desc = prompt.trim() || documentAnalysis?.mainDescription || "";
    if (!desc && !uploadedImageUrl && !urlInput) return;
    await checkAndGenerate(desc, async () => {
      setIsGenerating(true);
      setPortalGlow(true);
      try {
        const res = await generateMutation.mutateAsync({
          description: desc || "خيال حر",
          referenceImageUrl: uploadedImageUrl || urlInput || undefined,
          title: (desc || "خيال").slice(0, 60),
          sceneCount: 5,
          documentAnalysis: documentAnalysis ? {
            extractedText: documentAnalysis.extractedText,
            projectTitle: documentAnalysis.projectTitle,
            projectType: documentAnalysis.projectType,
            dimensions: documentAnalysis.dimensions,
            architecturalElements: documentAnalysis.architecturalElements,
            geometricMass: documentAnalysis.geometricMass,
            mainDescription: documentAnalysis.mainDescription,
            culturalContext: documentAnalysis.culturalContext,
            language: documentAnalysis.language,
            confidence: documentAnalysis.confidence,
          } : undefined,
        });
        setResult(res as GenerationResult);
        const mood = selectMusicMood(
          (res as GenerationResult).scenarioType || "imagine",
          (res as GenerationResult).atmosphere
        );
        musicEngine.play(mood, 0.12);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    });
  };

  // ── توليد فيديو ──
  const handleGenerateVideo = async () => {
    const desc = prompt.trim() || documentAnalysis?.mainDescription || "";
    if (!desc) return;
    await checkAndGenerate(desc, async () => {
      const genre = FILM_GENRES.find(g => g.id === selectedGenre);
      const fullDesc = genre ? `[${genre.label}] ${desc}` : desc;
      const langCode = ["AR", "FA", "UR", "HE"].includes(activeLang) ? "ar" : "en";
      try {
        const result = await quickProduceMutation.mutateAsync({
          description: fullDesc,
          language: langCode,
          voice: selectedVoice as any,
          sceneCount: videoSceneCount,
          options: {
            aspectRatio: "16:9",
            mode: "production",
            musicVolume: 0.12,
            useRunway: true,
            useElevenLabs: true,
          },
        });
        setVideoJob({
          jobId: result.jobId,
          status: "pending",
          progress: 0,
          currentStep: "جاري التحضير...",
        });
      } catch (err) {
        console.error(err);
      }
    });
  };

  // ── توليد سيناريو ──
  const handleGenerateScript = async () => {
    const desc = prompt.trim() || documentAnalysis?.mainDescription || "";
    if (!desc) return;
    await checkAndGenerate(desc, async () => {
      setIsGeneratingScript(true);
      try {
        const langCode = ["AR", "FA", "UR", "HE"].includes(activeLang) ? "ar" : "en";
        const genre = FILM_GENRES.find(g => g.id === selectedGenre);
        const fullDesc = genre ? `[${genre.label}] ${desc}` : desc;
        const result = await generateScriptMutation.mutateAsync({
          description: fullDesc,
          language: langCode,
          voice: selectedVoice as any,
          sceneCount: videoSceneCount,
        });
        // تحويل السيناريو إلى نص قابل للقراءة
        const s = result.script;
        const scriptText = [
          `# ${s.title}`,
          ``,
          `**الراوي:** ${s.narration}`,
          ``,
          `---`,
          ``,
          ...s.scenes.map((scene: any, i: number) => [
            `## المشهد ${i + 1}`,
            `**الصورة:** ${scene.imagePrompt}`,
            `**الترجمة:** ${scene.subtitle}`,
            scene.narration ? `**التعليق:** ${scene.narration}` : "",
            `**المدة:** ${scene.duration} ثانية`,
          ].filter(Boolean).join("\n")),
        ].join("\n");
        setScriptResult(scriptText);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGeneratingScript(false);
      }
    });
  };

  // ── الزر الرئيسي ──
  const handleMainAction = () => {
    if (!selectedMode) {
      // إذا لم يختر وضعاً → صورة افتراضياً
      handleGenerateImage();
    } else if (selectedMode === "image") {
      handleGenerateImage();
    } else if (selectedMode === "video") {
      handleGenerateVideo();
    } else if (selectedMode === "script") {
      handleGenerateScript();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMainAction();
    }
  };

  // ── عرض نتيجة الصورة ──
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

  // ── عرض تقدم الفيلم ──
  if (filmProgress?.isActive) {
    const progressPct = filmProgress.totalScenes > 0
      ? Math.round((filmProgress.completedScenes / filmProgress.totalScenes) * 100)
      : 0;
    return (
      <div className="min-h-screen bg-[#020408] flex flex-col items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0" style={{ backgroundImage: `url(${SPACE_BG})`, backgroundSize: "cover", opacity: 0.3 }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-transparent to-[#020408] opacity-90" />
        </div>
        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-3xl">🎬</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{lang.filmProgress}</h2>
          <p className="text-purple-300 text-sm mb-8">{filmProgress.durationLabel}</p>
          <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #7c3aed, #ec4899, #0ea5e9)" }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-8">
            <span>{filmProgress.completedScenes} / {filmProgress.totalScenes}</span>
            <span>{progressPct}%</span>
          </div>
          {filmProgress.accumulatedScenes.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {filmProgress.accumulatedScenes.slice(-8).map((scene, i) => (
                <div key={i} className="aspect-video rounded-lg overflow-hidden bg-white/5">
                  <img src={scene.imageUrl} alt={scene.label} className="w-full h-full object-cover opacity-80" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const glowIntensity = Math.min(volume * 8, 1);
  const currentGenre = FILM_GENRES.find(g => g.id === selectedGenre) || FILM_GENRES[0];
  const currentVoice = ELEVEN_VOICES_LIST.find(v => v.id === selectedVoice) || ELEVEN_VOICES_LIST[0];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#020408]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
    >
      {/* ═══ COSMIC BACKGROUND ═══ */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${SPACE_BG})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
        {PORTAL_SCENES.map((src, i) => (
          <div key={i} className="absolute inset-0" style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === bgIdx ? 0.12 : 0, transition: "opacity 2s ease" }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-transparent to-[#020408] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020408] via-transparent to-[#020408] opacity-60" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(120,60,220,0.15) 0%, transparent 70%)" }} />
      </div>

      {/* ═══ FLOATING PARTICLES ═══ */}
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

      {/* ═══ LANGUAGE SELECTOR ═══ */}
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
                  <span>{{ AR:"العربية", EN:"English", JA:"日本語", FR:"Français", ZH:"中文", IT:"Italiano", ES:"Español", HI:"हिन्दी" }[lk]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">

        {/* ── COSMIC PORTAL ── */}
        <div className="relative flex items-center justify-center mb-6 mt-8" style={{ width: 260, height: 260 }}>
          <div className="absolute rounded-full border border-purple-500/15" style={{ width: 260, height: 260, animation: "spin 22s linear infinite" }} />
          <div className="absolute rounded-full border border-blue-500/10" style={{ width: 230, height: 230, animation: "spin 16s linear infinite reverse" }} />
          {portalGlow && (
            <div className="absolute rounded-full pointer-events-none" style={{
              width: 280, height: 280,
              background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
              animation: "portalPulse 2s ease-in-out infinite",
            }} />
          )}
          <div className="absolute rounded-full overflow-hidden" style={{
            width: 200, height: 200,
            border: `2px solid ${portalGlow ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.25)"}`,
            boxShadow: portalGlow
              ? "0 0 40px rgba(139,92,246,0.4), inset 0 0 40px rgba(139,92,246,0.15)"
              : "0 0 20px rgba(139,92,246,0.15)",
            transition: "all 0.6s ease",
          }}>
            {PORTAL_SCENES.map((src, i) => (
              <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: i === portalIdx ? 0.85 : 0, transition: "opacity 1.5s ease" }} />
            ))}
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(139,92,246,0.2) 0%, rgba(2,4,8,0.5) 100%)" }} />
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute w-2.5 h-2.5 rounded-full" style={{
              background: ["#a78bfa", "#60a5fa", "#34d399"][i],
              boxShadow: `0 0 8px ${["rgba(167,139,250,0.8)", "rgba(96,165,250,0.8)", "rgba(52,211,153,0.8)"][i]}`,
              animation: `orbit${i} ${[12, 9, 15][i]}s linear infinite`,
            }} />
          ))}
        </div>

        {/* ── TITLE ── */}
        <div className="text-center mb-6">
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

        {/* ── DOCUMENT UPLOADER ── */}
        <div className="w-full max-w-3xl mb-3">
          <button
            onClick={() => setShowDocUploader(v => !v)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl transition-all mb-2"
            style={{
              background: showDocUploader || documentAnalysis ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${showDocUploader || documentAnalysis ? "rgba(96,165,250,0.35)" : "rgba(255,255,255,0.08)"}`,
              color: showDocUploader || documentAnalysis ? "#60a5fa" : "rgba(148,163,184,0.5)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{lang.docBtn}</span>
            {documentAnalysis && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                ✓ {documentAnalysis.projectTitle.slice(0, 20)}
              </span>
            )}
          </button>
          {showDocUploader && (
            <div className="mb-3">
              <DocumentUploader
                currentAnalysis={documentAnalysis}
                onAnalysisComplete={(analysis, imageUrl) => {
                  setDocumentAnalysis(analysis);
                  if (imageUrl && imageUrl.startsWith("http")) setUploadedImageUrl(imageUrl);
                  if (!prompt.trim()) setPrompt(analysis.mainDescription.slice(0, 200));
                  setShowDocUploader(false);
                }}
                onClear={() => { setDocumentAnalysis(null); setUploadedImageUrl(null); }}
              />
            </div>
          )}
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
              onChange={e => {
                const val = e.target.value;
                setPrompt(val);
                if (val.length > 8) {
                  const arabicRx = /[\u0600-\u06FF]/;
                  const japaneseRx = /[\u3040-\u30FF\u4E00-\u9FFF]/;
                  const chineseRx = /[\u4E00-\u9FFF]/;
                  const hindiRx = /[\u0900-\u097F]/;
                  const frRx = /[àâçéèêëîïôùûüæœ]/i;
                  const esRx = /[áéíóúüñ¿¡]/i;
                  const itRx = /[àèéìíîòóùú]/i;
                  if (arabicRx.test(val)) setActiveLang("AR");
                  else if (hindiRx.test(val)) setActiveLang("HI");
                  else if (japaneseRx.test(val)) setActiveLang("JA");
                  else if (chineseRx.test(val)) setActiveLang("ZH");
                  else if (frRx.test(val)) setActiveLang("FR");
                  else if (esRx.test(val)) setActiveLang("ES");
                  else if (itRx.test(val)) setActiveLang("IT");
                  else if (/[a-zA-Z]/.test(val)) setActiveLang("EN");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={documentAnalysis ? documentAnalysis.mainDescription.slice(0, 80) + "..." : lang.placeholder}
              dir={isRTL ? "rtl" : "ltr"}
              className="w-full bg-transparent text-white placeholder-white/20 resize-none outline-none px-5 pt-4 pb-2 text-base leading-relaxed"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", minHeight: 72, maxHeight: 180 }}
            />

            {/* Reference image preview */}
            {uploadedImageUrl && uploadedImageUrl.startsWith("http") && (
              <div className="px-5 pb-2 flex items-center gap-2">
                <img src={uploadedImageUrl} alt="reference" className="w-10 h-10 rounded-lg object-cover border border-blue-500/30" />
                <span className="text-xs text-blue-400">صورة مرجعية</span>
                <button onClick={() => setUploadedImageUrl(null)} className="text-white/30 hover:text-white/70 text-xs">✕</button>
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
              <div className="flex items-center gap-2">

                {/* Microphone */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-[2px] overflow-hidden rounded-lg transition-all duration-300"
                    style={{
                      width: isRecording ? 90 : 0, height: 28,
                      opacity: isRecording ? 1 : 0,
                      background: "rgba(139,92,246,0.08)",
                      border: isRecording ? "1px solid rgba(167,139,250,0.25)" : "none",
                      padding: isRecording ? "0 6px" : 0,
                      transition: "width 0.3s ease, opacity 0.3s ease, padding 0.3s ease",
                    }}
                  >
                    {waveData.map((h, i) => (
                      <div key={i} className="rounded-full flex-shrink-0" style={{
                        width: 2, height: `${Math.max(4, h * 24)}px`,
                        background: `hsl(${260 + i * 3 + volume * 40}, ${70 + volume * 30}%, ${55 + volume * 20}%)`,
                        boxShadow: volume > 0.1 ? `0 0 4px hsl(${260 + i * 3}, 80%, 70%)` : "none",
                        transition: "height 0.05s ease",
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={handleVoiceRecord}
                    className="relative flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                    style={{
                      width: 34, height: 34,
                      background: isRecording ? `rgba(239,68,68,${0.15 + glowIntensity * 0.25})` : "rgba(167,139,250,0.1)",
                      border: `1px solid ${isRecording ? `rgba(239,68,68,${0.5 + glowIntensity * 0.5})` : "rgba(167,139,250,0.25)"}`,
                      color: isRecording ? "#ef4444" : "#a78bfa",
                    }}
                    title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
                  >
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
                  {micState !== "idle" && (
                    <span className="text-xs" style={{ color: micState === "listening" ? "#ef4444" : "#a78bfa", animation: "fadeIn 0.3s ease" }}>
                      {micState === "listening" ? lang.listening : lang.processing}
                    </span>
                  )}
                </div>

                {/* Image upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[34px] h-[34px] rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}
                  title="رفع صورة مرجعية"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

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
                onClick={handleMainAction}
                disabled={isGenerating || isGeneratingScript || (!prompt.trim() && !documentAnalysis && !uploadedImageUrl && !urlInput)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  background: (isGenerating || isGeneratingScript)
                    ? "rgba(139,92,246,0.3)"
                    : selectedMode === "video"
                    ? "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)"
                    : selectedMode === "script"
                    ? "linear-gradient(135deg, #065f46 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)",
                  color: "white",
                  boxShadow: (isGenerating || isGeneratingScript) ? "none" : "0 0 20px rgba(124,58,237,0.4)",
                  minWidth: 110,
                }}
              >
                {(isGenerating || isGeneratingScript) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>يُشكّل...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 15 }}>
                      {selectedMode === "video" ? "🎬" : selectedMode === "script" ? "📄" : "✦"}
                    </span>
                    <span>
                      {selectedMode === "video" ? lang.modeVideo
                        : selectedMode === "script" ? lang.modeScript
                        : lang.btn}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              خيارات الإنتاج — تظهر أسفل البوكس عند الكتابة
          ══════════════════════════════════════════════════════════ */}
          {showModeOptions && (
            <div
              className="mt-3 rounded-2xl overflow-hidden transition-all duration-500"
              style={{
                background: "rgba(8,9,20,0.92)",
                border: "1px solid rgba(139,92,246,0.2)",
                backdropFilter: "blur(20px)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              {/* أزرار الوضع */}
              <div className="flex gap-0 border-b border-white/5">
                {[
                  { mode: "image" as ProductionMode,  icon: "🎨", label: lang.modeImage,  color: "#a78bfa" },
                  { mode: "video" as ProductionMode,  icon: "🎬", label: lang.modeVideo,  color: "#60a5fa" },
                  { mode: "script" as ProductionMode, icon: "📄", label: lang.modeScript, color: "#34d399" },
                ].map(({ mode, icon, label, color }) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(prev => prev === mode ? null : mode)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all"
                    style={{
                      color: selectedMode === mode ? color : "rgba(255,255,255,0.4)",
                      background: selectedMode === mode ? `${color}18` : "transparent",
                      borderBottom: selectedMode === mode ? `2px solid ${color}` : "2px solid transparent",
                    }}
                  >
                    <span>{icon}</span>
                    <span style={{ fontFamily: "'Tajawal', sans-serif" }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* خيارات الفيديو */}
              {selectedMode === "video" && (
                <div className="p-4 space-y-4" style={{ animation: "fadeIn 0.2s ease" }}>

                  {/* نوع الفيلم */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: "rgba(196,181,253,0.7)" }}>نوع الفيلم</span>
                      <button
                        onClick={() => setShowGenrePanel(v => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
                        style={{
                          background: "rgba(167,139,250,0.12)",
                          border: "1px solid rgba(167,139,250,0.25)",
                          color: currentGenre.color,
                        }}
                      >
                        <span>{currentGenre.icon}</span>
                        <span>{currentGenre.label}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d={showGenrePanel ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
                        </svg>
                      </button>
                    </div>
                    {showGenrePanel && (
                      <div className="grid grid-cols-4 gap-1.5" style={{ animation: "fadeIn 0.2s ease" }}>
                        {FILM_GENRES.map(genre => (
                          <button
                            key={genre.id}
                            onClick={() => { setSelectedGenre(genre.id); setShowGenrePanel(false); }}
                            className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs transition-all hover:scale-105"
                            style={{
                              background: selectedGenre === genre.id ? `${genre.color}20` : "rgba(255,255,255,0.04)",
                              border: `1px solid ${selectedGenre === genre.id ? genre.color + "60" : "rgba(255,255,255,0.08)"}`,
                              color: selectedGenre === genre.id ? genre.color : "rgba(255,255,255,0.5)",
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{genre.icon}</span>
                            <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10 }}>{genre.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* اختيار الصوت */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: "rgba(196,181,253,0.7)" }}>الصوت</span>
                      <button
                        onClick={() => setShowVoicePanel(v => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
                        style={{
                          background: "rgba(96,165,250,0.12)",
                          border: "1px solid rgba(96,165,250,0.25)",
                          color: "#60a5fa",
                        }}
                      >
                        <span>{currentVoice.icon}</span>
                        <span>{currentVoice.label}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d={showVoicePanel ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
                        </svg>
                      </button>
                    </div>
                    {showVoicePanel && (
                      <div className="grid grid-cols-1 gap-1" style={{ animation: "fadeIn 0.2s ease" }}>
                        {ELEVEN_VOICES_LIST.map(voice => (
                          <button
                            key={voice.id}
                            onClick={() => { setSelectedVoice(voice.id); setShowVoicePanel(false); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5"
                            style={{
                              background: selectedVoice === voice.id ? "rgba(96,165,250,0.12)" : "transparent",
                              border: `1px solid ${selectedVoice === voice.id ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.06)"}`,
                              color: selectedVoice === voice.id ? "#60a5fa" : "rgba(255,255,255,0.55)",
                            }}
                          >
                            <span style={{ fontSize: 14 }}>{voice.icon}</span>
                            <span style={{ fontFamily: "'Tajawal', sans-serif" }}>{voice.label}</span>
                            {selectedVoice === voice.id && (
                              <span className="mr-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa" }}>✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* عدد المشاهد */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: "rgba(196,181,253,0.7)" }}>عدد المشاهد</span>
                    <div className="flex items-center gap-2">
                      {[3, 5, 7, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => setVideoSceneCount(n)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all hover:scale-110"
                          style={{
                            background: videoSceneCount === n ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${videoSceneCount === n ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: videoSceneCount === n ? "#a78bfa" : "rgba(255,255,255,0.4)",
                          }}
                        >{n}</button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* خيارات الصورة */}
              {selectedMode === "image" && (
                <div className="px-4 py-3" style={{ animation: "fadeIn 0.2s ease" }}>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.5)" }}>
                    🎨 سيُولَّد 5 مشاهد سينمائية بتأثيرات Ken Burns وموسيقى تلقائية
                  </p>
                </div>
              )}

              {/* خيارات السيناريو */}
              {selectedMode === "script" && (
                <div className="px-4 py-3" style={{ animation: "fadeIn 0.2s ease" }}>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.5)" }}>
                    📄 سيُكتب سيناريو احترافي مع وصف المشاهد والحوارات والتعليقات الصوتية
                  </p>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              حالة إنتاج الفيديو — تظهر في نفس الصفحة
          ══════════════════════════════════════════════════════════ */}
          {videoJob && (
            <div
              className="mt-4 rounded-2xl p-4 transition-all"
              style={{
                background: "rgba(8,9,20,0.92)",
                border: `1px solid ${videoJob.status === "done" ? "rgba(52,211,153,0.4)" : videoJob.status === "failed" ? "rgba(239,68,68,0.4)" : "rgba(96,165,250,0.3)"}`,
                backdropFilter: "blur(20px)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{
                    background: videoJob.status === "done" ? "#34d399" : videoJob.status === "failed" ? "#ef4444" : "#60a5fa",
                    animation: videoJob.status === "processing" ? "micPulse 1.5s ease-out infinite" : "none",
                  }} />
                  <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Tajawal', sans-serif" }}>
                    {videoJob.status === "done" ? "✅ اكتمل الإنتاج!" : videoJob.status === "failed" ? "❌ فشل الإنتاج" : "🎬 جاري إنتاج الفيديو..."}
                  </span>
                </div>
                <button
                  onClick={() => setVideoJob(null)}
                  className="text-white/30 hover:text-white/70 text-xs transition-colors"
                >✕</button>
              </div>

              {videoJob.status !== "done" && videoJob.status !== "failed" && (
                <>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${videoJob.progress}%`, background: "linear-gradient(90deg, #3b82f6, #0ea5e9)" }} />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)", fontFamily: "'Tajawal', sans-serif" }}>
                    {videoJob.currentStep} — {videoJob.progress}%
                  </p>
                </>
              )}

              {videoJob.status === "done" && videoJob.videoUrl && (
                <div className="mt-2">
                  <video
                    src={videoJob.videoUrl}
                    controls
                    className="w-full rounded-xl"
                    style={{ maxHeight: 280, background: "#000" }}
                  />
                  <a
                    href={videoJob.videoUrl}
                    download="khayal-video.mp4"
                    className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontFamily: "'Tajawal', sans-serif" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    تحميل الفيديو
                  </a>
                </div>
              )}

              {videoJob.status === "failed" && (
                <p className="text-xs mt-1" style={{ color: "rgba(239,68,68,0.8)", fontFamily: "'Tajawal', sans-serif" }}>
                  {videoJob.error || "حدث خطأ أثناء الإنتاج"}
                </p>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              نتيجة السيناريو — تظهر في نفس الصفحة
          ══════════════════════════════════════════════════════════ */}
          {scriptResult && (
            <div
              className="mt-4 rounded-2xl p-4 transition-all"
              style={{
                background: "rgba(8,9,20,0.92)",
                border: "1px solid rgba(52,211,153,0.3)",
                backdropFilter: "blur(20px)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: "#34d399", fontFamily: "'Tajawal', sans-serif" }}>📄 السيناريو</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([scriptResult], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "khayal-script.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs px-2 py-1 rounded-lg transition-all hover:scale-105"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}
                  >
                    تحميل
                  </button>
                  <button onClick={() => setScriptResult(null)} className="text-white/30 hover:text-white/70 text-xs">✕</button>
                </div>
              </div>
              <div
                className="text-xs leading-relaxed overflow-y-auto max-h-80 whitespace-pre-wrap"
                style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Tajawal', sans-serif" }}
                dir="rtl"
              >
                {scriptResult}
              </div>
            </div>
          )}

        </div>

        {/* ── GENERATING ANIMATION ── */}
        {(isGenerating || isGeneratingScript) && (
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="rounded-full" style={{
                  width: 7, height: 7, background: "#a78bfa",
                  animation: "bounce 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
            <p style={{ color: "rgba(196,181,253,0.7)", fontSize: 14 }}>
              {isGeneratingScript
                ? "يكتب السيناريو الاحترافي..."
                : documentAnalysis
                ? `يُحلّل ${documentAnalysis.projectTitle} ويُشكّل المشاهد...`
                : "يُحلّل الخيال ويُشكّل المشاهد السينمائية..."
              }
            </p>
          </div>
        )}

        {/* ── EXAMPLE PROMPTS ── */}
        {!isGenerating && !isGeneratingScript && !videoJob && !scriptResult && (
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
            { icon: "📄", label: "مستندات" },
            { icon: "🎬", label: "أفلام" },
            { icon: "🌍", label: "كل الحضارات" },
          ].map((cap, i) => (
            <div key={i} className="flex items-center gap-1 text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
              <span>{cap.icon}</span>
              <span>{cap.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* ═══ CSS ANIMATIONS ═══ */}
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
