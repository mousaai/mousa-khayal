import { useTranslation } from 'react-i18next';
/**
 * PartnerPortal.tsx — بوابة الشركاء
 * Covers: Suppliers, Contractors, Developers, Consultants
 * Features: Registration → Profile → Projects → Services
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Wrench,
  HardHat,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  MapPin,
  Phone,
  Globe,
  FileText,
  Package,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

const PARTNER_TYPES = [
  { value: "supplier", labelAr: "مورد مواد", icon: Package, color: "from-amber-500 to-amber-700" },
  { value: "contractor", labelAr: "مقاول تنفيذ", icon: HardHat, color: "from-blue-500 to-blue-700" },
  { value: "developer", labelAr: "مطور عقاري", icon: Building2, color: "from-emerald-500 to-emerald-700" },
  { value: "consultant", labelAr: "مكتب استشاري", icon: Users, color: "from-purple-500 to-purple-700" },
  { value: "subcontractor", labelAr: "مقاول باطن", icon: Wrench, color: "from-orange-500 to-orange-700" },
  { value: "manufacturer", labelAr: "مصنّع", icon: Package, color: "from-rose-500 to-rose-700" },
] as const;

const EMIRATES = [
  "dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"
];
const EMIRATES_AR: Record<string, string> = {
  dubai: "دبي", abu_dhabi: "أبوظبي", sharjah: "الشارقة",
  ajman: "عجمان", ras_al_khaimah: "رأس الخيمة",
  fujairah: "الفجيرة", umm_al_quwain: "أم القيوين",
};

const PROJECT_TYPES_AR: Record<string, string> = {
  villa: "فيلا", apartment_building: "مبنى سكني", commercial: "تجاري",
  mixed_use: "متعدد الاستخدامات", industrial: "صناعي", hospitality: "ضيافة",
  healthcare: "رعاية صحية", educational: "تعليمي", infrastructure: "بنية تحتية",
  renovation: "ترميم", interior_only: "تشطيب داخلي", masterplan: "مخطط رئيسي",
  feasibility: "دراسة جدوى", other: "أخرى",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ size?: number }> }> = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
  under_review: { label: "تحت المراجعة", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  verified: { label: "موثّق", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  suspended: { label: "موقوف", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: XCircle },
};

// ── Main Component ────────────────────────────────────────────────

export default function PartnerPortal() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "projects" | "services">("profile");

  const { data: partnerProfile, isLoading: profileLoading, refetch: refetchProfile } =
    trpc.partners.getMyProfile.useQuery(undefined, { enabled: isAuthenticated });

  const { data: myProjects, refetch: refetchProjects } =
    trpc.partners.getMyProjects.useQuery(undefined, { enabled: isAuthenticated && !!partnerProfile });

  const { data: myServices, refetch: refetchServices } =
    trpc.partners.getMyServices.useQuery(undefined, { enabled: isAuthenticated && !!partnerProfile });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <Card className="glass-card max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gold mx-auto mb-4" />
            <h2 className="text-platinum text-xl font-bold mb-2">بوابة الشركاء</h2>
            <p className="text-steel mb-6">سجّل دخولك للوصول إلى بوابة الشركاء</p>
            <Button
              className="btn-gold w-full"
              onClick={() => window.location.href = getLoginUrl("/partner")}
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#080E1A" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(212,160,23,0.1)", background: "rgba(13,27,42,0.8)" }}>
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="text-gold" size={24} />
            <h1 className="text-platinum text-2xl font-bold">بوابة الشركاء</h1>
          </div>
          <p className="text-steel text-sm">موردون · مقاولون · مطورون · استشاريون</p>
        </div>
      </div>

      <div className="container py-8">
        {!partnerProfile ? (
          <RegistrationFlow onSuccess={() => refetchProfile()} />
        ) : (
          <div className="space-y-6">
            {/* Partner Status Card */}
            <PartnerStatusCard partner={partnerProfile} />

            {/* Tabs */}
            <div className="flex gap-2 border-b" style={{ borderColor: "rgba(212,160,23,0.1)" }}>
              {[
                { id: "profile", label: "الملف الشخصي", icon: Users },
                { id: "projects", label: `المشاريع (${myProjects?.length ?? 0})`, icon: Building2 },
                { id: "services", label: `الخدمات (${myServices?.length ?? 0})`, icon: Package },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-gold text-gold"
                        : "border-transparent text-steel hover:text-platinum"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === "profile" && (
              <ProfileTab partner={partnerProfile} onUpdate={() => refetchProfile()} />
            )}
            {activeTab === "projects" && (
              <ProjectsTab
                projects={myProjects ?? []}
                onAdd={() => refetchProjects()}
              />
            )}
            {activeTab === "services" && (
              <ServicesTab
                services={myServices ?? []}
                onAdd={() => refetchServices()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Registration Flow ─────────────────────────────────────────────

function RegistrationFlow({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", primarySpecialization: "",
    phone: "", email: "", website: "", address: "",
    tradeLicenseNo: "", engineeringGrade: "",
    profileAr: "", certifications: "",
    operatingEmirates: [] as string[],
    foundedYear: "",
  });

  const registerMutation = trpc.partners.register.useMutation({
    onSuccess: () => {
      toast.success("تم التسجيل بنجاح — سيتم مراجعة طلبك خلال 24-48 ساعة");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEmirate = (em: string) => {
    setForm(f => ({
      ...f,
      operatingEmirates: f.operatingEmirates.includes(em)
        ? f.operatingEmirates.filter(e => e !== em)
        : [...f.operatingEmirates, em],
    }));
  };

  const handleSubmit = () => {
    if (!selectedType || !form.nameAr || !form.primarySpecialization) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    registerMutation.mutate({
      partnerType: selectedType as "supplier",
      nameAr: form.nameAr,
      nameEn: form.nameEn || undefined,
      primarySpecialization: form.primarySpecialization,
      phone: form.phone || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      address: form.address || undefined,
      tradeLicenseNo: form.tradeLicenseNo || undefined,
      engineeringGrade: form.engineeringGrade || undefined,
      profileAr: form.profileAr || undefined,
      certifications: form.certifications || undefined,
      operatingEmirates: form.operatingEmirates.length > 0 ? form.operatingEmirates : undefined,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear) : undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
              step >= s ? "bg-gold border-gold text-obsidian" : "border-steel text-steel"
            }`}>{s}</div>
            <span className={`text-sm ${step >= s ? "text-platinum" : "text-steel"}`}>
              {s === 1 ? "نوع الشراكة" : "بيانات الشركة"}
            </span>
            {s < 2 && <ChevronRight size={14} className="text-steel" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-platinum text-xl font-bold mb-2">ما نوع شراكتك؟</h2>
          <p className="text-steel mb-6 text-sm">اختر الفئة التي تصف نشاطك التجاري</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {PARTNER_TYPES.map(pt => {
              const Icon = pt.icon;
              return (
                <button
                  key={pt.value}
                  onClick={() => setSelectedType(pt.value)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    selectedType === pt.value
                      ? "border-gold bg-gold/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pt.color} flex items-center justify-center mx-auto mb-3`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="text-platinum text-sm font-medium">{pt.labelAr}</span>
                </button>
              );
            })}
          </div>
          <Button
            className="btn-gold w-full"
            disabled={!selectedType}
            onClick={() => setStep(2)}
          >
            التالي
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-platinum text-xl font-bold mb-2">بيانات شركتك</h2>
          <p className="text-steel mb-6 text-sm">ستُراجَع هذه البيانات قبل تفعيل حسابك</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-steel text-xs mb-1 block">اسم الشركة (عربي) *</label>
              <Input
                className="input-dark"
                placeholder="شركة البناء المتحدة"
                value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-steel text-xs mb-1 block">اسم الشركة (إنجليزي)</label>
              <Input
                className="input-dark"
                placeholder="United Construction Co."
                value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-steel text-xs mb-1 block">التخصص الرئيسي *</label>
            <Input
              className="input-dark"
              placeholder="مثال: مقاولات عامة، أعمال حديد، تشطيبات فاخرة"
              value={form.primarySpecialization}
              onChange={e => setForm(f => ({ ...f, primarySpecialization: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-steel text-xs mb-1 block">رقم الهاتف</label>
              <Input className="input-dark" placeholder="+971 50 000 0000" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-steel text-xs mb-1 block">البريد الإلكتروني</label>
              <Input className="input-dark" placeholder="info@company.ae" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-steel text-xs mb-1 block">رقم الرخصة التجارية</label>
              <Input className="input-dark" placeholder="CN-XXXXXXX" value={form.tradeLicenseNo}
                onChange={e => setForm(f => ({ ...f, tradeLicenseNo: e.target.value }))} />
            </div>
            <div>
              <label className="text-steel text-xs mb-1 block">سنة التأسيس</label>
              <Input className="input-dark" placeholder="2005" value={form.foundedYear}
                onChange={e => setForm(f => ({ ...f, foundedYear: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-steel text-xs mb-1 block">الإمارات التي تعمل فيها</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMIRATES.map(em => (
                <button
                  key={em}
                  onClick={() => toggleEmirate(em)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.operatingEmirates.includes(em)
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-white/10 text-steel hover:border-white/20"
                  }`}
                >
                  {EMIRATES_AR[em]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-steel text-xs mb-1 block">نبذة عن الشركة</label>
            <Textarea
              className="input-dark resize-none"
              rows={3}
              placeholder="اكتب نبذة مختصرة عن نشاط شركتك وخبراتها..."
              value={form.profileAr}
              onChange={e => setForm(f => ({ ...f, profileAr: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              السابق
            </Button>
            <Button
              className="btn-gold flex-1"
              disabled={registerMutation.isPending}
              onClick={handleSubmit}
            >
              {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تقديم الطلب"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Partner Status Card ───────────────────────────────────────────

function PartnerStatusCard({ partner }: { partner: { nameAr: string; partnerType: string; verificationStatus: string; ratingAvg: number | null; ratingCount: number | null; trustScore: number | null } }) {
  const statusCfg = STATUS_CONFIG[partner.verificationStatus] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const partnerTypeCfg = PARTNER_TYPES.find(p => p.value === partner.partnerType);
  const PartnerIcon = partnerTypeCfg?.icon ?? Building2;

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${partnerTypeCfg?.color ?? "from-gold to-amber-700"} flex items-center justify-center`}>
              <PartnerIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-platinum font-bold text-lg">{partner.nameAr}</h3>
              <span className="text-steel text-sm">{partnerTypeCfg?.labelAr}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusCfg.color}`}>
              <StatusIcon size={12} />
              {statusCfg.label}
            </span>
            {partner.verificationStatus === "pending" && (
              <p className="text-steel text-xs text-right max-w-[200px]">
                سيتم مراجعة طلبك خلال 24-48 ساعة
              </p>
            )}
          </div>
        </div>

        {partner.verificationStatus === "verified" && (
          <div className="mt-4 pt-4 border-t flex gap-6" style={{ borderColor: "rgba(212,160,23,0.1)" }}>
            <div className="text-center">
              <div className="text-gold font-bold text-lg">{partner.ratingAvg?.toFixed(1) ?? "—"}</div>
              <div className="text-steel text-xs">التقييم</div>
            </div>
            <div className="text-center">
              <div className="text-gold font-bold text-lg">{partner.ratingCount ?? 0}</div>
              <div className="text-steel text-xs">تقييم</div>
            </div>
            <div className="text-center">
              <div className="text-gold font-bold text-lg">{partner.trustScore ?? 50}</div>
              <div className="text-steel text-xs">درجة الثقة</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────

function ProfileTab({ partner, onUpdate }: { partner: Record<string, unknown>; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    profileAr: (partner.profileAr as string) ?? "",
    phone: (partner.phone as string) ?? "",
    email: (partner.email as string) ?? "",
    website: (partner.website as string) ?? "",
    certifications: (partner.certifications as string) ?? "",
  });

  const updateMutation = trpc.partners.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      setEditing(false);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-platinum text-base">بيانات الشركة</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          {editing ? "إلغاء" : "تعديل"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div>
              <label className="text-steel text-xs mb-1 block">نبذة عن الشركة</label>
              <Textarea className="input-dark resize-none" rows={4} value={form.profileAr}
                onChange={e => setForm(f => ({ ...f, profileAr: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-steel text-xs mb-1 block">الهاتف</label>
                <Input className="input-dark" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">البريد الإلكتروني</label>
                <Input className="input-dark" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-steel text-xs mb-1 block">الموقع الإلكتروني</label>
              <Input className="input-dark" value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <label className="text-steel text-xs mb-1 block">الشهادات والاعتمادات</label>
              <Input className="input-dark" placeholder="ISO 9001, ESMA, CE..." value={form.certifications}
                onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} />
            </div>
            <Button className="btn-gold" disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(form)}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التغييرات"}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            {partner.profileAr != null && (
              <p className="text-steel text-sm leading-relaxed">{String(partner.profileAr)}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {partner.phone != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gold" />
                  <span className="text-platinum">{String(partner.phone)}</span>
                </div>
              )}
              {partner.email != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-gold" />
                  <span className="text-platinum">{String(partner.email)}</span>
                </div>
              )}
              {partner.website != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-gold" />
                  <a href={String(partner.website)} target="_blank" rel="noopener noreferrer"
                    className="text-gold hover:underline">{String(partner.website)}</a>
                </div>
              )}
              {Array.isArray(partner.operatingEmirates) && partner.operatingEmirates.length > 0 && (
                <div className="flex items-start gap-2 text-sm col-span-2">
                  <MapPin size={14} className="text-gold mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {(partner.operatingEmirates as string[]).map(em => (
                      <span key={em} className="px-2 py-0.5 rounded-full text-xs bg-gold/10 text-gold border border-gold/20">
                        {EMIRATES_AR[em] ?? em}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────

function ProjectsTab({ projects, onAdd }: { projects: Record<string, unknown>[]; onAdd: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nameAr: "", projectType: "villa" as string, partnerRole: "main_contractor" as string,
    emirate: "dubai" as string, totalAreaSqm: "", numFloors: "", contractValueAed: "",
    showContractValue: 0, startDate: "", completionDate: "", status: "completed" as string,
    descriptionAr: "", highlightsAr: "", specLevel: "standard" as string,
  });

  const submitMutation = trpc.partners.submitProject.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم المشروع — سيتم مراجعته وإضافته للمحفظة");
      setShowForm(false);
      onAdd();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.nameAr) {
      toast.error("اسم المشروع مطلوب");
      return;
    }
    submitMutation.mutate({
      nameAr: form.nameAr,
      projectType: form.projectType as "villa",
      partnerRole: form.partnerRole as "main_contractor",
      emirate: form.emirate as "dubai",
      totalAreaSqm: form.totalAreaSqm ? parseFloat(form.totalAreaSqm) : undefined,
      numFloors: form.numFloors ? parseInt(form.numFloors) : undefined,
      contractValueAed: form.contractValueAed ? parseFloat(form.contractValueAed) : undefined,
      showContractValue: form.showContractValue,
      startDate: form.startDate || undefined,
      completionDate: form.completionDate || undefined,
      status: form.status as "completed",
      descriptionAr: form.descriptionAr || undefined,
      highlightsAr: form.highlightsAr || undefined,
      specLevel: form.specLevel as "standard",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-platinum font-semibold">محفظة المشاريع</h3>
        <Button className="btn-gold" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="ml-1" />
          إضافة مشروع
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-gold/20">
          <CardHeader>
            <CardTitle className="text-platinum text-base">تقديم مشروع جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-steel text-xs mb-1 block">اسم المشروع *</label>
                <Input className="input-dark" placeholder="فيلا الخليج — دبي"
                  value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">نوع المشروع</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                  {Object.entries(PROJECT_TYPES_AR).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">دورك في المشروع</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.partnerRole} onChange={e => setForm(f => ({ ...f, partnerRole: e.target.value }))}>
                  <option value="main_contractor">مقاول رئيسي</option>
                  <option value="subcontractor">مقاول باطن</option>
                  <option value="developer">مطور</option>
                  <option value="consultant">استشاري</option>
                  <option value="designer">مصمم</option>
                  <option value="supplier">مورد</option>
                  <option value="project_manager">مدير مشروع</option>
                  <option value="owner">مالك</option>
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">الإمارة</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.emirate} onChange={e => setForm(f => ({ ...f, emirate: e.target.value }))}>
                  {EMIRATES.map(em => (
                    <option key={em} value={em}>{EMIRATES_AR[em]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">المساحة الإجمالية (م²)</label>
                <Input className="input-dark" type="number" placeholder="500"
                  value={form.totalAreaSqm} onChange={e => setForm(f => ({ ...f, totalAreaSqm: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">عدد الطوابق</label>
                <Input className="input-dark" type="number" placeholder="3"
                  value={form.numFloors} onChange={e => setForm(f => ({ ...f, numFloors: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">قيمة العقد (USD $)</label>
                <Input className="input-dark" type="number" placeholder="2500000"
                  value={form.contractValueAed} onChange={e => setForm(f => ({ ...f, contractValueAed: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">مستوى التشطيب</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.specLevel} onChange={e => setForm(f => ({ ...f, specLevel: e.target.value }))}>
                  <option value="economy">اقتصادي</option>
                  <option value="standard">قياسي</option>
                  <option value="premium">مميز</option>
                  <option value="luxury">فاخر</option>
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">تاريخ البدء</label>
                <Input className="input-dark" type="date"
                  value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">تاريخ الإنجاز</label>
                <Input className="input-dark" type="date"
                  value={form.completionDate} onChange={e => setForm(f => ({ ...f, completionDate: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-steel text-xs mb-1 block">وصف المشروع</label>
              <Textarea className="input-dark resize-none" rows={3}
                placeholder="اكتب وصفاً موجزاً للمشروع..."
                value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            </div>

            <div>
              <label className="text-steel text-xs mb-1 block">أبرز الإنجازات</label>
              <Textarea className="input-dark resize-none" rows={2}
                placeholder="ما الذي يميز هذا المشروع؟"
                value={form.highlightsAr} onChange={e => setForm(f => ({ ...f, highlightsAr: e.target.value }))} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="showValue" className="accent-gold"
                checked={form.showContractValue === 1}
                onChange={e => setForm(f => ({ ...f, showContractValue: e.target.checked ? 1 : 0 }))} />
              <label htmlFor="showValue" className="text-steel text-sm">
                إظهار قيمة العقد للزوار
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button className="btn-gold" disabled={submitMutation.isPending} onClick={handleSubmit}>
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تقديم المشروع"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-steel mx-auto mb-3" />
          <p className="text-steel">لم تُضف أي مشاريع بعد</p>
          <p className="text-steel text-sm mt-1">أضف مشاريعك لبناء محفظتك الاحترافية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id as number} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Record<string, unknown> }) {
  const approvalConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد المراجعة", color: "text-yellow-400" },
    approved: { label: "معتمد", color: "text-green-400" },
    rejected: { label: "مرفوض", color: "text-red-400" },
    needs_revision: { label: "يحتاج تعديل", color: "text-orange-400" },
  };
  const approval = approvalConfig[project.approvalStatus as string] ?? approvalConfig.pending;

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-platinum font-semibold text-sm">{project.nameAr as string}</h4>
            <p className="text-steel text-xs mt-0.5">
              {PROJECT_TYPES_AR[project.projectType as string]} · {EMIRATES_AR[project.emirate as string] ?? project.emirate as string}
            </p>
          </div>
          <span className={`text-xs font-medium ${approval.color}`}>{approval.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {project.totalAreaSqm != null && (
            <div>
              <div className="text-gold text-sm font-bold">{Number(project.totalAreaSqm as number).toLocaleString()}</div>
              <div className="text-steel text-xs">م²</div>
            </div>
          )}
          {project.numFloors != null && (
            <div>
              <div className="text-gold text-sm font-bold">{Number(project.numFloors as number)}</div>
              <div className="text-steel text-xs">طابق</div>
            </div>
          )}
          {project.actualCostPerSqmAed != null && (
            <div>
              <div className="text-gold text-sm font-bold">{Number(project.actualCostPerSqmAed as number).toLocaleString()}</div>
              <div className="text-steel text-xs">USD/م²</div>
            </div>
          )}
        </div>

        {project.descriptionAr != null && (
          <p className="text-steel text-xs mt-3 line-clamp-2">{String(project.descriptionAr)}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Services Tab ──────────────────────────────────────────────────

function ServicesTab({ services, onAdd }: { services: Record<string, unknown>[]; onAdd: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nameAr: "", serviceType: "service" as string, platform: "all" as string,
    descriptionAr: "", priceAed: "", priceUnit: "per project",
    priceIsNegotiable: 1, leadTimeDays: "",
  });

  const addMutation = trpc.partners.addService.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الخدمة");
      setShowForm(false);
      onAdd();
    },
    onError: (err) => toast.error(err.message),
  });

  const PLATFORM_LABELS: Record<string, string> = {
    fada: "فضاء", raqaba: "رقابة", harara: "حرارة",
    maskan: "مسكن", code: "كود", khayal: "خيال", all: "جميع المنصات",
  };

  const SERVICE_TYPE_LABELS: Record<string, string> = {
    product: "منتج", service: "خدمة", design: "تصميم",
    consultation: "استشارة", inspection: "تفتيش", study: "دراسة", training: "تدريب",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-platinum font-semibold">كتالوج الخدمات والمنتجات</h3>
        <Button className="btn-gold" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="ml-1" />
          إضافة خدمة
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-gold/20">
          <CardHeader>
            <CardTitle className="text-platinum text-base">إضافة خدمة / منتج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-steel text-xs mb-1 block">اسم الخدمة *</label>
                <Input className="input-dark" placeholder="دراسة الأحمال الحرارية"
                  value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">نوع الخدمة</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">المنصة المرتبطة</label>
                <select className="input-dark w-full rounded-md px-3 py-2 text-sm"
                  value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">السعر (USD $)</label>
                <Input className="input-dark" type="number" placeholder="1500"
                  value={form.priceAed} onChange={e => setForm(f => ({ ...f, priceAed: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">وحدة السعر</label>
                <Input className="input-dark" placeholder="per project / per m² / per hour"
                  value={form.priceUnit} onChange={e => setForm(f => ({ ...f, priceUnit: e.target.value }))} />
              </div>
              <div>
                <label className="text-steel text-xs mb-1 block">مدة التسليم (أيام)</label>
                <Input className="input-dark" type="number" placeholder="7"
                  value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-steel text-xs mb-1 block">وصف الخدمة</label>
              <Textarea className="input-dark resize-none" rows={3}
                placeholder="اكتب وصفاً تفصيلياً للخدمة..."
                value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="negotiable" className="accent-gold"
                checked={form.priceIsNegotiable === 1}
                onChange={e => setForm(f => ({ ...f, priceIsNegotiable: e.target.checked ? 1 : 0 }))} />
              <label htmlFor="negotiable" className="text-steel text-sm">السعر قابل للتفاوض</label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button className="btn-gold" disabled={addMutation.isPending}
                onClick={() => addMutation.mutate({
                  nameAr: form.nameAr,
                  serviceType: form.serviceType as "service",
                  platform: form.platform as "all",
                  descriptionAr: form.descriptionAr || undefined,
                  priceAed: form.priceAed ? parseFloat(form.priceAed) : undefined,
                  priceUnit: form.priceUnit || undefined,
                  priceIsNegotiable: form.priceIsNegotiable,
                  leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
                })}>
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة الخدمة"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-steel mx-auto mb-3" />
          <p className="text-steel">لم تُضف أي خدمات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <Card key={s.id as number} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-platinum font-semibold text-sm">{s.nameAr as string}</h4>
                  <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                    {PLATFORM_LABELS[s.platform as string]}
                  </Badge>
                </div>
                {s.descriptionAr != null && (
                  <p className="text-steel text-xs line-clamp-2 mb-3">{String(s.descriptionAr)}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gold font-bold text-sm">
                    {s.priceAed ? `$${Number(s.priceAed as number).toLocaleString("en-US")}` : "بالتفاوض"}
                    {s.priceUnit != null && <span className="text-steel text-xs font-normal"> / {String(s.priceUnit)}</span>}
                  </span>
                  <span className={`text-xs ${(s.approvalStatus as string) === "approved" ? "text-green-400" : "text-yellow-400"}`}>
                    {(s.approvalStatus as string) === "approved" ? "معتمد" : "قيد المراجعة"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
