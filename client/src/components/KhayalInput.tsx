/**
 * KhayalInput.tsx — المقوم 5: واجهة الإدخال الذكية
 * ═══════════════════════════════════════════════════════════════
 * تقبل أي محتوى وتكشف نوعه تلقائياً وتعرض خطة الفيلم قبل التوليد
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type { GenerationResult } from "@/types/khayal";

// ══════════════════════════════════════════════════════════════
// أنواع المجالات مع أيقوناتها وألوانها
// ══════════════════════════════════════════════════════════════

type ContentDomain =
  | "educational" | "storytelling" | "documentary" | "architectural"
  | "scientific" | "historical" | "natural" | "spatial" | "artistic"
  | "engineering" | "microscopic" | "cultural" | "fantasy" | "biographical";

const DOMAIN_META: Record<ContentDomain, { icon: string; label: string; color: string; examples: string[] }> = {
  educational:   { icon: "🔬", label: "تعليمي",      color: "#34d399", examples: ["حياة النملة تحت الأرض", "دورة حياة الفراشة", "كيف تعمل الخلية"] },
  storytelling:  { icon: "📖", label: "قصصي",        color: "#f472b6", examples: ["قصة الأرنب والسلحفاة", "مغامرة في الغابة السحرية", "الأمير الصغير"] },
  documentary:   { icon: "🎥", label: "وثائقي",       color: "#60a5fa", examples: ["حياة الأسد في الصحراء", "مجتمعات النحل", "الحياة في القطب الشمالي"] },
  architectural: { icon: "🏛️", label: "معماري",      color: "#a78bfa", examples: ["فيلا عصرية بإطلالة بحرية", "مسجد عثماني كلاسيكي", "برج زجاجي حديث"] },
  scientific:    { icon: "🔭", label: "علمي",         color: "#38bdf8", examples: ["رحلة إلى المريخ", "انفجار نجم عملاق", "الثقب الأسود"] },
  historical:    { icon: "🏺", label: "تاريخي",       color: "#fbbf24", examples: ["الحضارة الفرعونية", "بغداد في العصر الذهبي", "الحضارة الرومانية"] },
  natural:       { icon: "🌿", label: "طبيعي",        color: "#4ade80", examples: ["غابة الأمازون الاستوائية", "الشعاب المرجانية", "الصحراء الكبرى"] },
  spatial:       { icon: "🌌", label: "فضائي",        color: "#818cf8", examples: ["المجرة درب التبانة", "ثقب أسود يبتلع نجماً", "سديم كوني"] },
  artistic:      { icon: "🎨", label: "فني",          color: "#fb923c", examples: ["لوحة انطباعية لباريس", "نحت كلاسيكي يوناني", "فن إسلامي هندسي"] },
  engineering:   { icon: "⚙️", label: "هندسي",        color: "#94a3b8", examples: ["محرك طائرة نفاث", "جسر معلق ضخم", "محطة طاقة شمسية"] },
  microscopic:   { icon: "🦠", label: "مجهري",        color: "#c084fc", examples: ["خلية دم حمراء", "فيروس كورونا", "DNA وراثي"] },
  cultural:      { icon: "🎭", label: "ثقافي",        color: "#f59e0b", examples: ["مهرجان الألوان الهندي", "رقصة تقليدية عربية", "سوق شعبي قديم"] },
  fantasy:       { icon: "🐉", label: "خيالي",        color: "#e879f9", examples: ["مملكة طائرة في السحاب", "غابة السحر والتنانين", "مدينة المستقبل"] },
  biographical:  { icon: "👤", label: "سيرة ذاتية",  color: "#f87171", examples: ["رحلة ابن بطوطة", "حياة ابن سينا", "قصة نجاح رائد أعمال"] },
};

// كشف سريع من النص
function quickDetectDomain(text: string): ContentDomain | null {
  if (!text || text.length < 5) return null;
  const t = text.toLowerCase();

  if (/نمل|حشر|خلي|دور|مرحل|كيف|لماذا|تعليم|علم|ant|insect|cell|biology|how|why|learn|stage|life cycle/.test(t)) return "educational";
  if (/قصة|حكاية|كان يا|ذات مرة|بطل|شخصية|story|tale|once upon|hero|character/.test(t)) return "storytelling";
  if (/وثائقي|طبيعة|حيوان|غابة|محيط|documentary|wildlife|forest|ocean/.test(t)) return "documentary";
  if (/مبنى|بيت|فيلا|برج|مسجد|قصر|تصميم|معماري|building|house|villa|tower|architecture/.test(t)) return "architectural";
  if (/فضاء|كوكب|نجم|مجرة|ثقب أسود|space|planet|star|galaxy|black hole/.test(t)) return "scientific";
  if (/تاريخ|حضارة|قديم|فرعون|روماني|إسلامي|history|civilization|ancient|pharaoh/.test(t)) return "historical";
  if (/غابة|صحراء|جبل|نهر|بحر|شجرة|نبات|forest|desert|mountain|river|sea/.test(t)) return "natural";
  if (/كون|مجرة|سديم|universe|galaxy|nebula|cosmos/.test(t)) return "spatial";
  if (/فن|لوحة|نحت|رسم|art|painting|sculpture/.test(t)) return "artistic";
  if (/هندسة|آلة|محرك|engineering|machine|engine/.test(t)) return "engineering";
  if (/خلية|جرثوم|فيروس|dna|جزيء|cell|bacteria|virus|molecule/.test(t)) return "microscopic";
  if (/ثقافة|عادات|تقاليد|مهرجان|culture|customs|traditions|festival/.test(t)) return "cultural";
  if (/خيال|سحر|تنين|مملكة|fantasy|magic|dragon|kingdom/.test(t)) return "fantasy";
  if (/سيرة|شخصية|رحلة|biography|life story|journey/.test(t)) return "biographical";

  return null;
}

type UploadedFile = {
  name: string;
  type: "image" | "document";
  mimeType: string;
  dataUrl: string;   // للعرض المحلي فقط
  uploadedUrl?: string; // رابط R2 بعد الرفع
  size: number;
  uploading?: boolean;
};

interface Props {
  isGenerating: boolean;
  onGenerating: () => void;
  onGenerated: (result: GenerationResult) => void;
}

export default function KhayalInput({ isGenerating, onGenerating, onGenerated }: Props) {
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [detectedDomain, setDetectedDomain] = useState<ContentDomain | null>(null);
  const [useNewEngine, setUseNewEngine] = useState(true); // استخدام المحركات الجديدة
  const [visualMode, setVisualMode] = useState<"free" | "cinematic" | "realistic" | "precise">("cinematic");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // كشف نوع المحتوى تلقائياً عند الكتابة
  useEffect(() => {
    const timer = setTimeout(() => {
      const domain = quickDetectDomain(description);
      setDetectedDomain(domain);
    }, 500);
    return () => clearTimeout(timer);
  }, [description]);

  // توليد بالمحرك الجديد
  const generateWithDomainMutation = trpc.khayal.generateWithDomainEngine.useMutation({
    onSuccess: (data) => {
      onGenerated(data as GenerationResult);
    },
    onError: (err) => {
      setError(err.message || "حدث خطأ أثناء التوليد");
    },
  });

  // توليد بالمحرك القديم
  const generateMutation = trpc.khayal.generateScene.useMutation({
    onSuccess: (data) => {
      onGenerated(data as GenerationResult);
    },
    onError: (err) => {
      setError(err.message || "حدث خطأ أثناء التوليد");
    },
  });

  // رفع ملف إلى /api/upload والحصول على رابط R2
  const uploadFileToServer = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  };

  // معالجة رفع الملفات
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];
    for (const file of fileArray) {
      const isImage = file.type.startsWith("image/");
      const isDoc = file.type === "application/pdf" || file.type.includes("word") || file.name.endsWith(".pdf") || file.name.endsWith(".docx");
      if (!isImage && !isDoc) continue;
      if (file.size > 20 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: isImage ? "image" : "document", mimeType: file.type, dataUrl, size: file.size, uploading: isImage });
    }
    setUploadedFiles(prev => [...prev, ...newFiles].slice(0, 6));

    // رفع الصور إلى السيرفر في الخلفية للحصول على روابط R2 حقيقية
    for (const f of newFiles) {
      if (f.type === "image") {
        const blob = await (await fetch(f.dataUrl)).blob();
        const fileObj = new File([blob], f.name, { type: f.mimeType });
        const uploadedUrl = await uploadFileToServer(fileObj);
        setUploadedFiles(prev => prev.map(p =>
          p.name === f.name && p.uploading
            ? { ...p, uploadedUrl: uploadedUrl || undefined, uploading: false }
            : p
        ));
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  // توليد الفيلم
  const handleGenerate = async () => {
    if (!description.trim() && uploadedFiles.length === 0) {
      setError("يرجى إدخال وصف أو رفع ملف");
      return;
    }
    setError(null);
    onGenerating();

    const steps = [
      "تحليل المحتوى بالذكاء الاصطناعي...",
      "تحديد نوع الفيلم والأسلوب البصري...",
      "كتابة السيناريو والنصوص التعليمية...",
      "توليد المشاهد السينمائية...",
      "معالجة الصور الفوتوريالستيك...",
      "إعداد العرض السينمائي...",
    ];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setGeneratingStep(stepIndex);
    }, 3000);

    try {
      let fullDescription = description.trim();
      const imageFiles = uploadedFiles.filter(f => f.type === "image");
      const docFiles = uploadedFiles.filter(f => f.type === "document");

      if (docFiles.length > 0) fullDescription += `\n\nملفات مرفقة: ${docFiles.map(f => f.name).join(", ")}`;
      if (!fullDescription.trim()) fullDescription = "مشهد إبداعي";

      // استخدام رابط R2 إذا توفر وإلا التحويل للتحميل المباشر عبر السيرفر
      const referenceImageUrl = imageFiles.length > 0
        ? (imageFiles[0].uploadedUrl || undefined)
        : undefined;

      if (useNewEngine) {
        // المحركات الجديدة: تحليل + سيناريو + صور مخصصة
        await generateWithDomainMutation.mutateAsync({
          description: fullDescription,
          referenceImageUrl,
          visualMode,
        });
      } else {
        // المحرك القديم للتوافق
        await generateMutation.mutateAsync({
          description: fullDescription,
          scenarioType: "imagine",
          referenceImageUrl,
          title: fullDescription.slice(0, 60),
        });
      }
    } finally {
      clearInterval(stepInterval);
    }
  };

  const generatingSteps = [
    "تحليل المحتوى بالذكاء الاصطناعي...",
    "تحديد نوع الفيلم والأسلوب البصري...",
    "كتابة السيناريو والنصوص التعليمية...",
    "توليد المشاهد السينمائية...",
    "معالجة الصور الفوتوريالستيك...",
    "إعداد العرض السينمائي...",
  ];

  // ══════════════════════════════════════════════════════════════
  // شاشة التوليد
  // ══════════════════════════════════════════════════════════════
  if (isGenerating) {
    const domainMeta = detectedDomain ? DOMAIN_META[detectedDomain] : null;
    return (
      <div dir="rtl" className="min-h-screen bg-[#050608] flex flex-col items-center justify-center"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
        <div className="text-center max-w-md px-6">

          {/* دائرة التحميل */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="2" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad)" strokeWidth="2"
                strokeLinecap="round" strokeDasharray="283" strokeDashoffset="70"
                style={{ animation: "spin 2s linear infinite", transformOrigin: "center" }} />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl" style={{ animation: "pulse 2s ease-in-out infinite" }}>
                {domainMeta?.icon || "✨"}
              </span>
            </div>
          </div>

          {/* نوع المحتوى المكتشف */}
          {domainMeta && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{ background: `${domainMeta.color}15`, border: `1px solid ${domainMeta.color}40` }}>
              <span className="text-sm">{domainMeta.icon}</span>
              <span className="text-sm font-semibold" style={{ color: domainMeta.color }}>
                فيلم {domainMeta.label}
              </span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mb-3">جاري تشكيل خيالك...</h2>
          <p className="text-purple-300/60 text-sm mb-6">{generatingSteps[generatingStep]}</p>

          {/* شريط التقدم */}
          <div className="w-full bg-white/5 rounded-full h-1.5 mb-4 overflow-hidden">
            <div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #7c3aed, ${domainMeta?.color || "#3b82f6"})`,
                animation: "progress 15s ease-in-out infinite" }} />
          </div>

          {/* خطوات التوليد */}
          <div className="flex flex-col gap-1.5 mt-6">
            {generatingSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs"
                style={{ opacity: i === generatingStep ? 1 : i < generatingStep ? 0.5 : 0.2 }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                  style={{ background: i <= generatingStep ? `${domainMeta?.color || "#7c3aed"}30` : "transparent",
                    border: `1px solid ${i <= generatingStep ? (domainMeta?.color || "#7c3aed") + "60" : "rgba(255,255,255,0.1)"}` }}>
                  {i < generatingStep ? "✓" : i + 1}
                </div>
                <span style={{ color: i === generatingStep ? (domainMeta?.color || "#a78bfa") : "rgba(255,255,255,0.4)" }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          <p className="text-white/20 text-xs mt-6">قد يستغرق هذا 30-90 ثانية</p>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
          @keyframes progress { 0% { width: 5%; } 60% { width: 85%; } 100% { width: 95%; } }
        `}</style>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // واجهة الإدخال الرئيسية
  // ══════════════════════════════════════════════════════════════
  const domainMeta = detectedDomain ? DOMAIN_META[detectedDomain] : null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050608] flex flex-col"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black"
            style={{ background: "linear-gradient(135deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            خيال
          </span>
          <span className="text-white/20 text-sm">· منصة التخيل الشامل</span>
        </div>

        {/* مؤشر المحرك */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseNewEngine(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: useNewEngine ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${useNewEngine ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: useNewEngine ? "#34d399" : "rgba(255,255,255,0.4)",
            }}
          >
            <span>{useNewEngine ? "⚡" : "○"}</span>
            <span>{useNewEngine ? "المحركات الجديدة" : "المحرك الكلاسيكي"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-6">

        {/* العمود الأيسر — الإدخال */}
        <div className="flex-1 flex flex-col gap-5">

          {/* ── صندوق الوصف ── */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/50 text-xs font-medium">صف ما تريد تخيله</p>
              {/* مؤشر نوع المحتوى المكتشف */}
              {domainMeta && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
                  style={{ background: `${domainMeta.color}15`, border: `1px solid ${domainMeta.color}40`, color: domainMeta.color }}>
                  <span>{domainMeta.icon}</span>
                  <span>فيلم {domainMeta.label}</span>
                </div>
              )}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="صف خيالك بحرية... مثلاً:&#10;• حياة النملة تحت الأرض — كيف تعيش، تأكل، تبني مستعمرتها&#10;• قصة الأمير الصغير في كوكبه&#10;• رحلة إلى قلب المجرة&#10;• فيلا عصرية بإطلالة بحرية&#10;• الحضارة الفرعونية في عصرها الذهبي"
              className="w-full rounded-2xl p-4 text-white/90 text-sm leading-relaxed resize-none outline-none transition-all duration-200 placeholder-white/20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${domainMeta ? domainMeta.color + "30" : "rgba(255,255,255,0.07)"}`,
                minHeight: "160px",
                fontFamily: "'Cairo', sans-serif",
                boxShadow: domainMeta ? `0 0 30px ${domainMeta.color}08` : "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              onFocus={(e) => e.target.style.borderColor = domainMeta ? domainMeta.color + "50" : "rgba(167,139,250,0.4)"}
              onBlur={(e) => e.target.style.borderColor = domainMeta ? domainMeta.color + "30" : "rgba(255,255,255,0.07)"}
            />

            {/* عداد الأحرف */}
            {description.length > 0 && (
              <div className="absolute bottom-3 left-3 text-white/20 text-xs">{description.length} حرف</div>
            )}
          </div>

          {/* ── وضع التصور ── */}
          {useNewEngine && (
            <div>
              <p className="text-white/50 text-xs mb-2 font-medium">وضع التصور البصري</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { id: "cinematic", icon: "🎬", label: "سينمائي", desc: "إضاءة درامية" },
                  { id: "realistic", icon: "📷", label: "واقعي",   desc: "فوتوريالستيك" },
                  { id: "precise",   icon: "📐", label: "دقيق",    desc: "هندسي دقيق" },
                  { id: "free",      icon: "✨", label: "حر",       desc: "إبداعي حر" },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setVisualMode(m.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200"
                    style={{
                      background: visualMode === m.id ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.02)",
                      borderColor: visualMode === m.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.06)",
                      boxShadow: visualMode === m.id ? "0 0 20px rgba(167,139,250,0.15)" : "none",
                    }}>
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: visualMode === m.id ? "#a78bfa" : "rgba(255,255,255,0.5)" }}>
                      {m.label}
                    </span>
                    <span className="text-xs text-white/20">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── رفع الملفات ── */}
          <div>
            <p className="text-white/50 text-xs mb-2 font-medium">
              صور مرجعية أو مستندات
              <span className="text-white/20 mr-2">— اختياري</span>
            </p>
            <div
              className="rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 cursor-pointer"
              style={{
                borderColor: dragOver ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.08)",
                background: dragOver ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.02)",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx"
                className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
              {uploadedFiles.length === 0 ? (
                <>
                  <div className="text-2xl mb-1">📎</div>
                  <p className="text-white/40 text-xs">اسحب وأفلت أو انقر — صور · PDF · Word</p>
                </>
              ) : (
                <div className="grid grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden group" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {file.type === "image" ? (
                        <div className="relative w-full h-16">
                          <img src={file.dataUrl} alt={file.name} className="w-full h-16 object-cover" />
                          {file.uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                          {!file.uploading && file.uploadedUrl && (
                            <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full" />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-16 flex flex-col items-center justify-center gap-1">
                          <span className="text-xl">📄</span>
                          <span className="text-white/50 text-xs px-1 text-center truncate w-full">{file.name}</span>
                        </div>
                      )}
                      <button onClick={() => removeFile(i)}
                        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  {uploadedFiles.length < 6 && (
                    <div className="h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-400/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}>
                      <span className="text-white/30 text-xl">+</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="rounded-xl p-3 text-red-300 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {/* زر التوليد */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-5 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            style={{
              background: domainMeta
                ? `linear-gradient(135deg, ${domainMeta.color}80, #4f46e5, #2563eb)`
                : "linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)",
              boxShadow: `0 0 40px ${domainMeta?.color || "#7c3aed"}40`,
            }}
          >
            <span className="relative z-10">
              {isGenerating ? "جاري التوليد..." : `${domainMeta?.icon || "✨"} شكّل الخيال`}
            </span>
          </button>
        </div>

        {/* العمود الأيمن — مجالات + أمثلة */}
        <div className="lg:w-72 flex flex-col gap-4">

          {/* مجالات المحتوى */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-white/60 text-xs font-semibold mb-3">المجالات المدعومة</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(DOMAIN_META) as [ContentDomain, typeof DOMAIN_META[ContentDomain]][]).map(([domain, meta]) => (
                <button
                  key={domain}
                  onClick={() => {
                    const ex = meta.examples[0];
                    setDescription(ex);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all hover:bg-white/5"
                  style={{
                    background: detectedDomain === domain ? `${meta.color}12` : "transparent",
                    border: `1px solid ${detectedDomain === domain ? meta.color + "40" : "transparent"}`,
                  }}
                >
                  <span>{meta.icon}</span>
                  <span style={{ color: detectedDomain === domain ? meta.color : "rgba(255,255,255,0.5)" }}>
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* أمثلة ذكية حسب المجال المكتشف */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-white/60 text-xs font-semibold mb-3">
              {domainMeta ? `أمثلة ${domainMeta.label}` : "أمثلة سريعة"}
            </p>
            <div className="flex flex-col gap-2">
              {(domainMeta ? domainMeta.examples : [
                "حياة النملة تحت الأرض — مراحلها وكيف تعيش",
                "رحلة إلى قلب المجرة درب التبانة",
                "قصة الأمير الصغير في كوكبه الصغير",
                "الحضارة الفرعونية في عصرها الذهبي",
              ]).map((ex, i) => (
                <button key={i} onClick={() => setDescription(ex)}
                  className="text-right text-xs text-white/40 hover:text-white/70 transition-colors leading-relaxed p-2 rounded-lg hover:bg-white/5">
                  <span className="ml-1">{domainMeta?.icon || "✨"}</span>{ex}
                </button>
              ))}
            </div>
          </div>

          {/* نصيحة */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <p className="text-purple-300/80 text-xs font-semibold mb-2">💡 المحركات الجديدة</p>
            <p className="text-white/40 text-xs leading-relaxed">
              المنصة تكتشف نوع محتواك تلقائياً وتكتب السيناريو الكامل بالعربي والإنجليزي، ثم تولّد مشاهد سينمائية مخصصة لكل مجال.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
