/**
 * ForgotPassword.tsx — mousa.ai
 * Request password reset link
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ، يرجى المحاولة لاحقاً");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("يرجى إدخال البريد الإلكتروني");
    forgotMutation.mutate({ email });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #080E1A 0%, #0D1B2A 50%, #0a1628 100%)" }}
      dir="rtl"
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(rgba(212,160,23,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.15) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-3xl font-bold" style={{ color: "#D4A017", fontFamily: "'JetBrains Mono', monospace" }}>
              mousa.ai
            </span>
          </Link>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(13,27,42,0.9)",
            border: "1px solid rgba(212,160,23,0.15)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
          }}
        >
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">تم الإرسال</h2>
              <p className="text-slate-400 text-sm mb-6">
                إذا كان البريد الإلكتروني مسجلاً، ستصلك تعليمات إعادة تعيين كلمة المرور.
              </p>
              <Link href="/login">
                <Button style={{ background: "linear-gradient(135deg, #D4A017, #B8860B)", color: "#080E1A" }}>
                  العودة لتسجيل الدخول
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">نسيت كلمة المرور؟</h1>
              <p className="text-slate-400 text-sm mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300 text-sm">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pr-9"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E8EDF2" }}
                      dir="ltr"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="w-full font-semibold"
                  style={{ background: "linear-gradient(135deg, #D4A017, #B8860B)", color: "#080E1A" }}
                >
                  {forgotMutation.isPending ? (
                    <><Loader2 size={16} className="ml-2 animate-spin" />جاري الإرسال...</>
                  ) : (
                    "إرسال رابط إعادة التعيين"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-400 mt-5">
                تذكرت كلمة المرور؟{" "}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium">
                  تسجيل الدخول
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-1">
            <ArrowLeft size={14} />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
