/**
 * FilmDirectorModal.tsx — نافذة الفيلم الإخراجي
 * من 5 ثوانٍ إلى ما لا نهاية — المستخدم يختار بحرية كاملة
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Film, Clock, Layers, Zap, ChevronRight, Info, Infinity } from "lucide-react";

interface FilmDirectorModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (durationSeconds: number) => void;
  description: string;
}

// ── الأزرار السريعة ──
const PRESET_DURATIONS = [
  { label: "٥ث",     value: 5,      icon: "⚡", desc: "لقطة" },
  { label: "٣٠ث",    value: 30,     icon: "🎬", desc: "مقتطف" },
  { label: "١م",     value: 60,     icon: "🎥", desc: "دقيقة" },
  { label: "٥م",     value: 300,    icon: "🎞️", desc: "٥ دقائق" },
  { label: "١٥م",    value: 900,    icon: "🏆", desc: "ربع ساعة" },
  { label: "٣٠م",    value: 1800,   icon: "🌟", desc: "نصف ساعة" },
  { label: "١س",     value: 3600,   icon: "🎭", desc: "ساعة" },
  { label: "∞",      value: -1,     icon: "♾️", desc: "بلا حد" },
];

// ── تحويل الثوانٍ إلى نص مقروء ──
function formatDuration(seconds: number): string {
  if (seconds < 0) return "∞ بلا حد";
  if (seconds < 60) return `${seconds} ثانية`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}م ${secs}ث` : `${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}س ${remMins}م` : `${hrs} ساعة`;
}

// ── Slider logarithmic: 5s → 7200s (2 hours) ──
const SLIDER_MIN = 5;
const SLIDER_MAX = 7200;

export default function FilmDirectorModal({
  open,
  onClose,
  onConfirm,
  description,
}: FilmDirectorModalProps) {
  const [durationSeconds, setDurationSeconds] = useState(300); // 5 minutes default
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [sliderValue, setSliderValue] = useState(300);

  // debounce للـ query
  const [queryDuration, setQueryDuration] = useState(300);
  useEffect(() => {
    const t = setTimeout(() => setQueryDuration(isUnlimited ? 3600 : durationSeconds), 400);
    return () => clearTimeout(t);
  }, [durationSeconds, isUnlimited]);

  const { data: estimate, isLoading } = trpc.khayal.estimateFilm.useQuery(
    { durationSeconds: queryDuration },
    { enabled: open }
  );

  const handlePreset = (value: number) => {
    if (value === -1) {
      setIsUnlimited(true);
      setDurationSeconds(3600);
    } else {
      setIsUnlimited(false);
      setDurationSeconds(value);
      setSliderValue(value);
    }
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setSliderValue(v);
    setDurationSeconds(v);
    setIsUnlimited(false);
  };

  const handleConfirm = () => {
    onConfirm(isUnlimited ? 99999 : durationSeconds);
  };

  // تحديد الـ preset النشط
  const activePreset = isUnlimited ? -1 : PRESET_DURATIONS.find(p => p.value === durationSeconds)?.value ?? null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0d0f1a] border border-purple-500/30 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white">الفيلم الإخراجي</div>
              <div className="text-xs text-purple-300 font-normal mt-0.5">من ٥ ثوانٍ إلى ما لا نهاية</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* وصف المشروع */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-400 mb-1">الخيال المراد تحويله لفيلم</div>
            <div className="text-sm text-gray-200 line-clamp-2">{description || "..."}</div>
          </div>

          {/* أزرار سريعة */}
          <div>
            <div className="text-sm text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              مدة الفيلم
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className={`
                    p-2.5 rounded-xl border text-center transition-all duration-200
                    ${activePreset === preset.value
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50 hover:text-white"
                    }
                  `}
                >
                  <div className="text-lg mb-0.5">{preset.icon}</div>
                  <div className="text-xs font-bold">{preset.label}</div>
                  <div className="text-[10px] opacity-60">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slider حر */}
          {!isUnlimited && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>تخصيص المدة</span>
                <span className="text-purple-300 font-bold">{formatDuration(durationSeconds)}</span>
              </div>
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={5}
                value={sliderValue}
                onChange={handleSlider}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((sliderValue - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%, #374151 ${((sliderValue - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>٥ ثوانٍ</span>
                <span>ساعتان</span>
              </div>
            </div>
          )}

          {/* وضع بلا حد */}
          {isUnlimited && (
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-xl p-4 border border-purple-500/30 text-center">
              <Infinity className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-white font-bold">وضع بلا حد</div>
              <div className="text-xs text-gray-400 mt-1">الفيلم سيستمر حتى تقرر إيقافه</div>
              <button
                onClick={() => { setIsUnlimited(false); setDurationSeconds(300); }}
                className="mt-3 text-xs text-purple-400 underline"
              >
                تحديد مدة معينة
              </button>
            </div>
          )}

          {/* تقدير الوقت */}
          {estimate && !isLoading && !isUnlimited && (
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3 text-purple-300 text-sm font-medium">
                <Info className="w-4 h-4" />
                تفاصيل الفيلم
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Layers className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{estimate.sceneCount}</div>
                  <div className="text-xs text-gray-400">مشهد</div>
                </div>
                <div className="text-center">
                  <Film className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{estimate.sceneDurationSec}ث</div>
                  <div className="text-xs text-gray-400">لكل مشهد</div>
                </div>
                <div className="text-center">
                  <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">
                    {estimate.estimatedGenerationSeconds < 60
                      ? `${estimate.estimatedGenerationSeconds}ث`
                      : `~${estimate.estimatedGenerationMinutes}م`}
                  </div>
                  <div className="text-xs text-gray-400">وقت التوليد</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-center text-gray-400 bg-black/20 rounded-lg p-2">
                {estimate.description}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center text-gray-400 text-sm py-3">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              جاري الحساب...
            </div>
          )}
        </div>

        {/* أزرار التأكيد */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold"
          >
            <Film className="w-4 h-4 mr-2" />
            ابدأ التصوير
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
