/**
 * ExpertCorrections.tsx — Layer 5: Expert Feedback with Validation Pipeline
 * Engineers submit corrections to building codes/standards with evidence
 * 3-expert review process before acceptance
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
  Shield, CheckCircle2, Clock, AlertCircle, XCircle,
  Upload, FileText, Award, Users, RefreshCw, ChevronDown, ChevronUp, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const CORRECTION_TYPES = [
  { value: "building_code", label: "كود بناء" },
  { value: "design_standard", label: "معيار تصميم" },
  { value: "material_spec", label: "مواصفة مادة" },
  { value: "calculation_method", label: "طريقة حساب" },
  { value: "regulation", label: "لائحة تنظيمية" },
  { value: "best_practice", label: "أفضل ممارسة" },
];

const SPECIALIZATIONS = [
  { value: "structural", label: "إنشائي" },
  { value: "mechanical", label: "ميكانيكي" },
  { value: "electrical", label: "كهربائي" },
  { value: "civil", label: "مدني" },
  { value: "architectural", label: "معماري" },
  { value: "fire_safety", label: "سلامة حريق" },
  { value: "hvac", label: "تكييف وتهوية" },
  { value: "plumbing", label: "سباكة" },
  { value: "interior_design", label: "تصميم داخلي" },
  { value: "landscape", label: "تنسيق موقع" },
];

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: "حرج", color: "text-red-400" },
  major: { label: "رئيسي", color: "text-orange-400" },
  minor: { label: "ثانوي", color: "text-yellow-400" },
  suggestion: { label: "اقتراح", color: "text-blue-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pending: { label: "قيد المراجعة", icon: Clock },
  under_review: { label: "تحت المراجعة", icon: Users },
  approved: { label: "معتمد", icon: CheckCircle2 },
  rejected: { label: "مرفوض", icon: XCircle },
  needs_more_info: { label: "يحتاج معلومات", icon: AlertCircle },
};

function SubmitCorrectionForm() {
  const [form, setForm] = useState({
    title: "",
    correctionType: "",
    currentContent: "",
    proposedContent: "",
    justification: "",
    evidenceUrls: "",
    severity: "minor",
    affectedPlatforms: [] as string[],
    submitterSpecialization: "",
    submitterLicenseNumber: "",
  });

  const submitMutation = trpc.corrections.submit.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم التصحيح بنجاح — سيتم مراجعته من قِبل 3 خبراء متخصصين");
      setForm({
        title: "", correctionType: "", currentContent: "", proposedContent: "",
        justification: "", evidenceUrls: "", severity: "minor",
        affectedPlatforms: [], submitterSpecialization: "", submitterLicenseNumber: "",
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.title || !form.correctionType || !form.proposedContent || !form.justification) {
      return toast.error("يرجى ملء جميع الحقول المطلوبة");
    }
    if (!form.submitterSpecialization || !form.submitterLicenseNumber) {
      return toast.error("رقم الترخيص المهني مطلوب للتحقق من الهوية");
    }
    // Map UI correction types to schema types
    const correctionTypeMap: Record<string, "building_code" | "calculation_rule" | "design_standard" | "material_spec" | "climate_data" | "general_knowledge"> = {
      building_code: "building_code",
      design_standard: "design_standard",
      material_spec: "material_spec",
      calculation_method: "calculation_rule",
      regulation: "building_code",
      best_practice: "general_knowledge",
    };
    const mappedType = correctionTypeMap[form.correctionType] ?? "general_knowledge";
    const affectedPlatform = (form.affectedPlatforms[0] as "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal" | "all") ?? "all";
    submitMutation.mutate({
      platform: affectedPlatform,
      correctionType: mappedType,
      currentValueAr: form.currentContent || form.title,
      proposedValueAr: form.proposedContent,
      justificationAr: `${form.justification}\n\nالتخصص: ${form.submitterSpecialization} | الترخيص: ${form.submitterLicenseNumber}`,
      evidenceUrls: form.evidenceUrls ? form.evidenceUrls.split("\n").filter(Boolean) : [],
      officialReference: form.title,
      priority: form.severity === "critical" ? "critical" : form.severity === "major" ? "high" : "normal",
    });
  };

  const platforms = ["fada", "raqaba", "harara", "maskan", "code", "khayal"];
  const platformLabels: Record<string, string> = {
    fada: "فضاء", raqaba: "رقابة", harara: "حرارة",
    maskan: "مسكن", code: "كود", khayal: "خيال"
  };

  return (
    <div className="space-y-6">
      {/* Trust Notice */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.2)" }}>
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-gold mt-0.5 shrink-0" />
          <div>
            <p className="text-gold font-semibold text-sm mb-1">إجراءات التحقق الصارمة</p>
            <p className="text-steel text-sm" style={{ lineHeight: 1.7 }}>
              كل تصحيح يمر بمراجعة 3 خبراء مستقلين من نفس التخصص قبل الاعتماد.
              يجب تقديم رقم الترخيص المهني وأدلة داعمة. التصحيحات المعتمدة تُضاف للقاعدة مع اسم المُصحِّح ومرجعه.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specialization */}
        <div className="space-y-2">
          <Label className="text-steel">التخصص المهني <span className="text-red-400">*</span></Label>
          <Select value={form.submitterSpecialization} onValueChange={v => setForm(f => ({ ...f, submitterSpecialization: v }))}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر تخصصك" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALIZATIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* License Number */}
        <div className="space-y-2">
          <Label className="text-steel">رقم الترخيص المهني <span className="text-red-400">*</span></Label>
          <Input
            placeholder="مثال: UAE-ENG-2019-XXXXX"
            value={form.submitterLicenseNumber}
            onChange={e => setForm(f => ({ ...f, submitterLicenseNumber: e.target.value }))}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-steel">عنوان التصحيح <span className="text-red-400">*</span></Label>
        <Input
          placeholder="مثال: تصحيح قيمة U-Value للجدران الخارجية في مناخ الخليج"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Correction Type */}
        <div className="space-y-2">
          <Label className="text-steel">نوع التصحيح <span className="text-red-400">*</span></Label>
          <Select value={form.correctionType} onValueChange={v => setForm(f => ({ ...f, correctionType: v }))}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              {CORRECTION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <Label className="text-steel">درجة الأهمية</Label>
          <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">حرج — يؤثر على السلامة</SelectItem>
              <SelectItem value="major">رئيسي — خطأ فني واضح</SelectItem>
              <SelectItem value="minor">ثانوي — تحسين دقة</SelectItem>
              <SelectItem value="suggestion">اقتراح — إضافة معلومة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current Content */}
      <div className="space-y-2">
        <Label className="text-steel">المحتوى الحالي (الخاطئ أو الناقص)</Label>
        <Textarea
          placeholder="انسخ هنا النص أو القيمة الحالية في المنصة التي تعتقد أنها تحتاج تصحيحاً..."
          value={form.currentContent}
          onChange={e => setForm(f => ({ ...f, currentContent: e.target.value }))}
          rows={3}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
        />
      </div>

      {/* Proposed Content */}
      <div className="space-y-2">
        <Label className="text-steel">التصحيح المقترح <span className="text-red-400">*</span></Label>
        <Textarea
          placeholder="اكتب هنا المحتوى الصحيح أو القيمة الصحيحة مع المرجع..."
          value={form.proposedContent}
          onChange={e => setForm(f => ({ ...f, proposedContent: e.target.value }))}
          rows={4}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
        />
      </div>

      {/* Justification */}
      <div className="space-y-2">
        <Label className="text-steel">المبرر العلمي والتقني <span className="text-red-400">*</span></Label>
        <Textarea
          placeholder="اشرح لماذا هذا التصحيح ضروري، مع ذكر المرجع (رقم الكود، الطبعة، الصفحة)..."
          value={form.justification}
          onChange={e => setForm(f => ({ ...f, justification: e.target.value }))}
          rows={4}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
        />
      </div>

      {/* Evidence URLs */}
      <div className="space-y-2">
        <Label className="text-steel">روابط الأدلة (رابط لكل سطر)</Label>
        <Textarea
          placeholder="https://www.dcd.gov.ae/...&#10;https://www.ashrae.org/...&#10;رابط البريد الإلكتروني الرسمي أو الوثيقة..."
          value={form.evidenceUrls}
          onChange={e => setForm(f => ({ ...f, evidenceUrls: e.target.value }))}
          rows={3}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}
        />
      </div>

      {/* Affected Platforms */}
      <div className="space-y-2">
        <Label className="text-steel">المنصات المتأثرة</Label>
        <div className="flex flex-wrap gap-2">
          {platforms.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({
                ...f,
                affectedPlatforms: f.affectedPlatforms.includes(p)
                  ? f.affectedPlatforms.filter(x => x !== p)
                  : [...f.affectedPlatforms, p]
              }))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: form.affectedPlatforms.includes(p) ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${form.affectedPlatforms.includes(p) ? "rgba(212,160,23,0.5)" : "rgba(212,160,23,0.1)"}`,
                color: form.affectedPlatforms.includes(p) ? "#D4A017" : "#8899A6",
              }}
            >
              {platformLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full btn-gold"
      >
        {submitMutation.isPending ? <><RefreshCw size={16} className="animate-spin ml-2" />جارٍ الإرسال...</> : <><Shield size={16} className="ml-2" />تقديم التصحيح للمراجعة</>}
      </Button>
    </div>
  );
}

type CorrectionRecord = {
  id?: number;
  status?: string | null;
  severity?: string | null;
  correctionType?: string | null;
  title?: string | null;
  approvalCount?: number | null;
  proposedContent?: string | null;
  proposedValueAr?: string | null;
  justification?: string | null;
  justificationAr?: string | null;
  createdAt?: string | Date | null;
  officialReference?: string | null;
  priority?: string | null;
};

function CorrectionCard({ correction }: { correction: CorrectionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const status = String(correction.status ?? "pending_review");
  const priority = String(correction.priority ?? "normal");
  const StatusIcon = STATUS_CONFIG[status]?.icon ?? Clock;
  const severityInfo = SEVERITY_LABELS[priority] ?? { label: priority, color: "text-steel" };

  return (
    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.08)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <StatusIcon size={10} className="ml-1" />
              {STATUS_CONFIG[status]?.label ?? status}
            </Badge>
            <span className={`text-xs font-semibold ${severityInfo.color}`}>{severityInfo.label}</span>
            {correction.correctionType && (
              <Badge variant="secondary" className="text-xs">
                {CORRECTION_TYPES.find(c => c.value === correction.correctionType)?.label ?? String(correction.correctionType ?? "")}
              </Badge>
            )}
          </div>
          <h4 className="text-platinum font-semibold text-sm mb-1">{String(correction.officialReference ?? correction.title ?? "")}</h4>
          {correction.approvalCount != null && (
            <div className="flex items-center gap-1 mt-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: i < Number(correction.approvalCount) ? "#4ade80" : "rgba(255,255,255,0.1)"
                }} />
              ))}
              <span className="text-steel text-xs mr-1">{Number(correction.approvalCount)}/3 موافقات</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-steel hover:text-gold transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }}>
          {(correction.proposedContent || correction.proposedValueAr) && (
            <div>
              <p className="text-steel text-xs mb-1">التصحيح المقترح:</p>
              <p className="text-platinum text-sm" style={{ lineHeight: 1.6 }}>{String(correction.proposedValueAr ?? correction.proposedContent ?? "")}</p>
            </div>
          )}
          {(correction.justification || correction.justificationAr) && (
            <div>
              <p className="text-steel text-xs mb-1">المبرر:</p>
              <p className="text-steel text-sm" style={{ lineHeight: 1.6 }}>{String(correction.justificationAr ?? correction.justification ?? "")}</p>
            </div>
          )}
          {correction.createdAt && (
            <p className="text-steel text-xs">
              تاريخ التقديم: {new Date(String(correction.createdAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MyCorrectionsList() {
  const { data, isLoading } = trpc.corrections.myCorrections.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  const corrections = (data ?? []) as Record<string, unknown>[];

  if (corrections.length === 0) return (
    <div className="text-center py-16">
      <Shield size={40} className="mx-auto mb-3 text-steel opacity-40" />
      <p className="text-steel">لم تقدم أي تصحيحات بعد</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {corrections.map((c, i) => <CorrectionCard key={i} correction={c} />)}
    </div>
  );
}

function PublicApprovedList() {
  const { data, isLoading } = trpc.corrections.approved.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  const corrections = (data ?? []) as Record<string, unknown>[];

  if (corrections.length === 0) return (
    <div className="text-center py-16">
      <CheckCircle2 size={40} className="mx-auto mb-3 text-steel opacity-40" />
      <p className="text-steel">لا توجد تصحيحات معتمدة بعد — كن الأول!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {corrections.map((c, i) => <CorrectionCard key={i} correction={c} />)}
    </div>
  );
}

export default function ExpertCorrections() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
      <RefreshCw size={32} className="animate-spin text-gold" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
      <Card className="max-w-md w-full mx-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.2)" }}>
        <CardContent className="p-8 text-center">
          <Shield size={48} className="mx-auto mb-4 text-gold" />
          <h2 className="text-platinum text-xl font-bold mb-2">بوابة تصحيحات الخبراء</h2>
          <p className="text-steel mb-6">يجب تسجيل الدخول للمشاركة في تحسين قاعدة المعرفة</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="btn-gold w-full">تسجيل الدخول</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#080E1A" }}>
      <div className="container py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-5 text-sm hover:text-gold transition-colors" style={{ color: "#8A9BB0" }}>
            <ArrowRight size={14} />
            <span>العودة إلى الرئيسية</span>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)" }}>
              <Shield size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="text-platinum text-2xl font-bold">بوابة تصحيحات الخبراء</h1>
              <p className="text-steel text-sm">الطبقة الخامسة — التغذية الراجعة المُعتمَدة</p>
            </div>
          </div>
          <p className="text-steel max-w-2xl" style={{ lineHeight: 1.75 }}>
            ساهم في بناء أدق قاعدة معرفة هندسية في المنطقة. تصحيحاتك المدعومة بأدلة تُراجَع من 3 خبراء مستقلين قبل الاعتماد.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: Users, title: "مراجعة ثلاثية", desc: "3 خبراء مستقلين من نفس التخصص يراجعون كل تصحيح" },
              { icon: Award, title: "مكافأة بالكريدت", desc: "كل تصحيح معتمد يُضاف 50 كريدت لحسابك تلقائياً" },
              { icon: CheckCircle2, title: "مصداقية موثوقة", desc: "اسمك ومرجعك يُذكران مع كل تصحيح معتمد في القاعدة" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
                <Icon size={18} className="text-gold mb-2" />
                <div className="text-platinum font-semibold text-sm mb-1">{title}</div>
                <div className="text-steel text-xs" style={{ lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="submit" dir="rtl">
          <TabsList className="mb-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <TabsTrigger value="submit">تقديم تصحيح جديد</TabsTrigger>
            <TabsTrigger value="mine">تصحيحاتي</TabsTrigger>
            <TabsTrigger value="approved">المعتمدة</TabsTrigger>
          </TabsList>

          <div className="max-w-2xl">
            <TabsContent value="submit">
              <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.12)" }}>
                <CardHeader>
                  <CardTitle className="text-platinum flex items-center gap-2">
                    <FileText size={18} className="text-gold" /> تقديم تصحيح هندسي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SubmitCorrectionForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mine">
              <MyCorrectionsList />
            </TabsContent>

            <TabsContent value="approved">
              <PublicApprovedList />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
