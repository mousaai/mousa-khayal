/**
 * PlatformRedirect.tsx
 * صفحة وسيطة لفتح المنصات الفرعية
 * 
 * المنطق المُبسَّط:
 * 1. تُفتح في نفس التبويب أو تبويب جديد عبر window.open("/redirect?platform=fada")
 * 2. الـ session cookie مضبوط على .mousa.ai ويعمل على جميع الـ subdomains تلقائياً
 * 3. نُحوّل المستخدم مباشرة للمنصة مع ?lang= للحفاظ على اللغة
 * 
 * لا حاجة لـ token منفصل — الـ cookie المشترك يكفي
 */

import { useEffect, useState } from "react";

const PLATFORM_URLS: Record<string, string> = {
  fada:    "https://fada.mousa.ai/",
  raqaba:  "https://raqaba.mousa.ai/",
  harara:  "https://harara.mousa.ai/",
  maskan:  "https://maskan.mousa.ai/",
  code:    "https://code.mousa.ai/",
  khayal:  "https://khayal.mousa.ai/",
};

const PLATFORM_NAMES: Record<string, string> = {
  fada:    "فضاء",
  raqaba:  "رقابة",
  harara:  "حرارة",
  maskan:  "مسكن",
  code:    "كود",
  khayal:  "خيال",
};

export default function PlatformRedirect() {
  const [platformName, setPlatformName] = useState("");
  const [status, setStatus] = useState<"redirecting" | "error">("redirecting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform") || "";
    const baseUrl = PLATFORM_URLS[platform];

    if (!baseUrl) {
      setStatus("error");
      setErrorMsg("منصة غير معروفة");
      return;
    }

    setPlatformName(PLATFORM_NAMES[platform] || platform);

    // Get current language from localStorage to preserve it on the sub-platform
    const currentLang = localStorage.getItem("mousa_lang") || "ar";

    // Build the target URL with lang param
    const targetUrl = new URL(baseUrl);
    targetUrl.searchParams.set("lang", currentLang);

    // Short delay for UX (shows loading spinner briefly)
    const timer = setTimeout(() => {
      window.location.replace(targetUrl.toString());
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#080E1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Arabic', sans-serif",
        color: "#E8E0D0",
      }}
    >
      {status === "redirecting" ? (
        <>
          {/* Spinner */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "3px solid rgba(212,160,23,0.2)",
              borderTop: "3px solid #D4A017",
              animation: "spin 0.8s linear infinite",
              marginBottom: 24,
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Logo */}
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#D4A017", marginBottom: 8 }}>
            mousa.ai
          </div>

          <div style={{ fontSize: "1rem", color: "#8A9BB0", marginBottom: 4 }}>
            جاري الانتقال...
          </div>

          {platformName && (
            <div style={{ fontSize: "0.875rem", color: "#D4A017", opacity: 0.7 }}>
              منصة {platformName}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: "2rem", marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: "1.1rem", color: "#E8E0D0", marginBottom: 8 }}>
            حدث خطأ
          </div>
          <div style={{ fontSize: "0.875rem", color: "#8A9BB0", marginBottom: 24 }}>
            {errorMsg}
          </div>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 24px",
              background: "rgba(212,160,23,0.15)",
              border: "1px solid rgba(212,160,23,0.4)",
              borderRadius: 8,
              color: "#D4A017",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            العودة
          </button>
        </>
      )}
    </div>
  );
}
