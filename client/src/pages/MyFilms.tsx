/**
 * MyFilms.tsx — صفحة "أفلامي"
 * تعرض تاريخ الإنتاجات المكتملة مع إمكانية المشاركة وإعادة المشاهدة وتعديل المشاهد
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Film,
  Share2,
  Play,
  Clock,
  Copy,
  Check,
  ArrowLeft,
  Clapperboard,
  Pencil,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";

interface ProductionItem {
  jobId: string;
  title: string;
  description: string;
  videoUrl: string;
  metrics: any;
  scriptData?: any;
  createdAt: Date;
  updatedAt: Date;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec?: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// مكوّن متابعة تقدم مهمة التعديل
// ─────────────────────────────────────────────────────────────
function EditJobProgress({
  editJobId,
  onDone,
}: {
  editJobId: string;
  onDone: (videoUrl: string) => void;
}) {
  const { data } = trpc.video.getEditJobStatus.useQuery(
    { editJobId },
    { refetchInterval: (q) => (q.state.data?.status === "done" || q.state.data?.status === "failed" ? false : 2000) }
  );

  useEffect(() => {
    if (data?.status === "done" && data.videoUrl) {
      onDone(data.videoUrl);
    }
  }, [data?.status, data?.videoUrl, onDone]);

  if (!data) return null;

  const isDone = data.status === "done";
  const isFailed = data.status === "failed";
  const progress = data.progress ?? 0;

  return (
    <div className="mt-3 p-3 bg-[#0a0f1a] border border-blue-500/20 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-blue-300 font-mono">
          {isFailed ? "❌ فشل التعديل" : isDone ? "✅ اكتمل التعديل" : "⚙️ جاري التعديل..."}
        </span>
        <span className="text-xs text-gray-500">{progress}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${isFailed ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {data.currentStep && (
        <p className="text-xs text-gray-500 truncate">{data.currentStep}</p>
      )}
      {isFailed && data.error && (
        <p className="text-xs text-red-400 mt-1">{data.error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// مكوّن تعديل مشهد واحد
// ─────────────────────────────────────────────────────────────
function SceneEditPanel({
  jobId,
  scenes,
  onVideoUpdated,
}: {
  jobId: string;
  scenes: Array<{ imagePrompt: string; subtitle: string; duration: number }>;
  onVideoUpdated: (newVideoUrl: string) => void;
}) {
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const editScene = trpc.video.editScene.useMutation({
    onSuccess: (data) => {
      setEditJobId(data.editJobId);
      setIsEditing(true);
      toast.success(`بدأ تعديل المشهد ${data.sceneIndex + 1}...`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleEdit = () => {
    if (selectedScene === null) return;
    if (!newPrompt.trim() || newPrompt.trim().length < 5) {
      toast.error("أدخل وصفاً للمشهد (5 أحرف على الأقل)");
      return;
    }
    editScene.mutate({
      jobId,
      sceneIndex: selectedScene,
      newPrompt: newPrompt.trim(),
    });
  };

  const handleDone = (videoUrl: string) => {
    setIsEditing(false);
    setEditJobId(null);
    setSelectedScene(null);
    setNewPrompt("");
    onVideoUpdated(videoUrl);
    toast.success("✅ تم تعديل المشهد وتحديث الفيديو!");
  };

  return (
    <div className="border-t border-blue-500/20 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-blue-300 mb-3 flex items-center gap-2">
        <Layers className="w-3.5 h-3.5" />
        تعديل مشهد واحد
      </h4>

      {/* قائمة المشاهد */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {scenes.map((scene, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedScene(i === selectedScene ? null : i);
              setNewPrompt(i === selectedScene ? "" : scene.imagePrompt);
            }}
            className={`text-right p-2 rounded-lg border text-xs transition-all ${
              selectedScene === i
                ? "border-blue-500 bg-blue-500/10 text-blue-200"
                : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600"
            }`}
          >
            <span className="font-mono text-blue-500 ml-1">#{i + 1}</span>
            <span className="line-clamp-2">{scene.subtitle}</span>
          </button>
        ))}
      </div>

      {/* حقل التعديل */}
      {selectedScene !== null && !isEditing && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">
            وصف المشهد الجديد (بالإنجليزية أو العربية):
          </label>
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            placeholder="مثال: A futuristic city at night with neon lights..."
            className="w-full bg-[#0a0f1a] border border-gray-700 rounded-lg p-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            dir="auto"
          />
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleEdit}
            disabled={editScene.isPending}
          >
            {editScene.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Pencil className="w-3.5 h-3.5 mr-2" />
            )}
            تعديل المشهد {selectedScene + 1}
          </Button>
        </div>
      )}

      {/* متابعة التقدم */}
      {editJobId && isEditing && (
        <EditJobProgress editJobId={editJobId} onDone={handleDone} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// مكوّن زر المشاركة
// ─────────────────────────────────────────────────────────────
function ShareButton({ item }: { item: ProductionItem }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShare = trpc.video.createShareLink.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}/share/${data.shareId}`;
      setShareUrl(fullUrl);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleShare = () => {
    if (shareUrl) {
      copyToClipboard(shareUrl);
      return;
    }
    createShare.mutate({
      jobId: item.jobId,
      title: item.title,
      description: item.description,
      genre: item.metrics?.genre,
      genreLabel: item.metrics?.genreLabel,
      genreEmoji: item.metrics?.genreEmoji,
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("رابط المشاركة في الحافظة");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {shareUrl && (
        <span className="text-xs text-blue-400 font-mono truncate max-w-[160px]">
          {shareUrl}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
        onClick={handleShare}
        disabled={createShare.isPending}
      >
        {copied ? (
          <Check className="w-3 h-3 mr-1" />
        ) : (
          <Share2 className="w-3 h-3 mr-1" />
        )}
        {copied ? "تم النسخ" : shareUrl ? "نسخ الرابط" : "مشاركة"}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// مكوّن بطاقة الفيلم
// ─────────────────────────────────────────────────────────────
function FilmCard({ item }: { item: ProductionItem }) {
  const [playing, setPlaying] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(item.videoUrl);
  const metrics = item.metrics as any;
  const scenes: Array<{ imagePrompt: string; subtitle: string; duration: number }> =
    item.scriptData?.scenes ?? [];

  const handleVideoUpdated = (newUrl: string) => {
    setCurrentVideoUrl(newUrl);
    setPlaying(false);
    setShowEdit(false);
  };

  return (
    <Card className="bg-[#0d1117] border border-blue-500/20 overflow-hidden hover:border-blue-500/40 transition-all group">
      {/* معاينة الفيديو */}
      <div className="relative aspect-video bg-[#08090f]">
        {playing ? (
          <video
            src={currentVideoUrl}
            controls
            autoPlay
            className="w-full h-full object-cover"
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"
              style={{
                backgroundImage: `url(${currentVideoUrl}?thumbnail)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(2px)",
                opacity: 0.3,
              }}
            />
            <Button
              size="lg"
              className="relative z-10 bg-blue-600/80 hover:bg-blue-600 rounded-full w-14 h-14 p-0"
              onClick={() => setPlaying(true)}
            >
              <Play className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Genre badge */}
        {metrics?.genreEmoji && metrics?.genreLabel && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">
              {metrics.genreEmoji} {metrics.genreLabel}
            </Badge>
          </div>
        )}

        {/* Duration */}
        {metrics?.totalDuration && (
          <div className="absolute bottom-2 right-2 z-10">
            <Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(metrics.totalDuration)}
            </Badge>
          </div>
        )}
      </div>

      {/* معلومات الفيلم */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-1 truncate">
          {item.title}
        </h3>
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* إحصائيات */}
        {metrics && (
          <div className="flex gap-3 mb-3 text-xs text-gray-500">
            {metrics.sceneCount && (
              <span>{metrics.sceneCount} مشاهد</span>
            )}
            {metrics.usedRunway && (
              <span className="text-purple-400">Runway ✓</span>
            )}
            {metrics.usedElevenLabs && (
              <span className="text-green-400">ElevenLabs ✓</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-600 text-xs">
            {formatDate(item.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            {/* زر التعديل */}
            {scenes.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className={`border-purple-500/40 text-purple-300 hover:bg-purple-500/10 ${showEdit ? "bg-purple-500/10" : ""}`}
                onClick={() => setShowEdit(!showEdit)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                {showEdit ? "إخفاء" : "تعديل"}
                {showEdit ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            )}
            <ShareButton item={item} />
          </div>
        </div>

        {/* لوحة تعديل المشاهد */}
        {showEdit && scenes.length > 0 && (
          <SceneEditPanel
            jobId={item.jobId}
            scenes={scenes}
            onVideoUpdated={handleVideoUpdated}
          />
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// الصفحة الرئيسية
// ─────────────────────────────────────────────────────────────
export default function MyFilms() {
  const { data: history, isLoading } = trpc.video.getProductionHistory.useQuery({ limit: 20 });

  return (
    <div className="min-h-screen bg-[#08090f] text-white">
      {/* Header */}
      <div className="border-b border-blue-500/20 bg-[#0a0b10]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              الرئيسية
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-white">أفلامي</h1>
          </div>
          {history && (
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {history.length} فيلم
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-video bg-[#0d1117] border border-blue-500/10 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-24">
            <Film className="w-16 h-16 text-blue-500/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              لا توجد أفلام بعد
            </h2>
            <p className="text-gray-600 mb-6">
              ابدأ بإنتاج فيلمك الأول من الصفحة الرئيسية
            </p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700">
                إنتاج فيلم جديد
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(history as ProductionItem[]).map((item) => (
              <FilmCard key={item.jobId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
