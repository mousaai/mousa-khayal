/*
 * AIPlatformPage — Reusable AI Chat Interface for all 5 mousa.ai platforms
 * Features: session resume, project memory profile, cross-session summaries, credit management
 */

import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  Send, Zap, ArrowRight, User, Bot, AlertCircle, Plus, History,
  ChevronLeft, Loader2, Brain, Settings2, X, Save, FolderOpen, Download, Sparkles,
} from "lucide-react";

const GuestTrialWidget = lazy(() => import("./GuestTrialWidget"));

export type PlatformId = "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal";

interface PlatformConfig {
  id: PlatformId;
  name: string;
  nameEn: string;
  tagline: string;
  description: string;
  creditCost: number;
  color: string;
  bg: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  placeholders: string[];
  disclaimer: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ── PDF Export helper ──────────────────────────────────────────────────────
function exportConversationAsPDF(
  messages: Message[],
  platformName: string,
  platformTagline: string
) {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length === 0) {
    toast.error('لا توجد ردود لتصديرها');
    return;
  }
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const rows = messages.map(m => {
    const escaped = m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>');
    if (m.role === 'user') {
      return `<div class="section"><div class="q-label">السؤال</div><div class="question">${escaped}</div></div>`;
    }
    return `<div class="section"><div class="q-label">الرد</div><div class="answer">${escaped}</div></div>`;
  }).join('');
  const htmlContent = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير ${platformName} — ${date}</title><style>@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'IBM Plex Sans Arabic',Arial,sans-serif;background:#fff;color:#1a1a2e;direction:rtl;padding:40px}.header{border-bottom:3px solid #d4a017;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:22px;font-weight:700;color:#d4a017}.platform-name{font-size:16px;color:#666}.date{font-size:13px;color:#999}.section{margin-bottom:30px;page-break-inside:avoid}.q-label{font-size:11px;font-weight:600;color:#d4a017;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.question{background:#f8f9fa;border-right:3px solid #d4a017;padding:12px 16px;border-radius:6px;font-size:14px;color:#333;margin-bottom:12px}.answer{font-size:14px;line-height:1.9;color:#222}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;text-align:center}@media print{body{padding:20px}}</style></head><body><div class="header"><div><div class="logo">mousa.ai</div><div class="platform-name">${platformName} — ${platformTagline}</div></div><div class="date">${date}</div></div>${rows}<div class="footer">تقرير مُولَّد بواسطة mousa.ai — ${date} — للاستخدام الاسترشادي فقط</div></body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.onload = () => win.print();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast.success('جاري فتح نافذة الطباعة / التصدير كـ PDF');
}

