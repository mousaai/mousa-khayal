/**
 * Archive.tsx — Institutional Memory (Layer 10)
 * Upload contracts & drawings → AI extracts structured data automatically
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload, FileText, Building2, CheckCircle2, Clock, AlertCircle,
  BarChart3, TrendingUp, Archive as ArchiveIcon, Layers, RefreshCw, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { storagePut } from "@/lib/storage";

const EMIRATES = [
  { value: "dubai", label: "دبي" },
  { value: "abu_dhabi", label: "أبوظبي" },
  { value: "sharjah", label: "الشارقة" },
  { value: "ajman", label: "عجمان" },
  { value: "ras_al_khaimah", label: "رأس الخيمة" },
  { value: "fujairah", label: "الفجيرة" },
  { value: "umm_al_quwain", label: "أم القيوين" },
];

const PROJECT_TYPES = [
  { value: "villa", label: "فيلا" },
  { value: "apartment_building", label: "مبنى سكني" },
  { value: "commercial", label: "تجاري" },
  { value: "mixed_use", label: "متعدد الاستخدامات" },
  { value: "industrial", label: "صناعي" },
  { value: "hospitality", label: "فندقي" },
  { value: "healthcare", label: "صحي" },
  { value: "educational", label: "تعليمي" },
  { value: "infrastructure", label: "بنية تحتية" },
  { value: "renovation", label: "تجديد" },
  { value: "interior_only", label: "ديكور داخلي" },
  { value: "other", label: "أخرى" },
];

const DRAWING_TYPES = [
  { value: "floor_plan", label: "مخطط طابق" },
  { value: "elevation", label: "واجهة" },
  { value: "section", label: "قطاع" },
  { value: "site_plan", label: "مخطط موقع" },
  { value: "roof_plan", label: "مخطط سطح" },
  { value: "detail", label: "تفصيلة" },
  { value: "3d_view", label: "منظور ثلاثي" },
  { value: "landscape", label: "تنسيق موقع" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "في الانتظار", variant: "secondary" },
    processing: { label: "جارٍ الاستخراج", variant: "outline" },
    completed: { label: "مكتمل", variant: "default" },
    failed: { label: "فشل", variant: "destructive" },
    needs_review: { label: "يحتاج مراجعة", variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function UploadContractTab() {
  const [file, setFile] = useState<File | null>(null);
  const [emirate, setEmirate] = useState<string>("");
  const [projectType, setProjectType] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const uploadMutation = trpc.archive.uploadContract.useMutation({
    onSuccess: () => {
      toast.success("تم رفع العقد بنجاح — جارٍ استخراج البيانات بالذكاء الاصطناعي");
      setFile(null);
      setEmirate("");
      setProjectType("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpload = async () => {
    if (!file) return toast.error("اختر ملفاً أولاً");
    setUploading(true);
    try {
      // Upload to S3
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const key = `archive/contracts/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { url } = await storagePut(key, buffer, file.type || "application/pdf");

      await uploadMutation.mutateAsync({
        fileUrl: url,
        fileKey: key,
        originalFilename: file.name,
        emirate: emirate as "dubai" | "abu_dhabi" | "sharjah" | "ajman" | "ras_al_khaimah" | "fujairah" | "umm_al_quwain" | undefined,
        projectType: projectType as "villa" | "apartment_building" | "commercial" | "mixed_use" | "industrial" | "hospitality" | "healthcare" | "educational" | "infrastructure" | "renovation" | "interior_only" | "other" | undefined,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: "rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.03)" }}
        onClick={() => document.getElementById("contract-file-input")?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        <input
          id="contract-file-input"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <FileText size={40} className="mx-auto mb-3" style={{ color: "rgba(212,160,23,0.6)" }} />
        {file ? (
          <div>
            <p className="text-platinum font-semibold">{file.name}</p>
            <p className="text-steel text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-platinum font-medium mb-1">اسحب العقد هنا أو انقر للاختيار</p>
            <p className="text-steel text-sm">PDF، Word، أو صورة — حجم أقصى 16MB</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel">الإمارة</Label>
          <Select value={emirate} onValueChange={setEmirate}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر الإمارة" />
            </SelectTrigger>
            <SelectContent>
              {EMIRATES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-steel">نوع المشروع</Label>
          <Select value={projectType} onValueChange={setProjectType}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.15)" }}>
        <p className="text-gold text-sm font-semibold mb-1">🔒 الخصوصية مضمونة</p>
        <p className="text-steel text-sm">أسماء العملاء والمقاولين تُخفى تلقائياً — تُحفظ البيانات الهندسية فقط (مساحة، تكلفة، نوع المشروع)</p>
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full btn-gold"
      >
        {uploading ? <><RefreshCw size={16} className="animate-spin ml-2" />جارٍ الرفع والاستخراج...</> : <><Upload size={16} className="ml-2" />رفع العقد واستخراج البيانات</>}
      </Button>
    </div>
  );
}

function UploadDrawingTab() {
  const [file, setFile] = useState<File | null>(null);
  const [drawingType, setDrawingType] = useState<string>("");
  const [emirate, setEmirate] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const uploadMutation = trpc.archive.uploadDrawing.useMutation({
    onSuccess: () => {
      toast.success("تم رفع المخطط بنجاح — جارٍ التحليل المعماري بالذكاء الاصطناعي");
      setFile(null);
      setDrawingType("");
      setEmirate("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpload = async () => {
    if (!file) return toast.error("اختر ملفاً أولاً");
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const key = `archive/drawings/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { url } = await storagePut(key, buffer, file.type || "image/png");

      await uploadMutation.mutateAsync({
        fileUrl: url,
        fileKey: key,
        originalFilename: file.name,
        drawingType: drawingType as "floor_plan" | "elevation" | "section" | "site_plan" | "roof_plan" | "detail" | "3d_view" | "landscape" | undefined,
        emirate: emirate as "dubai" | "abu_dhabi" | "sharjah" | "ajman" | "ras_al_khaimah" | "fujairah" | "umm_al_quwain" | undefined,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: "rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.03)" }}
        onClick={() => document.getElementById("drawing-file-input")?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        <input
          id="drawing-file-input"
          type="file"
          accept=".pdf,.dwg,.jpg,.jpeg,.png,.svg"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Building2 size={40} className="mx-auto mb-3" style={{ color: "rgba(212,160,23,0.6)" }} />
        {file ? (
          <div>
            <p className="text-platinum font-semibold">{file.name}</p>
            <p className="text-steel text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-platinum font-medium mb-1">اسحب المخطط هنا أو انقر للاختيار</p>
            <p className="text-steel text-sm">PDF، صورة، أو DWG — حجم أقصى 16MB</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-steel">نوع المخطط</Label>
          <Select value={drawingType} onValueChange={setDrawingType}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              {DRAWING_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-steel">الإمارة</Label>
          <Select value={emirate} onValueChange={setEmirate}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <SelectValue placeholder="اختر الإمارة" />
            </SelectTrigger>
            <SelectContent>
              {EMIRATES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full btn-gold"
      >
        {uploading ? <><RefreshCw size={16} className="animate-spin ml-2" />جارٍ الرفع والتحليل...</> : <><Upload size={16} className="ml-2" />رفع المخطط وتحليله</>}
      </Button>
    </div>
  );
}

function ArchiveListTab() {
  const { data, isLoading, refetch } = trpc.archive.list.useQuery();

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-gold" />
    </div>
  );

  const contracts = data?.contracts ?? [];
  const drawings = data?.drawings ?? [];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "عقود مرفوعة", val: contracts.length },
          { icon: Building2, label: "مخططات مرفوعة", val: drawings.length },
          { icon: CheckCircle2, label: "مكتملة", val: contracts.filter(c => c.extractionStatus === "completed").length + drawings.filter(d => d.extractionStatus === "completed").length },
          { icon: Clock, label: "قيد المعالجة", val: contracts.filter(c => c.extractionStatus === "processing").length + drawings.filter(d => d.extractionStatus === "processing").length },
        ].map(({ icon: Icon, label, val }) => (
          <Card key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.1)" }}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon size={20} className="text-gold" />
              <div>
                <div className="text-platinum font-bold text-lg">{val}</div>
                <div className="text-steel text-xs">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contracts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-platinum font-semibold flex items-center gap-2">
            <FileText size={16} className="text-gold" /> العقود ({contracts.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-steel hover:text-gold">
            <RefreshCw size={14} className="ml-1" /> تحديث
          </Button>
        </div>
        {contracts.length === 0 ? (
          <p className="text-steel text-center py-8">لا توجد عقود مرفوعة بعد</p>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.id} className="p-4 rounded-xl flex items-start justify-between gap-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.08)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={c.extractionStatus} />
                    {c.projectType && <Badge variant="outline" className="text-xs">{PROJECT_TYPES.find(p => p.value === c.projectType)?.label ?? c.projectType}</Badge>}
                    {c.emirate && <Badge variant="outline" className="text-xs">{EMIRATES.find(e => e.value === c.emirate)?.label ?? c.emirate}</Badge>}
                  </div>
                  {c.extractionStatus === "completed" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {c.totalAreaSqm && <div className="text-xs"><span className="text-steel">المساحة: </span><span className="text-platinum font-semibold">{c.totalAreaSqm.toLocaleString()} م²</span></div>}
                      {c.contractValueAed && <div className="text-xs"><span className="text-steel">القيمة: </span><span className="text-gold font-semibold">{c.contractValueAed.toLocaleString()} د.إ</span></div>}
                      {c.costPerSqmAed && <div className="text-xs"><span className="text-steel">التكلفة/م²: </span><span className="text-platinum font-semibold">{c.costPerSqmAed.toLocaleString()} د.إ</span></div>}
                      {c.durationMonths && <div className="text-xs"><span className="text-steel">المدة: </span><span className="text-platinum">{c.durationMonths} شهر</span></div>}
                    </div>
                  )}
                  {c.extractionStatus === "processing" && (
                    <div className="flex items-center gap-2 mt-2">
                      <RefreshCw size={12} className="animate-spin text-gold" />
                      <span className="text-steel text-xs">الذكاء الاصطناعي يستخرج البيانات...</span>
                    </div>
                  )}
                </div>
                <div className="text-steel text-xs whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawings */}
      <div>
        <h3 className="text-platinum font-semibold flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-gold" /> المخططات ({drawings.length})
        </h3>
        {drawings.length === 0 ? (
          <p className="text-steel text-center py-8">لا توجد مخططات مرفوعة بعد</p>
        ) : (
          <div className="space-y-3">
            {drawings.map(d => (
              <div key={d.id} className="p-4 rounded-xl flex items-start justify-between gap-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.08)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={d.extractionStatus} />
                    {d.drawingType && <Badge variant="outline" className="text-xs">{DRAWING_TYPES.find(t => t.value === d.drawingType)?.label ?? d.drawingType}</Badge>}
                    {d.emirate && <Badge variant="outline" className="text-xs">{EMIRATES.find(e => e.value === d.emirate)?.label ?? d.emirate}</Badge>}
                  </div>
                  {d.extractionStatus === "completed" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {d.totalAreaSqm && <div className="text-xs"><span className="text-steel">المساحة الإجمالية: </span><span className="text-platinum font-semibold">{d.totalAreaSqm.toLocaleString()} م²</span></div>}
                      {d.netAreaSqm && <div className="text-xs"><span className="text-steel">الصافية: </span><span className="text-platinum">{d.netAreaSqm.toLocaleString()} م²</span></div>}
                      {d.efficiencyRatio && <div className="text-xs"><span className="text-steel">الكفاءة: </span><span className="text-gold font-semibold">{(d.efficiencyRatio * 100).toFixed(0)}%</span></div>}
                      {d.facadeOrientation && <div className="text-xs"><span className="text-steel">الواجهة: </span><span className="text-platinum">{d.facadeOrientation}</span></div>}
                    </div>
                  )}
                </div>
                <div className="text-steel text-xs whitespace-nowrap">
                  {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Archive() {
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
          <ArchiveIcon size={48} className="mx-auto mb-4 text-gold" />
          <h2 className="text-platinum text-xl font-bold mb-2">الأرشيف المؤسسي</h2>
          <p className="text-steel mb-6">يجب تسجيل الدخول للوصول إلى الأرشيف</p>
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
              <ArchiveIcon size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="text-platinum text-2xl font-bold">الأرشيف المؤسسي</h1>
              <p className="text-steel text-sm">الطبقة العاشرة — الذاكرة المؤسسية</p>
            </div>
          </div>
          <p className="text-steel max-w-2xl" style={{ lineHeight: 1.75 }}>
            ارفع عقودك ومخططاتك التاريخية — يستخرج الذكاء الاصطناعي البيانات الهندسية تلقائياً لبناء قاعدة بيانات تكاليف حقيقية مبنية على تجربتك الميدانية.
          </p>

          {/* Value props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: TrendingUp, title: "مؤشر تكاليف حقيقي", desc: "بيانات تكلفة/م² مبنية على مشاريعك الفعلية على مدى 20 سنة" },
              { icon: BarChart3, title: "تحليل اتجاهات السوق", desc: "كيف تغيرت تكاليف البناء عبر السنوات في كل إمارة" },
              { icon: Layers, title: "تغذية المنصات الذكية", desc: "بياناتك تُحسّن دقة توصيات حرارة ومسكن ورقابة" },
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
        <Tabs defaultValue="contracts" dir="rtl">
          <TabsList className="mb-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText size={14} /> رفع عقد
            </TabsTrigger>
            <TabsTrigger value="drawings" className="flex items-center gap-2">
              <Building2 size={14} /> رفع مخطط
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <ArchiveIcon size={14} /> الأرشيف
            </TabsTrigger>
          </TabsList>

          <div className="max-w-2xl">
            <TabsContent value="contracts">
              <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.12)" }}>
                <CardHeader>
                  <CardTitle className="text-platinum flex items-center gap-2">
                    <FileText size={18} className="text-gold" /> رفع عقد هندسي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UploadContractTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drawings">
              <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.12)" }}>
                <CardHeader>
                  <CardTitle className="text-platinum flex items-center gap-2">
                    <Building2 size={18} className="text-gold" /> رفع مخطط معماري
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UploadDrawingTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <ArchiveListTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
