/**
 * Gigs.tsx — Layer 6: Gig Workforce Marketplace
 * Engineers post partial tasks (BOQ, studies, inspections) for professionals
 * Connects platform intelligence with human expertise
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Briefcase, Clock, DollarSign, Users, Star,
  Plus, ChevronDown, ChevronUp, RefreshCw, Filter,
  Building2, Thermometer, BookOpen, Home as HomeIcon, Shield, Cpu, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const TASK_TYPES = [
  { value: "boq_preparation", label: "إعداد جدول الكميات (BOQ)", icon: "📋" },
  { value: "energy_study", label: "دراسة طاقة", icon: "⚡" },
  { value: "drawing_review", label: "مراجعة مخططات", icon: "📐" },
  { value: "code_checking", label: "فحص الكودات", icon: "✅" },
  { value: "cost_estimation", label: "تقدير تكاليف", icon: "💰" },
  { value: "inspection_report", label: "تقرير تفتيش", icon: "🔍" },
  { value: "design_review", label: "مراجعة تصميم", icon: "🎨" },
  { value: "quantity_survey", label: "مسح كميات", icon: "📏" },
  { value: "knowledge_entry", label: "إدخال بيانات معرفية", icon: "📚" },
  { value: "translation", label: "ترجمة تقنية", icon: "🌐" },
  { value: "other", label: "أخرى", icon: "📌" },
];

const PLATFORM_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  fada: { label: "فضاء", icon: HomeIcon, color: "text-amber-400" },
  raqaba: { label: "رقابة", icon: Shield, color: "text-blue-400" },
  harara: { label: "حرارة", icon: Thermometer, color: "text-orange-400" },
  maskan: { label: "مسكن", icon: Building2, color: "text-green-400" },
  code: { label: "كود", icon: BookOpen, color: "text-purple-400" },
  khayal: { label: "خيال", icon: Cpu, color: "text-pink-400" },
  all: { label: "عام", icon: Briefcase, color: "text-gold" },
};

type GigRecord = {
  id?: number;
  titleAr?: string | null;
  titleEn?: string | null;
  descriptionAr?: string | null;
  taskType?: string | null;
  platform?: string | null;
  budgetAed?: number | null;
  deadline?: string | Date | null;
  status?: string | null;
  requiredSpecialization?: string | null;
  minExperience?: number | null;
  createdAt?: string | Date | null;
};

function GigCard({ gig }: { gig: GigRecord }) {
  const [expanded, setExpanded] = useState(false);
  const taskType = TASK_TYPES.find(t => t.value === gig.taskType);
  const platformInfo = PLATFORM_LABELS[String(gig.platform ?? "all")] ?? PLATFORM_LABELS.all;
  const PlatformIcon = platformInfo.icon;
  const daysLeft = gig.deadline
    ? Math.ceil((new Date(String(gig.deadline)).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-5 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.1)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1">
              <PlatformIcon size={10} className={platformInfo.color} />
              {platformInfo.label}
            </Badge>
            {taskType && (
              <Badge variant="secondary" className="text-xs">
                {taskType.icon} {taskType.label}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${gig.status === "open" ? "text-green-400 border-green-400/30" : "text-steel"}`}
            >
              {gig.status === "open" ? "مفتوح" : gig.status === "assigned" ? "مُسند" : String(gig.status ?? "")}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="text-platinum font-bold text-base mb-2" style={{ lineHeight: 1.4 }}>
            {String(gig.titleAr ?? "")}
          </h3>

          {/* Meta info */}
          <div className="flex items-center gap-4 flex-wrap">
            {gig.budgetAed != null && (
              <span className="text-gold text-sm font-semibold flex items-center gap-1">
                <DollarSign size={13} />
                ${Number(gig.budgetAed).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            )}
            {daysLeft != null && daysLeft > 0 && (
              <span className="text-steel text-xs flex items-center gap-1">
                <Clock size={12} />
                {daysLeft} يوم متبقٍ
              </span>
            )}
            {gig.requiredSpecialization && (
              <span className="text-steel text-xs flex items-center gap-1">
                <Star size={12} />
                {String(gig.requiredSpecialization)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-steel hover:text-gold transition-colors shrink-0 mt-1"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }}>
          {gig.descriptionAr && (
            <div>
              <p className="text-steel text-xs mb-1">وصف المهمة:</p>
              <p className="text-platinum text-sm" style={{ lineHeight: 1.7 }}>{String(gig.descriptionAr)}</p>
            </div>
          )}
          {gig.minExperience != null && Number(gig.minExperience) > 0 && (
            <p className="text-steel text-xs flex items-center gap-1">
              <Users size={12} />
              خبرة لا تقل عن {Number(gig.minExperience)} سنوات
            </p>
          )}
          {gig.createdAt && (
            <p className="text-steel text-xs">
              نُشر: {new Date(String(gig.createdAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
          <Button size="sm" className="btn-gold w-full mt-2">
            <Briefcase size={14} className="ml-2" />
            تقديم عرض
          </Button>
        </div>
      )}
    </div>
  );
}

function PostGigForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    platform: "all" as "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal" | "all",
    taskType: "" as "boq_preparation" | "energy_study" | "drawing_review" | "code_checking" | "cost_estimation" | "inspection_report" | "design_review" | "quantity_survey" | "knowledge_entry" | "translation" | "other" | "",
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    requiredSpecialization: "",
    minExperience: 0,
    budgetAed: "",
    deadline: "",
  });

  const postMutation = trpc.gigs.post.useMutation({
    onSuccess: () => {
      toast.success("تم نشر المهمة بنجاح — ستظهر في السوق فوراً");
      setForm({
        platform: "all", taskType: "", titleAr: "", titleEn: "",
        descriptionAr: "", requiredSpecialization: "", minExperience: 0,
        budgetAed: "", deadline: "",
      });
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.taskType || !form.titleAr || !form.descriptionAr) {
      return toast.error("يرجى ملء جميع الحقول المطلوبة");
    }
    postMutation.mutate({
      platform: form.platform,
      taskType: form.taskType as "boq_preparation" | "energy_study" | "drawing_review" | "code_checking" | "cost_estimation" | "inspection_report" | "design_review" | "quantity_survey" | "knowledge_entry" | "translation" | "other",
      titleAr: form.titleAr,
      titleEn: form.titleEn || undefined,
      descriptionAr: form.descriptionAr,
      requiredSpecialization: form.requiredSpecialization || undefined,
      minExperience: form.minExperience || undefined,
      budgetAed: form.budgetAed ? Number(form.budgetAed) : undefined,
      deadline: form.deadline || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">المنصة المستهدفة *</Label>
          <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v as typeof form.platform }))}>
            <SelectTrigger className="input-dark">
              <SelectValue placeholder="اختر المنصة" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-steel text-sm">نوع المهمة *</Label>
          <Select value={form.taskType} onValueChange={(v) => setForm(f => ({ ...f, taskType: v as typeof form.taskType }))}>
            <SelectTrigger className="input-dark">
              <SelectValue placeholder="اختر نوع المهمة" />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-steel text-sm">عنوان المهمة (عربي) *</Label>
        <Input
          className="input-dark"
          placeholder="مثال: إعداد جدول كميات لمشروع سكني 3 طوابق"
          value={form.titleAr}
          onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))}
          dir="rtl"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-steel text-sm">وصف المهمة التفصيلي *</Label>
        <Textarea
          className="input-dark min-h-[120px]"
          placeholder="اشرح متطلبات المهمة بالتفصيل: نوع المشروع، المساحة، الاشتراطات الخاصة، المخرجات المطلوبة..."
          value={form.descriptionAr}
          onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))}
          dir="rtl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">الميزانية (USD $)</Label>
          <Input
            className="input-dark"
            type="number"
            placeholder="مثال: 2000"
            value={form.budgetAed}
            onChange={e => setForm(f => ({ ...f, budgetAed: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-steel text-sm">الموعد النهائي</Label>
          <Input
            className="input-dark"
            type="date"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-steel text-sm">الحد الأدنى للخبرة (سنوات)</Label>
          <Input
            className="input-dark"
            type="number"
            min={0}
            max={50}
            value={form.minExperience}
            onChange={e => setForm(f => ({ ...f, minExperience: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-steel text-sm">التخصص المطلوب</Label>
        <Input
          className="input-dark"
          placeholder="مثال: مهندس إنشائي، مهندس ميكانيكي..."
          value={form.requiredSpecialization}
          onChange={e => setForm(f => ({ ...f, requiredSpecialization: e.target.value }))}
          dir="rtl"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={postMutation.isPending}
        className="w-full btn-gold"
      >
        {postMutation.isPending
          ? <><RefreshCw size={16} className="animate-spin ml-2" />جارٍ النشر...</>
          : <><Plus size={16} className="ml-2" />نشر المهمة في السوق</>
        }
      </Button>
    </div>
  );
}

function GigsList() {
  const [filterPlatform, setFilterPlatform] = useState("all");
  const { data, isLoading, refetch } = trpc.gigs.listOpen.useQuery({ limit: 30 });

  const filtered = (data ?? []).filter(g =>
    filterPlatform === "all" || g.platform === filterPlatform
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-steel" />
        <span className="text-steel text-xs">تصفية:</span>
        {["all", "fada", "raqaba", "harara", "maskan", "code", "khayal"].map(p => (
          <button
            key={p}
            onClick={() => setFilterPlatform(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterPlatform === p
                ? "bg-gold/20 text-gold border border-gold/30"
                : "text-steel hover:text-platinum border border-transparent"
            }`}
          >
            {PLATFORM_LABELS[p]?.label ?? p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={40} className="text-steel mx-auto mb-4 opacity-40" />
          <p className="text-steel">لا توجد مهام مفتوحة حالياً</p>
          <p className="text-steel text-sm mt-1 opacity-70">كن أول من ينشر مهمة في هذا السوق</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(gig => (
            <GigCard key={gig.id} gig={gig as GigRecord} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyGigsList() {
  const { data, isLoading } = trpc.gigs.myGigs.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="text-center py-16">
      <Briefcase size={40} className="text-steel mx-auto mb-4 opacity-40" />
      <p className="text-steel">لم تنشر أي مهام بعد</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {data.map(gig => (
        <GigCard key={gig.id} gig={gig as GigRecord} />
      ))}
    </div>
  );
}

export default function Gigs() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#080E1A" }}>
      <RefreshCw size={28} className="animate-spin text-gold" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#080E1A" }}>
      {/* Header */}
      <div className="py-12" style={{ borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
        <div className="container">
          <Link href="/" className="inline-flex items-center gap-2 mb-5 text-sm hover:text-gold transition-colors" style={{ color: "#8A9BB0" }}>
            <ArrowRight size={14} />
            <span>العودة إلى الرئيسية</span>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.2)" }}>
              <Briefcase size={22} className="text-gold" />
            </div>
            <div>
              <h1 className="text-platinum font-bold text-2xl">سوق المهام الهندسية</h1>
              <p className="text-steel text-sm">الطبقة السادسة: القوى العاملة المتخصصة</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
            {[
              { num: "11", label: "نوع مهمة" },
              { num: "6", label: "منصة" },
              { num: "100%", label: "تحقق هوية" },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.1)" }}>
                <div className="text-gold font-bold text-lg">{s.num}</div>
                <div className="text-steel text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
            <TabsTrigger value="browse" className="data-[state=active]:text-gold">
              <Briefcase size={14} className="ml-1.5" />
              تصفح المهام
            </TabsTrigger>
            {isAuthenticated && (
              <>
                <TabsTrigger value="post" className="data-[state=active]:text-gold">
                  <Plus size={14} className="ml-1.5" />
                  نشر مهمة
                </TabsTrigger>
                <TabsTrigger value="my" className="data-[state=active]:text-gold">
                  <Users size={14} className="ml-1.5" />
                  مهامي
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="browse">
            <GigsList />
          </TabsContent>

          {isAuthenticated ? (
            <>
              <TabsContent value="post">
                <Card style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,160,23,0.12)" }}>
                  <CardHeader>
                    <CardTitle className="text-platinum text-lg flex items-center gap-2">
                      <Plus size={18} className="text-gold" />
                      نشر مهمة جديدة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PostGigForm onSuccess={() => setActiveTab("my")} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="my">
                <MyGigsList />
              </TabsContent>
            </>
          ) : (
            <TabsContent value="browse">
              <div className="text-center py-8 mt-4 rounded-xl" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
                <p className="text-steel mb-3">سجّل دخولك لنشر مهام أو تقديم عروض</p>
                <Button
                  className="btn-gold"
                  onClick={() => window.location.href = getLoginUrl("/gigs")}
                >
                  تسجيل الدخول
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
