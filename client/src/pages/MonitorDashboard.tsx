/**
 * MonitorDashboard.tsx — لوحة مراقبة النظام الهجين لمنصة خيال
 * تعرض: إحصاءات الأداء، سجل الفشل، التحسينات الذاتية
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MonitorDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.monitor.stats.useQuery();
  const { data: failures, isLoading: failuresLoading } = trpc.monitor.recentFailures.useQuery();
  const { data: improvements, isLoading: improvementsLoading } = trpc.monitor.activeImprovements.useQuery();

  return (
    <div className="min-h-screen bg-[#08090f] text-white p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <h1 className="text-2xl font-bold text-white">لوحة مراقبة النظام الهجين</h1>
        </div>
        <p className="text-blue-400/60 text-sm font-mono">
          خيال ← Manus ← OpenAI/Replicate · تحسين ذاتي تلقائي
        </p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-red-400">{stats.totalFailures}</div>
              <div className="text-xs text-white/50 mt-1">إجمالي الفشل</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-yellow-400">{stats.last24hFailures}</div>
              <div className="text-xs text-white/50 mt-1">فشل آخر 24 ساعة</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-400">{stats.totalImprovements}</div>
              <div className="text-xs text-white/50 mt-1">تحسينات مولّدة</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-green-400">{stats.activeImprovements}</div>
              <div className="text-xs text-white/50 mt-1">تحسينات نشطة</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failures by Type */}
        {stats && Object.keys(stats.failuresByType).length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/70">الفشل حسب النوع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.failuresByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-mono">{type}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 bg-red-500/60 rounded"
                        style={{ width: `${Math.min(count * 20, 120)}px` }}
                      />
                      <span className="text-xs text-red-400 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failures by Provider */}
        {stats && Object.keys(stats.failuresByProvider).length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/70">الفشل حسب المزود</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.failuresByProvider).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-mono">{provider}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 bg-orange-500/60 rounded"
                        style={{ width: `${Math.min(count * 20, 120)}px` }}
                      />
                      <span className="text-xs text-orange-400 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Failures */}
        <Card className="bg-white/5 border-white/10 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white/70">آخر الأعطال المسجّلة</CardTitle>
          </CardHeader>
          <CardContent>
            {failuresLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : failures && failures.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {failures.map((f: (typeof failures)[number]) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-white/5 text-xs"
                  >
                    <Badge
                      variant="outline"
                      className="shrink-0 border-red-500/40 text-red-400 text-[10px]"
                    >
                      {f.failureType}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/70 font-mono truncate">{f.operation}</div>
                      {f.errorMessage && (
                        <div className="text-white/40 truncate mt-0.5">{f.errorMessage}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-white/30 font-mono">
                      {f.provider}
                      {f.fallbackProvider && f.fallbackProvider !== "none" && (
                        <span className="text-green-400/60"> → {f.fallbackProvider}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/30 text-sm">
                لا توجد أعطال مسجّلة — النظام يعمل بشكل ممتاز ✅
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Improvements */}
        <Card className="bg-white/5 border-white/10 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white/70">
              التحسينات الذاتية النشطة
              <span className="mr-2 text-[10px] text-blue-400/60 font-normal">
                (برومبتات محسّنة تلقائياً بعد تحليل الفشل)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {improvementsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : improvements && improvements.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {improvements.map((imp: (typeof improvements)[number]) => (
                  <div key={imp.id} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-300 font-mono">{imp.operation}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px]">
                          {imp.failureType}
                        </Badge>
                        <span className="text-white/30">استُخدم {imp.useCount ?? 0} مرة</span>
                      </div>
                    </div>
                    {imp.improvementReason && (
                      <p className="text-white/50 leading-relaxed">{imp.improvementReason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/30 text-sm">
                لا توجد تحسينات ذاتية بعد — ستظهر هنا بعد 3 فشل متكرر في نفس العملية
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back Link */}
      <div className="mt-8 text-center">
        <a href="/" className="text-blue-400/60 hover:text-blue-400 text-sm transition-colors">
          ← العودة إلى خيال
        </a>
      </div>
    </div>
  );
}
