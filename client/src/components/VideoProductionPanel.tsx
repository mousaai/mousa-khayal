/**
 * VideoProductionPanel v3.0 — واجهة إنتاج الفيديو الاحترافي
 * Pipeline v3.0: وصف → سيناريو → صور → ElevenLabs TTS → Runway Gen-4 → Ken Burns (Fallback) → دمج → موسيقى → MP4
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/components/AuthGate";
import { getLoginUrl } from "@/const";
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

// ─── الأنواع v3.0 ─────────────────────────────────────────────

type MotionEffect =
  | "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
  | "shake" | "rotate" | "bounce" | "spiral";

type TransitionEffect =
  | "fade" | "dissolve" | "wipe_left" | "wipe_right"
  | "zoom_fade" | "blur_fade" | "slide_left" | "slide_right";

type SceneType = "b_roll" | "talking_head" | "animation" | "screen_recording" | "mixed";

type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
type ProductionMode = "draft" | "production";

interface VideoScene {
  imagePrompt: string;
  subtitle: string;
  narration?: string;
  duration: number;
  zoom: MotionEffect;
  transition?: TransitionEffect;
  sceneType?: SceneType;
}

interface VideoScript {
  title: string;
  language: "ar" | "en";
  voice: "ar_male" | "ar_female" | "en_male" | "en_female";
  narration: string;
  domain?: string;
  musicMood?: string;
  scenes: VideoScene[];
}

interface ProductionMetrics {
  durationMs?: number;
  fileSizeMB?: number;
  sceneCount?: number;
  costEstimate?: number;
  usedElevenLabs?: boolean;
  usedRunway?: boolean;
}

type ProductionStep =
  | "idle"
  | "writing_script"
  | "script_ready"
  | "producing"
  | "done"
  | "failed";

// ─── تسميات وأيقونات ──────────────────────────────────────────

const DOMAIN_ICONS: Record<string, string> = {
  educational: "🔬", documentary: "🎥", cinematic: "🎬",
  architectural: "🏛️", scientific: "🧪", historical: "📜",
  story: "📖", nature: "🌿", space: "🚀", marketing: "📢",
  medical: "🏥", default: "✨",
};

const MOTION_LABELS: Record<MotionEffect, string> = {
  zoom_in: "تقريب", zoom_out: "إبعاد",
  pan_left: "تحريك يسار", pan_right: "تحريك يمين",
  shake: "اهتزاز", rotate: "دوران",
  bounce: "ارتداد", spiral: "حلزوني",
};

const TRANSITION_LABELS: Record<TransitionEffect, string> = {
  fade: "تلاشي", dissolve: "ذوبان",
  wipe_left: "مسح يسار", wipe_right: "مسح يمين",
  zoom_fade: "تقريب+تلاشي", blur_fade: "ضبابي",
  slide_left: "انزلاق يسار", slide_right: "انزلاق يمين",
};

const MUSIC_MOOD_LABELS: Record<string, string> = {
  calm: "هادئ 🎵", epic: "ملحمي 🎺", dramatic: "درامي 🎻",
  playful: "مرح 🎶", mysterious: "غامض 🎼", inspiring: "ملهم 🎸",
};

const EXAMPLES = [
  "حياة النملة تحت الأرض — كيف تعيش وتأكل وتبني مستعمرتها في الصيف والشتاء",
  "رحلة قطرة الماء من البحر إلى السحاب إلى الأمطار — دورة الماء في الطبيعة",
  "الكواكب الشمسية — من عطارد إلى نبتون، حجومها ومسافاتها وأسرارها",
  "تاريخ الحضارة الإسلامية — من مكة المكرمة إلى الأندلس",
  "قصة الأسد والفأر — حكاية عن الوفاء والصداقة للأطفال",
];

// ─── مراحل Pipeline v3.0 ──────────────────────────────────────

const PIPELINE_STAGES = [
  { label: "توليد الصور", icon: "🖼️", threshold: 5 },
  { label: "ElevenLabs TTS", icon: "🎙️", threshold: 35 },
  { label: "Runway Gen-4", icon: "🎞️", threshold: 50 },
  { label: "تجميع المشاهد", icon: "🎥", threshold: 72 },
  { label: "دمج المشاهد", icon: "🔗", threshold: 80 },
  { label: "رفع الفيديو", icon: "☁️", threshold: 95 },
];

// ─── المكوّن الرئيسي ──────────────────────────────────────────

export default function VideoProductionPanel() {
  const { user, isGuest } = useAuth();
  const isAuthenticated = !isGuest;
  const authLoading = false;
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [voice, setVoice] = useState<VideoScript["voice"]>("ar_male");
  const [sceneCount, setSceneCount] = useState(6);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [mode, setMode] = useState<ProductionMode>("production");
  const [useRunway, setUseRunway] = useState(true);
  const [useElevenLabs, setUseElevenLabs] = useState(true);

  const [step, setStep] = useState<ProductionStep>("idle");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [notFoundCount, setNotFoundCount] = useState(0);

  // ── Mutations ──
  const generateScriptMutation = trpc.video.generateScript.useMutation();
  const startProductionMutation = trpc.video.startProduction.useMutation();
  const quickProduceMutation = trpc.video.quickProduce.useMutation();

  // ── Polling حالة المهمة ──
  const { data: jobStatus } = trpc.video.getJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId && step === "producing",
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (!jobStatus) return;

    if (jobStatus.status === "not_found") {
      setNotFoundCount(prev => {
        const next = prev + 1;
        if (next >= 5) {
          setError("انتهت صلاحية الجلسة أو أُعيد تشغيل الخادم. يرجى إعادة المحاولة.");
          setStep("failed");
        }
        return next;
      });
      return;
    }

    setNotFoundCount(0);
    setProgress(jobStatus.progress);
    setCurrentStep(jobStatus.currentStep);

    if (jobStatus.status === "done" && jobStatus.videoUrl) {
      setVideoUrl(jobStatus.videoUrl);
      setMetrics(jobStatus.metrics ?? null);
      setStep("done");
    } else if (jobStatus.status === "failed") {
      setError(jobStatus.error || "فشل الإنتاج");
      setStep("failed");
    }
  }, [jobStatus]);

  // ── كتابة السيناريو ──
  const handleWriteScript = async () => {
    if (isGuest) { window.open("https://www.mousa.ai?ref=khayal", "_blank"); return; }
    if (!description.trim()) return;
    setStep("writing_script");
    setError(null);
    try {
      const result = await generateScriptMutation.mutateAsync({
        description, language, voice, sceneCount,
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
      const result = await startProductionMutation.mutateAsync({
        script: script as Parameters<typeof startProductionMutation.mutateAsync>[0]["script"],
        options: { aspectRatio, mode, useRunway, useElevenLabs },
      });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل بدء الإنتاج");
      setStep("failed");
    }
  };

  // ── الإنتاج السريع ──
  const handleQuickProduce = async () => {
    if (isGuest) { window.open("https://www.mousa.ai?ref=khayal", "_blank"); return; }
    if (!description.trim()) return;
    setStep("producing");
    setProgress(0);
    setCurrentStep("تحليل المحتوى وكتابة السيناريو...");
    setError(null);
    setScript(null);
    try {
      const result = await quickProduceMutation.mutateAsync({
        description, language, voice, sceneCount,
        options: { aspectRatio, mode, useRunway, useElevenLabs },
      });
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإنتاج");
      setStep("failed");
    }
  };

  const handleReset = () => {
    setStep("idle"); setScript(null); setJobId(null);
    setProgress(0); setCurrentStep(""); setVideoUrl(null);
    setError(null); setMetrics(null); setNotFoundCount(0);
  };

  const domainIcon = script?.domain
    ? (DOMAIN_ICONS[script.domain] || DOMAIN_ICONS.default)
    : DOMAIN_ICONS.default;

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto" dir="rtl">

      {/* ── العنوان ── */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">🎬 إنتاج الفيديو الاحترافي</h2>
        <p className="text-blue-300/70 text-sm">
          وصف → سيناريو → صور → ElevenLabs TTS → Runway Gen-4 → دمج → موسيقى → MP4
        </p>
        {/* شارات الإمكانيات v3.0 */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {[
            { label: "🎙️ ElevenLabs TTS", color: "purple" },
            { label: "🎞️ Runway Gen-4", color: "blue" },
            { label: "8 تأثيرات حركة", color: "blue" },
            { label: "8 انتقالات", color: "blue" },
            { label: "موسيقى خلفية", color: "blue" },
            { label: "4 نسب أبعاد", color: "blue" },
          ].map(cap => (
            <span
              key={cap.label}
              className={`text-xs border px-2 py-0.5 rounded-full ${
                cap.color === "purple"
                  ? "bg-purple-900/30 border-purple-500/20 text-purple-300"
                  : "bg-blue-900/30 border-blue-500/20 text-blue-300"
              }`}
            >
              {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── حالة الخطأ ── */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-bold">خطأ: </span>
              {error.includes("TTS") || error.includes("audio") || error.includes("speech")
                ? "خدمة توليد الصوت غير متاحة حالياً. سيتم إنتاج الفيديو بدون صوت تلقائي."
                : error}
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-200 shrink-0" onClick={handleReset}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      )}

      {/* ══ المرحلة 1: الإدخال ══ */}
      {(step === "idle" || step === "failed") && (
        <Card className="bg-[#0d1117] border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300 text-lg">📝 وصف المحتوى</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: حياة النملة تحت الأرض — كيف تعيش وتأكل وتبني مستعمرتها في الصيف والشتاء..."
              className="bg-[#08090f] border-blue-500/30 text-white placeholder:text-blue-300/30 min-h-[120px] text-base"
              dir="auto"
            />

            {/* الإعدادات الأساسية */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <SelectItem value="ar_male">🎙️ ذكر عربي</SelectItem>
                    <SelectItem value="ar_female">🎙️ أنثى عربية</SelectItem>
                    <SelectItem value="en_male">🎙️ Male EN</SelectItem>
                    <SelectItem value="en_female">🎙️ Female EN</SelectItem>
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

              <div>
                <label className="text-blue-300/70 text-xs mb-1 block">نسبة الأبعاد</label>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)}>
                  <SelectTrigger className="bg-[#08090f] border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 — أفقي (يوتيوب)</SelectItem>
                    <SelectItem value="9:16">9:16 — عمودي (تيك توك)</SelectItem>
                    <SelectItem value="1:1">1:1 — مربع (إنستغرام)</SelectItem>
                    <SelectItem value="4:3">4:3 — كلاسيكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* وضع الإنتاج + خيارات AI */}
            <div className="flex flex-col gap-3">
              {/* وضع الإنتاج */}
              <div className="flex gap-3 items-center flex-wrap">
                <label className="text-blue-300/70 text-xs">وضع الإنتاج:</label>
                <div className="flex gap-2">
                  {(["draft", "production"] as ProductionMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        mode === m
                          ? "bg-blue-600 border-blue-400 text-white"
                          : "bg-transparent border-blue-500/30 text-blue-300/60 hover:border-blue-500/60"
                      }`}
                    >
                      {m === "draft" ? "🔧 مسودة (سريع)" : "🎬 إنتاج (احترافي)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* خيارات AI v3.0 */}
              <div className="flex gap-3 items-center flex-wrap">
                <label className="text-blue-300/70 text-xs">محركات AI:</label>
                <div className="flex gap-2 flex-wrap">
                  {/* ElevenLabs Toggle */}
                  <button
                    onClick={() => setUseElevenLabs(!useElevenLabs)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all ${
                      useElevenLabs
                        ? "bg-purple-700 border-purple-400 text-white"
                        : "bg-transparent border-purple-500/30 text-purple-300/50 hover:border-purple-500/60"
                    }`}
                  >
                    <span>🎙️</span>
                    <span>ElevenLabs TTS</span>
                    <span className={`text-xs ${useElevenLabs ? "text-purple-200" : "text-purple-400/40"}`}>
                      {useElevenLabs ? "✓" : "✗"}
                    </span>
                  </button>

                  {/* Runway Toggle */}
                  <button
                    onClick={() => setUseRunway(!useRunway)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all ${
                      useRunway
                        ? "bg-blue-700 border-blue-400 text-white"
                        : "bg-transparent border-blue-500/30 text-blue-300/50 hover:border-blue-500/60"
                    }`}
                  >
                    <span>🎞️</span>
                    <span>Runway Gen-4</span>
                    <span className={`text-xs ${useRunway ? "text-blue-200" : "text-blue-400/40"}`}>
                      {useRunway ? "✓" : "✗"}
                    </span>
                  </button>
                </div>
                {!useRunway && (
                  <span className="text-yellow-400/70 text-xs">
                    ← Ken Burns Fallback
                  </span>
                )}
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
            <div className="flex flex-wrap gap-2">
              <span className="text-blue-300/50 text-xs self-center">أمثلة:</span>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(ex)}
                  className="text-xs bg-blue-900/20 border border-blue-500/20 text-blue-300/70 hover:text-blue-200 hover:border-blue-500/50 px-2 py-1 rounded-full transition-all"
                >
                  {ex.slice(0, 35)}...
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 2: كتابة السيناريو ══ */}
      {step === "writing_script" && (
        <Card className="bg-[#0d1117] border-blue-500/20">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-300">جاري تحليل المحتوى وكتابة السيناريو...</p>
            <p className="text-blue-300/50 text-sm">المحرك يكتشف النوع ويكتب النص بالعربي والإنجليزي</p>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 3: مراجعة السيناريو ══ */}
      {step === "script_ready" && script && (
        <Card className="bg-[#0d1117] border-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <span>{domainIcon}</span>
                <span>{script.title}</span>
              </CardTitle>
              <div className="flex gap-2">
                {script.domain && (
                  <Badge className="bg-blue-900/40 text-blue-300 border-blue-500/30">
                    {script.domain}
                  </Badge>
                )}
                {script.musicMood && (
                  <Badge className="bg-purple-900/40 text-purple-300 border-purple-500/30">
                    {MUSIC_MOOD_LABELS[script.musicMood] || script.musicMood}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* التعليق الصوتي */}
            <div className="bg-[#08090f] rounded-lg p-4 border border-blue-500/10">
              <p className="text-blue-300/60 text-xs mb-2">التعليق الصوتي الكامل:</p>
              <p className="text-white/80 text-sm leading-relaxed" dir="auto">{script.narration}</p>
            </div>

            {/* المشاهد */}
            <div className="space-y-2">
              <p className="text-blue-300/60 text-xs">المشاهد ({script.scenes.length}):</p>
              {script.scenes.map((scene, i) => (
                <div key={i} className="bg-[#08090f] rounded-lg p-3 border border-blue-500/10 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-300 font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      <Badge className="text-xs bg-blue-900/30 text-blue-300 border-blue-500/20">
                        {MOTION_LABELS[scene.zoom] || scene.zoom}
                      </Badge>
                      {scene.transition && (
                        <Badge className="text-xs bg-purple-900/30 text-purple-300 border-purple-500/20">
                          → {TRANSITION_LABELS[scene.transition] || scene.transition}
                        </Badge>
                      )}
                      {scene.sceneType && scene.sceneType !== "b_roll" && (
                        <Badge className="text-xs bg-green-900/30 text-green-300 border-green-500/20">
                          {scene.sceneType}
                        </Badge>
                      )}
                      <span className="text-blue-300/40 text-xs">{scene.duration}ث</span>
                    </div>
                    <p className="text-white/80 text-sm" dir="auto">{scene.subtitle}</p>
                    {scene.narration && (
                      <p className="text-blue-300/50 text-xs mt-1" dir="auto">{scene.narration}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* شارات المحركات المفعّلة */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-blue-300/50 text-xs self-center">محركات الإنتاج:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${useElevenLabs ? "bg-purple-900/40 border-purple-500/30 text-purple-300" : "bg-gray-900/40 border-gray-500/20 text-gray-500"}`}>
                🎙️ ElevenLabs {useElevenLabs ? "✓" : "✗"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${useRunway ? "bg-blue-900/40 border-blue-500/30 text-blue-300" : "bg-gray-900/40 border-gray-500/20 text-gray-500"}`}>
                🎞️ Runway {useRunway ? "✓" : "✗"}
              </span>
            </div>

            {/* أزرار */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-900/20"
                onClick={handleReset}
              >
                ← تعديل
              </Button>
              <Button
                onClick={handleProduce}
                disabled={startProductionMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                🎬 ابدأ الإنتاج ({aspectRatio} · {mode === "draft" ? "مسودة" : "احترافي"})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 4: الإنتاج ══ */}
      {step === "producing" && (
        <Card className="bg-[#0d1117] border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300 text-lg">⚙️ جاري الإنتاج...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* رسالة تحذير عند not_found مؤقت */}
            {notFoundCount > 0 && notFoundCount < 5 && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-xs">
                ⏳ جاري الاتصال بالخادم... ({notFoundCount}/5)
              </div>
            )}

            {/* شريط التقدم */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-300/70">{currentStep || "جاري التحضير..."}</span>
                <span className="text-blue-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-[#08090f] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-blue-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* مراحل Pipeline v3.0 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PIPELINE_STAGES.map((stage) => {
                // إخفاء Runway إذا كان معطلاً
                if (stage.label === "Runway Gen-4" && !useRunway) {
                  return (
                    <div key={stage.label} className="flex items-center gap-2 p-2 rounded-lg text-sm bg-[#08090f] text-blue-300/20 border border-transparent">
                      <span>{stage.icon}</span>
                      <span className="text-xs line-through">{stage.label}</span>
                      <span className="mr-auto text-xs">Ken Burns</span>
                    </div>
                  );
                }
                // إخفاء ElevenLabs إذا كان معطلاً
                if (stage.label === "ElevenLabs TTS" && !useElevenLabs) {
                  return (
                    <div key={stage.label} className="flex items-center gap-2 p-2 rounded-lg text-sm bg-[#08090f] text-blue-300/20 border border-transparent">
                      <span>{stage.icon}</span>
                      <span className="text-xs line-through">{stage.label}</span>
                      <span className="mr-auto text-xs">بدون صوت</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={stage.label}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                      progress >= stage.threshold
                        ? "bg-blue-900/30 text-blue-200 border border-blue-500/30"
                        : "bg-[#08090f] text-blue-300/30 border border-transparent"
                    }`}
                  >
                    <span>{stage.icon}</span>
                    <span className="text-xs">{stage.label}</span>
                    {progress >= stage.threshold && (
                      <span className="mr-auto text-green-400">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ المرحلة 5: الفيديو النهائي ══ */}
      {step === "done" && videoUrl && (
        <Card className="bg-[#0d1117] border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-300 text-lg">✅ اكتمل الإنتاج!</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* مشغّل الفيديو */}
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full max-h-[400px]"
              />
            </div>

            {/* مقاييس الأداء v3.0 */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "وقت الإنتاج", value: metrics.durationMs ? `${Math.round(metrics.durationMs / 1000)}ث` : "—", icon: "⏱️" },
                  { label: "حجم الملف", value: metrics.fileSizeMB ? `${metrics.fileSizeMB} MB` : "—", icon: "📦" },
                  { label: "عدد المشاهد", value: metrics.sceneCount ? `${metrics.sceneCount} مشهد` : "—", icon: "🎬" },
                  { label: "التكلفة التقديرية", value: metrics.costEstimate ? `$${metrics.costEstimate}` : "—", icon: "💰" },
                  { label: "ElevenLabs TTS", value: metrics.usedElevenLabs ? "✓ مُفعّل" : "✗ Fallback", icon: "🎙️", highlight: metrics.usedElevenLabs },
                  { label: "Runway Gen-4", value: metrics.usedRunway ? "✓ مُفعّل" : "✗ Ken Burns", icon: "🎞️", highlight: metrics.usedRunway },
                ].map(m => (
                  <div
                    key={m.label}
                    className={`rounded-lg p-3 text-center border ${
                      (m as any).highlight
                        ? "bg-blue-900/20 border-blue-500/30"
                        : "bg-[#08090f] border-blue-500/10"
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className={`font-bold text-sm ${(m as any).highlight ? "text-blue-300" : "text-white"}`}>{m.value}</div>
                    <div className="text-blue-300/50 text-xs">{m.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* أزرار */}
            <div className="flex gap-3">
              <a
                href={videoUrl}
                download
                className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                ⬇️ تحميل الفيديو
              </a>
              <Button
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-900/20"
                onClick={handleReset}
              >
                🎬 إنتاج جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
