/**
 * Register.tsx — mousa.ai
 * Independent registration: email/password + Manus OAuth option
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح! مرحباً بك في mousa.ai");
      navigate("/dashboard");
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        toast.error("البريد الإلكتروني مسجل مسبقاً — يمكنك تسجيل الدخول");
      } else {
        toast.error(err.message || "فشل إنشاء الحساب");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("يرجى ملء جميع الحقول");
    if (password !== confirmPassword) return toast.error("كلمتا المرور غير متطابقتين");
    if (password.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    registerMutation.mutate({ name, email, password });
  };

  const oauthUrl = getLoginUrl("/dashboard");

  const passwordStrength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : 3;

  const strengthColors = ["", "#ef4444", "#f59e0b", "#22c55e"];
  const strengthLabels = ["", "ضعيفة", "متوسطة", "قوية"];

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
          <h1 className="text-2xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
          <p className="text-slate-400 text-sm mb-6">انضم إلى منظومة mousa.ai واحصل على 200 كريدت مجاناً</p>

          {/* Welcome bonus badge */}
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.2)" }}>
            <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
            <span className="text-amber-300 text-sm">200 كريدت مجاني عند التسجيل — ابدأ فوراً بدون دفع</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm">الاسم الكامل</Label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="pr-9"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E8EDF2" }}
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="8 أحرف على الأقل"
                  className="pr-9 pl-9"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", color: "#E8EDF2" }}
                  dir="ltr"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-slate-700">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${(passwordStrength / 3) * 100}%`, background: strengthColors[passwordStrength] }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: strengthColors[passwordStrength] }}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="pr-9"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: confirmPassword && confirmPassword !== password
                      ? "1px solid #ef4444"
                      : "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2"
                  }}
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-red-400 text-xs">كلمتا المرور غير متطابقتين</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full font-semibold mt-2"
              style={{ background: "linear-gradient(135deg, #D4A017, #B8860B)", color: "#080E1A" }}
            >
              {registerMutation.isPending ? (
                <><Loader2 size={16} className="ml-2 animate-spin" />جاري إنشاء الحساب...</>
              ) : (
                <><UserPlus size={16} className="ml-2" />إنشاء الحساب</>
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
              التسجيل بحساب mousa.ai
            </Button>
          </a>

          {/* Login link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium">
              تسجيل الدخول
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center text-xs text-slate-600 mt-3">
            بالتسجيل توافق على{" "}
            <Link href="/terms" className="text-slate-500 hover:text-slate-400 underline">شروط الاستخدام</Link>
            {" "}و{" "}
            <Link href="/privacy" className="text-slate-500 hover:text-slate-400 underline">سياسة الخصوصية</Link>
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
