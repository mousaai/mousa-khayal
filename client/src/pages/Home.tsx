/**
 * Home.tsx — خيال v5.0 "لمسة واحدة"
 * المستخدم يكتب / يسجل / يرفق → الذكاء الاصطناعي يفهم ويولّد تلقائياً
 * لا اختيارات، لا خطوات، لمسة واحدة فقط
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import KhayalCinematicViewer from "@/components/KhayalCinematicViewer";
import ImmersiveViewer from "@/components/ImmersiveViewer";
import type { GenerationResult, DocumentAnalysis, ImmersiveResult } from "@/types/khayal";
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
  // ── معمار وعمران ──
  { text: "مسجد عثماني فاخر في إسطنبول، قباب ذهبية تحت ضوء الغروب", lang: "AR", hint: "صورة" },
  { text: "فيلا إماراتية تراثية قديمة فيها فناء في الوسط فيه شجرة الزيتون", lang: "AR", hint: "صورة" },
  { text: "A futuristic skyscraper made of glass and vertical gardens in Dubai", lang: "EN", hint: "image" },
  { text: "مبنى متحف عملاق في شكل نملة عملاقة في بطنها قاعة عرض فيها فيل", lang: "AR", hint: "صورة" },
  { text: "جسر معلق فوق وادٍ سحيق في جبال الألب، ضباب الصباح", lang: "AR", hint: "صورة" },
  { text: "مدينة مستقبلية تحت الماء، أبراج زجاجية وأسماك تسبح حولها", lang: "AR", hint: "فيديو" },
  // ── علوم وتعليم ──
  { text: "تخيّل ذرة الكربون من الداخل، الإلكترونات تدور حول النواة بألوان نيون", lang: "AR", hint: "فيديو" },
  { text: "Visualize the Pythagorean theorem as a glowing 3D geometric proof", lang: "EN", hint: "image" },
  { text: "قانون الجاذبية لنيوتن: تفاحة تسقط بالتصوير البطيء مع خطوط القوة", lang: "AR", hint: "فيديو" },
  { text: "تفاعل كيميائي بين الصوديوم والماء، انفجار مضيء بألوان الطيف", lang: "AR", hint: "صورة" },
  { text: "المجرة درب التبانة من الأعلى، ملايين النجوم بألوان كونية", lang: "AR", hint: "صورة" },
  { text: "خلية حية تحت المجهر، الميتوكوندريا تتحرك داخل السيتوبلازم", lang: "AR", hint: "فيديو" },
  { text: "Visualize the Fibonacci spiral in nature: shells, galaxies, flowers", lang: "EN", hint: "video" },
  { text: "الثقب الأسود يبتلع نجماً، موجات الجاذبية تتموج في الفضاء", lang: "AR", hint: "فيديو" },
  // ── طبيعة وبيئة ──
  { text: "أحلق في السماء فوق أبوظبي وأرى المدينة بكل تفاصيلها", lang: "AR", hint: "فيديو" },
  { text: "جبل وكهف فيه سرير نوم مريح وكلب على باب الكهف", lang: "AR", hint: "صورة" },
  { text: "غابة مطيرة استوائية في الفجر، ضوء يخترق الأشجار وضباب خفيف", lang: "AR", hint: "صورة" },
  { text: "شلال جليدي في أيسلندا تحت الشفق القطبي الأخضر", lang: "AR", hint: "صورة" },
  // ── خيال وإبداع ──
  { text: "نملة صغيرة تأكل آيس كريم ملوّن، تصوير ماكرو سينمائي دقيق", lang: "AR", hint: "صورة" },
  { text: "اكتب سيناريو فيلم قصير عن رحلة في الفضاء", lang: "AR", hint: "سيناريو" },
  { text: "A cinematic journey through a futuristic Dubai skyline at night", lang: "EN", hint: "video" },
  { text: "قطة تقود سيارة رياضية في الصحراء، غروب الشمس", lang: "AR", hint: "صورة" },
  { text: "مدينة عائمة في السماء بين الغيوم، أبراج معلقة بسلاسل ذهبية", lang: "AR", hint: "صورة" },
  { text: "京都の静かな竹林に囲まれた古い日本の神社", lang: "JA", hint: "image" },
  { text: "Un château médiéval flottant sur un lac de nuages au coucher du soleil", lang: "FR", hint: "image" },
  { text: "Visualiza el ADN humano desenrollándose en una danza cósmica de colores", lang: "ES", hint: "video" },
  // ── تحويل شخصي (image-to-image) ──
  { text: "ارفع صورتك واطلب: تخيلني طفلاً في الخامسة من عمري", lang: "AR", hint: "تحويل شخصي" },
  { text: "ارفع صورتك واطلب: تخيلني بعد 30 سنة من الآن", lang: "AR", hint: "تحويل شخصي" },
  { text: "ارفع صورة شارع واطلب: كيف يبدو بعد 50 سنة", lang: "AR", hint: "تحويل زمني" },
  // ── تاريخي ──
  { text: "معركة عسكرية تاريخية في الصحراء العربية، فرسان بالسيوف، دخان وغروب الشمس", lang: "AR", hint: "فيديو" },
  { text: "سوق عربي قديم في القرن العاشر، تجار وبضائع وأضواء المصابيح", lang: "AR", hint: "صورة" },
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

// ── رسائل المحادثة ───────────────────────────────────────────────────────────
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

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

// ── مكوّن مشاركة الفيديو ─────────────────────────────────────────────────────
function ShareVideoButton({ jobId, description }: { jobId: string; description: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShare = trpc.video.createShareLink.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}/share/${data.shareId}`;
      setShareUrl(fullUrl);
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    },
  });

  const handleShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
      return;
    }
    createShare.mutate({ jobId, title: description.slice(0, 80), description });
  };

  return (
    <button
      onClick={handleShare}
      disabled={createShare.isPending}
      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
      style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", fontFamily: "'Tajawal', sans-serif" }}
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          تم النسخ
        </>
      ) : createShare.isPending ? (
        <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          مشاركة
        </>
      )}
    </button>
  );
}

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

  // ── فيديو ── (مع localStorage persistence)
  const [videoJob, setVideoJob] = useState<VideoJobState | null>(() => {
    try {
      // دعم ?reset=1 لمسح الحالة فوراً
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("reset") === "1") {
        localStorage.removeItem("khayal_video_job");
        localStorage.removeItem("khayal_chat");
        // إزالة المعامل من URL
        window.history.replaceState({}, "", window.location.pathname);
        return null;
      }

      const saved = localStorage.getItem("khayal_video_job");
      if (saved) {
        const parsed: VideoJobState = JSON.parse(saved);
        // استئناف فقط إذا كان ال― job لا يزال يعمل (ليس done أو failed)
        if (parsed.status === "pending" || parsed.status === "processing") {
          // مسح الجوبات العالقة أكثر من 45 دقيقة تلقائياً
          const savedAt = (parsed as any).savedAt;
          if (savedAt) {
            const ageMs = Date.now() - savedAt;
            if (ageMs > 45 * 60 * 1000) { // 45 دقيقة
              localStorage.removeItem("khayal_video_job");
              return null;
            }
          }
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return null;
  });
  const [scriptResult, setScriptResult] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // ── محادثة ذكية ──
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // ── Mic ──
  const [isRecording, setIsRecording] = useState(false);
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [volume, setVolume] = useState(0);
  const [waveData, setWaveData] = useState<number[]>(Array(24).fill(0.5));

  // ــ وضع الإخراج — يُحدد تلقائياً من الوصف بالذكاء ــ
  const [outputMode, setOutputMode] = useState<"images" | "fast" | "pro" | "immersive">("fast");

  // تحكّم يدوي: إذا اختار المستخدم وضعاً يدوياً → لا يُغيّره الكشف التلقائي
  const [manualMode, setManualMode] = useState<"images" | "fast" | "pro" | "immersive" | null>(null);

  // ــ نتيجة وضع أنا هناك ــ
  const [immersiveResult, setImmersiveResult] = useState<ImmersiveResult | null>(null);
  const [isGeneratingImmersive, setIsGeneratingImmersive] = useState(false);
  const videoQuality: "fast" | "pro" = outputMode === "pro" ? "pro" : "fast";

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
  const chatWithContextMutation = trpc.chat.chatWithContext.useMutation();
  const generateMutation = trpc.khayal.generateScene.useMutation();
  const checkContentMutation = trpc.khayal.checkContent.useMutation();
  const quickProduceMutation = trpc.video.quickProduce.useMutation();
  const generateScriptMutation = trpc.video.generateScript.useMutation();
  const analyzeDocMutation = trpc.khayal.analyzeDocument.useMutation();
  const immersiveViewMutation = trpc.khayal.immersiveView.useMutation();
  const detectIntentMutation = trpc.chat.detectIntent.useMutation();

  const jobStatusQuery = trpc.video.getJobStatus.useQuery(
    { jobId: videoJob?.jobId ?? "" },
    {
      enabled: !!videoJob?.jobId && videoJob.status !== "done" && videoJob.status !== "failed",
      refetchInterval: 2000,
    }
  );

  // ── إظهار المحادثة عند بدء الإنتاج أو اكتمال الصور ──
  useEffect(() => {
    if (videoJob && !showChat) {
      setShowChat(true);
      if (chatMessages.length === 0) {
        setChatMessages([{
          role: "assistant",
          content: "🎬 بدأ إنتاج الفيديو! يمكنك سؤالي عن أي شيء — كم يستغرق، ما المرحلة الحالية، أو طلب تعديلات بعد الانتهاء.",
          timestamp: Date.now(),
        }]);
      }
    }
  }, [videoJob]);

  // ── إظهار المحادثة بعد اكتمال الصور ──
  useEffect(() => {
    if (result && !showChat) {
      setShowChat(true);
      if (chatMessages.length === 0) {
        setChatMessages([{
          role: "assistant",
          content: "🎨 اكتملت الصور! يمكنك طلب تعديلات — غيّر الألوان، أضف تفاصيل، أو اطلب صوراً بزوايا مختلفة.",
          timestamp: Date.now(),
        }]);
      }
    }
  }, [result]);

  // ── تمرير المحادثة للأسفل تلقائياً ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── إرسال رسالة في المحادثة ──
  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatSending) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim(), timestamp: Date.now() };
    const thinkingMsg: ChatMsg = { role: "assistant", content: "...", timestamp: Date.now() + 1, isThinking: true };
    setChatMessages(prev => [...prev, userMsg, thinkingMsg]);
    setChatInput("");
    setIsChatSending(true);
    try {
      const productionContext = videoJob ? {
        status: videoJob.status === "pending" ? "producing" : videoJob.status as "idle" | "producing" | "done" | "failed",
        progress: videoJob.progress,
        currentStep: videoJob.currentStep,
        jobId: videoJob.jobId,
        outputType: "video" as const,
        description: prompt,
        sceneCount: 5,
        estimatedMinutes: 8,
      } : undefined;
      const history = chatMessages
        .filter(m => !m.isThinking)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await chatWithContextMutation.mutateAsync({
        message: userMsg.content,
        history,
        productionContext,
      });
      setChatMessages(prev => [
        ...prev.filter(m => !m.isThinking),
        { role: "assistant", content: res.reply, timestamp: Date.now() },
      ]);
      // تنفيذ الإجراء إذا وجد
      if (res.action?.type === "restart_production" && res.action.description) {
        setPrompt(res.action.description as string);
        setVideoJob(null);
      }
    } catch (err: any) {
      const errMsg = err?.message?.includes('timeout') || err?.message?.includes('network')
        ? "انقطع الاتصال مؤقتاً. يمكنك إعادة المحاولة."
        : "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى."
      setChatMessages(prev => [
        ...prev.filter(m => !m.isThinking),
        { role: "assistant", content: errMsg, timestamp: Date.now() },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // ── حفظ videoJob في localStorage عند كل تغيير ──
  useEffect(() => {
    if (videoJob) {
      try {
        // حفظ وقت الحفظ لكشف الجوبات العالقة لاحقاً
        const toSave = videoJob.status === "pending" || videoJob.status === "processing"
          ? { ...videoJob, savedAt: (videoJob as any).savedAt || Date.now() }
          : videoJob;
        localStorage.setItem("khayal_video_job", JSON.stringify(toSave));
      } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem("khayal_video_job"); } catch { /* ignore */ }
    }
  }, [videoJob]);

  // ── مزامنة حالة الوظيفة ──
  useEffect(() => {
    if (!jobStatusQuery.data || !videoJob) return;
    const d = jobStatusQuery.data;
    if (d.status === "not_found") return;
    const wasProcessing = videoJob.status === "pending" || videoJob.status === "processing";
    const nowDone = d.status === "done";
    const nowFailed = d.status === "failed";
    setVideoJob(prev => prev ? {
      ...prev,
      status: d.status as VideoJobState["status"],
      progress: d.progress,
      currentStep: d.currentStep,
      videoUrl: d.videoUrl,
      error: d.error,
    } : null);
    // ── منبّه عند اكتمال الإنتاج ──
    if (wasProcessing && nowDone) {
      // إشعار المتصفح (إذا كان مدعوماً)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("✨ خيال — اكتمل الإنتاج!", {
          body: "فيديوك جاهز للمشاهدة والتحميل",
          icon: "/favicon.ico",
        });
      }
      // محادثة خيال
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: "✨ اكتمل الإنتاج! فيديوك جاهز. اضغط على زر التحميل لحفظ الفيديو أو تصديره بصيغة PDF أو PPT.", timestamp: Date.now() },
      ]);
      setShowChat(true);
    } else if (wasProcessing && nowFailed) {
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: "❌ حدث خطأ في الإنتاج. هل تريد إعادة المحاولة؟", timestamp: Date.now() },
      ]);
    }
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

  // دالة مساعدة: تحويل outputMode إلى تسمية للعرض
  const getModeLabel = (mode: "images" | "fast" | "pro" | "immersive") => {
    const labels: Record<string, Record<string, string>> = {
      images: { AR: "🎨 صورة سينمائية", EN: "🎨 Cinematic Image" },
      fast: { AR: "⚡ فيديو سريع", EN: "⚡ Fast Video" },
      pro: { AR: "✨ فيديو احترافي", EN: "✨ Pro Video" },
      immersive: { AR: "🌍 أنا هناك — 360°", EN: "🌍 I'm There — 360°" },
    };
    return labels[mode]?.[activeLang] || labels[mode]?.["EN"] || "";
  };

  // ــ كشف القصد التلقائي بعد توقف الكتابة ــ
  useEffect(() => {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current);
    if (prompt.length < 5) {
      setDetectedIntent(null);
      setIntentLabel("");
      return;
    }

    // كشف سريع بالكلمات المفتاحية
    const quickDetect = (text: string): { type: DetectedIntentType; outputMode: "images" | "fast" | "pro" | "immersive"; label: string } => {
      const arabic = text;

      // وضع "أنا هناك" — الغمر الكامل
      const immersiveKw = ["أنا في ", "أنا داخل", "أنا بداخل", "أتخيل نفسي", "تخيل نفسي", "لو كنت", "داخل ", "بداخل ", "من داخل", "كأنني في", "i am inside", "imagine myself", "if i were"];
      if (immersiveKw.some(k => arabic.toLowerCase().includes(k.toLowerCase())))
        return { type: "image", outputMode: "immersive", label: activeLang === "AR" ? "🌍 أنا هناك — جولة 360°" : "🌍 I'm There — 360° Tour" };

      // كشف التسلسل الزمني والقصة المتطورة → فيديو
      const sequencePatterns = [
        /ينمو|يتطور|يتحول|يتغير|ينهار|يُبنى|يُشيَّد/,
        /من الصفر|من البداية|من الأساس/,
        /إلى التشطيب|إلى النهاية|إلى الاكتمال/,
        /يحكي|يروي|يسرد|رحلة/,
        /مراحل|خطوات|دورة حياة/,
        /ثم.{0,30}(يسقط|يتحول|يتغير|يصل)/,
        /فجأة.{0,30}(يسقط|يتحول|يصطدم)/,
        /وبعدين|وبعد ذلك|ثم بعد/,
        /time.?lapse|timelapse/i,
        /before.{0,10}after|قبل.{0,10}بعد/i,
      ];
      const hasSequence = sequencePatterns.some(p => p.test(arabic));

      // كشف تحويل الهوية الشخصية (image-to-image)
      const personalTransformPatterns = [
        /تخيلني|تخيل\s*لي|تخيل\s*نفسي/,
        /حوّلني|حولني|اجعلني/,
        /كيف\s*(أكون|سأكون|أبدو|سأبدو)/,
        /لو\s*كنت\s*(شاب|طفل|صغير|كبير|رياضي|فنان|ملك)/,
        /بعد\s*\d+\s*سن/,
        /imagine me|transform me|make me look/i,
      ];
      if (personalTransformPatterns.some(p => p.test(arabic)))
        return { type: "image", outputMode: "images", label: activeLang === "AR" ? "🪄 تحويل شخصي" : "🪄 Personal Transform" };

      const videoKw = ["فيديو", "فلم", "فيلم", "مقطع", "video", "movie", "film", "أنتج", "اصنع فيديو", "اعمل فيديو", "مشاهد متعددة", "تصوير"];
      const hasVideoKw = videoKw.some(k => arabic.includes(k));
      const isProKw = ["مشروع", "معماري", "وثائقي", "تسويقي", "تعليمي", "علمي", "تاريخي", "documentary", "marketing", "educational", "من الصفر", "دورة حياة", "مراحل البناء"].some(k => arabic.includes(k));

      if (hasVideoKw || hasSequence) {
        const isPro = isProKw || hasSequence;
        return { type: "video", outputMode: isPro ? "pro" : "fast", label: activeLang === "AR" ? (isPro ? "✨ فيديو احترافي" : "⚡ فيديو سريع") : (isPro ? "✨ Pro Video" : "⚡ Fast Video") };
      }

      const scriptKw = ["سيناريو", "script", "اكتب", "بدون إنتاج", "فقط الكتابة"];
      if (scriptKw.some(k => arabic.includes(k)))
        return { type: "script", outputMode: "fast", label: activeLang === "AR" ? "📄 سيناريو" : "📄 Script" };

      const imageKw = ["صورة", "صوّر", "ارسم", "image", "picture", "draw", "مشهد", "منظر", "لوحة", "تصميم", "تخيل", "تخيّل"];
      if (imageKw.some(k => arabic.includes(k)))
        return { type: "image", outputMode: "images", label: activeLang === "AR" ? "🎨 صورة سينمائية" : "🎨 Cinematic Image" };

      // افتراضي: أي وصف = إنتاج فوري
      if (text.length > 30) return { type: "video", outputMode: isProKw ? "pro" : "fast", label: activeLang === "AR" ? "🎬 فيديو سينمائي" : "🎬 Cinematic Video" };

      // وصف قصير = صورة
      return { type: "image", outputMode: "images", label: activeLang === "AR" ? "🎨 صورة سينمائية" : "🎨 Cinematic Image" };
    };

    const quick = quickDetect(prompt);
    setDetectedIntent(quick.type);
    // لا تغيّر outputMode إذا اختار المستخدم وضعاً يدوياً
    if (!manualMode) setOutputMode(quick.outputMode);
    setIntentLabel(manualMode ? getModeLabel(manualMode) : quick.label);

    // كشف ذكي بعد 1.5 ثانية من التوقف — يُحدّث الوضع بدقة أكبر
    intentTimerRef.current = setTimeout(async () => {
      if (prompt.length < 10) return;
      try {
        setIsThinking(true);
        const result = await detectIntentMutation.mutateAsync({ message: prompt });
        const intentType = result.intent.type as DetectedIntentType;
        const aiOutputMode = (result.intent as any).outputMode as "images" | "fast" | "pro" | "immersive" | undefined;

        // تحديث outputMode من الذكاء فقط إذا لم يختر المستخدم يدوياً
        if (aiOutputMode && !manualMode) setOutputMode(aiOutputMode);

        const modeLabels: Record<string, Record<string, string>> = {
          images: { AR: "🎨 صورة سينمائية", EN: "🎨 Cinematic Image" },
          fast: { AR: "⚡ فيديو سريع", EN: "⚡ Fast Video" },
          pro: { AR: "✨ فيديو احترافي", EN: "✨ Pro Video" },
          immersive: { AR: "🌍 أنا هناك — 360°", EN: "🌍 I'm There — 360°" },
        };
        if (!manualMode) {
          if (intentType === "script") {
            setDetectedIntent("script");
            setIntentLabel(activeLang === "AR" ? "📄 سيناريو احترافي" : "📄 Professional Script");
          } else {
            const finalMode = aiOutputMode || quick.outputMode;
            setIntentLabel(modeLabels[finalMode]?.[activeLang] || modeLabels[finalMode]?.["EN"] || "");
          }
        }
      } catch { /* keep quick detect */ } finally {
        setIsThinking(false);
      }
    }, 1500);
  }, [prompt, activeLang, manualMode]);

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

      // ── وضع أنا هناك ──
      if (outputMode === "immersive") {
        setIsGeneratingImmersive(true);
        setPortalGlow(true);
        try {
          const res = await immersiveViewMutation.mutateAsync({
            description: finalDesc || "خيال حر",
            referenceImageUrl: uploadedImageUrl || urlInput || undefined,
            language: langCode,
          });
          setImmersiveResult(res as ImmersiveResult);
        } catch (err) {
          console.error(err);
        } finally {
          setIsGeneratingImmersive(false);
        }
        return;
      }

      // إذا اختار المستخدم وضع "صور" صراحةً → توليد صور فقط بغض النظر عن القصد المكتشف
      if (outputMode === "images") {
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
        return;
      }

      if (intent === "video" || outputMode === "fast" || outputMode === "pro") {
        // ── طلب إذن الإشعارات عند بدء الإنتاج ──
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
        try {
          const result = await quickProduceMutation.mutateAsync({
            description: finalDesc,
            language: langCode,
            voice: langCode === "ar" ? "ar_male_formal" : "en_male_formal",
            sceneCount: 5,
            options: { aspectRatio: "16:9", mode: "production", musicVolume: 0.12, useRunway: true, useElevenLabs: true, quality: videoQuality },
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

  // ── عرض وضع أنا هناك ──
  if (immersiveResult) {
    return (
      <ImmersiveViewer
        result={immersiveResult}
        onBack={() => setImmersiveResult(null)}
      />
    );
  }

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

      {/* ═══ MY FILMS BUTTON ═══ */}
      <div className="absolute top-4 right-4 z-30">
        <Link href="/my-films">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
            style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa", fontFamily: "'Tajawal', sans-serif" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
            <span>أفلامي</span>
          </button>
        </Link>
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
            )}            {/* ـــ شريط التحكّم: أزرار يدوية + chip الكشف التلقائي ـــ */}
            <div className="flex items-center gap-2 px-4 pt-2 pb-0 flex-wrap">
              {/* أزرار التحكّم اليدوي */}
              {([
                { mode: "images" as const, icon: "🎨", ar: "صور", en: "Images" },
                { mode: "fast" as const, icon: "⚡", ar: "سريع", en: "Fast" },
                { mode: "pro" as const, icon: "✨", ar: "احترافي", en: "Pro" },
                { mode: "immersive" as const, icon: "🌍", ar: "أنا هناك", en: "I'm There" },
              ] as const).map(({ mode, icon, ar, en }) => {
                const isActive = outputMode === mode;
                const colors = {
                  images: { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.5)", color: "#34d399", bgInactive: "rgba(52,211,153,0.05)", borderInactive: "rgba(52,211,153,0.15)" },
                  fast: { bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.5)", color: "#60a5fa", bgInactive: "rgba(96,165,250,0.05)", borderInactive: "rgba(96,165,250,0.15)" },
                  pro: { bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.5)", color: "#a78bfa", bgInactive: "rgba(167,139,250,0.05)", borderInactive: "rgba(167,139,250,0.15)" },
                  immersive: { bg: "rgba(255,170,68,0.15)", border: "rgba(255,170,68,0.5)", color: "#ffaa44", bgInactive: "rgba(255,170,68,0.05)", borderInactive: "rgba(255,170,68,0.15)" },
                }[mode];
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (manualMode === mode) {
                        // إلغاء التحكّم اليدوي → عودة للكشف التلقائي
                        setManualMode(null);
                      } else {
                        setManualMode(mode);
                        setOutputMode(mode);
                        setIntentLabel(getModeLabel(mode));
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isActive ? colors.bg : colors.bgInactive,
                      border: `1px solid ${isActive ? colors.border : colors.borderInactive}`,
                      color: isActive ? colors.color : "rgba(255,255,255,0.35)",
                      fontFamily: "'Tajawal', sans-serif",
                      boxShadow: isActive ? `0 0 8px ${colors.border}` : "none",
                    }}
                    title={activeLang === "AR" ? `تحديد وضع ${ar} يدوياً` : `Force ${en} mode`}
                  >
                    <span>{icon}</span>
                    <span>{activeLang === "AR" ? ar : en}</span>
                    {manualMode === mode && (
                      <span style={{ opacity: 0.7, fontSize: 9 }}>✓</span>
                    )}
                  </button>
                );
              })}

              {/* chip الكشف التلقائي */}
              {intentLabel && !manualMode && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: outputMode === "immersive" ? "rgba(255,170,68,0.08)" : outputMode === "pro" ? "rgba(167,139,250,0.08)" : outputMode === "images" ? "rgba(52,211,153,0.08)" : "rgba(96,165,250,0.08)",
                    color: outputMode === "immersive" ? "rgba(255,170,68,0.6)" : outputMode === "pro" ? "rgba(167,139,250,0.6)" : outputMode === "images" ? "rgba(52,211,153,0.6)" : "rgba(96,165,250,0.6)",
                    border: `1px solid ${outputMode === "immersive" ? "rgba(255,170,68,0.15)" : outputMode === "pro" ? "rgba(167,139,250,0.15)" : outputMode === "images" ? "rgba(52,211,153,0.15)" : "rgba(96,165,250,0.15)"}`,
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  {isThinking ? (
                    <span style={{ opacity: 0.5 }}>{activeLang === "AR" ? "⚡ تحليل..." : "⚡ Analyzing..."}</span>
                  ) : (
                    <span style={{ opacity: 0.6 }}>{activeLang === "AR" ? "ذكاء: " : "AI: "}{intentLabel}</span>
                  )}
                </div>
              )}
            </div>
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
                disabled={isGenerating || isGeneratingScript || isGeneratingImmersive || !hasContent}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  background: (isGenerating || isGeneratingScript || isGeneratingImmersive)
                    ? "rgba(139,92,246,0.3)"
                    : outputMode === "immersive"
                    ? "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fbbf24 100%)"
                    : detectedIntent === "video"
                    ? "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)"
                    : detectedIntent === "script"
                    ? "linear-gradient(135deg, #065f46 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)",
                  color: "white",
                  boxShadow: (isGenerating || isGeneratingScript || isGeneratingImmersive) ? "none" : outputMode === "immersive" ? "0 0 20px rgba(251,191,36,0.4)" : "0 0 20px rgba(124,58,237,0.4)",
                  minWidth: 110,
                }}
              >
                {isGeneratingImmersive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    <span>{activeLang === "AR" ? "ينقلك هناك..." : "Teleporting..."}</span>
                  </>
                ) : (isGenerating || isGeneratingScript) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{activeLang === "AR" ? "يُشكّل..." : "Generating..."}</span>
                  </>
                ) : outputMode === "immersive" ? (
                  <span>🌍 {activeLang === "AR" ? "انقلني هناك" : "Take Me There"}</span>
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
                <button
                  onClick={() => {
                    localStorage.removeItem("khayal_video_job");
                    localStorage.removeItem("khayal_chat");
                    setVideoJob(null);
                    setShowChat(false);
                    setChatMessages([]);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Tajawal', sans-serif" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  إلغاء
                </button>
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
                <div className="mt-2 space-y-2">
                  {/* مشغّل الفيديو — playsInline ضروري لـ Safari/iPhone */}
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: "#000", aspectRatio: "16/9" }}>
                    <video
                      src={videoJob.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                      style={{ display: "block" }}
                    />
                  </div>
                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2">
                    <a
                      href={videoJob.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontFamily: "'Tajawal', sans-serif" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      {activeLang === "AR" ? "تحميل" : "Download"}
                    </a>
                    <ShareVideoButton jobId={videoJob.jobId} description={prompt} />
                    <a
                      href={videoJob.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa", fontFamily: "'Tajawal', sans-serif" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                      </svg>
                      {activeLang === "AR" ? "فتح" : "Open"}
                    </a>
                  </div>
                </div>
              )}

              {videoJob.status === "failed" && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)", fontFamily: "'Tajawal', sans-serif" }}>
                    {videoJob.error?.includes("Server restarted")
                      ? "⚡ انقطع الإنتاج بسبب إعادة تشغيل السيرفر — يمكنك إعادة المحاولة الآن"
                      : videoJob.error?.includes("Image generation")
                      ? "🎨 فشل توليد الصور — يرجى إعادة المحاولة"
                      : videoJob.error || "حدث خطأ أثناء الإنتاج"}
                  </p>
                  {/* زر إعادة المحاولة — يُعيد الإنتاج بنفس الوصف */}
                  {prompt.trim() && (
                    <button
                      onClick={async () => {
                        localStorage.removeItem("khayal_video_job");
                        setVideoJob(null);
                        // إعادة الإنتاج تلقائياً
                        try {
                          const langCode = ["AR", "FA", "UR", "HE"].includes(activeLang) ? "ar" : "en";
                          const result = await quickProduceMutation.mutateAsync({
                            description: prompt.trim(),
                            language: langCode,
                            voice: langCode === "ar" ? "ar_male_formal" : "en_male_formal",
                            sceneCount: 5,
                            options: { aspectRatio: "16:9", mode: "production", musicVolume: 0.12, useRunway: true, useElevenLabs: true, quality: videoQuality },
                          });
                          setVideoJob({ jobId: result.jobId, status: "pending", progress: 0, currentStep: "جاري التحضير..." });
                        } catch (err) { console.error(err); }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", fontFamily: "'Tajawal', sans-serif" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
                      إعادة المحاولة
                    </button>
                  )}
                </div>
              )}
              {/* زر إنتاج جديد — يظهر عند اكتمال الإنتاج أو فشله */}
              {(videoJob.status === "done" || videoJob.status === "failed") && (
                <button
                  onClick={() => {
                    localStorage.removeItem("khayal_video_job");
                    setVideoJob(null);
                    setResult(null);
                    setPrompt("");
                    setUploadedImageUrl(null);
                    setDocumentAnalysis(null);
                    setUrlInput("");
                    setChatMessages([]);
                    setShowChat(false);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.2))",
                    border: "1px solid rgba(124,58,237,0.4)",
                    color: "#c4b5fd",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7-7 7 7"/>
                  </svg>
                  ✨ إنتاج جديد
                </button>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              شريط المحادثة الذكية مع خيال
          ══════════════════════════════════════════════════════════ */}
          {showChat && (
            <div
              className="mt-4 rounded-2xl overflow-hidden transition-all"
              style={{
                background: "rgba(6,7,16,0.95)",
                border: "1px solid rgba(139,92,246,0.2)",
                backdropFilter: "blur(20px)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.1)" }}
                onClick={() => setShowChat(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" style={{ animation: "micPulse 2s ease-out infinite" }} />
                  <span className="text-xs font-bold" style={{ color: "rgba(196,181,253,0.8)", fontFamily: "'Tajawal', sans-serif" }}>
                    {activeLang === "AR" ? "تحدّث مع خيال" : "Chat with Khayal"}
                  </span>
                  <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.35)" }}>
                    {activeLang === "AR" ? "اسأل، عدّل، استفسر..." : "Ask, edit, inquire..."}
                  </span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </div>

              {/* Messages */}
              <div
                className="overflow-y-auto px-4 py-3 flex flex-col gap-2"
                style={{ maxHeight: 260, minHeight: chatMessages.length > 0 ? 80 : 0 }}
                dir={isRTL ? "rtl" : "ltr"}
              >
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? (isRTL ? "justify-start" : "justify-end") : (isRTL ? "justify-end" : "justify-start")}`}
                  >
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                      style={{
                        fontFamily: "'Tajawal', sans-serif",
                        background: msg.role === "user"
                          ? "rgba(139,92,246,0.18)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${msg.role === "user" ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: msg.role === "user" ? "rgba(196,181,253,0.9)" : "rgba(255,255,255,0.75)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.isThinking ? (
                        <div className="flex items-center gap-1">
                          {[0,1,2].map(j => (
                            <div key={j} className="w-1.5 h-1.5 rounded-full bg-purple-400/60"
                              style={{ animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${j * 0.2}s` }} />
                          ))}
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder={activeLang === "AR" ? "اسأل خيال... كم يستغرق؟ عدّل المشهد الثاني..." : "Ask Khayal... how long? edit scene 2..."}
                  className="flex-1 bg-transparent text-white/70 placeholder-white/20 outline-none text-xs"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || isChatSending}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  {isChatSending ? (
                    <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* زر فتح المحادثة إذا لم تكن ظاهرة */}
          {!showChat && (videoJob || scriptResult || result) && (
            <button
              onClick={() => setShowChat(true)}
              className="mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                color: "rgba(196,181,253,0.6)",
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {activeLang === "AR" ? "تحدّث مع خيال" : "Chat with Khayal"}
            </button>
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
