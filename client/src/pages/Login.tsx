/**
 * Login.tsx — mousa.ai
 * Hybrid login: email/password (independent) + Manus OAuth (optional)
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "فشل تسجيل الدخول");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
    loginMutation.mutate({ email, password });
  };

  const returnPath = new URLSearchParams(window.location.search).get("returnPath") || "/dashboard";
  const oauthUrl = getLoginUrl(returnPath);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #080E1A 0%, #0D1B2A 50%, #0a1628 100%)" }}
      dir="rtl"
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(rgba(212,160,23,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.15) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-3xl font-bold" style={{ color: "#D4A017", fontFamily: "'JetBrains Mono', monospace" }}>
              mousa.ai
            </span>
          </Link>
          <p className="text-slate-400 mt-2 text-sm">المنظومة الرقمية الذكية للبناء والعمران</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(13,27,42,0.9)",
            border: "1px solid rgba(212,160,23,0.15)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
          }}
        >
          <h1 className="text-2xl font-bold text-white mb-2">تسجيل الدخول</h1>
          <p className="text-slate-400 text-sm mb-6">أدخل بياناتك للوصول إلى حسابك</p>

          {/* Email/Password Form */}
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
                  className="pr-9 text-right"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E8EDF2" }}
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">كلمة المرور</Label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9 pl-9"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E8EDF2" }}
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full font-semibold"
              style={{ background: "linear-gradient(135deg, #D4A017, #B8860B)", color: "#080E1A" }}
            >
              {loginMutation.isPending ? (
                <><Loader2 size={16} className="ml-2 animate-spin" />جاري تسجيل الدخول...</>
              ) : (
                <><LogIn size={16} className="ml-2" />تسجيل الدخول</>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(212,160,23,0.15)" }} />
            <span className="text-slate-500 text-xs">أو</span>
            <div className="flex-1 h-px" style={{ background: "rgba(212,160,23,0.15)" }} />
          </div>

          {/* SSO OAuth */}
          <a href={oauthUrl}>
            <Button
              variant="outline"
              className="w-full"
              style={{ border: "1px solid rgba(212,160,23,0.25)", background: "rgba(255,255,255,0.03)", color: "#E8EDF2" }}
            >
              <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              الدخول بحساب mousa.ai
            </Button>
          </a>

          {/* Register link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        {/* Back to home */}
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
