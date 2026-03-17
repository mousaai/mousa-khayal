/**
 * FilmDirectorModal.tsx — نافذة الفيلم الإخراجي
 * المستخدم يختار المدة → النظام يحسب عدد المشاهد + وقت التوليد
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Film, Clock, Layers, Zap, ChevronRight, Info } from "lucide-react";

interface FilmDirectorModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (durationMinutes: number) => void;
  description: string;
}

const PRESET_DURATIONS = [
  { label: "٥ دقائق", value: 5, icon: "⚡", desc: "عرض سريع" },
  { label: "١٥ دقيقة", value: 15, icon: "🎬", desc: "ربع ساعة" },
  { label: "٢٠ دقيقة", value: 20, icon: "🎥", desc: "ثلث ساعة" },
  { label: "٣٠ دقيقة", value: 30, icon: "🎞️", desc: "نصف ساعة" },
  { label: "٤٥ دقيقة", value: 45, icon: "🏆", desc: "ثلاثة أرباع" },
  { label: "٦٠ دقيقة", value: 60, icon: "🌟", desc: "ساعة كاملة" },
];

export default function FilmDirectorModal({
  open,
  onClose,
  onConfirm,
  description,
}: FilmDirectorModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(15);

  const { data: estimate, isLoading } = trpc.khayal.estimateFilm.useQuery(
    { durationMinutes: selectedDuration },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0d0f1a] border border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white">الفيلم الإخراجي</div>
              <div className="text-xs text-purple-300 font-normal mt-0.5">اختر مدة الفيلم</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* وصف المشروع */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-400 mb-1">الخيال المراد تحويله لفيلم</div>
            <div className="text-sm text-gray-200 line-clamp-2">{description}</div>
          </div>

          {/* اختيار المدة — أزرار سريعة */}
          <div>
            <div className="text-sm text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              مدة الفيلم
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setSelectedDuration(preset.value)}
                  className={`
                    p-3 rounded-xl border text-center transition-all duration-200
                    ${selectedDuration === preset.value
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-purple-500/50 hover:text-white"
                    }
                  `}
                >
                  <div className="text-xl mb-1">{preset.icon}</div>
                  <div className="text-sm font-bold">{preset.label}</div>
                  <div className="text-xs opacity-60">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slider للمدة المخصصة */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>مدة مخصصة</span>
              <span className="text-purple-300 font-bold">{selectedDuration} دقيقة</span>
            </div>
            <Slider
              value={[selectedDuration]}
              onValueChange={([v]) => setSelectedDuration(v)}
              min={1}
              max={120}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>١ دقيقة</span>
              <span>٢ ساعة</span>
            </div>
          </div>

          {/* تقدير الوقت */}
          {estimate && !isLoading && (
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3 text-purple-300 text-sm font-medium">
                <Info className="w-4 h-4" />
                تفاصيل الفيلم
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{estimate.sceneCount}</div>
                  <div className="text-xs text-gray-400">مشهد</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Film className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{estimate.sceneDurationSec}ث</div>
                  <div className="text-xs text-gray-400">لكل مشهد</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">~{estimate.estimatedGenerationMinutes}</div>
                  <div className="text-xs text-gray-400">دقيقة توليد</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-center text-gray-400 bg-black/20 rounded-lg p-2">
                {estimate.description}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center text-gray-400 text-sm py-4">
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
            onClick={() => onConfirm(selectedDuration)}
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
