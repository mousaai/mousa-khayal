/**
 * GitHubManager.tsx — إدارة GitHub Actions للمنصات الفرعية
 * يتيح للمدير تشغيل GitHub Actions يدوياً ومراقبة حالة الـ repos
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Github, Play, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  fada: "فضاء", raqaba: "رقابة", harara: "حرارة",
  maskan: "مسكن", code: "كود", khayal: "خيال",
};

const PLATFORM_COLORS: Record<string, string> = {
  fada: "#d4a017", raqaba: "#3b82f6", harara: "#f97316",
  maskan: "#22c55e", code: "#a855f7", khayal: "#ec4899",
};

type Platform = "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal";
type Action = "restart" | "deploy" | "rollback";

const PLATFORMS: Platform[] = ["fada", "raqaba", "harara", "maskan", "code", "khayal"];

function RunStatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === "in_progress" || status === "queued") {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
        <Loader2 size={10} className="animate-spin" />
        {status === "queued" ? "في الانتظار" : "جاري التشغيل"}
      </span>
    );
  }
  if (status === "completed") {
    if (conclusion === "success") {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
          <CheckCircle2 size={10} />
          نجح
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
        <XCircle size={10} />
        {conclusion ?? "فشل"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
      <Clock size={10} />
      {status}
    </span>
  );
}

function PlatformCard({ platform }: { platform: Platform }) {
  const [selectedAction, setSelectedAction] = useState<Action>("restart");
  const [reason, setReason] = useState("");
  const [showRuns, setShowRuns] = useState(false);

  const { data: reposData } = trpc.monitoring.getGitHubRepos.useQuery();
  const { data: runsData, refetch: refetchRuns, isLoading: runsLoading } = trpc.monitoring.getGitHubRuns.useQuery(
    { platform },
    { enabled: showRuns }
  );

  const dispatchMutation = trpc.monitoring.dispatchGitHubAction.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (showRuns) refetchRuns();
    },
    onError: (e) => toast.error(e.message),
  });

  const repoInfo = reposData?.repos?.find(r => r.repo === `mousa-${platform}`);
  const color = PLATFORM_COLORS[platform];

  const handleDispatch = () => {
    dispatchMutation.mutate({ platform, action: selectedAction, reason: reason || undefined });
    setReason("");
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(13,27,42,0.6)", border: `1px solid ${color}22` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
            <Github size={16} style={{ color }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "#e8dcc8" }}>
              {PLATFORM_LABELS[platform]}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              mousaai/mousa-{platform}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {repoInfo?.exists ? (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
              <CheckCircle2 size={10} />
              موجود
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
              <AlertCircle size={10} />
              غير موجود
            </span>
          )}
          {repoInfo?.url && (
            <a href={repoInfo.url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Last push */}
      {repoInfo?.lastPush && (
        <div className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          آخر push: {new Date(repoInfo.lastPush).toLocaleString("ar-AE")}
        </div>
      )}

      {/* Action selector */}
      <div className="flex gap-2 mb-3">
        {(["restart", "deploy", "rollback"] as Action[]).map(a => (
          <button key={a} onClick={() => setSelectedAction(a)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: selectedAction === a ? `${color}20` : "rgba(255,255,255,0.04)",
              color: selectedAction === a ? color : "rgba(255,255,255,0.45)",
              border: `1px solid ${selectedAction === a ? color + "40" : "rgba(255,255,255,0.06)"}`,
            }}>
            {a === "restart" ? "إعادة تشغيل" : a === "deploy" ? "نشر" : "تراجع"}
          </button>
        ))}
      </div>

      {/* Reason input */}
      <input
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="سبب التشغيل (اختياري)"
        className="w-full px-3 py-2 rounded-lg text-xs mb-3 outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#e8dcc8",
        }}
      />

      {/* Dispatch button */}
      <button
        onClick={handleDispatch}
        disabled={dispatchMutation.isPending}
        className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        style={{
          background: dispatchMutation.isPending ? "rgba(255,255,255,0.05)" : `${color}18`,
          color: dispatchMutation.isPending ? "rgba(255,255,255,0.3)" : color,
          border: `1px solid ${color}30`,
        }}>
        {dispatchMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {dispatchMutation.isPending ? "جاري التشغيل..." : "تشغيل"}
      </button>

      {/* Runs toggle */}
      <button
        onClick={() => { setShowRuns(!showRuns); if (!showRuns) refetchRuns(); }}
        className="w-full mt-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
        style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)" }}>
        <RefreshCw size={10} />
        {showRuns ? "إخفاء السجل" : "عرض آخر التشغيلات"}
      </button>

      {/* Runs list */}
      {showRuns && (
        <div className="mt-3 space-y-1.5">
          {runsLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          ) : runsData?.runs?.length === 0 ? (
            <div className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              لا توجد تشغيلات بعد
            </div>
          ) : (
            runsData?.runs?.map(run => (
              <div key={run.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2">
                  <RunStatusBadge status={run.status} conclusion={run.conclusion} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {new Date(run.createdAt).toLocaleString("ar-AE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <a href={run.url} target="_blank" rel="noopener noreferrer"
                  className="p-1 rounded" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <ExternalLink size={10} />
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function GitHubManager() {
  const { data: reposData, isLoading, refetch } = trpc.monitoring.getGitHubRepos.useQuery();

  return (
    <div className="p-6" style={{ background: "#080E1A", minHeight: "600px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)" }}>
            <Github size={20} style={{ color: "#d4a017" }} />
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "#e8dcc8" }}>إدارة GitHub</h2>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {reposData?.configured ? `✅ متصل بـ github.com/${reposData.owner}` : "⚠️ GitHub غير مُهيَّأ"}
            </p>
          </div>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Not configured warning */}
      {!isLoading && !reposData?.configured && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="font-semibold text-sm mb-1" style={{ color: "#f87171" }}>GitHub غير مُهيَّأ</div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                يجب إضافة <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)" }}>GITHUB_TOKEN_MOUSA</code> و <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)" }}>GITHUB_OWNER</code> كـ environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {reposData?.configured && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.12)" }}>
            <div className="text-xl font-bold" style={{ color: "#d4a017" }}>{reposData.repos.filter(r => r.exists).length}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>repos موجودة</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <div className="text-xl font-bold" style={{ color: "#4ade80" }}>6</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>منصات فرعية</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <div className="text-xl font-bold" style={{ color: "#60a5fa" }}>✓</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Workflow مُعدَّة</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: "#d4a017" }} />
        </div>
      )}

      {/* Platform cards grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map(platform => (
            <PlatformCard key={platform} platform={platform} />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>كيف يعمل نظام GitHub Actions؟</h3>
        <div className="space-y-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <p>• <strong style={{ color: "rgba(255,255,255,0.6)" }}>إعادة تشغيل:</strong> يُشغّل workflow يُرسل إشعاراً لـ Manus لإعادة تشغيل المنصة</p>
          <p>• <strong style={{ color: "rgba(255,255,255,0.6)" }}>نشر:</strong> يُشغّل workflow لنشر آخر تحديث من الـ main branch</p>
          <p>• <strong style={{ color: "rgba(255,255,255,0.6)" }}>تراجع:</strong> يُشغّل workflow للرجوع للإصدار السابق</p>
          <p>• <strong style={{ color: "rgba(255,255,255,0.6)" }}>تلقائي:</strong> نظام المراقبة يُشغّل هذه الـ workflows تلقائياً عند اكتشاف مشكلة</p>
        </div>
      </div>
    </div>
  );
}
