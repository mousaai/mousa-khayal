/**
 * KhayalInput.tsx
 * واجهة الإدخال الذكية لمنصة خيال
 * تقبل: نص وصفي + صور مرجعية + مستندات (PDF/Word) + رابط URL
 * مع اختيار نوع السيناريو
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { GenerationResult } from "@/pages/Home";

type ScenarioType = "design" | "develop" | "deteriorate" | "compare" | "imagine";

const SCENARIOS: { id: ScenarioType; icon: string; label: string; desc: string; color: string }[] = [
  { id: "imagine",     icon: "✨", label: "خيال حر",        desc: "أي شيء تتخيله",          color: "#a78bfa" },
  { id: "design",      icon: "🏛️", label: "تصميم جديد",    desc: "ابنِ من الصفر",           color: "#60a5fa" },
  { id: "develop",     icon: "🌱", label: "تطوير وازدهار",  desc: "كيف يبدو بعد التطوير",   color: "#34d399" },
  { id: "deteriorate", icon: "🌪️", label: "تدهور وتقادم",  desc: "أثر الزمن والإهمال",     color: "#f87171" },
  { id: "compare",     icon: "⏳", label: "مقارنة زمنية",   desc: "قبل وبعد جنباً لجنب",   color: "#fbbf24" },
];

type UploadedFile = {
  name: string;
  type: "image" | "document";
  mimeType: string;
  dataUrl: string;      // base64 للعرض المحلي
  s3Url?: string;       // URL بعد الرفع
  size: number;
};

interface Props {
  isGenerating: boolean;
  onGenerating: () => void;
  onGenerated: (result: GenerationResult) => void;
}

export default function KhayalInput({ isGenerating, onGenerating, onGenerated }: Props) {
  const [description, setDescription] = useState("");
  const [scenario, setScenario] = useState<ScenarioType>("imagine");
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingStep, setGeneratingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateMutation = trpc.khayal.generateScene.useMutation({
    onSuccess: (data) => {
      onGenerated(data as GenerationResult);
    },
    onError: (err) => {
      setError(err.message || "حدث خطأ أثناء التوليد");
    },
  });

  // معالجة رفع الملفات
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const isImage = file.type.startsWith("image/");
      const isDoc = file.type === "application/pdf" ||
                    file.type.includes("word") ||
                    file.type.includes("document") ||
                    file.name.endsWith(".pdf") ||
                    file.name.endsWith(".doc") ||
                    file.name.endsWith(".docx");

      if (!isImage && !isDoc) continue;
      if (file.size > 20 * 1024 * 1024) continue; // 20MB max

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newFiles.push({
        name: file.name,
        type: isImage ? "image" : "document",
        mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
        dataUrl,
        size: file.size,
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles].slice(0, 6)); // max 6 files
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // توليد المشهد
  const handleGenerate = async () => {
    if (!description.trim() && uploadedFiles.length === 0 && !urlInput.trim()) {
      setError("يرجى إدخال وصف أو رفع ملف أو إدخال رابط");
      return;
    }
    setError(null);
    onGenerating();

    // محاكاة خطوات التوليد
    const steps = [
      "تحليل الوصف بالذكاء الاصطناعي...",
      "توليد المشاهد السينمائية...",
      "معالجة الصور الفوتوريالستيك...",
      "إعداد العرض السينمائي...",
    ];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setGeneratingStep(stepIndex);
    }, 2500);

    try {
      // رفع الصور إلى S3 عبر API
      let referenceImageUrl: string | undefined;
      const imageFiles = uploadedFiles.filter(f => f.type === "image");
      const docFiles = uploadedFiles.filter(f => f.type === "document");

      // بناء الوصف الكامل
      let fullDescription = description.trim();
      if (urlInput.trim()) {
        fullDescription += `\n\nرابط مرجعي: ${urlInput.trim()}`;
      }
      if (docFiles.length > 0) {
        fullDescription += `\n\nملفات مرفقة: ${docFiles.map(f => f.name).join(", ")}`;
      }
      if (!fullDescription.trim()) {
        fullDescription = "مشهد معماري إبداعي";
      }

      // استخدام أول صورة كمرجع بصري
      if (imageFiles.length > 0) {
        referenceImageUrl = imageFiles[0].dataUrl;
      }

      await generateMutation.mutateAsync({
        description: fullDescription,
        scenarioType: scenario,
        referenceImageUrl,
        title: fullDescription.slice(0, 60),
      });
    } finally {
      clearInterval(stepInterval);
    }
  };

  const generatingSteps = [
    "تحليل الوصف بالذكاء الاصطناعي...",
    "توليد المشاهد السينمائية...",
    "معالجة الصور الفوتوريالستيك...",
    "إعداد العرض السينمائي...",
  ];

  // ===== شاشة التوليد =====
  if (isGenerating) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#050608] flex flex-col items-center justify-center"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        <div className="text-center max-w-md px-6">
          {/* دائرة التحميل */}
          <div className="relative w-32 h-32 mx-auto mb-10">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="2" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="url(#grad)" strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset="70"
                style={{ animation: "spin 2s linear infinite", transformOrigin: "center" }}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl" style={{ animation: "pulse 2s ease-in-out infinite" }}>✨</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">جاري تشكيل خيالك...</h2>
          <p className="text-purple-300/60 text-sm mb-8">{generatingSteps[generatingStep]}</p>

          {/* شريط التقدم */}
          <div className="w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #7c3aed, #3b82f6)",
                animation: "progress 10s ease-in-out infinite",
                width: "60%",
              }}
            />
          </div>

          <p className="text-white/20 text-xs">قد يستغرق هذا 30-60 ثانية</p>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
          @keyframes progress { 0% { width: 5%; } 50% { width: 80%; } 100% { width: 95%; } }
        `}</style>
      </div>
    );
  }

  // ===== واجهة الإدخال =====
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#050608] flex flex-col"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <span
          className="text-2xl font-black"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          خيال
        </span>
        <span className="text-white/20 text-sm">· صف خيالك وشاهده يتشكل</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-7xl mx-auto w-full p-6 gap-6">

        {/* العمود الأيسر — الإدخال */}
        <div className="flex-1 flex flex-col gap-5">

          {/* اختيار السيناريو */}
          <div>
            <p className="text-white/50 text-xs mb-3 font-medium">نوع السيناريو</p>
            <div className="grid grid-cols-5 gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200"
                  style={{
                    background: scenario === s.id ? `${s.color}15` : "rgba(255,255,255,0.02)",
                    borderColor: scenario === s.id ? `${s.color}60` : "rgba(255,255,255,0.06)",
                    boxShadow: scenario === s.id ? `0 0 20px ${s.color}20` : "none",
                  }}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: scenario === s.id ? s.color : "rgba(255,255,255,0.5)" }}>
                    {s.label}
                  </span>
                  <span className="text-xs text-white/20 text-center leading-tight hidden md:block">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* صندوق الوصف النصي */}
          <div>
            <p className="text-white/50 text-xs mb-2 font-medium">الوصف الشفهي / النصي</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="صف خيالك بحرية... مثلاً: قرية تراثية على جبل، بيوت حجرية قديمة، أشجار زيتون، أجواء غروب ذهبي — وتخيّل كيف ستبدو بعد تطويرها لتصبح وجهة سياحية فاخرة"
              className="w-full rounded-2xl p-4 text-white/90 text-sm leading-relaxed resize-none outline-none transition-all duration-200 placeholder-white/20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                minHeight: "140px",
                fontFamily: "'Cairo', sans-serif",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(167,139,250,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
            />
          </div>

          {/* منطقة رفع الملفات */}
          <div>
            <p className="text-white/50 text-xs mb-2 font-medium">
              صور مرجعية أو مستندات (اختياري)
              <span className="text-white/20 mr-2">— صور، PDF، Word، مخططات</span>
            </p>
            <div
              className="rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer"
              style={{
                borderColor: dragOver ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.08)",
                background: dragOver ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.02)",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              {uploadedFiles.length === 0 ? (
                <>
                  <div className="text-3xl mb-2">📎</div>
                  <p className="text-white/40 text-sm">اسحب وأفلت الملفات هنا أو انقر للاختيار</p>
                  <p className="text-white/20 text-xs mt-1">صور · PDF · Word · حتى 20MB لكل ملف</p>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden group" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {file.type === "image" ? (
                        <img src={file.dataUrl} alt={file.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl">📄</span>
                          <span className="text-white/50 text-xs px-2 text-center truncate w-full">{file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  {uploadedFiles.length < 6 && (
                    <div
                      className="h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-400/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="text-white/30 text-2xl">+</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* رابط URL */}
          <div>
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-white/30 text-xs hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <span>{showUrlInput ? "▼" : "▶"}</span>
              إضافة رابط مرجعي (موقع، صورة، خريطة...)
            </button>
            {showUrlInput && (
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-xl p-3 text-white/80 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  fontFamily: "monospace",
                  direction: "ltr",
                }}
              />
            )}
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
            className="w-full py-5 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)",
              boxShadow: "0 0 40px rgba(124,58,237,0.3)",
            }}
          >
            {isGenerating ? "جاري التوليد..." : "✨ شكّل الخيال"}
          </button>
        </div>

        {/* العمود الأيمن — إرشادات */}
        <div className="lg:w-72 flex flex-col gap-4">
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-white/60 text-sm font-semibold mb-4">أمثلة على الوصف</p>
            <div className="flex flex-col gap-3">
              {[
                { icon: "🕌", text: "مسجد عثماني كلاسيكي بقبة ذهبية ومئذنتين، في وسط حديقة خضراء واسعة عند الغروب" },
                { icon: "🏘️", text: "حي سكني شعبي قديم في المدينة القديمة — تخيّل كيف سيبدو بعد إعادة التأهيل والتطوير" },
                { icon: "🏭", text: "منطقة صناعية مهجورة بعد 50 سنة من الإهمال، أجواء درامية وكئيبة" },
                { icon: "🌿", text: "حديقة عامة فاخرة في قلب المدينة، ممشيات، نوافير، إضاءة ليلية ساحرة" },
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(ex.text)}
                  className="text-right text-xs text-white/40 hover:text-white/70 transition-colors leading-relaxed p-2 rounded-lg hover:bg-white/5"
                >
                  <span className="ml-1">{ex.icon}</span>{ex.text}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <p className="text-purple-300/80 text-sm font-semibold mb-3">💡 نصيحة</p>
            <p className="text-white/40 text-xs leading-relaxed">
              كلما كان وصفك أكثر تفصيلاً وإثراءً بالمشاعر والأجواء، كانت النتيجة السينمائية أكثر إبهاراً. أضف الإضاءة، الوقت من اليوم، الطقس، والمواد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
