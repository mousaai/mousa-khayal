/*
 * mousa.ai — Pricing Rules Admin
 * إدارة معادلات احتساب الكريدت لكل منصة فرعية
 * كل منصة تُرسل usage_factors، وموسى يحتسب التكلفة بالمعادلة المخصصة
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Save, RefreshCw, Calculator, Info, ChevronDown, ChevronUp, Settings2 } from "lucide-react";

const PLATFORM_LABELS: Record<string, { name: string; color: string; factors: { key: string; label: string; desc: string }[] }> = {
  fada: {
    name: "فضاء — التصميم الداخلي",
    color: "#d4a017",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "image_count", label: "عدد الصور", desc: "صور المساحة المرفوعة" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = استشارة سريعة" },
      { key: "room_count", label: "عدد الغرف", desc: "عدد الغرف في المساحة" },
    ],
  },
  raqaba: {
    name: "رقابة — الإشراف الميداني",
    color: "#3b82f6",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "image_count", label: "عدد الصور", desc: "صور الموقع المرفوعة" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = مراجعة سريعة" },
      { key: "violation_count", label: "عدد المخالفات", desc: "مخالفات مرصودة في الموقع" },
    ],
  },
  harara: {
    name: "حرارة — الكفاءة الطاقوية",
    color: "#f97316",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "floor_count", label: "عدد الطوابق", desc: "طوابق المبنى" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = تحليل سريع" },
      { key: "hvac_zones", label: "مناطق HVAC", desc: "عدد مناطق التكييف" },
    ],
  },
  maskan: {
    name: "مسكن — الاحتياجات السكنية",
    color: "#22c55e",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "property_options", label: "خيارات عقارية", desc: "عدد الخيارات المقارنة" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = توصية سريعة" },
    ],
  },
  code: {
    name: "كود — مرجع الكودات",
    color: "#a855f7",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "code_sections", label: "بنود كودية", desc: "عدد البنود المستشهد بها" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = بحث سريع" },
    ],
  },
  khayal: {
    name: "خيال — توليد المرئيات",
    color: "#ec4899",
    factors: [
      { key: "message_count", label: "عدد الرسائل", desc: "كل رسالة في المحادثة" },
      { key: "image_count", label: "صور محللة", desc: "صور مرفوعة للتحليل" },
      { key: "image_generation", label: "صور مُولَّدة", desc: "صور مُولَّدة بالذكاء الاصطناعي" },
      { key: "report_type_full", label: "تقرير كامل", desc: "1 = تقرير كامل، 0 = توليد سريع" },
    ],
  },
};

type PricingRule = {
  id: number;
  platform: string;
  baseCost: number;
  minCost: number;
  maxCost: number;
  factorWeights: Record<string, number>;
  description: string | null;
  isActive: boolean;
  updatedAt: Date;
};

type EditState = {
  baseCost: number;
  minCost: number;
  maxCost: number;
  factorWeights: Record<string, number>;
  description: string;
  isActive: boolean;
};

function PlatformPricingCard({
  platform,
  rule,
  onSave,
  isSaving,
}: {
  platform: string;
  rule: PricingRule | undefined;
  onSave: (platform: string, data: EditState) => void;
  isSaving: boolean;
}) {
  const config = PLATFORM_LABELS[platform];
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState<EditState>(() => ({
    baseCost: rule?.baseCost ?? 5,
    minCost: rule?.minCost ?? 5,
    maxCost: rule?.maxCost ?? 80,
    factorWeights: rule?.factorWeights ?? Object.fromEntries(config.factors.map(f => [f.key, 1])),
    description: rule?.description ?? "",
    isActive: rule?.isActive ?? true,
  }));

  // Preview calculation
  const previewFactors: Record<string, number> = {
    message_count: 5,
    image_count: 2,
    report_type_full: 1,
    room_count: 3,
    violation_count: 2,
    floor_count: 3,
    hvac_zones: 2,
    property_options: 3,
    code_sections: 4,
    image_generation: 1,
  };
  const previewCost = Math.max(
    edit.minCost,
    Math.min(
      edit.maxCost,
      Math.round(
        edit.baseCost +
          config.factors.reduce((sum, f) => {
            const val = previewFactors[f.key] ?? 0;
            const weight = edit.factorWeights[f.key] ?? 0;
            return sum + val * weight;
          }, 0)
      )
    )
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(13,27,42,0.6)", border: `1px solid ${config.color}22` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ borderBottom: expanded ? `1px solid ${config.color}22` : "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: config.color }}
          />
          <span className="text-platinum font-semibold">{config.name}</span>
          {!rule && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}
            >
              افتراضي
            </span>
          )}
          {rule && !rule.isActive && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              معطّل
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-steel">التكلفة الأساسية</div>
            <div className="font-bold" style={{ color: config.color }}>
              {edit.baseCost}–{edit.maxCost} كريدت
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-steel" />
          ) : (
            <ChevronDown size={16} className="text-steel" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-5 space-y-5">
          {/* Base/Min/Max */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "baseCost", label: "التكلفة الأساسية", desc: "كريدت ثابت لكل جلسة" },
              { key: "minCost", label: "الحد الأدنى", desc: "أقل تكلفة ممكنة" },
              { key: "maxCost", label: "الحد الأقصى", desc: "أعلى تكلفة ممكنة" },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <label className="block text-xs text-steel mb-1">
                  {label}
                  <span className="block text-xs opacity-60">{desc}</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={edit[key as keyof EditState] as number}
                  onChange={(e) =>
                    setEdit((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${config.color}33`,
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Factor Weights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={14} style={{ color: config.color }} />
              <span className="text-sm font-semibold text-platinum">أوزان العوامل</span>
              <span className="text-xs text-steel">(كريدت لكل وحدة)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {config.factors.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-steel mb-1">
                    {f.label}
                    <span className="block text-xs opacity-60">{f.desc}</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={edit.factorWeights[f.key] ?? 0}
                    onChange={(e) =>
                      setEdit((prev) => ({
                        ...prev,
                        factorWeights: {
                          ...prev.factorWeights,
                          [f.key]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${config.color}33`,
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-4"
            style={{ background: `${config.color}0a`, border: `1px solid ${config.color}22` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={14} style={{ color: config.color }} />
              <span className="text-sm font-semibold" style={{ color: config.color }}>
                معاينة الاحتساب
              </span>
              <span className="text-xs text-steel">(مثال: 5 رسائل + 2 صور + تقرير كامل)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold" style={{ color: config.color }}>
                {previewCost}
              </div>
              <div className="text-sm text-steel">كريدت</div>
              <div className="text-xs text-steel mr-auto">
                = {edit.baseCost} (أساسي) +{" "}
                {config.factors
                  .filter((f) => (edit.factorWeights[f.key] ?? 0) > 0)
                  .map((f) => {
                    const val = previewFactors[f.key] ?? 0;
                    const w = edit.factorWeights[f.key] ?? 0;
                    return val > 0 ? `${val}×${w}` : null;
                  })
                  .filter(Boolean)
                  .join(" + ")}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-steel mb-1">وصف المعادلة (اختياري)</label>
            <input
              type="text"
              value={edit.description}
              onChange={(e) => setEdit((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="مثال: 5 كريدت أساسي + 1 لكل رسالة + 5 لكل صورة..."
              className="w-full px-3 py-2 rounded-lg text-sm text-platinum"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${config.color}33`,
                outline: "none",
              }}
            />
          </div>

          {/* Active Toggle + Save */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: edit.isActive ? config.color : "rgba(255,255,255,0.1)" }}
                onClick={() => setEdit((prev) => ({ ...prev, isActive: !prev.isActive }))}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: edit.isActive ? "translateX(21px)" : "translateX(2px)" }}
                />
              </div>
              <span className="text-sm text-steel">
                {edit.isActive ? "المعادلة مفعّلة" : "المعادلة معطّلة (يُستخدم الافتراضي)"}
              </span>
            </label>

            <button
              onClick={() => onSave(platform, edit)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: config.color,
                color: "#080E1A",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              حفظ المعادلة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingRulesAdmin() {
  const { data: rules, isLoading, refetch } = trpc.pricing.getRules.useQuery();
  const seedMutation = trpc.pricing.seedDefaults.useMutation({
    onSuccess: () => {
      toast.success("تم زرع القواعد الافتراضية بنجاح");
      refetch();
    },
    onError: (e) => toast.error(`خطأ: ${e.message}`),
  });
  const upsertMutation = trpc.pricing.upsertRule.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ المعادلة بنجاح");
      refetch();
    },
    onError: (e) => toast.error(`خطأ في الحفظ: ${e.message}`),
  });

  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);

  const handleSave = async (platform: string, data: EditState) => {
    setSavingPlatform(platform);
    try {
      await upsertMutation.mutateAsync({
        platform: platform as "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal",
        baseCost: data.baseCost,
        minCost: data.minCost,
        maxCost: data.maxCost,
        factorWeights: data.factorWeights,
        description: data.description || undefined,
        isActive: data.isActive,
      });
    } finally {
      setSavingPlatform(null);
    }
  };

  const rulesMap = Object.fromEntries((rules ?? []).map((r) => [r.platform, r]));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-platinum text-xl font-bold mb-1">معادلات احتساب الكريدت</h2>
          <p className="text-steel text-sm">
            كل منصة فرعية تُرسل{" "}
            <code
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}
            >
              usage_factors
            </code>{" "}
            مع طلب الخصم، وموسى يحتسب التكلفة الدقيقة بالمعادلة المخصصة لكل منصة.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
          >
            <RefreshCw size={14} />
            تحديث
          </button>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}
          >
            {seedMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            زرع الافتراضيات
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
      >
        <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-steel">
          <strong className="text-platinum">كيف يعمل النظام:</strong> عند انتهاء المستخدم من جلسته في المنصة الفرعية، تُرسل المنصة{" "}
          <code
            className="px-1 py-0.5 rounded text-xs"
            style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}
          >
            usage_factors
          </code>{" "}
          (مثل عدد الرسائل، الصور، نوع التقرير) إلى موسى. يُطبّق موسى المعادلة:{" "}
          <code
            className="px-1 py-0.5 rounded text-xs"
            style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}
          >
            clamp(baseCost + Σ(factor × weight), min, max)
          </code>{" "}
          ويخصم الكريدت الدقيق. إذا لم تُرسل المنصة usage_factors، يُطبَّق التكلفة الأساسية فقط.
        </div>
      </div>

      {/* Platform Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : (
        <div className="space-y-3">
          {Object.keys(PLATFORM_LABELS).map((platform) => (
            <PlatformPricingCard
              key={platform}
              platform={platform}
              rule={rulesMap[platform] as PricingRule | undefined}
              onSave={handleSave}
              isSaving={savingPlatform === platform}
            />
          ))}
        </div>
      )}

      {/* API Documentation */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
      >
        <h3 className="text-platinum font-semibold mb-3 flex items-center gap-2">
          <Calculator size={16} className="text-gold" />
          توثيق API للمنصات الفرعية
        </h3>
        <p className="text-steel text-sm mb-3">
          أرسل{" "}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017" }}
          >
            usage_factors
          </code>{" "}
          مع طلب الخصم:
        </p>
        <pre
          className="text-xs p-4 rounded-lg overflow-x-auto"
          style={{ background: "rgba(0,0,0,0.3)", color: "#d4a017", fontFamily: "monospace" }}
        >
{`POST /api/platform/deduct-credits
Headers:
  Authorization: Bearer <platform-api-key>
  X-Platform-ID: fada

Body:
{
  "userId": 123,
  "description": "تقرير تصميم غرفة المعيشة",
  "usage_factors": {
    "message_count": 8,     // عدد رسائل المحادثة
    "image_count": 3,        // صور مرفوعة
    "report_type_full": 1,   // 1 = تقرير كامل
    "room_count": 2          // عدد الغرف
  }
}

Response:
{
  "success": true,
  "deducted": 28,            // الكريدت المخصوم الفعلي
  "newBalance": 172,
  "costBreakdown": {
    "base": 5,
    "message_count": 8,
    "image_count": 15,
    "report_type_full": 10
  },
  "costRule": "فضاء: 5 كريدت أساسي + 1 لكل رسالة..."
}`}
        </pre>
      </div>
    </div>
  );
}
