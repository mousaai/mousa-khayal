/**
 * SmartProductionModal — نافذة الإنتاج الذكية
 * ثلاثة أوضاع:
 *   1. AI: خيال تكتب السيناريو تلقائياً (يحتاج LLM)
 *   2. جاهز: اختيار من مكتبة سيناريوهات (بدون LLM)
 *   3. يدوي: كتابة المشاهد يدوياً (بدون LLM)
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  BookOpen,
  PenLine,
  Plus,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Zap,
  Clock,
  Wand2,
} from "lucide-react";

// ─── أنواع ─────────────────────────────────────────────────────────────────

type ProductionMode = "ai" | "prebuilt" | "manual";

interface ManualScene {
  imagePrompt: string;
  narration: string;
  duration: number;
}

interface SmartProductionModalProps {
  open: boolean;
  onClose: () => void;
  onJobStarted: (jobId: string, title: string) => void;
  initialDescription?: string;
  /** إذا كان LLM معطلاً، يُعرض تحذير وتُفتح الأوضاع البديلة */
  llmUnavailable?: boolean;
}

// ─── ألوان الفئات ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  nature: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  city: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cinematic: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  documentary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  travel: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  tech: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  story: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  abstract: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  nature: "طبيعة",
  city: "مدينة",
  cinematic: "سينمائي",
  documentary: "وثائقي",
  travel: "سفر",
  tech: "تقنية",
  story: "قصة",
  abstract: "تجريدي",
};

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────

