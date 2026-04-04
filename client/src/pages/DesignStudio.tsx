/**
 * DesignStudio.tsx — استوديو التصاميم المعمارية لمنصة خيال
 * ─────────────────────────────────────────────────────────────
 * الميزات:
 * 1. توليد تصميم جديد (مع اختيار النمط والنوع)
 * 2. معرض التصاميم السابقة
 * 3. التعديل التدريجي (تعديل تصميم موجود)
 * 4. أنماط محددة مسبقاً
 * 5. مشاركة التصاميم
 * 6. تحميل بدقة عالية
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  Share2,
  Download,
  Pencil,
  Trash2,
  ChevronLeft,
  X,
  Check,
  Copy,
} from "lucide-react";

// ─── أنواع ───────────────────────────────────────────────────
type DesignStyle = "modern" | "islamic" | "gulf" | "contemporary";
type DesignType = "exterior" | "interior" | "floor_plan";

interface Design {
  id: number;
  userId: string;
  prompt: string;
  style: DesignStyle;
  type: DesignType;
  imageUrl: string;
  referenceImageUrl?: string | null;
  creditsCost: number;
  shareToken?: string | null;
  isPublic: number;
  createdAt: Date;
}

// ─── ثوابت الأنماط والأنواع (مطابقة للـ backend) ────────────
const STYLES: Record<DesignStyle, { label: string; icon: string; desc: string }> = {
  modern: { label: "عصري", icon: "🏙️", desc: "خطوط بسيطة، زجاج وفولاذ" },
  islamic: { label: "إسلامي", icon: "🕌", desc: "زخارف هندسية، أقواس تراثية" },
  gulf: { label: "خليجي", icon: "🏜️", desc: "عناصر سعودية وخليجية تقليدية" },
  contemporary: { label: "معاصر", icon: "🌿", desc: "مواد طبيعية، فضاءات مفتوحة" },
};

const TYPES: Record<DesignType, { label: string; icon: string; cost: number }> = {
  exterior: { label: "واجهة خارجية", icon: "🏛️", cost: 35 },
  interior: { label: "تصميم داخلي", icon: "🛋️", cost: 35 },
  floor_plan: { label: "مسقط أفقي", icon: "📐", cost: 25 },
};

// ─── مكوّن بطاقة التصميم ─────────────────────────────────────
function DesignCard({
  design,
  onRefine,
  onShare,
  onDelete,
}: {
  design: Design;
  onRefine: (d: Design) => void;
  onShare: (d: Design) => void;
  onDelete: (id: number) => void;
}) {
  const style = STYLES[design.style];
  const type = TYPES[design.type];

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-purple-500/40 transition-all duration-300"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
    >
      {/* الصورة */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={design.imageUrl}
          alt={design.prompt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Overlay عند hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={() => onRefine(design)}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            title="تعديل تدريجي"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onShare(design)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            title="مشاركة"
          >
            <Share2 size={16} />
          </button>
          <a
            href={design.imageUrl}
            download={`khayal-design-${design.id}.jpg`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-green-600 hover:bg-green-500 text-white transition-colors"
            title="تحميل"
          >
            <Download size={16} />
          </a>
          <button
            onClick={() => onDelete(design.id)}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white transition-colors"
            title="حذف"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* المعلومات */}
      <div className="p-3">
        <p className="text-white/80 text-sm line-clamp-2 mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {design.prompt}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
            {style.icon} {style.label}
          </Badge>
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
            {type.icon} {type.label}
          </Badge>
          <span className="text-xs text-white/30 mr-auto">{design.creditsCost} كريدت</span>
        </div>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function DesignStudio() {
  const { user } = useAuth();

  // حالة النموذج
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>("modern");
  const [selectedType, setSelectedType] = useState<DesignType>("exterior");

  // حالة التعديل
  const [refineTarget, setRefineTarget] = useState<Design | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");

  // حالة المشاركة
  const [shareDesign, setShareDesign] = useState<Design | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // حالة عرض التصميم
  const [viewDesign, setViewDesign] = useState<Design | null>(null);

  // ── tRPC queries & mutations ──────────────────────────────
  const { data: myDesigns, refetch: refetchDesigns, isLoading: loadingDesigns } = trpc.design.getMyDesigns.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user }
  );

  const generateMutation = trpc.design.generate.useMutation({
    onSuccess: () => {
      toast.success("✅ تم توليد التصميم! تصميمك الجديد جاهز في المعرض");
      setPrompt("");
      refetchDesigns();
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`);
    },
  });

  const refineMutation = trpc.design.refine.useMutation({
    onSuccess: () => {
      toast.success("✅ تم التعديل! النسخة المعدّلة جاهزة في المعرض");
      setRefineTarget(null);
      setRefinePrompt("");
      refetchDesigns();
    },
    onError: (err) => {
      toast.error(`❌ خطأ في التعديل: ${err.message}`);
    },
  });

  const shareMutation = trpc.design.share.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    },
    onError: (err) => {
      toast.error(`❌ خطأ في المشاركة: ${err.message}`);
    },
  });

  const deleteMutation = trpc.design.delete.useMutation({
    onSuccess: () => {
      toast("🗑️ تم الحذف");
      refetchDesigns();
    },
  });

  // ── معالجات الأحداث ───────────────────────────────────────
  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("⚠️ أدخل وصفاً للتصميم");
      return;
    }
    generateMutation.mutate({ prompt, style: selectedStyle, type: selectedType });
  };

  const handleRefine = () => {
    if (!refineTarget || !refinePrompt.trim()) return;
    refineMutation.mutate({ designId: refineTarget.id, refinementPrompt: refinePrompt });
  };

  const handleShare = (design: Design) => {
    setShareDesign(design);
    setShareUrl(null);
    if (design.shareToken) {
      setShareUrl(`${window.location.origin}/design/${design.shareToken}`);
    } else {
      shareMutation.mutate({ designId: design.id });
    }
  };

  const handleCopyUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const designs = (myDesigns?.designs || []) as Design[];

  return (
    <div
      className="min-h-screen bg-[#08090f] text-white"
      dir="rtl"
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
    >
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
          <ChevronLeft size={20} />
        </a>
        <h1 className="text-xl font-bold text-white">استوديو التصاميم</h1>
        <span className="text-sm text-white/40 mr-auto">
          {designs.length} تصميم
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* نموذج التوليد */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}
        >
          <h2 className="text-lg font-bold mb-4 text-purple-200">توليد تصميم جديد</h2>

          {/* اختيار النوع */}
          <div className="mb-4">
            <p className="text-sm text-white/50 mb-2">نوع التصميم</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(TYPES) as [DesignType, typeof TYPES[DesignType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    selectedType === key
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {val.icon} {val.label}
                  <span className="mr-1 text-xs opacity-60">({val.cost} كريدت)</span>
                </button>
              ))}
            </div>
          </div>

          {/* اختيار النمط */}
          <div className="mb-4">
            <p className="text-sm text-white/50 mb-2">النمط المعماري</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(STYLES) as [DesignStyle, typeof STYLES[DesignStyle]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStyle(key)}
                  className={`p-3 rounded-xl text-right transition-all ${
                    selectedStyle === key
                      ? "bg-purple-600/30 border border-purple-500/60 text-white"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xl mb-1">{val.icon}</div>
                  <div className="text-sm font-medium">{val.label}</div>
                  <div className="text-xs opacity-60">{val.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* وصف التصميم */}
          <div className="mb-4">
            <p className="text-sm text-white/50 mb-2">وصف التصميم</p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: فيلا عصرية بمسبح خارجي وحديقة خضراء، واجهة زجاجية تطل على البحر..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[100px]"
              dir="rtl"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="ml-2 animate-spin" size={18} />
                جاري التوليد... (قد يستغرق 15-30 ثانية)
              </>
            ) : (
              <>
                <Sparkles className="ml-2" size={18} />
                توليد التصميم ({TYPES[selectedType].cost} كريدت)
              </>
            )}
          </Button>
        </div>

        {/* معرض التصاميم */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-white/80">معرض تصاميمي</h2>

          {loadingDesigns ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-purple-400" size={32} />
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-4">🎨</div>
              <p>لا توجد تصاميم بعد — ولّد أول تصميم!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onRefine={(d) => { setRefineTarget(d); setRefinePrompt(""); }}
                  onShare={handleShare}
                  onDelete={(id) => deleteMutation.mutate({ designId: id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog: التعديل التدريجي */}
      <Dialog open={!!refineTarget} onOpenChange={(open) => !open && setRefineTarget(null)}>
        <DialogContent className="bg-[#0d0e1a] border-purple-500/30 text-white max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-purple-200" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              ✏️ تعديل تدريجي
            </DialogTitle>
          </DialogHeader>

          {refineTarget && (
            <div className="space-y-4">
              {/* معاينة التصميم الأصلي */}
              <div className="rounded-xl overflow-hidden aspect-video">
                <img src={refineTarget.imageUrl} alt="التصميم الأصلي" className="w-full h-full object-cover" />
              </div>

              <div>
                <p className="text-sm text-white/50 mb-2">ماذا تريد أن تعدّل؟</p>
                <Textarea
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  placeholder="مثال: أضف نوافذ أكبر، غيّر لون الواجهة للأبيض، أضف حديقة أمامية..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[80px]"
                  dir="rtl"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRefine}
                  disabled={refineMutation.isPending || !refinePrompt.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-500"
                >
                  {refineMutation.isPending ? (
                    <><Loader2 className="ml-2 animate-spin" size={16} />جاري التعديل...</>
                  ) : (
                    <><Sparkles className="ml-2" size={16} />تطبيق التعديل (60 كريدت)</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRefineTarget(null)}
                  className="border-white/20 text-white/60"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: المشاركة */}
      <Dialog open={!!shareDesign} onOpenChange={(open) => !open && setShareDesign(null)}>
        <DialogContent className="bg-[#0d0e1a] border-blue-500/30 text-white max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-blue-200" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              🔗 مشاركة التصميم
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {shareMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-400" size={24} />
                <span className="mr-2 text-white/60">جاري إنشاء رابط المشاركة...</span>
              </div>
            ) : shareUrl ? (
              <>
                <p className="text-sm text-white/60">رابط المشاركة العام:</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 text-left"
                    dir="ltr"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-400">✅ تم النسخ!</p>}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
