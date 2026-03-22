/**
 * DeveloperPage.tsx
 * صفحة المطور — بيانات التكامل مع منصة Mousa.ai والتسعيرة
 * متاحة على: /developer
 */
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Coins,
  Zap,
  Code2,
  Globe,
  Shield,
  Info,
  Copy,
  Check,
  ChevronRight,
  Layers,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

// ─── تسعيرة خيال المتدرجة ────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    id: "scene",
    nameAr: "مشهد واحد",
    nameEn: "Single Scene",
    descAr: "توليد 3–8 صور سينمائية لمشهد واحد",
    descEn: "Generate 3–8 cinematic images for one scene",
    cost: 30,
    unit: "كريدت/جلسة",
    color: "blue",
    icon: "🎨",
    features: ["3–8 صور عالية الجودة", "تحليل وصف ذكي", "دعم صور مرجعية", "4 نسب عرض"],
  },
  {
    id: "film_short",
    nameAr: "فيلم قصير",
    nameEn: "Short Film",
    descAr: "فيلم مدته 15–60 ثانية (3–12 مشهد)",
    descEn: "15–60 second film (3–12 scenes)",
    cost: 50,
    unit: "كريدت/جلسة",
    color: "purple",
    icon: "🎬",
    features: ["3–12 مشهد متتابع", "موسيقى تصويرية", "تعليق صوتي AI", "تصدير فيديو"],
    recommended: true,
  },
  {
    id: "film_long",
    nameAr: "فيلم طويل",
    nameEn: "Long Film",
    descAr: "فيلم مدته 1–5 دقائق (12–37 مشهد)",
    descEn: "1–5 minute film (12–37 scenes)",
    cost: 100,
    unit: "كريدت/جلسة",
    color: "gold",
    icon: "🎥",
    features: ["12–37 مشهد", "توليد على دفعات", "جودة إنتاجية عالية", "أولوية في المعالجة"],
  },
  {
    id: "film_epic",
    nameAr: "فيلم ملحمي",
    nameEn: "Epic Film",
    descAr: "فيلم مدته 5–30 دقيقة (37+ مشهد)",
    descEn: "5–30 minute film (37+ scenes)",
    cost: 200,
    unit: "كريدت/جلسة",
    color: "red",
    icon: "🏆",
    features: ["37+ مشهد", "معالجة موزعة", "جودة سينمائية احترافية", "دعم مخصص"],
  },
];

// ─── مقارنة مع المنصات الأخرى ────────────────────────────────────────────────