export default function SmartProductionModal({
  open,
  onClose,
  onJobStarted,
  initialDescription = "",
  llmUnavailable = false,
}: SmartProductionModalProps) {
  const [mode, setMode] = useState<ProductionMode>(llmUnavailable ? "prebuilt" : "ai");
  const [description, setDescription] = useState(initialDescription);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualScenes, setManualScenes] = useState<ManualScene[]>([
    { imagePrompt: "", narration: "", duration: 6 },
    { imagePrompt: "", narration: "", duration: 6 },
    { imagePrompt: "", narration: "", duration: 6 },
  ]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحديث الوضع عند تغيير llmUnavailable
  useEffect(() => {
    if (llmUnavailable && mode === "ai") setMode("prebuilt");
  }, [llmUnavailable]);

  // جلب السيناريوهات الجاهزة
  const { data: prebuiltScripts = [], isLoading: loadingScripts } = trpc.video.getPrebuiltScripts.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

  // Mutations
  const quickProduce = trpc.video.quickProduce.useMutation();
  const produceFromPrebuilt = trpc.video.produceFromPrebuilt.useMutation();
  const produceFromManual = trpc.video.produceFromManual.useMutation();

  const filteredScripts = filterCategory
    ? prebuiltScripts.filter(s => s.category === filterCategory)
    : prebuiltScripts;

  const categories = Array.from(new Set(prebuiltScripts.map(s => s.category)));

  // ── معالجات ────────────────────────────────────────────────────────────────

  const handleAIProduce = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await quickProduce.mutateAsync({
        description: description.trim(),
        language: "ar",
        voice: "ar_male",
        sceneCount: 5,
        options: { useRunway: true, useElevenLabs: true, quality: "fast" },
      });
      onJobStarted(result.jobId, description.trim());
      onClose();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("usage exhausted") || msg.includes("412") || msg.includes("quota")) {
        setMode("prebuilt");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrebuiltProduce = async () => {
    if (!selectedScriptId) return;
    setIsSubmitting(true);
    try {
      const result = await produceFromPrebuilt.mutateAsync({
        scriptId: selectedScriptId,
        options: { useRunway: true, useElevenLabs: true, quality: "fast" },
      });
      const script = prebuiltScripts.find(s => s.id === selectedScriptId);
      onJobStarted(result.jobId, result.title);
      onClose();
    } catch (err: any) {
      console.error("prebuilt produce error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualProduce = async () => {
    const validScenes = manualScenes.filter(s => s.imagePrompt.trim() && s.narration.trim());
    if (!manualTitle.trim() || validScenes.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await produceFromManual.mutateAsync({
        title: manualTitle.trim(),
        language: "ar",
        voice: "ar_male",
        scenes: validScenes,
        options: { useRunway: true, useElevenLabs: true, quality: "fast" },
      });
      onJobStarted(result.jobId, result.title);
      onClose();
    } catch (err: any) {
      console.error("manual produce error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addScene = () => {
    if (manualScenes.length < 10) {
      setManualScenes(prev => [...prev, { imagePrompt: "", narration: "", duration: 6 }]);
    }
  };

  const removeScene = (i: number) => {
    if (manualScenes.length > 1) {
      setManualScenes(prev => prev.filter((_, idx) => idx !== i));
    }
  };

  const updateScene = (i: number, field: keyof ManualScene, value: string | number) => {
    setManualScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  // ── واجهة ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0d1117] border-white/10 text-white p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-400" />
            إنتاج فيديو جديد
          </DialogTitle>

          {/* تحذير LLM */}
          {llmUnavailable && (
            <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">محرك الذكاء الاصطناعي مشغول حالياً</span>
                <span className="text-amber-300/70 mr-1">— يمكنك الإنتاج من سيناريو جاهز أو كتابة مشاهدك يدوياً</span>
              </div>
            </div>
          )}

          {/* أزرار الأوضاع */}
          <div className="flex gap-2 mt-4">
            <ModeButton
              active={mode === "ai"}
              disabled={llmUnavailable}
              onClick={() => setMode("ai")}
              icon={<Sparkles className="w-4 h-4" />}
              label="خيال تكتب"
              sublabel="بالذكاء الاصطناعي"
              color="blue"
            />
            <ModeButton
              active={mode === "prebuilt"}
              onClick={() => setMode("prebuilt")}
              icon={<BookOpen className="w-4 h-4" />}
              label="سيناريو جاهز"
              sublabel={`${prebuiltScripts.length} خيار`}
              color="emerald"
            />
            <ModeButton
              active={mode === "manual"}
              onClick={() => setMode("manual")}
              icon={<PenLine className="w-4 h-4" />}
              label="كتابة يدوية"
              sublabel="تحكم كامل"
              color="purple"
            />
          </div>
        </DialogHeader>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── وضع AI ── */}
          {mode === "ai" && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm">صف فكرتك وخيال ستكتب السيناريو وتنتج الفيديو تلقائياً</p>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="مثال: رحلة إلى جبال الهيمالايا في الشتاء، تصوير سينمائي بأجواء هادئة..."
                className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-base"
                dir="rtl"
              />
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Zap className="w-3 h-3" />
                <span>يستغرق الإنتاج 3-5 دقائق</span>
                <Clock className="w-3 h-3 mr-2" />
                <span>يعمل في الخلفية</span>
              </div>
            </div>
          )}

          {/* ── وضع السيناريوهات الجاهزة ── */}
          {mode === "prebuilt" && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm">اختر من مكتبة سيناريوهات احترافية جاهزة — تعمل فوراً بدون انتظار</p>

              {/* فلتر الفئات */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    !filterCategory
                      ? "bg-white/15 border-white/30 text-white"
                      : "bg-transparent border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  الكل
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      filterCategory === cat
                        ? CATEGORY_COLORS[cat] ?? "bg-white/15 border-white/30 text-white"
                        : "bg-transparent border-white/10 text-white/50 hover:border-white/20"
                    }`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>

              {/* شبكة السيناريوهات */}
              {loadingScripts ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredScripts.map(script => (
                    <button
                      key={script.id}
                      onClick={() => setSelectedScriptId(script.id === selectedScriptId ? null : script.id)}
                      className={`relative text-right p-4 rounded-xl border transition-all ${
                        selectedScriptId === script.id
                          ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                          : "bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15"
                      }`}
                    >
                      {selectedScriptId === script.id && (
                        <div className="absolute top-3 left-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <ChevronRight className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-2xl mb-2">{script.emoji}</div>
                      <div className="font-medium text-white text-sm mb-1">{script.title}</div>
                      <div className="text-white/50 text-xs leading-relaxed line-clamp-2">{script.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[script.category] ?? ""}`}>
                          {CATEGORY_LABELS[script.category] ?? script.category}
                        </span>
                        <span className="text-white/30 text-xs">{script.sceneCount} مشاهد</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── وضع الكتابة اليدوية ── */}
          {mode === "manual" && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm">اكتب عنوان الفيديو ومشاهده يدوياً — تحكم كامل في كل تفصيلة</p>

              <Input
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder="عنوان الفيديو..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-base"
                dir="rtl"
              />

              <div className="space-y-3">
                {manualScenes.map((scene, i) => (
                  <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs font-mono">مشهد {i + 1}</span>
                      {manualScenes.length > 1 && (
                        <button
                          onClick={() => removeScene(i)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={scene.imagePrompt}
                      onChange={e => updateScene(i, "imagePrompt", e.target.value)}
                      placeholder="وصف الصورة بالإنجليزية (مثال: Sunset over ocean, dramatic clouds, cinematic photography)..."
                      className="min-h-[70px] bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none text-sm"
                      dir="ltr"
                    />
                    <Textarea
                      value={scene.narration}
                      onChange={e => updateScene(i, "narration", e.target.value)}
                      placeholder="نص التعليق الصوتي بالعربية..."
                      className="min-h-[60px] bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none text-sm"
                      dir="rtl"
                    />
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>المدة:</span>
                      {[4, 5, 6, 8, 10].map(d => (
                        <button
                          key={d}
                          onClick={() => updateScene(i, "duration", d)}
                          className={`px-2 py-0.5 rounded border transition-all ${
                            scene.duration === d
                              ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                              : "border-white/10 text-white/40 hover:border-white/20"
                          }`}
                        >
                          {d}ث
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {manualScenes.length < 10 && (
                  <button
                    onClick={addScene}
                    className="w-full py-3 border border-dashed border-white/15 rounded-xl text-white/40 hover:text-white/60 hover:border-white/25 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مشهد
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* أزرار الإجراء */}
        <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            إلغاء
          </button>

          {mode === "ai" && (
            <Button
              onClick={handleAIProduce}
              disabled={!description.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 gap-2"
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري البدء...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> خيال تنتج</>
              )}
            </Button>
          )}

          {mode === "prebuilt" && (
            <Button
              onClick={handlePrebuiltProduce}
              disabled={!selectedScriptId || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 gap-2"
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري البدء...</>
              ) : (
                <><Zap className="w-4 h-4" /> إنتاج فوري</>
              )}
            </Button>
          )}

          {mode === "manual" && (
            <Button
              onClick={handleManualProduce}
              disabled={
                !manualTitle.trim() ||
                manualScenes.filter(s => s.imagePrompt.trim() && s.narration.trim()).length === 0 ||
                isSubmitting
              }
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 gap-2"
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري البدء...</>
              ) : (
                <><PenLine className="w-4 h-4" /> إنتاج من مشاهدي</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── مكوّن زر الوضع ──────────────────────────────────────────────────────────

function ModeButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  sublabel,
  color,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: "blue" | "emerald" | "purple";
}) {
  const colors = {
    blue: active ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "border-white/10 text-white/50",
    emerald: active ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "border-white/10 text-white/50",
    purple: active ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "border-white/10 text-white/50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all text-center ${
        colors[color]
      } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <span className="text-xs opacity-60">{sublabel}</span>
    </button>
  );
}
