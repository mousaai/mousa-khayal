/**
 * KhayalChat.tsx — واجهة المحادثة الذكية الموحدة لمنصة خيال
 *
 * صندوق محادثة واحد يفهم القصد ويوجّه الإنتاج تلقائياً:
 * - صورة سينمائية
 * - فيديو كامل (مع مؤشر تقدم)
 * - سيناريو مكتوب
 * - تعديل مشهد
 * - إجابة على سؤال
 *
 * الألوان: متوافقة مع الصفحة الرئيسية (بنفسجي + أزرق + خلفية #020408)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/components/AuthGate";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { Send, Loader2, Sparkles, Film, ImageIcon, FileText } from "lucide-react";
import { Streamdown } from "streamdown";

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
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: isUser
            ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
            : "linear-gradient(135deg, #7c3aed, #db2777)",
          boxShadow: isUser
            ? "0 0 12px rgba(59,130,246,0.3)"
            : "0 0 12px rgba(124,58,237,0.3)",
          color: "white",
        }}
      >
        {isUser ? "أنت" : "✨"}
      </div>

      {/* Bubble */}
      <div
        className={cn("max-w-[80%] rounded-2xl px-4 py-3", isUser ? "rounded-tr-sm" : "rounded-tl-sm")}
        style={{
          background: isUser
            ? "rgba(59,130,246,0.12)"
            : "rgba(139,92,246,0.08)",
          border: isUser
            ? "1px solid rgba(59,130,246,0.25)"
            : "1px solid rgba(139,92,246,0.2)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* نص عادي */}
        {msg.type === "text" && (
          <div className="text-sm leading-relaxed" dir="auto" style={{ color: "rgba(255,255,255,0.9)" }}>
            <Streamdown>{msg.content}</Streamdown>
          </div>
        )}

        {/* تفكير */}
        {msg.type === "thinking" && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#a78bfa" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{msg.content}</span>
          </div>
        )}

        {/* صورة */}
        {msg.type === "image" && (
          <div>
            <p className="text-sm mb-2" style={{ color: "rgba(196,181,253,0.8)" }}>{msg.content}</p>
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="صورة مولّدة"
                className="rounded-xl max-w-full"
                style={{ maxHeight: 400, border: "1px solid rgba(139,92,246,0.3)" }}
              />
            )}
          </div>
        )}

        {/* فيديو جاري الإنتاج */}
        {msg.type === "video_progress" && msg.videoJobId && (
          <div>
            <p className="text-sm mb-3" style={{ color: "#a78bfa" }}>{msg.content}</p>
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "#a78bfa" }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>جاري الإنتاج... (Job: {msg.videoJobId?.slice(-8)})</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>سيظهر الفيديو هنا عند اكتمال الإنتاج</p>
            </div>
          </div>
        )}

        {/* فيديو مكتمل */}
        {msg.type === "video_done" && msg.videoUrl && (
          <div>
            <p className="text-sm mb-2" style={{ color: "#4ade80" }}>✅ {msg.content}</p>
            <video
              src={msg.videoUrl}
              controls
              className="rounded-xl w-full"
              style={{ maxHeight: 400, border: "1px solid rgba(139,92,246,0.3)" }}
            />
            <a
              href={msg.videoUrl}
              download="khayal-video.mp4"
              className="mt-2 inline-flex items-center gap-1 text-xs"
              style={{ color: "#60a5fa" }}
            >
              ⬇️ تحميل الفيديو
            </a>
          </div>
        )}

        {/* سيناريو */}
        {msg.type === "script" && msg.script && (
          <div>
            <p className="mb-3 font-bold" style={{ color: "#fbbf24" }}>
              📝 {msg.script.title}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {msg.script.scenes.map((scene, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2 text-xs"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
                >
                  <p className="font-bold mb-1" style={{ color: "#a78bfa" }}>
                    المشهد {i + 1}: {scene.subtitle}
                  </p>
                  <p className="leading-relaxed" style={{ color: "rgba(203,213,225,0.8)" }}>
                    {scene.narration || scene.imagePrompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* وقت الرسالة */}
        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>
          {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ───────────────────────────────────────────

export default function KhayalChat() {
  const { user } = useAuth();
  const authLoading = false; // AuthGate يضمن وجود user
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

    addMessage({ role: "user", content: text, type: "text" });
    addMessage({ role: "assistant", content: "جاري التحليل...", type: "thinking" });

    try {
      const historyForAPI = messages
        .filter((m) => m.type === "text" && m.role !== "assistant" || m.role === "user")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const { intent, reply } = await detectIntentMutation.mutateAsync({
        message: text,
        history: historyForAPI,
      });

      updateLastAssistantMessage({ content: reply, type: "text" });

      if (intent.type === "video") {
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
        try {
          // sceneCount يجب أن يكون 3 على الأقل (حد الـ schema)
          const result = await generateImageMutation.mutateAsync({
            description: intent.params.description || text,
            sceneCount: 3,
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
        } catch (err) {
          console.error("[KhayalChat] Image generation failed:", err);
          updateLastAssistantMessage({
            content: "حدث خطأ في توليد الصورة. تأكد من وصف واضح وحاول مرة أخرى.",
            type: "text",
          });
        }
      }
      // question / greeting / clarify — الرد موجود بالفعل
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
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          borderBottom: "1px solid rgba(139,92,246,0.15)",
          background: "rgba(2,4,8,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}
        >
          ✨
        </div>
        <div>
          <h2 className="font-bold text-sm" style={{ color: "rgba(255,255,255,0.95)" }}>مساعد خيال الذكي</h2>
          <p className="text-xs" style={{ color: "rgba(167,139,250,0.7)" }}>يفهم أي فكرة ويحوّلها إلى مرئيات سينمائية</p>
        </div>
        <div className="mr-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color: "#4ade80" }}>متصل</span>
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
          <p className="text-xs mb-2 text-center" style={{ color: "rgba(148,163,184,0.45)" }}>أمثلة للإلهام</p>
          <div className="grid grid-cols-1 gap-1.5">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(p);
                  textareaRef.current?.focus();
                }}
                className="text-right text-xs rounded-xl px-3 py-2 transition-all"
                style={{
                  background: "rgba(139,92,246,0.07)",
                  border: "1px solid rgba(139,92,246,0.18)",
                  color: "rgba(196,181,253,0.65)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.14)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.35)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(196,181,253,0.9)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.18)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(196,181,253,0.65)";
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input ─── */}
      <div
        className="px-4 pb-4 pt-2"
        style={{ borderTop: "1px solid rgba(139,92,246,0.15)", background: "rgba(2,4,8,0.6)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="flex gap-2 items-end rounded-2xl px-4 py-2"
          style={{
            background: "rgba(10,11,20,0.85)",
            border: "1px solid rgba(139,92,246,0.25)",
            backdropFilter: "blur(24px)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب فكرتك... فيديو، صورة، سيناريو، أو أي سؤال"
            className="flex-1 resize-none bg-transparent outline-none text-sm"
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'Tajawal', 'Cairo', sans-serif",
              minHeight: 40,
              maxHeight: 120,
            }}
            rows={1}
            disabled={isProcessing}
            dir="auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)",
              boxShadow: "0 0 16px rgba(124,58,237,0.35)",
            }}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
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
              className="flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-all"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.18)",
                color: "rgba(167,139,250,0.65)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.14)";
                (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(167,139,250,0.65)";
              }}
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