const PLATFORM_COMPARISON = [
  { id: "code", nameAr: "كود", cost: 10, category: "تحليل نصي", complexity: "منخفض" },
  { id: "maskan", nameAr: "مسكن", cost: 15, category: "بيانات عقارية", complexity: "منخفض" },
  { id: "fada", nameAr: "فضاء", cost: 20, category: "تصميم 2D", complexity: "متوسط" },
  { id: "raqaba", nameAr: "رقابة", cost: 30, category: "تحليل فيديو", complexity: "عالي" },
  { id: "khayal", nameAr: "خيال ✦", cost: 30, category: "توليد سينمائي", complexity: "عالي جداً", highlight: true },
  { id: "harara", nameAr: "حرارة", cost: 35, category: "تحليل حراري", complexity: "عالي جداً" },
];

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pricing" | "integration" | "api">("pricing");

  const { data: status, isLoading } = trpc.credits.getStatus.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: platformInfo } = trpc.developer.getPlatformInfo.useQuery(undefined, {
    staleTime: 60_000,
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const costPerSession = status?.costPerSession ?? 30;

  return (
    <div className="min-h-screen bg-[#08090f] text-white" dir="rtl">
      {/* ─── Header ─── */}
      <div className="border-b border-white/10 bg-[#0d0e1a]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">صفحة المطور</h1>
              <p className="text-xs text-white/40">بيانات التكامل مع منصة Mousa.ai</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
            ) : status?.enabled ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                متصل بـ Mousa.ai
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1.5">
                <XCircle className="w-3 h-3" />
                غير متصل
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-white/20 text-white/60 hover:text-white"
              onClick={() => window.open("https://www.mousa.ai/dashboard", "_blank")}
            >
              <ExternalLink className="w-3 h-3 ml-1" />
              لوحة Mousa.ai
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ─── بطاقات الحالة الرئيسية ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "معرف المنصة",
              value: status?.platformId ?? "khayal",
              icon: <Shield className="w-4 h-4 text-blue-400" />,
              mono: true,
            },
            {
              label: "التكلفة الأساسية",
              value: `${costPerSession} كريدت`,
              icon: <Coins className="w-4 h-4 text-yellow-400" />,
              mono: true,
            },
            {
              label: "رابط المنصة",
              value: "khayal.mousa.ai",
              icon: <Globe className="w-4 h-4 text-green-400" />,
              mono: true,
              link: "https://khayal.mousa.ai",
            },
            {
              label: "حالة التكامل",
              value: status?.enabled ? "مفعّل" : "غير مفعّل",
              icon: status?.enabled
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <XCircle className="w-4 h-4 text-red-400" />,
              mono: false,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span className="text-xs text-white/40">{card.label}</span>
              </div>
              {card.link ? (
                <a
                  href={card.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                >
                  {card.value}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className={`text-sm font-bold text-white ${card.mono ? "font-mono" : ""}`}>
                  {card.value}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {[
            { id: "pricing", label: "التسعيرة", icon: <Coins className="w-4 h-4" /> },
            { id: "integration", label: "التكامل", icon: <Zap className="w-4 h-4" /> },
            { id: "api", label: "API", icon: <Code2 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab: التسعيرة ─── */}
        {activeTab === "pricing" && (
          <div className="space-y-8">
            {/* تحذير التناقض */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-300 mb-1">
                  ملاحظة: التسعيرة الحالية المسجلة في Mousa.ai هي 30 كريدت/جلسة (مشهد واحد)
                </p>
                <p className="text-xs text-yellow-300/70">
                  التسعيرة المتدرجة أدناه مقترحة لتحسين الإيرادات وتشجيع الاستخدام المكثف.
                  يمكن تفعيلها من خلال تحديث منصة Mousa.ai وإضافة منطق التسعيرة في الكود.
                </p>
              </div>
            </div>

            {/* بطاقات التسعيرة المقترحة */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">التسعيرة المقترحة (متدرجة حسب حجم الاستخدام)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PRICING_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`relative rounded-xl border p-5 transition-all ${
                      tier.recommended
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    {tier.recommended && (
                      <div className="absolute -top-3 right-4">
                        <Badge className="bg-purple-500 text-white text-xs border-0">
                          الأكثر طلباً
                        </Badge>
                      </div>
                    )}
                    <div className="text-3xl mb-3">{tier.icon}</div>
                    <h3 className="font-bold text-white mb-1">{tier.nameAr}</h3>
                    <p className="text-xs text-white/50 mb-4">{tier.descAr}</p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-white font-mono">{tier.cost}</span>
                      <span className="text-xs text-white/40">{tier.unit}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                          <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* مقارنة مع المنصات الأخرى */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">مقارنة مع منصات Mousa.ai</h2>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-right p-3 text-white/60 font-medium">المنصة</th>
                      <th className="text-right p-3 text-white/60 font-medium">التصنيف</th>
                      <th className="text-right p-3 text-white/60 font-medium">التعقيد</th>
                      <th className="text-center p-3 text-white/60 font-medium">التكلفة الحالية</th>
                      <th className="text-center p-3 text-white/60 font-medium">التكلفة المقترحة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORM_COMPARISON.map((p) => (
                      <tr
                        key={p.id}
                        className={`border-b border-white/5 ${
                          p.highlight ? "bg-blue-500/10" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-3 font-medium">
                          {p.highlight ? (
                            <span className="text-blue-300">{p.nameAr}</span>
                          ) : (
                            p.nameAr
                          )}
                        </td>
                        <td className="p-3 text-white/60">{p.category}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              p.complexity === "عالي جداً"
                                ? "border-red-500/40 text-red-400"
                                : p.complexity === "عالي"
                                ? "border-orange-500/40 text-orange-400"
                                : p.complexity === "متوسط"
                                ? "border-yellow-500/40 text-yellow-400"
                                : "border-green-500/40 text-green-400"
                            }`}
                          >
                            {p.complexity}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {p.highlight ? (
                            <span className="text-yellow-400">{p.cost}</span>
                          ) : (
                            <span className="text-white/60">{p.cost}</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {p.highlight ? (
                            <span className="text-green-400">30 – 200</span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-white/30 mt-2 text-right">
                * التكلفة المقترحة لخيال متدرجة: 30 (مشهد) / 50 (فيلم قصير) / 100 (فيلم طويل) / 200 (فيلم ملحمي)
              </p>
            </div>

            {/* تبرير التسعيرة */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
              <h3 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                لماذا هذه التسعيرة مناسبة؟
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-white mb-1">تكلفة API الخارجية</p>
                  <p className="text-white/50 text-xs">
                    خيال تستخدم Runway ML (توليد فيديو) + ElevenLabs (صوت) + OpenAI (تحليل) — تكلفة
                    الجلسة الواحدة تتراوح بين $0.15–$2 حسب المدة.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">القيمة المقدمة</p>
                  <p className="text-white/50 text-xs">
                    خيال تنتج محتوى سينمائياً احترافياً (صور + فيديو + صوت) في دقائق — قيمة أعلى بكثير
                    من التحليل النصي أو البيانات العقارية.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">التسعيرة المتدرجة</p>
                  <p className="text-white/50 text-xs">
                    تشجع المستخدمين على إنتاج أفلام أطول (عائد أعلى)، وتعكس التكلفة الفعلية للموارد
                    المستهلكة في كل نوع من الجلسات.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab: التكامل ─── */}
        {activeTab === "integration" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* بيانات التكامل */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  بيانات التكامل
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Platform ID", value: status?.platformId ?? "khayal" },
                    { label: "Base URL", value: "https://www.mousa.ai" },
                    { label: "Platform URL", value: "https://khayal.mousa.ai" },
                    { label: "Credits/Session", value: `${costPerSession}` },
                    { label: "Upgrade URL", value: "https://www.mousa.ai/pricing?ref=khayal" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/40 font-mono w-32 shrink-0">{item.label}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-white/80 font-mono truncate">{item.value}</span>
                        <button
                          onClick={() => copyToClipboard(item.value, item.label)}
                          className="shrink-0 text-white/30 hover:text-white/70 transition-colors"
                        >
                          {copied === item.label ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endpoints المستخدمة */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Endpoints المستخدمة
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      method: "POST",
                      path: "/api/platform/verify-token",
                      desc: "التحقق من توكن المستخدم",
                      color: "blue",
                    },
                    {
                      method: "GET",
                      path: "/api/platform/check-balance",
                      desc: "فحص الرصيد قبل التوليد",
                      color: "green",
                    },
                    {
                      method: "POST",
                      path: "/api/platform/deduct-credits",
                      desc: "خصم الكريدتس بعد النجاح",
                      color: "red",
                    },
                    {
                      method: "GET",
                      path: "/api/platform/info",
                      desc: "بيانات جميع المنصات",
                      color: "purple",
                    },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono shrink-0 ${
                          ep.color === "blue"
                            ? "border-blue-500/40 text-blue-400"
                            : ep.color === "green"
                            ? "border-green-500/40 text-green-400"
                            : ep.color === "red"
                            ? "border-red-500/40 text-red-400"
                            : "border-purple-500/40 text-purple-400"
                        }`}
                      >
                        {ep.method}
                      </Badge>
                      <div>
                        <p className="text-xs font-mono text-white/80">{ep.path}</p>
                        <p className="text-[11px] text-white/40">{ep.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* تدفق الخصم */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                تدفق عملية الخصم
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {[
                  { step: "1", label: "المستخدم يضغط توليد", color: "blue" },
                  { step: "→", label: "", color: "none" },
                  { step: "2", label: "guardMousaBalance(userId)", color: "yellow" },
                  { step: "→", label: "", color: "none" },
                  { step: "3", label: "تنفيذ التوليد", color: "purple" },
                  { step: "→", label: "", color: "none" },
                  { step: "4", label: "deductMousaCredits(userId, 30)", color: "green" },
                  { step: "→", label: "", color: "none" },
                  { step: "5", label: "تحديث الرصيد في Mousa.ai", color: "red" },
                ].map((s, i) =>
                  s.color === "none" ? (
                    <span key={i} className="text-white/30 text-lg">
                      →
                    </span>
                  ) : (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                        s.color === "blue"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                          : s.color === "yellow"
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                          : s.color === "purple"
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                          : s.color === "green"
                          ? "bg-green-500/10 border-green-500/30 text-green-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
                    >
                      <span className="font-bold font-mono">{s.step}</span>
                      <span>{s.label}</span>
                    </div>
                  )
                )}
              </div>
              <p className="text-xs text-white/30 mt-3">
                * في حالة فشل التوليد: لا يتم الخصم. في حالة خطأ الشبكة مع Mousa.ai: يُسمح بالتوليد (fail-open).
              </p>
            </div>
          </div>
        )}

        {/* ─── Tab: API ─── */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                متغيرات البيئة المطلوبة
              </h3>
              <div className="space-y-2">
                {[
                  {
                    key: "MOUSA_API_KEY",
                    desc: "مفتاح API الخاص بمنصة خيال في Mousa.ai",
                    required: true,
                    status: "مفعّل",
                  },
                  {
                    key: "MOUSA_BASE_URL",
                    desc: "عنوان منصة Mousa.ai",
                    required: true,
                    value: "https://www.mousa.ai",
                    status: "مفعّل",
                  },
                  {
                    key: "MOUSA_PLATFORM_ID",
                    desc: "معرف خيال في منصة Mousa.ai",
                    required: true,
                    value: "khayal",
                    status: "مفعّل",
                  },
                  {
                    key: "MOUSA_CREDITS_PER_SESSION",
                    desc: "تكلفة الجلسة الأساسية (يجب أن تكون 30)",
                    required: false,
                    value: "30",
                    status: "يحتاج تحديث",
                    warning: true,
                  },
                ].map((env) => (
                  <div
                    key={env.key}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                      env.warning
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <code
                        className={`text-xs font-mono px-2 py-0.5 rounded ${
                          env.warning
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {env.key}
                      </code>
                      <span className="text-xs text-white/50">{env.desc}</span>
                      {env.value && (
                        <code className="text-xs font-mono text-white/40">= {env.value}</code>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {env.required && (
                        <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">
                          مطلوب
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          env.warning
                            ? "border-yellow-500/40 text-yellow-400"
                            : "border-green-500/40 text-green-400"
                        }`}
                      >
                        {env.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* كود مثال */}
            <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <span className="text-xs text-white/40 font-mono">mousaCreditsService.ts — مثال الاستخدام</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `// فحص الرصيد قبل التوليد
const guard = await guardMousaBalance(ctx.user.id);
if (!guard.allowed) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: JSON.stringify({
      code: "INSUFFICIENT_CREDITS",
      balance: guard.balance ?? 0,
      upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
    }),
  });
}

// ... تنفيذ التوليد ...

// خصم الكريدتس بعد النجاح
await deductMousaCredits(ctx.user.id, "توليد مشهد سينمائي");`,
                      "code-example"
                    )
                  }
                  className="text-white/30 hover:text-white/70 transition-colors"
                >
                  {copied === "code-example" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs text-green-300/80 font-mono overflow-x-auto leading-relaxed">
                {`// فحص الرصيد قبل التوليد
const guard = await guardMousaBalance(ctx.user.id);
if (!guard.allowed) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: JSON.stringify({
      code: "INSUFFICIENT_CREDITS",
      balance: guard.balance ?? 0,
      upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
    }),
  });
}

// ... تنفيذ التوليد ...

// خصم الكريدتس بعد النجاح (30 كريدت = جلسة مشهد)
await deductMousaCredits(
  ctx.user.id,
  "توليد مشهد سينمائي",
  30  // أو 50/100/200 حسب نوع الجلسة
);`}
              </pre>
            </div>

            {/* روابط مفيدة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "لوحة Mousa.ai", url: "https://www.mousa.ai/dashboard", icon: "🏠" },
                { label: "صفحة التسعيرة", url: "https://www.mousa.ai/pricing?ref=khayal", icon: "💰" },
                { label: "منصة خيال", url: "https://khayal.mousa.ai", icon: "🎬" },
                { label: "توثيق API", url: "https://www.mousa.ai/api/platform/info", icon: "📖" },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/10 transition-all text-sm text-white/70 hover:text-white"
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3 mr-auto opacity-50" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
