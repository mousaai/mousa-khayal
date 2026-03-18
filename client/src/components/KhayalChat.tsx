/**
 * KhayalChat.tsx — واجهة المحادثة الذكية الموحدة لمنصة خيال
 *
 * صندوق محادثة واحد يفهم القصد ويوجّه الإنتاج تلقائياً:
 * - صورة سينمائية
 * - فيديو كامل (مع مؤشر تقدم)
 * - سيناريو مكتوب
 * - تعديل مشهد
 * - إجابة على سؤال
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, Loader2, Sparkles, Film, ImageIcon, FileText, Mic, MicOff } from "lucide-react";
import { Streamdown } from "streamdown";
import VideoProductionPanel from "@/components/VideoProductionPanel";

// ─── أنواع الرسائل ─────────────────────────────────────────────

export type ChatMessageType =
  | "text"
  | "image"
  | "video_progress"
  | "video_done"
  | "script"
  | "thinking";

export interface KhayalChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: ChatMessageType;
  timestamp: number;
  // بيانات إضافية حسب النوع
  imageUrl?: string;
  videoUrl?: string;
  videoJobId?: string;
  script?: {
    title: string;
    language: string;
    narration: string;
    scenes: Array<{
      imagePrompt: string;
      subtitle: string;
      narration?: string;
      duration: number;
      zoom: string;
      transition?: string;
      sceneType?: string;
    }>;
  };
}

// ─── أمثلة الإلهام ────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "حياة النملة تحت الأرض — كيف تعيش وتأكل وتبني مملكتها",
  "رحلة قطرة الماء من البحر إلى السحاب",
  "الكواكب الشمسية — من عطارد إلى نبتون",
  "قصة الأسد والفأرة — حكاية عن الوفاء",
  "تاريخ الحضارة الإسلامية — من مكة إلى الأندلس",
  "فيلم تعليمي عن دورة الماء في الطبيعة للأطفال",
];

// ─── مكوّن رسالة واحدة ────────────────────────────────────────

function ChatBubble({ msg, onVideoComplete }: {
  msg: KhayalChatMessage;
  onVideoComplete?: (url: string) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
        isUser
          ? "bg-blue-600 text-white"
          : "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
      )}>
        {isUser ? "أنت" : "✨"}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser
          ? "bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-sm"
          : "bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm"
      )}>
        {/* نص عادي */}
        {msg.type === "text" && (
          <div className="text-sm leading-relaxed" dir="auto">
            <Streamdown>{msg.content}</Streamdown>
          </div>
        )}

        {/* تفكير */}
        {msg.type === "thinking" && (
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{msg.content}</span>
          </div>
        )}

        {/* صورة */}
        {msg.type === "image" && (
          <div>
            <p className="text-sm text-gray-300 mb-2">{msg.content}</p>
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="صورة مولّدة"
                className="rounded-xl max-w-full border border-white/10"
                style={{ maxHeight: 400 }}
              />
            )}
          </div>
        )}

        {/* فيديو جاري الإنتاج */}
        {msg.type === "video_progress" && msg.videoJobId && (
          <div>
            <p className="text-sm text-purple-300 mb-3">{msg.content}</p>
            {/* مؤشر تقدم بسيط */}
            <div className="bg-black/30 rounded-xl p-3 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-300 text-xs mb-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>جاري الإنتاج... (Job: {msg.videoJobId?.slice(-8)})</span>
              </div>
              <p className="text-gray-400 text-xs">سيظهر الفيديو هنا عند اكتمال الإنتاج</p>
            </div>
          </div>
        )}

        {/* فيديو مكتمل */}
        {msg.type === "video_done" && msg.videoUrl && (
          <div>
            <p className="text-sm text-green-300 mb-2">✅ {msg.content}</p>
            <video
              src={msg.videoUrl}
              controls
              className="rounded-xl w-full border border-white/10"
              style={{ maxHeight: 400 }}
            />
            <a
              href={msg.videoUrl}
              download="khayal-video.mp4"
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              ⬇️ تحميل الفيديو
            </a>
          </div>
        )}

        {/* سيناريو */}
        {msg.type === "script" && msg.script && (
          <div>
            <p className="text-yellow-300 mb-3 font-bold">
              📝 {msg.script.title}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {msg.script.scenes.map((scene, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-2 text-xs">
                  <p className="text-purple-300 font-bold mb-1">
                    المشهد {i + 1}: {scene.subtitle}
                  </p>
                  <p className="text-gray-300 leading-relaxed">{scene.narration || scene.imagePrompt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* وقت الرسالة */}
        <p className="text-xs text-gray-500 mt-1">
          {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ───────────────────────────────────────────

export default function KhayalChat() {
  const [messages, setMessages] = useState<KhayalChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "أهلاً! أنا **خيال** 🌟 — أحوّل أي فكرة إلى مرئيات سينمائية.\n\nيمكنك أن تطلب مني:\n- **فيديو** تعليمي أو قصصي أو وثائقي\n- **صورة** سينمائية لأي مشهد\n- **سيناريو** كامل لفيلمك\n\nما الذي تريد تخيّله اليوم؟",
      type: "text",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // tRPC mutations
  const detectIntentMutation = trpc.chat.detectIntent.useMutation();
  const askMutation = trpc.chat.ask.useMutation();
  const generateScriptMutation = trpc.chat.generateScript.useMutation();
  const generateImageMutation = trpc.khayal.generateScene.useMutation();
  const startVideoMutation = trpc.video.startProduction.useMutation();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const addMessage = useCallback((msg: Omit<KhayalChatMessage, "id" | "timestamp">) => {
    const newMsg: KhayalChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  }, []);

  const updateLastAssistantMessage = useCallback((updates: Partial<KhayalChatMessage>) => {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const updated = [...prev];
      updated[realIdx] = { ...updated[realIdx], ...updates };
      return updated;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    setInput("");
    setIsProcessing(true);

    // إضافة رسالة المستخدم
    addMessage({ role: "user", content: text, type: "text" });

    // رسالة تفكير مؤقتة
    addMessage({ role: "assistant", content: "جاري التحليل...", type: "thinking" });

    try {
      // كشف القصد
      const historyForAPI = messages
        .filter((m) => m.type === "text" && m.role !== "assistant" || m.role === "user")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const { intent, reply } = await detectIntentMutation.mutateAsync({
        message: text,
        history: historyForAPI,
      });

      // تحديث رسالة التفكير بالرد الأولي
      updateLastAssistantMessage({ content: reply, type: "text" });

      // تنفيذ الإجراء حسب القصد
      if (intent.type === "video") {
        // بدء إنتاج الفيديو
        const sceneCount = intent.params.sceneCount || 6;
        const language = intent.params.language || "ar";

        try {
          const { jobId } = await startVideoMutation.mutateAsync({
            description: intent.params.description || text,
            language,
            voice: language === "ar" ? "ar_male" : "en_male",
            sceneCount,
            options: {
              aspectRatio: "16:9",
              mode: "draft",
              musicVolume: 0.3,
            },
          });

          // استبدال رسالة التفكير بواجهة التقدم
          updateLastAssistantMessage({
            content: reply,
            type: "video_progress",
            videoJobId: jobId,
          });
        } catch {
          updateLastAssistantMessage({
            content: "حدث خطأ في بدء الإنتاج. حاول مرة أخرى.",
            type: "text",
          });
        }
      } else if (intent.type === "script") {
        // توليد سيناريو
        try {
          const { script } = await generateScriptMutation.mutateAsync({
            message: intent.params.description || text,
            language: intent.params.language || "ar",
            sceneCount: intent.params.sceneCount || 6,
          });

          updateLastAssistantMessage({
            content: `📝 السيناريو جاهز: **${script.title}**`,
            type: "script",
            script: script as unknown as KhayalChatMessage["script"],
          });
        } catch {
          updateLastAssistantMessage({
            content: "حدث خطأ في كتابة السيناريو.",
            type: "text",
          });
        }
      } else if (intent.type === "image") {
        // توليد صورة
        try {
          const result = await generateImageMutation.mutateAsync({
            description: intent.params.description || text,
            sceneCount: 1,
          });

          const firstScene = result.scenes?.[0];
          if (firstScene?.imageUrl) {
            updateLastAssistantMessage({
              content: "🖼️ الصورة جاهزة",
              type: "image",
              imageUrl: firstScene.imageUrl,
            });
          } else {
            updateLastAssistantMessage({ content: reply, type: "text" });
          }
        } catch {
          updateLastAssistantMessage({
            content: "حدث خطأ في توليد الصورة.",
            type: "text",
          });
        }
      } else if (intent.type === "question" || intent.type === "greeting" || intent.type === "clarify") {
        // الرد موجود بالفعل من detectIntent
        // لا حاجة لإجراء إضافي
      }
    } catch {
      updateLastAssistantMessage({
        content: "عذراً، حدث خطأ. حاول مرة أخرى.",
        type: "text",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    input,
    isProcessing,
    messages,
    addMessage,
    updateLastAssistantMessage,
    detectIntentMutation,
    generateScriptMutation,
    generateImageMutation,
    startVideoMutation,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleVideoComplete = useCallback(
    (msgId: string, url: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, type: "video_done" as ChatMessageType, videoUrl: url, content: "الفيديو جاهز للمشاهدة والتحميل 🎬" }
            : m
        )
      );
    },
    []
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
      dir="rtl"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
          ✨
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">مساعد خيال الذكي</h2>
          <p className="text-gray-400 text-xs">يفهم أي فكرة ويحوّلها إلى مرئيات سينمائية</p>
        </div>
        <div className="mr-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs">متصل</span>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            onVideoComplete={(url) => handleVideoComplete(msg.id, url)}
          />
        ))}
      </div>

      {/* ─── Suggested prompts (empty state) ─── */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <p className="text-gray-500 text-xs mb-2 text-center">أمثلة للإلهام</p>
          <div className="grid grid-cols-1 gap-1.5">
            {SUGGESTED_PROMPTS.slice(0, 4).map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(p);
                  textareaRef.current?.focus();
                }}
                className="text-right text-xs text-gray-400 hover:text-purple-300 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors border border-white/5 hover:border-purple-500/30"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input ─── */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب فكرتك... فيديو، صورة، سيناريو، أو أي سؤال"
            className="flex-1 resize-none bg-white/5 border-white/20 text-white placeholder:text-gray-500 rounded-xl text-sm min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isProcessing}
            dir="auto"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 flex-shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* أيقونات الإجراءات السريعة */}
        <div className="flex gap-2 mt-2 justify-center">
          {[
            { icon: <Film className="w-3 h-3" />, label: "فيديو", prompt: "أنتج فيديو عن " },
            { icon: <ImageIcon className="w-3 h-3" />, label: "صورة", prompt: "صوّر لي " },
            { icon: <FileText className="w-3 h-3" />, label: "سيناريو", prompt: "اكتب سيناريو عن " },
            { icon: <Sparkles className="w-3 h-3" />, label: "فكرة", prompt: "ساعدني في تطوير فكرة عن " },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(action.prompt);
                textareaRef.current?.focus();
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-300 bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors border border-white/5 hover:border-purple-500/30"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
