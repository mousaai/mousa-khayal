/**
 * SharePage.tsx — صفحة مشاهدة الفيديو المشارك
 * صفحة عامة لا تتطلب تسجيل دخول
 */
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { ArrowLeft, Eye, Film, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SharePage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId;
  const { t, isRTL } = useLanguage();

  const { data: link, isLoading, error } = trpc.video.getShareLink.useQuery(
    { shareId: shareId ?? "" },
    { enabled: !!shareId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090f] flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t.loadingVideo}</p>
        </div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-[#08090f] flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{t.invalidLink}</h1>
          <p className="text-gray-500 mb-6">{t.invalidLinkDesc}</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backHome}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090f] text-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b border-blue-500/20 bg-[#0a0b10]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.appName}
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Eye className="w-4 h-4" />
            <span>{(link.viewCount ?? 0).toLocaleString()} {t.views}</span>
          </div>
        </div>
      </div>

      {/* Video */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Genre chip */}
        {link.genreEmoji && link.genreLabel && (
          <div className="mb-4">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm px-3 py-1">
              {link.genreEmoji} {link.genreLabel}
            </Badge>
          </div>
        )}

        <h1 className="text-2xl font-bold text-white mb-2">
          {link.title ?? t.appName}
        </h1>

        {link.description && (
          <p className="text-gray-400 mb-6 leading-relaxed">
            {link.description}
          </p>
        )}

        {/* Video Player */}
        <div className="rounded-xl overflow-hidden border border-blue-500/20 bg-black aspect-video">
          <video
            src={link.videoUrl}
            controls
            autoPlay
            className="w-full h-full"
            poster=""
          />
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-600 text-sm">
            {t.createdBy}{" "}
            <span className="text-blue-400 font-semibold">{t.appName}</span>
          </p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-sm">
              {t.createYourOwn}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
