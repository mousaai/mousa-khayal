/**
 * DocumentUploader.tsx — رافع المستندات لمنصة خيال
 * يدعم: PDF / Word / صور المخططات
 * يحلل المستند ويستخرج الأبعاد والعناصر المعمارية
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Image, Upload, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { DocumentAnalysisResult } from "../../../server/documentAnalyzer";

interface DocumentUploaderProps {
  onAnalysisComplete: (result: DocumentAnalysisResult, imageUrl?: string) => void;
  onClear: () => void;
  currentAnalysis?: DocumentAnalysisResult | null;
}

const ACCEPTED_TYPES = {
  "application/pdf": { label: "PDF", icon: "📄", color: "text-red-400" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "Word", icon: "📝", color: "text-blue-400" },
  "application/msword": { label: "Word", icon: "📝", color: "text-blue-400" },
  "image/jpeg": { label: "صورة", icon: "🖼️", color: "text-green-400" },
  "image/png": { label: "صورة", icon: "🖼️", color: "text-green-400" },
  "image/webp": { label: "صورة", icon: "🖼️", color: "text-green-400" },
  "text/plain": { label: "نص", icon: "📃", color: "text-gray-400" },
};

export default function DocumentUploader({
  onAnalysisComplete,
  onClear,
  currentAnalysis,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeDocumentMutation = trpc.khayal.analyzeDocument.useMutation();

  const processFile = useCallback(async (file: File) => {
    const mimeType = file.type;
    if (!Object.keys(ACCEPTED_TYPES).includes(mimeType)) {
      setError("صيغة الملف غير مدعومة. يرجى رفع PDF أو Word أو صورة.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFileName(file.name);

    try {
      // تحويل الملف إلى Base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      // إذا كانت صورة، نرفعها أولاً للحصول على URL
      let imageUrl: string | undefined;
      if (mimeType.startsWith("image/")) {
        // استخدام data URL للصور (بدون رفع خارجي)
        imageUrl = `data:${mimeType};base64,${base64}`;
      }

      const result = await analyzeDocumentMutation.mutateAsync({
        fileBase64: base64,
        mimeType,
        imageUrl,
        fileName: file.name,
      });

      onAnalysisComplete(result, imageUrl);
    } catch (err: any) {
      setError(err.message || "فشل تحليل المستند. يرجى المحاولة مجدداً.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeDocumentMutation, onAnalysisComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClear = () => {
    setFileName(null);
    setError(null);
    setShowDetails(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  // ── حالة: تم التحليل ──
  if (currentAnalysis) {
    const confidence = Math.round(currentAnalysis.confidence * 100);
    return (
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {currentAnalysis.projectTitle}
              </div>
              <div className="text-xs text-green-300 mt-0.5">
                {fileName} · دقة التحليل {confidence}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* تفاصيل التحليل */}
        {showDetails && (
          <div className="mt-4 space-y-3 border-t border-green-500/20 pt-3">
            {/* الكتلة الهندسية */}
            <div>
              <div className="text-xs text-gray-400 mb-1.5">الكتلة الهندسية</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 rounded-lg p-2">
                  <span className="text-gray-400">الشكل: </span>
                  <span className="text-white">{currentAnalysis.geometricMass.shape}</span>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <span className="text-gray-400">الطوابق: </span>
                  <span className="text-white">{currentAnalysis.geometricMass.floorCount}</span>
                </div>
                {currentAnalysis.geometricMass.estimatedWidth !== "unknown" && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-gray-400">العرض: </span>
                    <span className="text-white">{currentAnalysis.geometricMass.estimatedWidth}</span>
                  </div>
                )}
                {currentAnalysis.geometricMass.estimatedLength !== "unknown" && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-gray-400">الطول: </span>
                    <span className="text-white">{currentAnalysis.geometricMass.estimatedLength}</span>
                  </div>
                )}
              </div>
            </div>

            {/* الأبعاد المستخرجة */}
            {currentAnalysis.dimensions.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">الأبعاد المستخرجة</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentAnalysis.dimensions.slice(0, 6).map((dim, i) => (
                    <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                      {dim.element}: {dim.value} {dim.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* العناصر المعمارية */}
            {currentAnalysis.architecturalElements.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">العناصر المعمارية</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentAnalysis.architecturalElements.slice(0, 8).map((el, i) => (
                    <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* الوصف الموحد */}
            <div>
              <div className="text-xs text-gray-400 mb-1">الوصف الموحد للتوليد</div>
              <div className="text-xs text-gray-300 bg-black/20 rounded-lg p-2 line-clamp-3">
                {currentAnalysis.mainDescription}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── حالة: التحليل جارٍ ──
  if (isAnalyzing) {
    return (
      <div className="bg-purple-900/20 rounded-xl border border-purple-500/30 p-6 text-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
        <div className="text-sm text-purple-300 font-medium">جاري تحليل المستند...</div>
        <div className="text-xs text-gray-400 mt-1">{fileName}</div>
        <div className="mt-3 h-1 bg-purple-900/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  // ── حالة: خطأ ──
  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl border border-red-500/30 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-red-300">{error}</div>
          <button onClick={handleClear} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 w-full text-xs text-gray-400 hover:text-white py-2 border border-white/10 rounded-lg hover:border-white/30 transition-colors"
        >
          حاول مرة أخرى
        </button>
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt" onChange={handleFileChange} />
      </div>
    );
  }

  // ── حالة: الافتراضية (رفع ملف) ──
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200
        ${isDragging
          ? "border-purple-400 bg-purple-500/10 scale-[1.02]"
          : "border-white/20 bg-white/5 hover:border-purple-500/50 hover:bg-white/8"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Upload className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      <div className="text-sm font-medium text-white mb-1">
        ارفع مستند أو مخطط
      </div>
      <div className="text-xs text-gray-400 mb-3">
        اسحب وأفلت أو انقر للاختيار
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {Object.entries(ACCEPTED_TYPES).slice(0, 4).map(([mime, info]) => (
          <span key={mime} className={`text-xs ${info.color} bg-white/5 px-2 py-0.5 rounded-full border border-white/10`}>
            {info.icon} {info.label}
          </span>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        يستخرج الأبعاد والعناصر المعمارية تلقائياً
      </div>
    </div>
  );
}
