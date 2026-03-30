/**
 * Referral — صفحة برنامج الإحالة
 * يعرض رابط الإحالة الفريد للمستخدم وإحصائيات الإحالات
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Copy, CheckCheck, Gift, Users, Coins, Share2, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Referral() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = trpc.marketing.getMyReferralCode.useQuery();

  const handleCopy = async () => {
    if (!data?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setCopied(true);
      toast.success("تم نسخ رابط الإحالة!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("تعذّر النسخ — انسخ الرابط يدوياً");
    }
  };

  const handleShare = async () => {
    if (!data?.referralUrl) return;
    const text = `انضم إلى mousa.ai — المنظومة الذكية للبناء والعمران واحصل على 100 كريدت مجاناً عند التسجيل عبر رابطي:\n${data.referralUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "mousa.ai — دعوة للانضمام", text, url: data.referralUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ رسالة المشاركة!");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: "#8A9BB0" }}>
              <ArrowLeft size={14} className="rotate-180" />
              لوحة التحكم
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">برنامج الإحالة</h1>
          <p style={{ color: "#8A9BB0" }}>شارك mousa.ai واكسب كريدت مجاناً لكل مستخدم تدعوه</p>
        </div>

        {/* How it works */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} style={{ color: "#D4A017" }} />
            <h2 className="font-bold text-white">كيف يعمل البرنامج؟</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", icon: "🔗", title: "شارك رابطك", desc: "أرسل رابط الإحالة الفريد لأصدقائك وزملائك المهندسين" },
              { step: "2", icon: "👤", title: "يسجّل صديقك", desc: "يسجّل صديقك عبر رابطك ويحصل على 100 كريدت ترحيبي إضافي" },
              { step: "3", icon: "🎁", title: "تحصل على 50 كريدت", desc: "بمجرد إتمام صديقك أول عملية شراء، تُضاف 50 كريدت لحسابك فوراً" },
            ].map((s) => (
              <div key={s.step} className="text-center p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-xs font-mono mb-1" style={{ color: "#D4A017" }}>خطوة {s.step}</div>
                <div className="font-semibold text-white text-sm mb-1">{s.title}</div>
                <div className="text-xs" style={{ color: "#8A9BB0", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral Link Card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="font-bold text-white mb-4">رابط الإحالة الخاص بك</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: "#D4A017" }} />
            </div>
          ) : data ? (
            <>
              {/* URL display */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="flex-1 text-sm font-mono truncate"
                  style={{ color: "#D4A017", direction: "ltr", textAlign: "left" }}
                >
                  {data.referralUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                  style={
                    copied
                      ? { background: "rgba(74,155,127,0.15)", color: "#4A9B7F", border: "1px solid rgba(74,155,127,0.3)" }
                      : { background: "rgba(212,160,23,0.12)", color: "#D4A017", border: "1px solid rgba(212,160,23,0.25)" }
                  }
                >
                  {copied ? <><CheckCheck size={13} /> تم النسخ</> : <><Copy size={13} /> نسخ</>}
                </button>
              </div>

              {/* Code display */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm" style={{ color: "#8A9BB0" }}>كود الإحالة:</span>
                <span
                  className="font-mono font-bold px-2 py-0.5 rounded-lg text-sm"
                  style={{ background: "rgba(212,160,23,0.1)", color: "#D4A017", border: "1px solid rgba(212,160,23,0.2)" }}
                >
                  {data.code}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                >
                  <Share2 size={15} />
                  مشاركة الرابط
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`انضم إلى mousa.ai واحصل على 100 كريدت مجاناً! 🎁\n${data.referralUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}
                >
                  <ExternalLink size={15} />
                  مشاركة عبر واتساب
                </a>
              </div>
            </>
          ) : (
            <p style={{ color: "#8A9BB0" }}>تعذّر تحميل رابط الإحالة</p>
          )}
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: <Users size={20} style={{ color: "#5B8DD9" }} />,
                label: "إجمالي الإحالات",
                value: data.totalReferrals,
                color: "#5B8DD9",
                bg: "rgba(91,141,217,0.08)",
                border: "rgba(91,141,217,0.2)",
              },
              {
                icon: <Users size={20} style={{ color: "#4A9B7F" }} />,
                label: "إحالات مكتملة",
                value: data.rewardedCount,
                color: "#4A9B7F",
                bg: "rgba(74,155,127,0.08)",
                border: "rgba(74,155,127,0.2)",
              },
              {
                icon: <Coins size={20} style={{ color: "#D4A017" }} />,
                label: "كريدت مكتسب",
                value: data.totalCreditsEarned,
                color: "#D4A017",
                bg: "rgba(212,160,23,0.08)",
                border: "rgba(212,160,23,0.2)",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl text-center"
                style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
              >
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="font-mono text-3xl font-bold mb-1" style={{ color: stat.color }}>
                  {stat.value.toLocaleString("ar")}
                </div>
                <div className="text-xs" style={{ color: "#8A9BB0" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pending referrals notice */}
        {data && data.pendingCount > 0 && (
          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.15)" }}
          >
            <Gift size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#D4A017" }} />
            <p className="text-sm" style={{ color: "#B0C0D4" }}>
              لديك <strong style={{ color: "#D4A017" }}>{data.pendingCount}</strong> إحالة في الانتظار — ستحصل على الكريدت بمجرد إتمام المحالين أول عملية شراء.
            </p>
          </div>
        )}

        {/* Empty state */}
        {data && data.totalReferrals === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="font-bold text-white mb-2">ابدأ الإحالة الآن!</h3>
            <p className="text-sm mb-4" style={{ color: "#8A9BB0" }}>
              شارك رابطك مع زملائك المهندسين واكسب كريدت مجاناً
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
