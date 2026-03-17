/**
 * VideoProductionPanel — واجهة إنتاج الفيديو الاحترافي
 * Pipeline: وصف → سيناريو → صور → صوت → Ken Burns → فيديو MP4
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── أنواع ───────────────────────────────────────────────────

interface VideoScene {
  imagePrompt: string;
  subtitle: string;
  narration?: string;
  duration: number;
  zoom: "in" | "out" | "pan_left" | "pan_right";
}

interface VideoScript {
  title: string;
  language: "ar" | "en";
  voice: "ar_male" | "ar_female" | "en_male" | "en_female";
  narration: string;
  domain?: string;
  scenes: VideoScene[];
}

type ProductionStep =
  | "idle"
  | "writing_script"
  | "script_ready"
  | "producing"
  | "done"
  | "failed";

// ─── الأيقونات ────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, string> = {
  educational: "🔬",
  documentary: "🎥",
  cinematic: "🎬",
  architectural: "🏛️",
  scientific: "🧪",
  historical: "📜",
  story: "📖",
  nature: "🌿",
  space: "🚀",
  marketing: "📢",
  medical: "🏥",
  default: "✨",
};

const VOICE_LABELS: Record<string, string> = {
  ar_male: "صوت ذكر عربي",
  ar_female: "صوت أنثى عربي",
  en_male: "Male English",
  en_female: "Female English",
};

const ZOOM_LABELS: Record<string, string> = {
  in: "تقريب",
  out: "إبعاد",
  pan_left: "تحريك يسار",
  pan_right: "تحريك يمين",
};

// ─── المكوّن الرئيسي ──────────────────────────────────────────

export default function VideoProductionPanel() {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [voice, setVoice] = useState<"ar_male" | "ar_female" | "en_male" | "en_female">("ar_male");
  const [sceneCount, setSceneCount] = useState(6);
  const [step, setStep] = useState<ProductionStep>("idle");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Mutations ──
  const generateScriptMutation = trpc.video.generateScript.useMutation();
  const startProductionMutation = trpc.video.startProduction.useMutation();
  const quickProduceMutation = trpc.video.quickProduce.useMutation();

  // ── Polling حالة المهمة ──
  const { data: jobStatus } = trpc.video.getJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId && (step === "producing"),
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (!jobStatus) return;
    setProgress(jobStatus.progress);
    setCurrentStep(jobStatus.currentStep);

    if (jobStatus.status === "done" && jobStatus.videoUrl) {
      setVideoUrl(jobStatus.videoUrl);
      setStep("done");
    } else if (jobStatus.status === "failed") {
      setError(jobStatus.error || "فشل الإنتاج");
      setStep("failed");
    }
  }, [jobStatus]);

  // ── كتابة السيناريو ──
  const handleWriteScript = async () => {
    if (!description.trim()) return;
    setStep("writing_script");
    setError(null);
    try {
      const result = await generateScriptMutation.mutateAsync({
        description,
        language,
        voice,
        sceneCount,
      });
      setScript(result.script as VideoScript);
      setStep("script_ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل كتابة السيناريو");
      setStep("failed");
    }
  };

  // ── بدء الإنتاج بسيناريو موجود ──
  const handleProduce = async () => {
    if (!script) return;
    setStep("producing");
    setProgress(0);
    setCurrentStep("جاري التحضير...");
    setError(null);
    try {
      const result = await startProductionMutation.mutateAsync({ script });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل بدء الإنتاج");
      setStep("failed");
    }
  };

  // ── الإنتاج السريع (سيناريو + إنتاج) ──
  const handleQuickProduce = async () => {
    if (!description.trim()) return;
    setStep("producing");
    setProgress(0);
    setCurrentStep("تحليل المحتوى وكتابة السيناريو...");
    setError(null);
    setScript(null);
    try {
      const result = await quickProduceMutation.mutateAsync({
        description,
        language,
        voice,
        sceneCount,
      });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإنتاج");
      setStep("failed");
    }
  };

  const handleReset = () => {
    setStep("idle");
    setScript(null);
    setJobId(null);
    setProgress(0);
    setCurrentStep("");
    setVideoUrl(null);
    setError(null);
  };

  const domainIcon = script?.domain
    ? DOMAIN_ICONS[script.domain] || DOMAIN_ICONS.default
    : DOMAIN_ICONS.default;

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto" dir="rtl">

      {/* ── العنوان ── */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">
          🎬 إنتاج الفيديو الاحترافي
        </h2>
        <p className="text-blue-300/70 text-sm">
          أي محتوى → سيناريو → صور → صوت → فيديو MP4 احترافي
        </p>
      </div>

      {/* ── حالة الخطأ ── */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">
          <span className="font-bold">خطأ: </span>{error}
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 text-red-400 hover:text-red-200"
            onClick={handleReset}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* ══ المرحلة 1: الإدخال ══ */}
      {(step === "idle" || step === "failed") && (
        <Card className="bg-[#0d1117] border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300 text-lg">
              📝 وصف المحتوى
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: حياة النملة تحت الأرض — كيف تعيش وتأكل وتبني مستعمرتها في الصيف والشتاء..."
              className="bg-[#08090f] border-blue-500/30 text-white placeholder:text-blue-300/30 min-h-[120px] text-base"
              dir="auto"
            />

            {/* الإعدادات */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-blue-300/70 text-xs mb-1 block">اللغة</label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                  <SelectTrigger className="bg-[#08090f] border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-blue-300/70 text-xs mb-1 block">الصوت</label>
                <Select value={voice} onValueChange={(v) => setVoice(v as typeof voice)}>
                  <SelectTrigger className="bg-[#08090f] border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar_male">ذكر عربي</SelectItem>
                    <SelectItem value="ar_female">أنثى عربية</SelectItem>
                    <SelectItem value="en_male">Male EN</SelectItem>
                    <SelectItem value="en_female">Female EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-blue-300/70 text-xs mb-1 block">عدد المشاهد</label>
                <Select value={String(sceneCount)} onValueChange={(v) => setSceneCount(Number(v))}>
                  <SelectTrigger className="bg-[#08090f] border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} مشاهد</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="flex gap-3">
              <Button
                onClick={handleWriteScript}
                disabled={!description.trim() || generateScriptMutation.isPending}
                variant="outline"
                className="flex-1 border-blue-500/40 text-blue-300 hover:bg-blue-900/20"
              >
                {generateScriptMutation.isPending ? "جاري الكتابة..." : "✍️ اكتب السيناريو أولاً"}
              </Button>
              <Button
                onClick={handleQuickProduce}
                disabled={!description.trim() || quickProduceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                🚀 إنتاج مباشر
              </Button>
            </div>

            {/* أمثلة */}
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                "حياة النملة تحت الأرض",
                "رحلة إلى المريخ",
                "قصة الأرنب والسلحفاة",
                "بناء الأهرامات المصرية",
                "دورة الماء في الطبيعة",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  className="text-xs px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-300/70 hover:text-blue-200 hover:border-blue-400/40 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 2: السيناريو ══ */}
      {step === "script_ready" && script && (
        <Card className="bg-[#0d1117] border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-300 text-lg flex items-center gap-2">
                <span>{domainIcon}</span>
                <span>{script.title}</span>
              </CardTitle>
              <div className="flex gap-2">
                {script.domain && (
                  <Badge className="bg-blue-900/40 text-blue-300 border-blue-500/30">
                    {script.domain}
                  </Badge>
                )}
                <Badge className="bg-green-900/40 text-green-300 border-green-500/30">
                  {VOICE_LABELS[script.voice]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* التعليق الصوتي */}
            <div className="bg-[#08090f] rounded-lg p-4 border border-blue-500/10">
              <p className="text-blue-300/50 text-xs mb-2">التعليق الصوتي الكامل:</p>
              <p className="text-white/80 text-sm leading-relaxed">{script.narration}</p>
            </div>

            {/* المشاهد */}
            <div className="grid grid-cols-1 gap-3">
              {script.scenes.map((scene, i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-[#08090f] rounded-lg p-3 border border-blue-500/10"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-300 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium mb-1">{scene.subtitle}</p>
                    <p className="text-blue-300/50 text-xs truncate">{scene.imagePrompt.slice(0, 80)}...</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-blue-400/60">{scene.duration}ث</span>
                      <span className="text-xs text-blue-400/60">{ZOOM_LABELS[scene.zoom]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* أزرار */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-gray-500/40 text-gray-400 hover:bg-gray-900/20"
              >
                تعديل
              </Button>
              <Button
                onClick={handleProduce}
                disabled={startProductionMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                🎬 ابدأ الإنتاج
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 3: الإنتاج ══ */}
      {step === "producing" && (
        <Card className="bg-[#0d1117] border-blue-500/30">
          <CardContent className="pt-6 flex flex-col gap-6">
            {/* عنوان */}
            <div className="text-center">
              <div className="text-4xl mb-3 animate-pulse">🎬</div>
              <h3 className="text-white text-xl font-bold mb-1">جاري الإنتاج...</h3>
              <p className="text-blue-300/70 text-sm">{currentStep}</p>
            </div>

            {/* شريط التقدم */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-blue-300/60">
                <span>التقدم</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 bg-[#08090f] rounded-full overflow-hidden border border-blue-500/20">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* خطوات Pipeline */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { icon: "🖼️", label: "الصور", threshold: 40 },
                { icon: "🎙️", label: "الصوت", threshold: 55 },
                { icon: "🎞️", label: "المشاهد", threshold: 80 },
                { icon: "🔗", label: "الدمج", threshold: 90 },
                { icon: "☁️", label: "الرفع", threshold: 99 },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    progress >= s.threshold
                      ? "border-green-500/40 bg-green-900/20"
                      : progress >= s.threshold - 20
                      ? "border-blue-500/40 bg-blue-900/20 animate-pulse"
                      : "border-gray-700/40 bg-gray-900/10"
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-blue-300/40 text-xs">
              قد يستغرق الإنتاج 2-5 دقائق حسب عدد المشاهد
            </p>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 4: الفيديو جاهز ══ */}
      {step === "done" && videoUrl && (
        <Card className="bg-[#0d1117] border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-300 text-lg flex items-center gap-2">
              <span>✅</span>
              <span>الفيديو جاهز!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* مشغّل الفيديو */}
            <div className="rounded-xl overflow-hidden border border-green-500/20 bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full"
                style={{ maxHeight: "400px" }}
              >
                متصفحك لا يدعم تشغيل الفيديو
              </video>
            </div>

            {/* معلومات */}
            {script && (
              <div className="bg-[#08090f] rounded-lg p-3 border border-green-500/10">
                <p className="text-green-300/70 text-sm font-medium">{script.title}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {script.scenes.length} مشاهد · {script.scenes.reduce((a, s) => a + s.duration, 0)} ثانية
                </p>
              </div>
            )}

            {/* أزرار */}
            <div className="flex gap-3">
              <a
                href={videoUrl}
                download
                className="flex-1"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
                  ⬇️ تحميل الفيديو MP4
                </Button>
              </a>
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-blue-500/40 text-blue-300 hover:bg-blue-900/20"
              >
                إنتاج جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
