/**
 * PlatformAnalytics — لوحة تحليلات التكاليف والاستهلاك الشاملة
 * تغطي: استهلاك الكريدت، جلسات AI، تكاليف الاستضافة، LLM، TTS، Stripe
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Cpu, Users, BarChart3,
  Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "fada", name: "فضاء", color: "#D4A017", emoji: "🏠" },
  { id: "raqaba", name: "رقابة", color: "#3B82F6", emoji: "🔍" },
  { id: "harara", name: "حرارة", color: "#F97316", emoji: "🌡️" },
  { id: "maskan", name: "مسكن", color: "#22C55E", emoji: "🏘️" },
  { id: "code", name: "كود", color: "#A855F7", emoji: "📖" },
  { id: "khayal", name: "خيال", color: "#EC4899", emoji: "✨" },
  { id: "mousa_main", name: "mousa.ai (رئيسي)", color: "#64748B", emoji: "🌐" },
  { id: "shared", name: "مشترك", color: "#94A3B8", emoji: "🔗" },
];

const CATEGORIES = [
  { id: "manus_hosting", name: "استضافة mousa.ai", icon: "☁️" },
  { id: "sub_platform_hosting", name: "استضافة المنصات الفرعية", icon: "🖥️" },
  { id: "llm_api", name: "API الذكاء الاصطناعي (LLM)", icon: "🤖" },
  { id: "tts_api", name: "API الصوت (ElevenLabs TTS)", icon: "🎙️" },
  { id: "stt_api", name: "API تحويل الصوت لنص (STT)", icon: "👂" },
  { id: "storage", name: "التخزين (S3/R2)", icon: "💾" },
  { id: "database", name: "قاعدة البيانات", icon: "🗄️" },
  { id: "stripe_fees", name: "رسوم Stripe", icon: "💳" },
  { id: "domain", name: "النطاق (Domain)", icon: "🌍" },
  { id: "email_service", name: "خدمة الإيميل (Resend)", icon: "📧" },
  { id: "other", name: "أخرى", icon: "📌" },
];

const CATEGORY_COLORS: Record<string, string> = {
  manus_hosting: "#6366F1",
  sub_platform_hosting: "#8B5CF6",
  llm_api: "#D4A017",
  tts_api: "#F97316",
  stt_api: "#EF4444",
  storage: "#3B82F6",
  database: "#22C55E",
  stripe_fees: "#EC4899",
  domain: "#14B8A6",
  email_service: "#F59E0B",
  other: "#94A3B8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSAR(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getPlatformLabel(id: string) {
  return PLATFORMS.find(p => p.id === id)?.name ?? id;
}
function getCategoryLabel(id: string) {
  const c = CATEGORIES.find(c => c.id === id);
  return c ? `${c.icon} ${c.name}` : id;
}
function getPlatformColor(id: string) {
  return PLATFORMS.find(p => p.id === id)?.color ?? "#94A3B8";
}
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlatformAnalytics() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [month, setMonth] = useState(getCurrentMonth());
  const [addOpen, setAddOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    platform: "mousa_main" as string,
    category: "manus_hosting" as string,
    amountSAR: "",
    description: "",
    periodStart: `${month}-01`,
    periodEnd: `${month}-${new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0).getDate()}`,
    invoiceRef: "",
  });

  // tRPC queries
  const statsQ = trpc.analytics.getPlatformStats.useQuery({ month }, { enabled: !!user });
  const costQ = trpc.analytics.getCostSummary.useQuery({ month }, { enabled: !!user });
  const logsQ = trpc.analytics.getCostLogs.useQuery({ limit: 200 }, { enabled: !!user });

  const utils = trpc.useUtils();
  const addMut = trpc.analytics.addCostLog.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التكلفة");
      utils.analytics.getCostSummary.invalidate();
      utils.analytics.getCostLogs.invalidate();
      setAddOpen(false);
      setForm(f => ({ ...f, amountSAR: "", description: "", invoiceRef: "" }));
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.analytics.deleteCostLog.useMutation({
    onSuccess: () => {
      toast.success("تم حذف السجل");
      utils.analytics.getCostSummary.invalidate();
      utils.analytics.getCostLogs.invalidate();
    },
  });

  // Redirect non-admins
  if (!loading && user?.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const consumption = statsQ.data?.consumption ?? [];
  const revenue = statsQ.data?.revenue ?? { totalRevenueCents: 0, totalTransactions: 0 };
  const costs = costQ.data?.costs ?? [];

  const totalCostCents = costs.reduce((s, c) => s + c.totalCents, 0);
  const profitCents = revenue.totalRevenueCents - totalCostCents;
  const profitMargin = revenue.totalRevenueCents > 0
    ? ((profitCents / revenue.totalRevenueCents) * 100).toFixed(1)
    : "0.0";

  // Per-platform cost bar chart data
  const platformCostData = useMemo(() => {
    const map: Record<string, number> = {};
    costs.forEach(c => {
      map[c.platform] = (map[c.platform] ?? 0) + c.totalCents;
    });
    return PLATFORMS
      .filter(p => map[p.id] !== undefined)
      .map(p => ({ name: p.name, cost: map[p.id] / 100, color: p.color }));
  }, [costs]);

  // Per-category pie chart data
  const categoryPieData = useMemo(() => {
    const map: Record<string, number> = {};
    costs.forEach(c => {
      map[c.category] = (map[c.category] ?? 0) + c.totalCents;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, cents]) => ({
        name: getCategoryLabel(cat),
        value: cents / 100,
        color: CATEGORY_COLORS[cat] ?? "#94A3B8",
      }));
  }, [costs]);

  // Consumption bar chart
  const consumptionData = consumption.map(c => ({
    name: getPlatformLabel(c.platform),
    جلسات: c.totalSessions,
    كريدت: c.totalCreditsUsed,
    color: getPlatformColor(c.platform),
  }));

  // Logs for current month
  const currentLogs = (logsQ.data ?? []).filter(l =>
    l.periodStart.startsWith(month)
  );

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "#080E1A", color: "#E2E8F0" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(212,160,23,0.15)", background: "rgba(13,27,42,0.8)" }}>
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#D4A017" }}>
              📊 تحليلات التكاليف والاستهلاك
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              تتبع شامل لجميع تكاليف المنظومة ومصادر الإيراد
            </p>
          </div>
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMonth(m => addMonths(m, -1))}>
              <ChevronRight size={16} />
            </Button>
            <span className="font-mono text-sm px-3 py-1 rounded" style={{ background: "rgba(212,160,23,0.1)", color: "#D4A017" }}>
              {month}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMonth(m => addMonths(m, 1))} disabled={month >= getCurrentMonth()}>
              <ChevronLeft size={16} />
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: "#D4A017", color: "#080E1A" }}>
                  <Plus size={14} className="ml-1" /> إضافة تكلفة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-md" style={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}>
                <DialogHeader>
                  <DialogTitle style={{ color: "#D4A017" }}>إضافة سجل تكلفة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>المنصة</Label>
                      <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                        <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)" }}>
                          {PLATFORMS.map(p => (
                            <SelectItem key={p.id} value={p.id} style={{ color: "#E2E8F0" }}>{p.emoji} {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>الفئة</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)" }}>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.id} value={c.id} style={{ color: "#E2E8F0" }}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>المبلغ (USD $)</Label>
                    <Input
                      type="number" step="0.01" min="0.01"
                      placeholder="مثال: 150.00"
                      value={form.amountSAR}
                      onChange={e => setForm(f => ({ ...f, amountSAR: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>الوصف (اختياري)</Label>
                    <Input
                      placeholder="مثال: فاتورة استضافة - مارس 2026"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>من تاريخ</Label>
                      <Input
                        type="date" value={form.periodStart}
                        onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>إلى تاريخ</Label>
                      <Input
                        type="date" value={form.periodEnd}
                        onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>رقم الفاتورة (اختياري)</Label>
                    <Input
                      placeholder="INV-2026-001"
                      value={form.invoiceRef}
                      onChange={e => setForm(f => ({ ...f, invoiceRef: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                    />
                  </div>
                  <Button
                    className="w-full"
                    style={{ background: "#D4A017", color: "#080E1A" }}
                    disabled={!form.amountSAR || addMut.isPending}
                    onClick={() => {
                      const cents = Math.round(parseFloat(form.amountSAR) * 100);
                      if (!cents || cents < 1) return toast.error("أدخل مبلغاً صحيحاً");
                      addMut.mutate({
                        platform: form.platform as any,
                        category: form.category as any,
                        amountCents: cents,
                        description: form.description || undefined,
                        periodStart: form.periodStart,
                        periodEnd: form.periodEnd,
                        invoiceRef: form.invoiceRef || undefined,
                      });
                    }}
                  >
                    {addMut.isPending ? "جاري الحفظ..." : "حفظ التكلفة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<DollarSign size={20} />}
            label="الإيراد الإجمالي"
            value={formatSAR(revenue.totalRevenueCents)}
            sub={`${revenue.totalTransactions} معاملة`}
            color="#22C55E"
          />
          <KpiCard
            icon={<TrendingDown size={20} />}
            label="إجمالي التكاليف"
            value={formatSAR(totalCostCents)}
            sub={`${costs.length} فئة`}
            color="#EF4444"
          />
          <KpiCard
            icon={profitCents >= 0 ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
            label="صافي الربح"
            value={formatSAR(Math.abs(profitCents))}
            sub={`هامش ${profitMargin}%`}
            color={profitCents >= 0 ? "#D4A017" : "#EF4444"}
            negative={profitCents < 0}
          />
          <KpiCard
            icon={<Users size={20} />}
            label="إجمالي الجلسات"
            value={consumption.reduce((s, c) => s + c.totalSessions, 0).toLocaleString("ar")}
            sub={`${consumption.reduce((s, c) => s + c.totalCreditsUsed, 0).toLocaleString("ar")} كريدت`}
            color="#3B82F6"
          />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Cost Bar Chart */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#D4A017" }}>
              <BarChart3 size={18} /> التكاليف حسب المنصة (USD)
            </h3>
            {platformCostData.length === 0 ? (
              <EmptyState text="لا توجد تكاليف مسجلة لهذا الشهر" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={platformCostData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                    formatter={(v: number) => [`${v.toFixed(2)} USD`, "التكلفة"]}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {platformCostData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Pie Chart */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#D4A017" }}>
              <Cpu size={18} /> توزيع التكاليف حسب الفئة
            </h3>
            {categoryPieData.length === 0 ? (
              <EmptyState text="لا توجد تكاليف مسجلة لهذا الشهر" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                    formatter={(v: number) => [`${v.toFixed(2)} USD`]}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: "#94A3B8", fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Consumption Chart ── */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#D4A017" }}>
            <Users size={18} /> استهلاك الكريدت والجلسات حسب المنصة
          </h3>
          {consumptionData.length === 0 ? (
            <EmptyState text="لا توجد جلسات مسجلة لهذا الشهر" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={consumptionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.1)" />
                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0D1B2A", border: "1px solid rgba(212,160,23,0.2)", color: "#E2E8F0" }}
                />
                <Legend formatter={(v) => <span style={{ color: "#94A3B8", fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="جلسات" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="كريدت" fill="#D4A017" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Cost Breakdown Table ── */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#D4A017" }}>
            <DollarSign size={18} /> تفصيل التكاليف حسب المنصة والفئة
          </h3>
          {costs.length === 0 ? (
            <EmptyState text="لا توجد تكاليف مسجلة — أضف أول تكلفة بالزر أعلاه" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(212,160,23,0.1)" }}>
                    <TableHead style={{ color: "#94A3B8" }}>المنصة</TableHead>
                    <TableHead style={{ color: "#94A3B8" }}>الفئة</TableHead>
                    <TableHead style={{ color: "#94A3B8" }} className="text-left">المبلغ (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.sort((a, b) => b.totalCents - a.totalCents).map((c, i) => (
                    <TableRow key={i} style={{ borderColor: "rgba(212,160,23,0.05)" }}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: getPlatformColor(c.platform) }} />
                          {getPlatformLabel(c.platform)}
                        </span>
                      </TableCell>
                      <TableCell style={{ color: "#94A3B8" }}>{getCategoryLabel(c.category)}</TableCell>
                      <TableCell className="text-left font-mono" style={{ color: "#EF4444" }}>
                        {(c.totalCents / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow style={{ borderColor: "rgba(212,160,23,0.15)", background: "rgba(212,160,23,0.05)" }}>
                    <TableCell colSpan={2} className="font-bold" style={{ color: "#D4A017" }}>الإجمالي</TableCell>
                    <TableCell className="text-left font-bold font-mono" style={{ color: "#EF4444" }}>
                      {(totalCostCents / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* ── Raw Logs Table ── */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#D4A017" }}>
            📋 سجلات التكاليف التفصيلية — {month}
          </h3>
          {currentLogs.length === 0 ? (
            <EmptyState text="لا توجد سجلات لهذا الشهر" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "rgba(212,160,23,0.1)" }}>
                    <TableHead style={{ color: "#94A3B8" }}>المنصة</TableHead>
                    <TableHead style={{ color: "#94A3B8" }}>الفئة</TableHead>
                    <TableHead style={{ color: "#94A3B8" }}>الوصف</TableHead>
                    <TableHead style={{ color: "#94A3B8" }}>الفترة</TableHead>
                    <TableHead style={{ color: "#94A3B8" }} className="text-left">المبلغ</TableHead>
                    <TableHead style={{ color: "#94A3B8" }}>رقم الفاتورة</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLogs.map((log) => (
                    <TableRow key={log.id} style={{ borderColor: "rgba(212,160,23,0.05)" }}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: getPlatformColor(log.platform) }} />
                          {getPlatformLabel(log.platform)}
                        </span>
                      </TableCell>
                      <TableCell style={{ color: "#94A3B8", fontSize: "0.8rem" }}>{getCategoryLabel(log.category)}</TableCell>
                      <TableCell style={{ color: "#CBD5E1", fontSize: "0.85rem" }}>{log.description ?? "—"}</TableCell>
                      <TableCell style={{ color: "#64748B", fontSize: "0.78rem", fontFamily: "monospace" }}>
                        {log.periodStart} → {log.periodEnd}
                      </TableCell>
                      <TableCell className="text-left font-mono font-bold" style={{ color: "#EF4444" }}>
                        {(log.amountCents / 100).toFixed(2)} USD
                      </TableCell>
                      <TableCell style={{ color: "#64748B", fontSize: "0.78rem" }}>{log.invoiceRef ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-500 hover:text-red-400 h-7 w-7"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذا السجل؟")) deleteMut.mutate({ id: log.id });
                          }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* ── P&L Summary Card ── */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2" style={{ color: "#D4A017" }}>
            📈 ملخص الأرباح والخسائر — {month}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PLRow label="إجمالي الإيراد" value={formatSAR(revenue.totalRevenueCents)} color="#22C55E" />
            <PLRow label="إجمالي التكاليف" value={`(${formatSAR(totalCostCents)})`} color="#EF4444" />
            <PLRow
              label="صافي الربح / الخسارة"
              value={`${profitCents >= 0 ? "+" : ""}${formatSAR(profitCents)}`}
              color={profitCents >= 0 ? "#D4A017" : "#EF4444"}
              large
            />
          </div>
          {totalCostCents === 0 && (
            <p className="text-center mt-4 text-sm" style={{ color: "#64748B" }}>
              ⚠️ لم تُسجَّل أي تكاليف لهذا الشهر بعد — أضف التكاليف للحصول على تحليل دقيق
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, negative }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string; negative?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs" style={{ color: "#64748B" }}>{label}</span>
      </div>
      <div className="text-lg font-bold font-mono" style={{ color: negative ? "#EF4444" : color }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "#475569" }}>{sub}</div>
    </div>
  );
}

function PLRow({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <div className="text-center p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,160,23,0.08)" }}>
      <div className="text-sm mb-2" style={{ color: "#64748B" }}>{label}</div>
      <div className={`font-bold font-mono ${large ? "text-2xl" : "text-lg"}`} style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12" style={{ color: "#475569" }}>
      <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
