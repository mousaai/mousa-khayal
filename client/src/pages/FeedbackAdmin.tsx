/*
 * FeedbackAdmin — لوحة إدارة الملاحظات والأخطاء
 * تتيح للمشرف مراجعة آراء المستخدمين وتقارير الأخطاء والرد عليها
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Star,
  Bug,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type ErrorStatus = "open" | "investigating" | "resolved" | "closed";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          fill={rating >= s ? "#d4a017" : "transparent"}
          stroke={rating >= s ? "#d4a017" : "#334155"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: ErrorStatus }) {
  const map: Record<ErrorStatus, { label: string; color: string; icon: React.ReactNode }> = {
    open: { label: "مفتوح", color: "#ef4444", icon: <AlertCircle size={12} /> },
    investigating: { label: "قيد التحقيق", color: "#f59e0b", icon: <Clock size={12} /> },
    resolved: { label: "محلول", color: "#22c55e", icon: <CheckCircle2 size={12} /> },
    closed: { label: "مغلق", color: "#64748b", icon: <XCircle size={12} /> },
  };
  const { label, color, icon } = map[status] ?? map.open;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {icon}
      {label}
    </span>
  );
}

function timeAgo(ts: number | string | Date) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function FeedbackStats() {
  const { data: stats, isLoading } = trpc.feedback.getStats.useQuery();

  if (isLoading) return <div className="h-24 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />;
  if (!stats) return null;

  const cards = [
    { label: "إجمالي التقييمات", value: stats.total ?? 0, icon: <MessageSquare size={18} />, color: "#3b82f6" },
    { label: "متوسط التقييم", value: stats.avgRating ? `${Number(stats.avgRating).toFixed(1)} ⭐` : "—", icon: <Star size={18} />, color: "#d4a017" },
    { label: "تقييمات ممتازة (5★)", value: stats.total ? `${Math.round((Object.values(stats.byPlatform).reduce((a, b) => a + b.total, 0) / Math.max(stats.total, 1)) * 100)}%` : "0%", icon: <TrendingUp size={18} />, color: "#22c55e" },
    { label: "المنصات المُقيَّمة", value: Object.keys(stats.byPlatform).length, icon: <AlertCircle size={18} />, color: "#ef4444" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl p-4"
          style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: c.color }}>
            {c.icon}
            <span className="text-xs" style={{ color: "#64748b" }}>{c.label}</span>
          </div>
          <div className="text-xl font-bold" style={{ color: "#e2e8f0" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly Trend Chart ─────────────────────────────────────────────────────
function WeeklyTrendChart() {
  const { data: trend, isLoading } = trpc.feedback.weeklyTrend.useQuery();

  if (isLoading) return (
    <div className="h-64 animate-pulse rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.04)" }} />
  );
  if (!trend || trend.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} style={{ color: "#d4a017" }} />
        <span className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>اتجاه التقييمات الأسبوعي</span>
        <span className="text-xs mr-auto" style={{ color: "#64748b" }}>آخر 8 أسابيع</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 5]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#0D1B2A",
              border: "1px solid rgba(212,160,23,0.2)",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              name === "avgRating" ? `${Number(value).toFixed(1)} ⭐` : value,
              name === "avgRating" ? "متوسط التقييم" : "عدد التقييمات",
            ]}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend
            formatter={(value) => value === "avgRating" ? "متوسط التقييم" : "عدد التقييمات"}
            wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
          />
          <Bar yAxisId="right" dataKey="count" fill="rgba(212,160,23,0.2)" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgRating"
            stroke="#d4a017"
            strokeWidth={2}
            dot={{ fill: "#d4a017", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ErrorStats() {
  const { data: stats, isLoading } = trpc.errors.getStats.useQuery();

  if (isLoading) return <div className="h-24 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />;
  if (!stats) return null;

  const cards = [
    { label: "إجمالي التقارير", value: stats.total ?? 0, icon: <Bug size={18} />, color: "#ef4444" },
    { label: "مفتوحة", value: stats.open ?? 0, icon: <AlertCircle size={18} />, color: "#ef4444" },
    { label: "أنواع الأخطاء", value: Object.keys(stats.byType).length, icon: <Clock size={18} />, color: "#f59e0b" },
    { label: "محلولة", value: stats.resolved ?? 0, icon: <CheckCircle2 size={18} />, color: "#22c55e" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl p-4"
          style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: c.color }}>
            {c.icon}
            <span className="text-xs" style={{ color: "#64748b" }}>{c.label}</span>
          </div>
          <div className="text-xl font-bold" style={{ color: "#e2e8f0" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Feedback List ────────────────────────────────────────────────────────────
function FeedbackList() {
  const [platform, setPlatform] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [exporting, setExporting] = useState(false);

  const utils = trpc.useUtils();

  const handleExportFeedback = async () => {
    setExporting(true);
    try {
      const result = await utils.feedback.exportCsv.fetch({ platform: platform || undefined });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.count} سجل`);
    } catch (e) {
      toast.error("فشل التصدير");
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading, refetch } = trpc.feedback.getList.useQuery({
    platform: platform || undefined,
    limit: 50,
    offset: 0,
  });

  const replyMutation = trpc.feedback.reply.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الرد");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const PLATFORMS = [
    { value: "", label: "كل المنصات" },
    { value: "general", label: "عام" },
    { value: "fada", label: "فضاء" },
    { value: "raqaba", label: "رقابة" },
    { value: "harara", label: "حرارة" },
    { value: "maskan", label: "مسكن" },
    { value: "code", label: "كود" },
    { value: "khayal", label: "خيال" },
  ];

  const FEEDBACK_TYPE_LABELS: Record<string, string> = {
    session: "جلسة",
    general: "عام",
    feature: "ميزة",
    bug: "خطأ",
  };

  return (
    <div>
      <FeedbackStats />
      <WeeklyTrendChart />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={16} style={{ color: "#64748b" }} />
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-40 h-8 text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw size={14} style={{ color: "#64748b" }} />
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportFeedback}
          disabled={exporting}
          className="mr-auto gap-1.5 text-xs h-8"
          style={{ borderColor: "rgba(212,160,23,0.3)", color: "#d4a017" }}
        >
          <Download size={13} />
          {exporting ? "جاري التصدير..." : "تصدير CSV"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-12" style={{ color: "#475569" }}>
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p>لا توجد تقييمات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StarRating rating={item.rating} />
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}
                      >
                        {FEEDBACK_TYPE_LABELS[item.feedbackType] ?? item.feedbackType}
                      </span>
                      <span className="text-xs" style={{ color: "#475569" }}>
                        {item.platform}
                      </span>
                      {item.adminReply && (
                        <span className="text-xs" style={{ color: "#22c55e" }}>✓ تم الرد</span>
                      )}
                    </div>
                    {item.comment && (
                      <p className="text-sm truncate" style={{ color: "#94a3b8" }}>{item.comment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: "#475569" }}>
                      {timeAgo(item.createdAt)}
                    </span>
                    {expandedId === item.id ? <ChevronUp size={14} style={{ color: "#64748b" }} /> : <ChevronDown size={14} style={{ color: "#64748b" }} />}
                  </div>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {item.comment && (
                    <div className="mt-3 mb-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-sm" style={{ color: "#cbd5e1" }}>{item.comment}</p>
                    </div>
                  )}
                  {item.adminReply && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <p className="text-xs mb-1" style={{ color: "#22c55e" }}>ردك:</p>
                      <p className="text-sm" style={{ color: "#94a3b8" }}>{item.adminReply}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText[item.id] ?? ""}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="اكتب رداً على هذا التقييم..."
                      rows={2}
                      className="text-sm resize-none flex-1"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)", color: "#e2e8f0" }}
                    />
                    <Button
                      onClick={() => {
                        const text = replyText[item.id]?.trim();
                        if (!text) return;
                        replyMutation.mutate({ id: item.id, adminReply: text });
                        setReplyText((prev) => ({ ...prev, [item.id]: "" }));
                      }}
                      disabled={!replyText[item.id]?.trim() || replyMutation.isPending}
                      size="sm"
                      style={{ background: "#d4a017", color: "#080e1a" }}
                    >
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Error Reports List ───────────────────────────────────────────────────────
function ErrorReportsList() {
  const [statusFilter, setStatusFilter] = useState<ErrorStatus | "">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState<Record<number, string>>({});
  const [exporting, setExporting] = useState(false);

  const utils = trpc.useUtils();

  const handleExportErrors = async () => {
    setExporting(true);
    try {
      const result = await utils.errors.exportCsv.fetch({ status: statusFilter || undefined });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `errors-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.count} سجل`);
    } catch (e) {
      toast.error("فشل التصدير");
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading, refetch } = trpc.errors.getList.useQuery({
    status: statusFilter || undefined,
    limit: 50,
    offset: 0,
  });

  const updateStatusMutation = trpc.errors.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const ERROR_TYPE_LABELS: Record<string, string> = {
    ui: "واجهة",
    api: "API",
    voice: "صوت",
    payment: "دفع",
    performance: "أداء",
    other: "أخرى",
  };

  const STATUS_OPTIONS: { value: ErrorStatus; label: string }[] = [
    { value: "open", label: "مفتوح" },
    { value: "investigating", label: "قيد التحقيق" },
    { value: "resolved", label: "محلول" },
    { value: "closed", label: "مغلق" },
  ];

  return (
    <div>
      <ErrorStats />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={16} style={{ color: "#64748b" }} />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ErrorStatus | "")}>
          <SelectTrigger className="w-44 h-8 text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)" }}>
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل الحالات</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw size={14} style={{ color: "#64748b" }} />
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportErrors}
          disabled={exporting}
          className="mr-auto gap-1.5 text-xs h-8"
          style={{ borderColor: "rgba(212,160,23,0.3)", color: "#d4a017" }}
        >
          <Download size={13} />
          {exporting ? "جاري التصدير..." : "تصدير CSV"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-12" style={{ color: "#475569" }}>
          <Bug size={32} className="mx-auto mb-3 opacity-30" />
          <p>لا توجد تقارير أخطاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge status={item.status as ErrorStatus} />
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                      >
                        {ERROR_TYPE_LABELS[item.errorType] ?? item.errorType}
                      </span>
                      <span className="text-xs" style={{ color: "#475569" }}>{item.platform}</span>
                    </div>
                    {item.userDescription && (
                      <p className="text-sm truncate" style={{ color: "#94a3b8" }}>{item.userDescription}</p>
                    )}
                    {item.errorMessage && (
                      <p className="text-xs truncate font-mono mt-0.5" style={{ color: "#ef4444" }}>{item.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: "#475569" }}>{timeAgo(item.createdAt)}</span>
                    {expandedId === item.id ? <ChevronUp size={14} style={{ color: "#64748b" }} /> : <ChevronDown size={14} style={{ color: "#64748b" }} />}
                  </div>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {item.userDescription && (
                    <div className="mt-3 mb-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs mb-1" style={{ color: "#64748b" }}>وصف المستخدم:</p>
                      <p className="text-sm" style={{ color: "#cbd5e1" }}>{item.userDescription}</p>
                    </div>
                  )}
                  {item.errorMessage && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                      <p className="text-xs mb-1 font-mono" style={{ color: "#ef4444" }}>رسالة الخطأ:</p>
                      <p className="text-xs font-mono" style={{ color: "#94a3b8" }}>{item.errorMessage}</p>
                    </div>
                  )}
                  {item.pageUrl && (
                    <p className="text-xs mb-3" style={{ color: "#475569" }}>الصفحة: <span style={{ color: "#64748b" }}>{item.pageUrl}</span></p>
                  )}
                  {item.adminNote && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.15)" }}>
                      <p className="text-xs mb-1" style={{ color: "#d4a017" }}>ملاحظة المشرف:</p>
                      <p className="text-sm" style={{ color: "#94a3b8" }}>{item.adminNote}</p>
                    </div>
                  )}

                  {/* Status update */}
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => updateStatusMutation.mutate({
                          id: item.id,
                          status: s.value,
                          adminNote: noteText[item.id]?.trim() || undefined,
                        })}
                        disabled={item.status === s.value || updateStatusMutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          background: item.status === s.value ? "rgba(212,160,23,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${item.status === s.value ? "rgba(212,160,23,0.3)" : "rgba(255,255,255,0.08)"}`,
                          color: item.status === s.value ? "#d4a017" : "#64748b",
                          opacity: item.status === s.value ? 1 : 0.8,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      value={noteText[item.id] ?? ""}
                      onChange={(e) => setNoteText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="ملاحظة اختيارية عند تغيير الحالة..."
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,160,23,0.12)",
                        color: "#e2e8f0",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeedbackAdmin() {
  return (
    <div dir="rtl" className="min-h-screen p-6" style={{ background: "#080E1A" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#e2e8f0" }}>
            مركز الملاحظات والأخطاء
          </h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            راجع آراء المستخدمين وتقارير الأخطاء وتفاعل معها
          </p>
        </div>

        <Tabs defaultValue="feedback">
          <TabsList
            className="mb-6"
            style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.1)" }}
          >
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare size={14} />
              آراء المستخدمين
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <Bug size={14} />
              تقارير الأخطاء
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback">
            <FeedbackList />
          </TabsContent>

          <TabsContent value="errors">
            <ErrorReportsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
