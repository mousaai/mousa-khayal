/*
 * Contact.tsx — صفحة تواصل معنا
 * mousa.ai | نموذج دعم مع إشعار فوري للمالك
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight, Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "البريد الإلكتروني",
    value: "mousa@almaskanengineering.com",
    href: "mailto:mousa@almaskanengineering.com",
  },
  {
    icon: Phone,
    label: "الهاتف",
    value: "+971 50 432 3033",
    href: "tel:+971504323033",
  },
  {
    icon: MapPin,
    label: "العنوان",
    value: "جزيرة أبوظبي، النادي السياحي، بناية سعيد عبدالله ناصر الجنيبي",
    href: null,
  },
  {
    icon: Clock,
    label: "ساعات العمل",
    value: "الأحد – الخميس: 9:00 ص – 6:00 م",
    href: null,
  },
];

const SUBJECTS = [
  "استفسار عام",
  "مشكلة تقنية",
  "طلب استرداد",
  "اقتراح أو ملاحظة",
  "شراكة أو تعاون",
  "الباقة المؤسسية",
  "أخرى",
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const notifyMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("لم نتمكن من إرسال رسالتك. يرجى المحاولة مجدداً أو التواصل مباشرة عبر البريد الإلكتروني.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    notifyMutation.mutate({
      title: `📩 رسالة جديدة من ${form.name} — ${form.subject || "استفسار عام"}`,
      content: `**الاسم:** ${form.name}\n**البريد:** ${form.email}\n**الموضوع:** ${form.subject || "—"}\n\n**الرسالة:**\n${form.message}`,
    });
  };

  return (
    <div dir="rtl" style={{ background: "#060E18", minHeight: "100vh", color: "#E8EDF2" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(to bottom, #0D1B2A, #060E18)", borderBottom: "1px solid rgba(212,160,23,0.12)", padding: "5rem 0 3rem" }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <Link href="/">
            <button
              className="flex items-center gap-2 mb-8 text-sm transition-colors"
              style={{ color: "#8A9BB0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}
            >
              <ArrowRight size={15} />
              العودة إلى الرئيسية
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.2)" }}
            >
              <MessageSquare size={20} style={{ color: "#D4A017" }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              تواصل معنا
            </h1>
          </div>
          <p style={{ color: "#8A9BB0", fontSize: "0.95rem", lineHeight: 1.7 }}>
            فريقنا جاهز للإجابة على استفساراتك ودعمك في الحصول على أفضل تجربة مع mousa.ai
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ maxWidth: 960, padding: "3rem 1rem 5rem" }}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Left: Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={15} style={{ color: "#D4A017" }} />
                <span className="text-xs font-semibold" style={{ color: "#D4A017", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
                  الجهة المشغِّلة
                </span>
              </div>
              <p className="font-bold" style={{ color: "#E8EDF2", fontSize: "1rem" }}>شركة المسكن للاستشارات الهندسية</p>
              <p style={{ color: "#8A9BB0", fontSize: "0.78rem", marginTop: "0.2rem" }}>AL MASKAN ENGINEERING CONSULTANTS</p>
            </div>

            <div className="space-y-4">
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.15)" }}
                    >
                      <Icon size={15} style={{ color: "#D4A017" }} />
                    </div>
                    <div>
                      <p style={{ color: "#8A9BB0", fontSize: "0.75rem", marginBottom: "0.15rem" }}>{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          style={{ color: "#C8D4E0", fontSize: "0.9rem", lineHeight: 1.5 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#C8D4E0")}
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p style={{ color: "#C8D4E0", fontSize: "0.9rem", lineHeight: 1.5 }}>{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Response time note */}
            <div
              className="p-4 rounded-xl"
              style={{ background: "rgba(212,160,23,0.04)", border: "1px solid rgba(212,160,23,0.12)" }}
            >
              <p style={{ color: "#8A9BB0", fontSize: "0.85rem", lineHeight: 1.7 }}>
                <span style={{ color: "#D4A017", fontWeight: 600 }}>⏱ وقت الاستجابة:</span> نستهدف الرد على جميع الاستفسارات خلال <strong style={{ color: "#E8EDF2" }}>24 ساعة عمل</strong>.
              </p>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div
                className="flex flex-col items-center justify-center text-center p-12 rounded-2xl"
                style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", minHeight: 400 }}
              >
                <CheckCircle2 size={52} style={{ color: "#4ade80", marginBottom: "1.25rem" }} />
                <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", color: "#E8EDF2" }}>
                  تم إرسال رسالتك بنجاح!
                </h2>
                <p style={{ color: "#8A9BB0", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 380 }}>
                  سيتواصل معك فريقنا على بريدك الإلكتروني خلال 24 ساعة عمل.
                </p>
                <button
                  className="mt-8 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.25)", color: "#D4A017" }}
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,160,23,0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,160,23,0.12)"; }}
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl p-8 space-y-5"
                style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.1)" }}
              >
                <h2 className="text-lg font-bold mb-6" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                  أرسل لنا رسالة
                </h2>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: "#8A9BB0" }}>
                      الاسم <span style={{ color: "#E2724A" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="اسمك الكريم"
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,160,23,0.15)",
                        color: "#E8EDF2",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.4)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.15)")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: "#8A9BB0" }}>
                      البريد الإلكتروني <span style={{ color: "#E2724A" }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                      dir="ltr"
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,160,23,0.15)",
                        color: "#E8EDF2",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.4)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.15)")}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: "#8A9BB0" }}>
                    موضوع الرسالة
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                    style={{
                      background: "rgba(13,27,42,0.9)",
                      border: "1px solid rgba(212,160,23,0.15)",
                      color: form.subject ? "#E8EDF2" : "#8A9BB0",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.15)")}
                  >
                    <option value="" style={{ background: "#0D1B2A" }}>اختر موضوع الرسالة</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s} style={{ background: "#0D1B2A" }}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: "#8A9BB0" }}>
                    الرسالة <span style={{ color: "#E2724A" }}>*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all resize-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(212,160,23,0.15)",
                      color: "#E8EDF2",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.15)")}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={notifyMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: notifyMutation.isPending ? "rgba(212,160,23,0.3)" : "linear-gradient(135deg, #D4A017, #B8860B)",
                    color: "#060E18",
                    cursor: notifyMutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {notifyMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      إرسال الرسالة
                    </>
                  )}
                </button>

                <p style={{ color: "#8A9BB0", fontSize: "0.75rem", textAlign: "center" }}>
                  بإرسال هذه الرسالة، أنت توافق على{" "}
                  <Link href="/privacy">
                    <span style={{ color: "#D4A017", cursor: "pointer" }}>سياسة الخصوصية</span>
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
