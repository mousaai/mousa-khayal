/**
 * Home.tsx — خيال v5.0 "لمسة واحدة"
 * المستخدم يكتب / يسجل / يرفق → الذكاء الاصطناعي يفهم ويولّد تلقائياً
 * لا اختيارات، لا خطوات، لمسة واحدة فقط
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";
import type { GenerationResult, DocumentAnalysis } from "@/types/khayal";
import { musicEngine, selectMusicMood } from "@/lib/musicEngine";

// ── صور الخلفية ──────────────────────────────────────────────────────────────
const PORTAL_SCENES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg1_arabic_b191f500.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg2_japan_f80bdd07.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg3_future_25da11b8.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/bg4_nature_75d33de9.webp",
];
const SPACE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/space_bg_f67dfcac.webp";

// ── أمثلة ────────────────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { text: "أحلق في السماء فوق أبوظبي وأرى المدينة بكل تفاصيلها", lang: "AR", hint: "فيديو" },
  { text: "مسجد عثماني فاخر في إسطنبول، قباب ذهبية تحت ضوء الغروب", lang: "AR", hint: "صورة" },
  { text: "A cinematic journey through a futuristic Dubai skyline", lang: "EN", hint: "video" },
  { text: "اكتب سيناريو فيلم قصير عن رحلة في الفضاء", lang: "AR", hint: "سيناريو" },
  { text: "جبل وكهف فيه سرير نوم مريح وكلب على باب الكهف", lang: "AR", hint: "صورة" },
  { text: "京都の静かな竹林に囲まれた古い日本の神社", lang: "JA", hint: "image" },
];

// ── نصوص الواجهة ─────────────────────────────────────────────────────────────
const UI_LANGS: Record<string, { placeholder: string; btn: string; listening: string; processing: string; thinking: string; examples: string; tagline: string; sub: string; attachHint: string; }> = {
  AR: {
    placeholder: "صِف ما تتخيله أو تريده... فيديو، صورة، سيناريو، أو أي فكرة",
    btn: "✦ توليد",
    listening: "يستمع...",
    processing: "يُحلّل الصوت...",
    thinking: "يفهم ويُحلّل...",
    examples: "أمثلة للإلهام",
    tagline: "خيال",
    sub: "حوّل أي وصف إلى مرئيات سينمائية",
    attachHint: "أرفق صورة أو مستنداً أو أدخل رابطاً",
  },
  EN: {
    placeholder: "Describe what you want... video, image, script, or any idea",
    btn: "✦ Generate",
    listening: "Listening...",
    processing: "Analyzing audio...",
    thinking: "Understanding & analyzing...",
    examples: "Inspiration examples",
    tagline: "Khayal",
    sub: "Transform any description into cinematic visuals",
    attachHint: "Attach image, document, or enter a URL",
  },
  JA: { placeholder: "想像するものを説明してください...", btn: "✦ 生成", listening: "聴いています...", processing: "分析中...", thinking: "理解中...", examples: "インスピレーション例", tagline: "خيال", sub: "あらゆる説明を映画的シーンに変換", attachHint: "画像・文書を添付またはURLを入力" },
  FR: { placeholder: "Décrivez ce que vous imaginez...", btn: "✦ Générer", listening: "Écoute...", processing: "Analyse...", thinking: "Compréhension...", examples: "Exemples d'inspiration", tagline: "خيال", sub: "Transformez toute description en scène cinématographique", attachHint: "Joindre une image, un document ou entrer une URL" },
  ZH: { placeholder: "描述您想象的内容...", btn: "✦ 生成", listening: "聆听中...", processing: "分析中...", thinking: "理解中...", examples: "灵感示例", tagline: "خيال", sub: "将任何描述转化为电影场景", attachHint: "附加图片、文档或输入URL" },
  IT: { placeholder: "Descrivi cosa immagini...", btn: "✦ Genera", listening: "Ascolta...", processing: "Analizza...", thinking: "Comprensione...", examples: "Esempi di ispirazione", tagline: "خيال", sub: "Trasforma qualsiasi descrizione in una scena cinematografica", attachHint: "Allega immagine, documento o inserisci URL" },
  ES: { placeholder: "Describe lo que imaginas...", btn: "✦ Generar", listening: "Escuchando...", processing: "Analizando...", thinking: "Entendiendo...", examples: "Ejemplos de inspiración", tagline: "خيال", sub: "Transforma cualquier descripción en una escena cinematográfica", attachHint: "Adjunta imagen, documento o ingresa URL" },
  HI: { placeholder: "वर्णन करें जो आप कल्पना करते हैं...", btn: "✦ उत्पन्न करें", listening: "सुन रहा है...", processing: "विश्लेषण...", thinking: "समझ रहा है...", examples: "प्रेरणा के उदाहरण", tagline: "خيال", sub: "किसी भी विवरण को सिनेमाई दृश्य में बदलें", attachHint: "छवि, दस्तावेज़ संलग्न करें या URL दर्ज करें" },
};

const LANG_KEYS = Object.keys(UI_LANGS);

// ── حالة إنتاج الفيديو ────────────────────────────────────────────────────────
interface VideoJobState {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  error?: string;
}

// ── نوع القصد المكتشف ─────────────────────────────────────────────────────────
type DetectedIntentType = "image" | "video" | "script" | "thinking" | null;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // ── حالة الذكاء الاصطناعي ──
  const [detectedIntent, setDetectedIntent] = useState<DetectedIntentType>(null);
  const [intentLabel, setIntentLabel] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);

  // ── مرفقات ──
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // ── فيديو ──
  const [videoJob, setVideoJob] = useState<VideoJobState | null>(null);
  const [scriptResult, setScriptResult] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // ── Mic ──
  const [isRecording, setIsRecording] = useState(false);
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [volume, setVolume] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(24).fill(0.5));

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
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const waveAnimRef = useRef<number>(0);
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lang = UI_LANGS[activeLang] || UI_LANGS.AR;
  const isRTL = ["AR", "FA", "UR", "HE"].includes(activeLang);

  // ── tRPC mutations ──
  const generateMutation = trpc.khayal.generateScene.useMutation();
  const checkContentMutation = trpc.khayal.checkContent.useMutation();
  const quickProduceMutation = trpc.video.quickProduce.useMutation();
  const generateScriptMutation = trpc.video.generateScript.useMutation();
  const analyzeDocMutation = trpc.khayal.analyzeDocument.useMutation();
  const detectIntentMutation = trpc.chat.detectIntent.useMutation();

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

  // ── تنظيف ──
  useEffect(() => {
    return () => {
      musicEngine.stop();
      if (intentTimerRef.current) clearTimeout(intentTimerRef.current);
    };
  }, []);

  // ── Particles ──
  useEffect(() => {
    setParticles(Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5, speed: Math.random() * 0.012 + 0.004,
      opacity: Math.random() * 0.6 + 0.15,
    })));
  }, []);

  useEffect(() => {
    let f: number;
    const animate = () => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y - p.speed < -2 ? 102 : p.y - p.speed,
        x: p.x + Math.sin(Date.now() * 0.0003 + p.id) * 0.018,
        opacity: 0.15 + Math.abs(Math.sin(Date.now() * 0.001 + p.id)) * 0.5,
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

  useEffect(() => { setPortalGlow(prompt.length > 0 || !!documentAnalysis || !!uploadedImageUrl || !!urlInput); }, [prompt, documentAnalysis, uploadedImageUrl, urlInput]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  // ── كشف القصد التلقائي بعد توقف الكتابة ──
  useEffect(() => {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current);
    if (prompt.length < 5) {
      setDetectedIntent(null);
      setIntentLabel("");
      return;
    }

    // كشف سريع بالكلمات المفتاحية
    const quickDetect = (text: string): { type: DetectedIntentType; label: string } => {
      const t = text.toLowerCase();
      const arabic = text;

      const videoKw = ["فيديو", "فلم", "فيلم", "مقطع", "video", "movie", "film", "أنتج", "اصنع فيديو", "اعمل فيديو", "مشاهد متعددة", "تصوير", "أحلق", "رحلة", "جولة"];
      if (videoKw.some(k => arabic.includes(k))) return { type: "video", label: activeLang === "AR" ? "🎬 فيديو سينمائي" : "🎬 Cinematic Video" };

      const scriptKw = ["سيناريو", "script", "اكتب", "خطة", "مخطط", "بدون إنتاج", "فقط الكتابة", "قصة", "حوار"];
      if (scriptKw.some(k => arabic.includes(k))) return { type: "script", label: activeLang === "AR" ? "📄 سيناريو" : "📄 Script" };

      const imageKw = ["صورة", "صوّر", "ارسم", "image", "picture", "draw", "مشهد", "منظر", "لوحة", "تصميم"];
      if (imageKw.some(k => arabic.includes(k))) return { type: "image", label: activeLang === "AR" ? "🎨 صورة سينمائية" : "🎨 Cinematic Image" };

      // إذا كان النص طويلاً → فيديو افتراضياً
      if (text.length > 30) return { type: "video", label: activeLang === "AR" ? "🎬 فيديو سينمائي" : "🎬 Cinematic Video" };

      return { type: "image", label: activeLang === "AR" ? "🎨 صورة سينمائية" : "🎨 Cinematic Image" };
    };

    const quick = quickDetect(prompt);
    setDetectedIntent(quick.type);
    setIntentLabel(quick.label);

    // كشف ذكي بعد 1.5 ثانية من التوقف
    intentTimerRef.current = setTimeout(async () => {
      if (prompt.length < 10) return;
      try {
        setIsThinking(true);
        const result = await detectIntentMutation.mutateAsync({ message: prompt });
        const intentType = result.intent.type as DetectedIntentType;
        if (intentType === "image" || intentType === "video" || intentType === "script") {
          setDetectedIntent(intentType);
          const labels: Record<string, Record<string, string>> = {
            image: { AR: "🎨 صورة سينمائية", EN: "🎨 Cinematic Image" },
            video: { AR: "🎬 فيديو سينمائي", EN: "🎬 Cinematic Video" },
            script: { AR: "📄 سيناريو احترافي", EN: "📄 Professional Script" },
          };
          setIntentLabel(labels[intentType]?.[activeLang] || labels[intentType]?.["EN"] || "");
        }
      } catch { /* keep quick detect */ } finally {
        setIsThinking(false);
      }
    }, 1500);
  }, [prompt, activeLang]);

  // ── Live waveform ──
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
      setVolume(Math.sqrt(sum / bufferLength));
      const barCount = 24;
      const step = Math.floor(bufferLength / barCount);
      setWaveData(Array.from({ length: barCount }, (_, i) => {
        const val = dataArray[i * step] / 128.0;
        return Math.max(0.05, Math.min(1, Math.abs(val - 1) * 2.5 + 0.05));
      }));
      waveAnimRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const stopWaveAnimation = useCallback(() => {
    cancelAnimationFrame(waveAnimRef.current);
    setVolume(0);
    setWaveData(Array(24).fill(0.05));
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
              const ISO_MAP: Record<string, string> = { AR: "AR", EN: "EN", JA: "JA", FR: "FR", ZH: "ZH", IT: "IT", ES: "ES", HI: "HI", DE: "EN", PT: "ES", RU: "EN", KO: "JA", TR: "EN", FA: "AR", UR: "HI", BN: "HI" };
              const mapped = ISO_MAP[detectedLang] || "EN";
              if (mapped in UI_LANGS) setActiveLang(mapped);
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

  // ── رفع صورة ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadedFileName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setUploadedImageUrl(data.url);
    } catch { /* ignore */ }
    setShowAttachMenu(false);
  };

  // ── رفع مستند ──
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string)?.split(",")[1];
      if (!base64) return;
      try {
        const analysis = await analyzeDocMutation.mutateAsync({
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setDocumentAnalysis(analysis as unknown as DocumentAnalysis);
        if (!prompt.trim()) setPrompt((analysis as any).mainDescription?.slice(0, 200) || "");
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
  };

  // ── فحص المحتوى ──
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

  // ── الزر الرئيسي: توليد ذكي ──
  const handleGenerate = async () => {
    const desc = prompt.trim() || documentAnalysis?.mainDescription || "";
    if (!desc && !uploadedImageUrl && !urlInput) return;
    if (isGenerating || isGeneratingScript) return;

    const finalDesc = urlInput ? `${desc}\n\nرابط مرجعي: ${urlInput}` : desc;
    const langCode = ["AR", "FA", "UR", "HE"].includes(activeLang) ? "ar" : "en";

    await checkAndGenerate(finalDesc, async () => {
      const intent = detectedIntent || "image";

      if (intent === "video") {
        try {
          const result = await quickProduceMutation.mutateAsync({
            description: finalDesc,
            language: langCode,
            voice: langCode === "ar" ? "ar_male_formal" : "en_male_formal",
            sceneCount: 5,
            options: { aspectRatio: "16:9", mode: "production", musicVolume: 0.12, useRunway: true, useElevenLabs: true },
          });
          setVideoJob({ jobId: result.jobId, status: "pending", progress: 0, currentStep: "جاري التحضير..." });
        } catch (err) {
          console.error(err);
        }
      } else if (intent === "script") {
        setIsGeneratingScript(true);
        try {
          const result = await generateScriptMutation.mutateAsync({
            description: finalDesc,
            language: langCode,
            voice: langCode === "ar" ? "ar_male_formal" : "en_male_formal",
            sceneCount: 5,
          });
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
      } else {
        // image (default)
        setIsGenerating(true);
        setPortalGlow(true);
        try {
          const res = await generateMutation.mutateAsync({
            description: finalDesc || "خيال حر",
            referenceImageUrl: uploadedImageUrl || urlInput || undefined,
            title: (finalDesc || "خيال").slice(0, 60),
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
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
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

  const glowIntensity = Math.min(volume * 8, 1);
  const hasContent = prompt.length > 0 || !!documentAnalysis || !!uploadedImageUrl || !!urlInput;

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#020408]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
      onClick={() => { setShowLangMenu(false); setShowAttachMenu(false); }}
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
      <div className="absolute top-4 left-4 z-30" onClick={e => e.stopPropagation()}>
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
            <div className="absolute top-10 left-0 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: "rgba(8,9,20,0.97)", border: "1px solid rgba(167,139,250,0.2)", minWidth: 130 }}>
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
        <div className="relative flex items-center justify-center mb-6 mt-8" style={{ width: 220, height: 220 }}>
          <div className="absolute rounded-full border border-purple-500/15" style={{ width: 220, height: 220, animation: "spin 22s linear infinite" }} />
          <div className="absolute rounded-full border border-blue-500/10" style={{ width: 195, height: 195, animation: "spin 16s linear infinite reverse" }} />
          {portalGlow && (
            <div className="absolute rounded-full pointer-events-none" style={{
              width: 240, height: 240,
              background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
              animation: "portalPulse 2s ease-in-out infinite",
            }} />
          )}
          <div className="absolute rounded-full overflow-hidden" style={{
            width: 170, height: 170,
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
            <div key={i} className="absolute w-2 h-2 rounded-full" style={{
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

        {/* ══════════════════════════════════════════════════════════
            INPUT BOX — لمسة واحدة
        ══════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <div
            className="relative rounded-2xl transition-all duration-300"
            style={{
              background: "rgba(10,11,20,0.88)",
              border: `1px solid ${portalGlow ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.2)"}`,
              backdropFilter: "blur(24px)",
              boxShadow: portalGlow
                ? "0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* ── AI Intent Badge ── */}
            {hasContent && (detectedIntent || isThinking) && (
              <div className="px-4 pt-3 flex items-center gap-2" style={{ animation: "fadeIn 0.3s ease" }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: isThinking ? "rgba(167,139,250,0.1)" : detectedIntent === "video" ? "rgba(96,165,250,0.12)" : detectedIntent === "script" ? "rgba(52,211,153,0.12)" : "rgba(167,139,250,0.12)",
                    border: `1px solid ${isThinking ? "rgba(167,139,250,0.25)" : detectedIntent === "video" ? "rgba(96,165,250,0.3)" : detectedIntent === "script" ? "rgba(52,211,153,0.3)" : "rgba(167,139,250,0.3)"}`,
                    color: isThinking ? "rgba(167,139,250,0.7)" : detectedIntent === "video" ? "#60a5fa" : detectedIntent === "script" ? "#34d399" : "#a78bfa",
                  }}
                >
                  {isThinking ? (
                    <>
                      <div className="w-2.5 h-2.5 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
                      <span>{lang.thinking}</span>
                    </>
                  ) : (
                    <span>{intentLabel}</span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                  {activeLang === "AR" ? "سيُولَّد تلقائياً" : "will be generated automatically"}
                </span>
              </div>
            )}

            {/* ── Textarea ── */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => {
                const val = e.target.value;
                setPrompt(val);
                if (val.length > 8) {
                  if (/[\u0600-\u06FF]/.test(val)) setActiveLang("AR");
                  else if (/[\u0900-\u097F]/.test(val)) setActiveLang("HI");
                  else if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(val)) setActiveLang("JA");
                  else if (/[àâçéèêëîïôùûüæœ]/i.test(val)) setActiveLang("FR");
                  else if (/[áéíóúüñ¿¡]/i.test(val)) setActiveLang("ES");
                  else if (/[a-zA-Z]/.test(val)) setActiveLang("EN");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={documentAnalysis ? documentAnalysis.mainDescription.slice(0, 80) + "..." : lang.placeholder}
              dir={isRTL ? "rtl" : "ltr"}
              className="w-full bg-transparent text-white placeholder-white/20 resize-none outline-none px-5 pt-4 pb-2 text-base leading-relaxed"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", minHeight: 80, maxHeight: 200 }}
            />

            {/* ── Attachments preview ── */}
            {(uploadedImageUrl || documentAnalysis || urlInput) && (
              <div className="px-5 pb-2 flex items-center gap-2 flex-wrap">
                {uploadedImageUrl && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                    style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" }}>
                    <img src={uploadedImageUrl} alt="" className="w-5 h-5 rounded object-cover" />
                    <span>{uploadedFileName || "صورة"}</span>
                    <button onClick={() => { setUploadedImageUrl(null); setUploadedFileName(null); }} className="opacity-50 hover:opacity-100">✕</button>
                  </div>
                )}
                {documentAnalysis && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{documentAnalysis.projectTitle?.slice(0, 20) || uploadedFileName || "مستند"}</span>
                    <button onClick={() => { setDocumentAnalysis(null); setUploadedFileName(null); }} className="opacity-50 hover:opacity-100">✕</button>
                  </div>
                )}
                {urlInput && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                    style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    <span>{urlInput.slice(0, 30)}...</span>
                    <button onClick={() => setUrlInput("")} className="opacity-50 hover:opacity-100">✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── URL input ── */}
            {showUrlInput && (
              <div className="px-5 pb-3">
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { setShowUrlInput(false); } }}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full bg-transparent text-white/70 placeholder-white/20 outline-none text-sm border-t border-white/5 pt-2"
                  style={{ fontFamily: "monospace" }}
                  autoFocus
                />
              </div>
            )}

            {/* ── BOTTOM BAR ── */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-3">

              {/* Left: tools */}
              <div className="flex items-center gap-2">

                {/* Microphone */}
                <div className="flex items-center gap-1.5">
                  {isRecording && (
                    <div className="flex items-center gap-[2px] overflow-hidden rounded-lg"
                      style={{ width: 72, height: 26, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(167,139,250,0.25)", padding: "0 5px" }}>
                      {waveData.map((h, i) => (
                        <div key={i} className="rounded-full flex-shrink-0" style={{
                          width: 2, height: `${Math.max(3, h * 20)}px`,
                          background: `hsl(${260 + i * 3 + volume * 40}, ${70 + volume * 30}%, ${55 + volume * 20}%)`,
                          transition: "height 0.05s ease",
                        }} />
                      ))}
                    </div>
                  )}
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
                    <span className="text-xs" style={{ color: micState === "listening" ? "#ef4444" : "#a78bfa" }}>
                      {micState === "listening" ? lang.listening : lang.processing}
                    </span>
                  )}
                </div>

                {/* Attach button */}
                <div className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setShowAttachMenu(v => !v); }}
                    className="w-[34px] h-[34px] rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: (uploadedImageUrl || documentAnalysis || urlInput) ? "rgba(96,165,250,0.18)" : "rgba(96,165,250,0.08)",
                      border: `1px solid ${(uploadedImageUrl || documentAnalysis || urlInput) ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.2)"}`,
                      color: "#60a5fa",
                    }}
                    title={lang.attachHint}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>

                  {/* Attach menu */}
                  {showAttachMenu && (
                    <div
                      className="absolute bottom-10 rounded-xl overflow-hidden shadow-2xl z-50"
                      style={{
                        background: "rgba(8,9,20,0.97)",
                        border: "1px solid rgba(96,165,250,0.2)",
                        minWidth: 180,
                        [isRTL ? "right" : "left"]: 0,
                        animation: "fadeIn 0.15s ease",
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all hover:bg-blue-500/10 text-left"
                        style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Tajawal', sans-serif" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        {activeLang === "AR" ? "صورة مرجعية" : "Reference Image"}
                      </button>
                      <button
                        onClick={() => docInputRef.current?.click()}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all hover:bg-green-500/10 text-left"
                        style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Tajawal', sans-serif" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {activeLang === "AR" ? "مستند / مخطط" : "Document / Plan"}
                      </button>
                      <button
                        onClick={() => { setShowUrlInput(v => !v); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all hover:bg-purple-500/10 text-left"
                        style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Tajawal', sans-serif" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                        </svg>
                        {activeLang === "AR" ? "رابط URL" : "URL Link"}
                      </button>
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={handleDocUpload} className="hidden" />
              </div>

              {/* Right: generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isGeneratingScript || !hasContent}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  background: (isGenerating || isGeneratingScript)
                    ? "rgba(139,92,246,0.3)"
                    : detectedIntent === "video"
                    ? "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)"
                    : detectedIntent === "script"
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
                    <span>{activeLang === "AR" ? "يُشكّل..." : "Generating..."}</span>
                  </>
                ) : (
                  <span>{lang.btn}</span>
                )}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              حالة إنتاج الفيديو
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
                <button onClick={() => setVideoJob(null)} className="text-white/30 hover:text-white/70 text-xs transition-colors">✕</button>
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
                    autoPlay
                    className="w-full rounded-xl"
                    style={{ maxHeight: 300, background: "#000" }}
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
                    {activeLang === "AR" ? "تحميل الفيديو" : "Download Video"}
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
              نتيجة السيناريو
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
                <span className="text-sm font-bold" style={{ color: "#34d399", fontFamily: "'Tajawal', sans-serif" }}>📄 {activeLang === "AR" ? "السيناريو" : "Script"}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([scriptResult], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "khayal-script.txt"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs px-2 py-1 rounded-lg transition-all hover:scale-105"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}
                  >
                    {activeLang === "AR" ? "تحميل" : "Download"}
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
            <p style={{ color: "rgba(196,181,253,0.7)", fontSize: 14, fontFamily: "'Tajawal', sans-serif" }}>
              {isGeneratingScript
                ? (activeLang === "AR" ? "يكتب السيناريو الاحترافي..." : "Writing professional script...")
                : documentAnalysis
                ? (activeLang === "AR" ? `يُحلّل ${documentAnalysis.projectTitle} ويُشكّل المشاهد...` : `Analyzing ${documentAnalysis.projectTitle}...`)
                : (activeLang === "AR" ? "يُحلّل الخيال ويُشكّل المشاهد السينمائية..." : "Analyzing and generating cinematic scenes...")
              }
            </p>
          </div>
        )}

        {/* ── EXAMPLE PROMPTS ── */}
        {!isGenerating && !isGeneratingScript && !videoJob && !scriptResult && (
          <div className="mt-8 w-full max-w-2xl">
            <p className="text-center text-xs mb-3" style={{ color: "rgba(148,163,184,0.4)" }}>
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
                  <span className="text-[10px] font-bold opacity-40">{ex.hint}</span>
                  <span dir={ex.lang === "AR" ? "rtl" : "ltr"}>
                    {ex.text.length > 45 ? ex.text.slice(0, 45) + "…" : ex.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CAPABILITIES ROW ── */}
        <div className="mt-10 flex items-center justify-center gap-5 flex-wrap">
          {[
            { icon: "🎬", label: activeLang === "AR" ? "فيديو" : "Video" },
            { icon: "🎨", label: activeLang === "AR" ? "صورة" : "Image" },
            { icon: "📄", label: activeLang === "AR" ? "سيناريو" : "Script" },
            { icon: "🎙️", label: activeLang === "AR" ? "صوت" : "Voice" },
            { icon: "📎", label: activeLang === "AR" ? "مرفقات" : "Attachments" },
            { icon: "🔗", label: activeLang === "AR" ? "روابط" : "Links" },
            { icon: "🌍", label: activeLang === "AR" ? "متعدد اللغات" : "Multilingual" },
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
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-7px); opacity: 1; } }
        @keyframes micPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.7); opacity: 0; } }
        @keyframes portalPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbit0 { from { transform: rotate(0deg) translateX(97px) rotate(0deg); } to { transform: rotate(360deg) translateX(97px) rotate(-360deg); } }
        @keyframes orbit1 { from { transform: rotate(120deg) translateX(97px) rotate(-120deg); } to { transform: rotate(480deg) translateX(97px) rotate(-480deg); } }
        @keyframes orbit2 { from { transform: rotate(240deg) translateX(97px) rotate(-240deg); } to { transform: rotate(600deg) translateX(97px) rotate(-600deg); } }
      `}</style>
    </div>
  );
}