export default function AIPlatformPage({ config }: { config: PlatformConfig }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  // Project profile form state
  const [profileForm, setProfileForm] = useState({
    projectName: "",
    location: "",
    projectType: "",
    notes: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: wallet, refetch: refetchWallet } = trpc.credits.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const { data: sessions, refetch: refetchSessions } = trpc.sessions.list.useQuery({ limit: 20 }, { enabled: isAuthenticated });
  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery(
    { platform: config.id },
    { enabled: isAuthenticated }
  );

  // Load session messages for resume
  const [resumeSessionId, setResumeSessionId] = useState<number | undefined>();
  const { data: resumeMessages } = trpc.sessions.getMessages.useQuery(
    { sessionId: resumeSessionId! },
    { enabled: !!resumeSessionId }
  );

  // Populate profile form when data arrives
  useEffect(() => {
    if (profile) {
      setProfileForm({
        projectName: profile.projectName ?? "",
        location: profile.location ?? "",
        projectType: profile.projectType ?? "",
        notes: profile.notes ?? "",
      });
    }
  }, [profile]);

  // When resume messages arrive, load them into chat
  useEffect(() => {
    if (resumeMessages && resumeSessionId) {
      const loaded: Message[] = resumeMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
      setMessages(loaded);
      setSessionId(resumeSessionId);
      setResumeSessionId(undefined);
      setLoadingSession(false);
      setShowHistory(false);
      toast.success("تم استئناف الجلسة السابقة");
    }
  }, [resumeMessages, resumeSessionId]);

  const saveProfileMutation = trpc.profile.save.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ ملف المشروع — سيتذكره الذكاء الاصطناعي في كل جلساتك");
      refetchProfile();
      setProfileSaving(false);
    },
    onError: (err) => {
      toast.error(`فشل الحفظ: ${err.message}`);
      setProfileSaving(false);
    },
  });

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, timestamp: new Date() }]);
      setSessionId(data.sessionId);
      refetchWallet();
      refetchSessions();
    },
    onError: (err) => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ **خطأ:** ${err.message}`,
        timestamp: new Date(),
      }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed, timestamp: new Date() }]);
    setInput("");
    chatMutation.mutate({ platform: config.id, message: trimmed, sessionId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startNewSession = () => {
    setMessages([]);
    setSessionId(undefined);
    setShowHistory(false);
    setResumeSessionId(undefined);
  };

  const resumeSession = (sid: number) => {
    setLoadingSession(true);
    setMessages([]);
    setSessionId(sid);
    setResumeSessionId(sid);
  };

  const handleSaveProfile = () => {
    setProfileSaving(true);
    saveProfileMutation.mutate({ platform: config.id, ...profileForm });
  };

  const Icon = config.icon;
  const balance = wallet?.balance ?? 0;
  const canAfford = balance >= config.creditCost;
  const platformSessions = sessions?.filter(s => s.platform === config.id) ?? [];
  const hasProfile = profile && (profile.projectName || profile.location || profile.projectType || profile.notes);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080E1A" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4" style={{ borderColor: "rgba(212,160,23,0.3)", borderTopColor: "#d4a017" }} />
          <p className="text-steel">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // After login, redirect back to the current page using full URL
    // Using window.location.origin ensures fada.mousa.ai users return to fada.mousa.ai (not mousa.ai)
    const loginUrl = getLoginUrl(window.location.origin + window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: "#080E1A" }}>
        {/* Minimal header */}
        <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,14,26,0.95)", borderColor: "rgba(212,160,23,0.08)", backdropFilter: "blur(12px)" }}>
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: config.bg, border: `1px solid ${config.color}22` }}>
                <Icon size={15} style={{ color: config.color }} />
              </div>
              <span className="text-platinum font-bold text-sm">{config.name}</span>
              <span className="text-steel text-xs hidden sm:inline">— {config.tagline}</span>
            </div>
            <a href={loginUrl} className="text-gold text-sm font-semibold hover:underline">تسجيل الدخول</a>
          </div>
        </header>

        {/* Main content: free trial + login */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Platform intro */}
          <div className="text-center mb-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: config.bg, border: `1px solid ${config.color}33` }}>
              <Icon size={28} style={{ color: config.color }} />
            </div>
            <h1 className="text-platinum font-bold text-2xl mb-2">{config.name}</h1>
            <p className="text-steel text-sm leading-relaxed">{config.description}</p>
          </div>

          {/* Free trial widget */}
          <div className="w-full max-w-lg mb-6">
            <Suspense fallback={<div className="glass-card p-6 text-center text-steel text-sm">جاري التحميل...</div>}>
              <GuestTrialWidget
                platform={config.id}
                platformName={config.name}
                placeholder={config.placeholders[0]}
                returnUrl={window.location.href}
              />
            </Suspense>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-lg mb-6">
            <div className="flex-1 h-px" style={{ background: "rgba(212,160,23,0.12)" }} />
            <span className="text-steel text-xs">أو</span>
            <div className="flex-1 h-px" style={{ background: "rgba(212,160,23,0.12)" }} />
          </div>

          {/* Login CTA */}
          <div className="w-full max-w-lg">
            <a href={loginUrl} className="btn-gold w-full justify-center flex items-center gap-2 text-base py-3">
              <span>تسجيل الدخول للوصول الكامل</span>
              <ArrowRight size={16} />
            </a>
            <p className="text-steel text-xs text-center mt-3">حساب واحد يمنحك وصولاً لجميع المنصات الست</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: "#080E1A" }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,14,26,0.95)", borderColor: "rgba(212,160,23,0.08)", backdropFilter: "blur(12px)" }}>
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <ChevronLeft size={18} className="text-steel" style={{ transform: "rotate(180deg)" }} />
              </button>
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: config.bg, border: `1px solid ${config.color}22` }}>
              <Icon size={16} style={{ color: config.color }} />
            </div>
            <div>
              <div className="text-platinum font-bold text-sm leading-tight">{config.name}</div>
              <div className="text-steel text-xs">{config.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Credit display */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: canAfford ? "rgba(212,160,23,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${canAfford ? "rgba(212,160,23,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <Zap size={12} style={{ color: canAfford ? "#d4a017" : "#ef4444" }} />
              <span className="font-bold text-sm" style={{ color: canAfford ? "#d4a017" : "#ef4444" }}>{balance.toLocaleString()}</span>
              <span className="text-steel text-xs">كريدت</span>
            </div>
            {/* Project profile button */}
            <button
              onClick={() => { setShowProfile(!showProfile); setShowHistory(false); }}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
              title="ملف المشروع"
            >
              <Brain size={16} className={showProfile ? "text-gold" : "text-steel"} />
              {hasProfile && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400" />
              )}
            </button>
            {/* New session */}
            <button onClick={startNewSession} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="محادثة جديدة">
              <Plus size={16} className="text-steel" />
            </button>
            {/* History */}
            <button
              onClick={() => { setShowHistory(!showHistory); setShowProfile(false); }}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="السجل"
            >
              <History size={16} className={showHistory ? "text-gold" : "text-steel"} />
            </button>
            {/* Export PDF */}
            {messages.length > 0 && (
              <button
                onClick={() => exportConversationAsPDF(messages, config.name, config.tagline)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                title="تصدير التقرير كـ PDF"
              >
                <Download size={16} className="text-steel" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* PROJECT PROFILE SIDEBAR */}
        {showProfile && (
          <aside className="w-80 border-l flex-shrink-0 overflow-y-auto" style={{ background: "rgba(13,20,35,0.95)", borderColor: "rgba(212,160,23,0.08)" }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-gold" />
                  <h3 className="text-platinum font-semibold text-sm">ذاكرة المشروع</h3>
                </div>
                <button onClick={() => setShowProfile(false)} className="p-1 hover:bg-white/5 rounded">
                  <X size={14} className="text-steel" />
                </button>
              </div>
              <p className="text-steel text-xs mb-4 leading-relaxed">
                هذه المعلومات ستُرسَل تلقائياً مع كل محادثة — الذكاء الاصطناعي سيتذكر مشروعك دائماً.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-steel text-xs mb-1 block">اسم المشروع</label>
                  <input
                    type="text"
                    data-mousa-field="project_name"
                    value={profileForm.projectName}
                    onChange={e => setProfileForm(p => ({ ...p, projectName: e.target.value }))}
                    placeholder="مثال: فيلا الرياض"
                    className="w-full px-3 py-2 rounded-lg text-sm text-platinum placeholder-steel/40 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div>
                  <label className="text-steel text-xs mb-1 block">الموقع / المدينة</label>
                  <input
                    type="text"
                    data-mousa-field="location"
                    value={profileForm.location}
                    onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="مثال: الرياض، حي النرجس"
                    className="w-full px-3 py-2 rounded-lg text-sm text-platinum placeholder-steel/40 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div>
                  <label className="text-steel text-xs mb-1 block">نوع المشروع</label>
                  <input
                    type="text"
                    data-mousa-field="project_type"
                    value={profileForm.projectType}
                    onChange={e => setProfileForm(p => ({ ...p, projectType: e.target.value }))}
                    placeholder="مثال: سكني - فيلا 400م²"
                    className="w-full px-3 py-2 rounded-lg text-sm text-platinum placeholder-steel/40 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div>
                  <label className="text-steel text-xs mb-1 block">ملاحظات إضافية</label>
                  <textarea
                    data-mousa-field="notes"
                    value={profileForm.notes}
                    onChange={e => setProfileForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="أي معلومات تريد أن يتذكرها الذكاء الاصطناعي..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm text-platinum placeholder-steel/40 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.3)", color: "#d4a017" }}
                >
                  {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  حفظ الذاكرة
                </button>
              </div>

              {hasProfile && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-green-400 text-xs font-medium">الذاكرة مفعّلة</span>
                  </div>
                  <p className="text-steel text-xs">الذكاء الاصطناعي يتذكر مشروعك في كل جلسة جديدة.</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* HISTORY SIDEBAR */}
        {showHistory && (
          <aside className="w-72 border-l flex-shrink-0 overflow-y-auto" style={{ background: "rgba(13,20,35,0.8)", borderColor: "rgba(212,160,23,0.08)" }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-platinum font-semibold text-sm">الجلسات السابقة</h3>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-white/5 rounded">
                  <X size={14} className="text-steel" />
                </button>
              </div>
              {platformSessions.length === 0 ? (
                <p className="text-steel text-xs">لا توجد جلسات سابقة لهذه المنصة</p>
              ) : (
                <div className="space-y-2">
                  {platformSessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => resumeSession(s.id)}
                      className="p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                      style={{ border: sessionId === s.id ? `1px solid ${config.color}33` : "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-platinum text-xs font-medium truncate flex-1">{s.title ?? "جلسة بدون عنوان"}</div>
                        <FolderOpen size={12} className="text-steel opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-steel text-xs">{new Date(s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span className="text-steel text-xs opacity-50">·</span>
                        <span className="text-gold text-xs">{s.creditsUsed} كريدت</span>
                        {s.summary && (
                          <>
                            <span className="text-steel text-xs opacity-50">·</span>
                            <span className="text-green-400 text-xs flex items-center gap-0.5">
                              <Brain size={9} />
                              ملخص
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Loading session indicator */}
          {loadingSession && (
            <div className="flex items-center justify-center gap-2 py-3 border-b" style={{ borderColor: "rgba(212,160,23,0.08)", background: "rgba(212,160,23,0.04)" }}>
              <Loader2 size={14} className="animate-spin text-gold" />
              <span className="text-gold text-sm">جارٍ تحميل الجلسة السابقة...</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              /* Welcome screen */
              <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: config.bg, border: `1px solid ${config.color}22` }}>
                  <Icon size={36} style={{ color: config.color }} />
                </div>
                <h2 className="text-platinum font-bold text-2xl mb-2">{config.name}</h2>
                <p className="text-steel mb-2 text-sm">{config.tagline}</p>
                <p className="text-steel text-xs mb-6 max-w-md leading-relaxed">{config.description}</p>

                {/* Memory status */}
                {hasProfile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full mb-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <Brain size={12} className="text-green-400" />
                    <span className="text-green-400 text-xs">الذاكرة مفعّلة — {profile?.projectName || "مشروعك محفوظ"}</span>
                  </div>
                )}

                {/* Cost badge */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.15)" }}>
                  <Zap size={13} className="text-gold" />
                  <span className="text-gold text-sm font-medium">{config.creditCost} كريدت لكل رسالة</span>
                </div>

                {/* Placeholder prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {config.placeholders.map((ph, i) => (
                    <button key={i} onClick={() => setInput(ph)}
                      className="p-3 rounded-xl text-right text-sm transition-all hover:scale-[1.01]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                      {ph}
                    </button>
                  ))}
                </div>

                {!canAfford && (
                  <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle size={16} style={{ color: "#ef4444" }} />
                    <span className="text-sm" style={{ color: "#ef4444" }}>رصيدك غير كافٍ. <Link href="/pricing"><span className="underline cursor-pointer">اشحن الآن</span></Link></span>
                  </div>
                )}
              </div>
            ) : (
              /* Messages list */
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ background: msg.role === "user" ? "rgba(212,160,23,0.15)" : config.bg }}>
                    {msg.role === "user" ? <User size={14} className="text-gold" /> : <Icon size={14} style={{ color: config.color }} />}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={{
                      background: msg.role === "user" ? "rgba(212,160,23,0.1)" : "rgba(255,255,255,0.04)",
                      border: msg.role === "user" ? "1px solid rgba(212,160,23,0.15)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {msg.role === "assistant" ? (
                      <div className="text-platinum text-sm leading-relaxed prose-sm prose-invert max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-platinum text-sm leading-relaxed">{msg.content}</p>
                    )}
                    <div className="text-xs mt-2 opacity-40" style={{ color: msg.role === "user" ? "#d4a017" : "#8a9bb0" }}>
                      {msg.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: config.bg }}>
                  <Icon size={14} style={{ color: config.color }} />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: config.color }} />
                    <span className="text-steel text-sm">جارٍ التحليل...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="border-t p-4" style={{ borderColor: "rgba(212,160,23,0.08)", background: "rgba(8,14,26,0.8)" }}>
            {messages.length === 0 && (
              <p className="text-steel text-xs text-center mb-3 opacity-60">{config.disclaimer}</p>
            )}
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                data-mousa-field="chat_input"
                id="platform-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`اسأل ${config.name}...`}
                disabled={!canAfford || chatMutation.isPending}
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-platinum placeholder-steel/50 outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  maxHeight: "120px",
                  lineHeight: "1.5",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                data-mousa-action="send_message"
                disabled={!input.trim() || !canAfford || chatMutation.isPending}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && canAfford && !chatMutation.isPending ? config.color : "rgba(255,255,255,0.06)",
                  opacity: input.trim() && canAfford && !chatMutation.isPending ? 1 : 0.5,
                }}>
                {chatMutation.isPending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-steel text-xs opacity-50">Enter للإرسال · Shift+Enter لسطر جديد</span>
              <div className="flex items-center gap-3">
                {hasProfile && (
                  <div className="flex items-center gap-1">
                    <Brain size={10} className="text-green-400 opacity-70" />
                    <span className="text-green-400 text-xs opacity-70">ذاكرة مفعّلة</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Zap size={10} className="text-gold opacity-60" />
                  <span className="text-gold text-xs opacity-60">{config.creditCost} كريدت/رسالة</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
