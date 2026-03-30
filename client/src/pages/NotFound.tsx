import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: "#080E1A", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      dir="rtl"
    >
      <div className="text-center px-6 max-w-lg">
        {/* 404 Number */}
        <div
          className="text-8xl font-bold mb-4 select-none"
          style={{ color: "#D4A017", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.04em" }}
        >
          404
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.2)" }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: "#D4A017" }} />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: "#E8EDF2" }}
        >
          الصفحة غير موجودة
        </h1>

        {/* Description */}
        <p
          className="mb-8 leading-relaxed"
          style={{ color: "#8A9BB0", fontSize: "0.95rem" }}
        >
          الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.
          <br />
          تحقق من الرابط أو عد للصفحة الرئيسية.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold"
            style={{ background: "#D4A017", color: "#080E1A", border: "none" }}
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold"
            style={{ borderColor: "rgba(212,160,23,0.3)", color: "#D4A017", background: "transparent" }}
          >
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
        </div>

        {/* Logo */}
        <div className="mt-12" style={{ color: "#4A5568", fontSize: "0.8rem" }}>
          <span style={{ color: "#D4A017", fontFamily: "'JetBrains Mono', monospace" }}>mousa.ai</span>
          {" — "}ذكاء البناء والعمران
        </div>
      </div>
    </div>
  );
}
