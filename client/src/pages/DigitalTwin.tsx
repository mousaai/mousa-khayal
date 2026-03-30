/**
 * DigitalTwin.tsx — Layer 9: Digital Property Identity
 * Every property gets a unique digital fingerprint linking all AI sessions,
 * documents, inspections, and decisions across all 6 platforms.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2, MapPin, Layers, FileText, Plus, RefreshCw,
  ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle,
  Cpu, Home as HomeIcon, Thermometer, Shield, BookOpen, Zap, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const PROJECT_TYPES = [
  { value: "villa", label: "فيلا سكنية" },
  { value: "apartment_building", label: "مبنى شقق" },
  { value: "commercial", label: "تجاري" },
  { value: "mixed_use", label: "متعدد الاستخدامات" },
  { value: "industrial", label: "صناعي" },
  { value: "hospitality", label: "ضيافة وفنادق" },
  { value: "healthcare", label: "صحي" },
  { value: "educational", label: "تعليمي" },
  { value: "infrastructure", label: "بنية تحتية" },
  { value: "renovation", label: "تجديد وترميم" },
  { value: "interior_only", label: "تصميم داخلي فقط" },
  { value: "feasibility", label: "دراسة جدوى" },
  { value: "other", label: "أخرى" },
];

const PHASES = [
  { value: "feasibility", label: "دراسة الجدوى", step: 1 },
  { value: "concept_design", label: "التصميم المفاهيمي", step: 2 },
  { value: "schematic_design", label: "التصميم التخطيطي", step: 3 },
  { value: "design_development", label: "تطوير التصميم", step: 4 },
  { value: "construction_documents", label: "وثائق الإنشاء", step: 5 },
  { value: "permitting", label: "التراخيص", step: 6 },
  { value: "construction", label: "الإنشاء", step: 7 },
  { value: "handover", label: "التسليم", step: 8 },
  { value: "completed", label: "مكتمل", step: 9 },
];

const EMIRATES = [
  { value: "dubai", label: "دبي" },
  { value: "abu_dhabi", label: "أبوظبي" },
  { value: "sharjah", label: "الشارقة" },
  { value: "ajman", label: "عجمان" },
  { value: "ras_al_khaimah", label: "رأس الخيمة" },
  { value: "fujairah", label: "الفجيرة" },
  { value: "umm_al_quwain", label: "أم القيوين" },
];

const PLATFORM_COLORS: Record<string, string> = {
  fada: "text-amber-400",
  raqaba: "text-blue-400",
  harara: "text-orange-400",
  maskan: "text-green-400",
  code: "text-purple-400",
  khayal: "text-pink-400",
};

type ProjectRecord = {
  id?: number;
  nameAr?: string | null;
  nameEn?: string | null;
  projectType?: string | null;
  emirate?: string | null;
  area?: string | null;
  plotNumber?: string | null;
  totalAreaSqm?: number | null;
  numFloors?: number | null;
  budgetAed?: number | null;
  phase?: string | null;
  status?: string | null;
  openIssues?: number | null;
  linkedSessionIds?: Record<string, number[]> | null;
  createdAt?: string | Date | null;
  documents?: Array<{ id: number; nameAr: string; docType: string; fileUrl: string; createdAt: Date }>;
};

function PhaseTimeline({ currentPhase }: { currentPhase: string }) {
  const currentStep = PHASES.find(p => p.value === currentPhase)?.step ?? 1;
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {PHASES.map((phase, i) => (
        <div key={phase.value} className="flex items-center gap-1 shrink-0">
          <div className={`flex flex-col items-center gap-1`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              phase.step < currentStep ? "bg-gold/30 text-gold" :
              phase.step === currentStep ? "bg-gold text-obsidian" :
              "bg-white/5 text-steel"
            }`}>
              {phase.step < currentStep ? "✓" : phase.step}
            </div>
            <span className={`text-xs whitespace-nowrap ${phase.step === currentStep ? "text-gold" : "text-steel"}`} style={{ fontSize: "0.65rem" }}>
              {phase.label}
            </span>
          </div>
          {i < PHASES.length - 1 && (
            <div className={`w-4 h-0.5 mb-4 ${phase.step < currentStep ? "bg-gold/40" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectRecord }) {
  const [expanded, setExpanded] = useState(false);
  const phase = PHASES.find(p => p.value === project.phase);
  const projectType = PROJECT_TYPES.find(t => t.value === project.projectType);
  const emirate = EMIRATES.find(e => e.value === project.emirate);

  // Count linked sessions across platforms
  const linkedSessions = project.linkedSessionIds ?? {};
  const totalSessions = Object.values(linkedSessions).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,160,23,0.15)", background: "rgba(255,255,255,0.02)" }}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {projectType?.label ?? String(project.projectType ?? "")}
              </Badge>
              {emirate && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <MapPin size={9} />
                  {emirate.label}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${project.status === "active" ? "text-green-400 border-green-400/30" : "text-steel"}`}
              >
                {project.status === "active" ? "نشط" : project.status === "completed" ? "مكتمل" : String(project.status ?? "")}
              </Badge>
            </div>

            <h3 className="text-platinum font-bold text-lg mb-1">{String(project.nameAr ?? "")}</h3>

            {/* Quick stats */}
            <div className="flex items-center gap-4 flex-wrap mt-2">
              {project.totalAreaSqm != null && (
                <span className="text-steel text-xs flex items-center gap-1">
                  <Layers size={11} />
                  {Number(project.totalAreaSqm).toLocaleString("en-US")} م²
                </span>
              )}
              {project.numFloors != null && (
                <span className="text-steel text-xs flex items-center gap-1">
                  <Building2 size={11} />
                  {Number(project.numFloors)} طوابق
                </span>
              )}
              {totalSessions > 0 && (
                <span className="text-gold text-xs flex items-center gap-1">
                  <Cpu size={11} />
                  {totalSessions} جلسة AI
                </span>
              )}
              {Number(project.openIssues) > 0 && (
                <span className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {Number(project.openIssues)} مشكلة مفتوحة
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

        {/* Phase timeline */}
        {project.phase && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }}>
            <p className="text-steel text-xs mb-2">مرحلة المشروع:</p>
            <PhaseTimeline currentPhase={String(project.phase)} />
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }}>
          {/* Platform sessions */}
          {Object.keys(linkedSessions).length > 0 && (
            <div>
              <p className="text-steel text-xs mb-2">جلسات AI المرتبطة:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(linkedSessions).map(([platform, sessions]) =>
                  Array.isArray(sessions) && sessions.length > 0 ? (
                    <div key={platform} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className={PLATFORM_COLORS[platform] ?? "text-steel"}>{platform}</span>
                      <span className="text-steel">({sessions.length})</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {project.documents && project.documents.length > 0 && (
            <div>
              <p className="text-steel text-xs mb-2">المستندات ({project.documents.length}):</p>
              <div className="space-y-1">
                {project.documents.slice(0, 3).map(doc => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-platinum hover:text-gold transition-colors py-1"
                  >
                    <FileText size={12} className="text-steel" />
                    {doc.nameAr}
                  </a>
                ))}
                {project.documents.length > 3 && (
                  <p className="text-steel text-xs">+{project.documents.length - 3} مستندات أخرى</p>
                )}
              </div>
            </div>
          )}

          {project.createdAt && (
            <p className="text-steel text-xs">
              أُنشئ: {new Date(String(project.createdAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CreateProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    projectType: "" as "villa" | "apartment_building" | "commercial" | "mixed_use" | "industrial" | "hospitality" | "healthcare" | "educational" | "infrastructure" | "renovation" | "interior_only" | "feasibility" | "other" | "",
    emirate: "" as "dubai" | "abu_dhabi" | "sharjah" | "ajman" | "ras_al_khaimah" | "fujairah" | "umm_al_quwain" | "",
    area: "",
    plotNumber: "",
    totalAreaSqm: "",
    numFloors: "",
    budgetAed: "",
    phase: "feasibility" as "feasibility" | "concept_design" | "schematic_design" | "design_development" | "construction_documents" | "permitting" | "construction" | "handover" | "completed",
  });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء هوية المشروع الرقمية بنجاح");
      setForm({
        nameAr: "", nameEn: "", projectType: "", emirate: "", area: "",
        plotNumber: "", totalAreaSqm: "", numFloors: "", budgetAed: "", phase: "feasibility",
      });
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.nameAr || !form.projectType) {
      return toast.error("اسم المشروع ونوعه مطلوبان");
    }
    createMutation.mutate({
      nameAr: form.nameAr,
      nameEn: form.nameEn || undefined,
      projectType: form.projectType as "villa" | "apartment_building" | "commercial" | "mixed_use" | "industrial" | "hospitality" | "healthcare" | "educational" | "infrastructure" | "renovation" | "interior_only" | "feasibility" | "other",
      emirate: form.emirate as "dubai" | "abu_dhabi" | "sharjah" | "ajman" | "ras_al_khaimah" | "fujairah" | "umm_al_quwain" | undefined || undefined,
      area: form.area || undefined,
      plotNumber: form.plotNumber || undefined,
      totalAreaSqm: form.totalAreaSqm ? Number(form.totalAreaSqm) : undefined,
      numFloors: form.numFloors ? Number(form.numFloors) : undefined,
      budgetAed: form.budgetAed ? Number(form.budgetAed) : undefined,
      phase: form.phase,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">اسم المشروع (عربي) *</Label>
          <Input
            className="input-dark"
            placeholder="مثال: فيلا المرسى — دبي"
            value={form.nameAr}
            onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-steel text-sm">اسم المشروع (إنجليزي)</Label>
          <Input
            className="input-dark"
            placeholder="Project Name in English"
            value={form.nameEn}
            onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">نوع المشروع *</Label>
          <Select value={form.projectType} onValueChange={(v) => setForm(f => ({ ...f, projectType: v as typeof form.projectType }))}>
            <SelectTrigger className="input-dark">
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-steel text-sm">الإمارة</Label>
          <Select value={form.emirate} onValueChange={(v) => setForm(f => ({ ...f, emirate: v as typeof form.emirate }))}>
            <SelectTrigger className="input-dark">
              <SelectValue placeholder="اختر الإمارة" />
            </SelectTrigger>
            <SelectContent>
              {EMIRATES.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">المساحة الإجمالية (م²)</Label>
          <Input
            className="input-dark"
            type="number"
            placeholder="مثال: 500"
            value={form.totalAreaSqm}
            onChange={e => setForm(f => ({ ...f, totalAreaSqm: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-steel text-sm">عدد الطوابق</Label>
          <Input
            className="input-dark"
            type="number"
            placeholder="مثال: 3"
            value={form.numFloors}
            onChange={e => setForm(f => ({ ...f, numFloors: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-steel text-sm">رقم القطعة</Label>
          <Input
            className="input-dark"
            placeholder="مثال: 123-456"
            value={form.plotNumber}
            onChange={e => setForm(f => ({ ...f, plotNumber: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel text-sm">الميزانية التقديرية (USD $)</Label>
          <Input
            className="input-dark"
            type="number"
            placeholder="مثال: 2000000"
            value={form.budgetAed}
            onChange={e => setForm(f => ({ ...f, budgetAed: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-steel text-sm">مرحلة المشروع الحالية</Label>
          <Select value={form.phase} onValueChange={(v) => setForm(f => ({ ...f, phase: v as typeof form.phase }))}>
            <SelectTrigger className="input-dark">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.step}. {p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
        className="w-full btn-gold"
      >
        {createMutation.isPending
          ? <><RefreshCw size={16} className="animate-spin ml-2" />جارٍ الإنشاء...</>
          : <><Plus size={16} className="ml-2" />إنشاء الهوية الرقمية للمشروع</>
        }
      </Button>
    </div>
  );
}

function ProjectsList() {
  const { data, isLoading } = trpc.projects.list.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="text-center py-16">
      <Building2 size={40} className="text-steel mx-auto mb-4 opacity-40" />
      <p className="text-steel">لا توجد مشاريع بعد</p>
      <p className="text-steel text-sm mt-1 opacity-70">أنشئ هوية رقمية لمشروعك الأول</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {data.map(project => (
        <ProjectCard key={project.id} project={project as ProjectRecord} />
      ))}
    </div>
  );
}

export default function DigitalTwin() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("projects");

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#080E1A" }}>
      <RefreshCw size={28} className="animate-spin text-gold" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
      <div className="text-center">
        <Building2 size={48} className="text-gold mx-auto mb-4 opacity-60" />
        <h2 className="text-platinum font-bold text-xl mb-2">الهوية الرقمية للعقارات</h2>
        <p className="text-steel mb-6">سجّل دخولك لإدارة مشاريعك وهويتها الرقمية</p>
        <Button className="btn-gold" onClick={() => window.location.href = getLoginUrl("/digital-twin")}>
          تسجيل الدخول
        </Button>
      </div>
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
              <Building2 size={22} className="text-gold" />
            </div>
            <div>
              <h1 className="text-platinum font-bold text-2xl">الهوية الرقمية للعقارات</h1>
              <p className="text-steel text-sm">الطبقة التاسعة: التوأم الرقمي لكل مشروع</p>
            </div>
          </div>

          {/* Info boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: Cpu, title: "ربط ذكي", desc: "جميع جلسات AI مرتبطة بمشروعك تلقائياً" },
              { icon: FileText, title: "أرشيف موحد", desc: "مخططات وعقود وتقارير في مكان واحد" },
              { icon: CheckCircle2, title: "تتبع المراحل", desc: "من الجدوى حتى التسليم في 9 مراحل" },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
                <item.icon size={18} className="text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-platinum text-sm font-semibold">{item.title}</p>
                  <p className="text-steel text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.1)" }}>
            <TabsTrigger value="projects" className="data-[state=active]:text-gold">
              <Building2 size={14} className="ml-1.5" />
              مشاريعي
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:text-gold">
              <Plus size={14} className="ml-1.5" />
              مشروع جديد
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ProjectsList />
          </TabsContent>

          <TabsContent value="create">
            <Card style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,160,23,0.12)" }}>
              <CardHeader>
                <CardTitle className="text-platinum text-lg flex items-center gap-2">
                  <Plus size={18} className="text-gold" />
                  إنشاء هوية رقمية جديدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreateProjectForm onSuccess={() => setActiveTab("projects")} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
