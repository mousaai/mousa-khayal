/**
 * KnowledgeBar — مؤشر المكتبة الحية
 * يعرض: عدد السيناريوهات + نسبة الاستقلالية + مصادر المعرفة
 */

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Brain, Database, Globe, Cpu, TrendingUp, RefreshCw } from "lucide-react";

export default function KnowledgeBar() {
  const [expanded, setExpanded] = useState(false);

  const { data: stats, isLoading, refetch } = trpc.video.getLibraryStats.useQuery(undefined, {
    refetchInterval: 30_000, // تحديث كل 30 ثانية
  });

  const triggerHarvest = trpc.video.triggerHarvest.useMutation({
    onSuccess: () => {
      setTimeout(() => refetch(), 5000);
    },
  });

  const seedLibrary = trpc.video.seedLibrary.useMutation({
    onSuccess: () => {
      setTimeout(() => refetch(), 3000);
    },
  });

  if (isLoading) return null;

  const total = stats?.totalScripts ?? 0;
  const independence = stats?.independenceRate ?? 0;
  const bySource = stats?.bySource ?? {};
  const recentAdditions = stats?.recentAdditions ?? 0;

  // ألوان نسبة الاستقلالية
  const independenceColor =
    independence >= 80 ? "text-emerald-400" :
    independence >= 50 ? "text-yellow-400" :
    independence >= 20 ? "text-orange-400" : "text-red-400";

  const independenceBarColor =
    independence >= 80 ? "bg-emerald-500" :
    independence >= 50 ? "bg-yellow-500" :
    independence >= 20 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {/* الزر الرئيسي */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 bg-[#0d1117]/90 border border-blue-500/30 rounded-full px-3 py-1.5 text-xs text-blue-300 hover:border-blue-400/60 transition-all backdrop-blur-sm"
      >
        <Brain size={12} className="text-blue-400" />
        <span className="font-mono">{total.toLocaleString()}</span>
        <span className="text-blue-500/60">سيناريو</span>
        <span className={`font-bold ${independenceColor}`}>{independence}%</span>
        <span className="text-blue-500/40">مستقل</span>
      </button>

      {/* اللوحة الموسّعة */}
      {expanded && (
        <div className="absolute bottom-10 left-0 w-72 bg-[#0d1117]/95 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm shadow-2xl">
          {/* العنوان */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-blue-400" />
              <span className="text-white text-sm font-semibold">مكتبة المعرفة</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-blue-500/40 hover:text-blue-300 text-xs"
            >
              ✕
            </button>
          </div>

          {/* نسبة الاستقلالية */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400/70">نسبة الاستقلالية</span>
              <span className={`font-bold font-mono ${independenceColor}`}>{independence}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${independenceBarColor}`}
                style={{ width: `${independence}%` }}
              />
            </div>
          </div>

          {/* إجمالي السيناريوهات */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-white font-bold font-mono text-lg">{total.toLocaleString()}</div>
              <div className="text-blue-400/60 text-xs">إجمالي السيناريوهات</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-emerald-400 font-bold font-mono text-lg">+{recentAdditions}</div>
              <div className="text-blue-400/60 text-xs">هذا الأسبوع</div>
            </div>
          </div>

          {/* مصادر المعرفة */}
          <div className="mb-3">
            <div className="text-blue-400/70 text-xs mb-2">مصادر المعرفة</div>
            <div className="space-y-1.5">
              {Object.entries(bySource).map(([source, count]) => {
                const sourceInfo = getSourceInfo(source);
                const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-2">
                    <sourceInfo.Icon size={10} className={sourceInfo.color} />
                    <span className="text-blue-300/70 text-xs w-20">{sourceInfo.label}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sourceInfo.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-blue-400/60 text-xs font-mono w-8 text-right">{Number(count).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2">
            <button
              onClick={() => seedLibrary.mutate()}
              disabled={seedLibrary.isPending}
              className="flex-1 flex items-center justify-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg py-1.5 text-xs text-blue-300 transition-all disabled:opacity-50"
            >
              <Database size={10} />
              {seedLibrary.isPending ? "جاري البذر..." : "بذر المكتبة"}
            </button>
            <button
              onClick={() => triggerHarvest.mutate()}
              disabled={triggerHarvest.isPending}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg py-1.5 text-xs text-emerald-300 transition-all disabled:opacity-50"
            >
              <Globe size={10} />
              {triggerHarvest.isPending ? "جاري الحصاد..." : "حصاد الويب"}
            </button>
          </div>

          {/* رسالة الحالة */}
          {(triggerHarvest.isSuccess || seedLibrary.isSuccess) && (
            <div className="mt-2 text-center text-xs text-emerald-400/80">
              ✓ تم التشغيل في الخلفية — ستتحدث الأرقام قريباً
            </div>
          )}

          {/* مؤشر النمو */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-blue-400/50">
              <TrendingUp size={10} />
              <span>الهدف: 10,000 سيناريو أسبوعياً → استقلالية 100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSourceInfo(source: string) {
  const map: Record<string, { label: string; color: string; barColor: string; Icon: any }> = {
    generated: { label: "محلي", color: "text-blue-400", barColor: "bg-blue-500", Icon: Cpu },
    llm: { label: "ذكاء اصطناعي", color: "text-purple-400", barColor: "bg-purple-500", Icon: Brain },
    wikipedia: { label: "ويكيبيديا", color: "text-green-400", barColor: "bg-green-500", Icon: Globe },
    tmdb: { label: "أفلام", color: "text-yellow-400", barColor: "bg-yellow-500", Icon: Database },
    seed: { label: "أساسي", color: "text-orange-400", barColor: "bg-orange-500", Icon: Database },
    user: { label: "مستخدمين", color: "text-pink-400", barColor: "bg-pink-500", Icon: TrendingUp },
  };
  return map[source] ?? { label: source, color: "text-gray-400", barColor: "bg-gray-500", Icon: Database };
}
