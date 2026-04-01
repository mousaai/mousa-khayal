/**
 * SharedDesign.tsx — صفحة عرض التصميم المشترك (عام)
 * تُعرض عبر /design/:shareToken
 */

import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowRight, Loader2 } from "lucide-react";

const STYLES: Record<string, { label: string; icon: string }> = {
  modern: { label: "عصري", icon: "🏙️" },
  islamic: { label: "إسلامي", icon: "🕌" },
  gulf: { label: "خليجي", icon: "🏜️" },
  contemporary: { label: "معاصر", icon: "🌿" },
};

const TYPES: Record<string, { label: string; icon: string }> = {
  exterior: { label: "واجهة خارجية", icon: "🏛️" },
  interior: { label: "تصميم داخلي", icon: "🛋️" },
  floor_plan: { label: "مسقط أفقي", icon: "📐" },
};

export default function SharedDesign() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params.shareToken;

  const { data: design, isLoading, error } = trpc.design.getSharedDesign.useQuery(
    { shareToken: shareToken || "" },
    { enabled: !!shareToken }
  );

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-[#08090f] flex items-center justify-center"
        dir="rtl"
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        <div className="text-center">
          <Loader2 className="animate-spin text-purple-400 mx-auto mb-4" size={40} />
          <p className="text-white/60">جاري تحميل التصميم...</p>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div
        className="min-h-screen bg-[#08090f] flex items-center justify-center"
        dir="rtl"
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">التصميم غير موجود</h1>
          <p className="text-white/50 mb-6">الرابط غير صحيح أو انتهت صلاحيته</p>
          <a href="/">
            <Button className="bg-purple-600 hover:bg-purple-500">
              <ArrowRight className="ml-2" size={16} />
              العودة للرئيسية
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const style = STYLES[design.style] || { label: design.style, icon: "🏗️" };
  const type = TYPES[design.type] || { label: design.type, icon: "📐" };

  return (
    <div
      className="min-h-screen bg-[#08090f] text-white"
      dir="rtl"
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
    >
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-sm">
          <ArrowRight size={16} />
          خيال
        </a>
        <span className="text-white/20">/</span>
        <span className="text-white/60 text-sm">تصميم مشترك</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* الصورة الرئيسية */}
        <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <img
            src={design.imageUrl}
            alt={design.prompt}
            className="w-full object-cover"
            style={{ maxHeight: "70vh" }}
          />
        </div>

        {/* المعلومات */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <p
              className="text-lg text-white/80 mb-3 leading-relaxed"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              {design.prompt}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                {style.icon} {style.label}
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                {type.icon} {type.label}
              </Badge>
            </div>
          </div>

          {/* أزرار التحميل */}
          <div className="flex gap-2">
            <a
              href={design.imageUrl}
              download={`khayal-design.jpg`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-green-500/30 text-green-300 hover:bg-green-500/10">
                <Download className="ml-2" size={16} />
                تحميل
              </Button>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/30 text-sm mb-3">تم إنشاء هذا التصميم بواسطة</p>
          <a href="/" className="text-purple-400 hover:text-purple-300 font-bold text-lg">
            منصة خيال
          </a>
          <p className="text-white/20 text-xs mt-1">khayal.mousa.ai</p>
        </div>
      </div>
    </div>
  );
}
