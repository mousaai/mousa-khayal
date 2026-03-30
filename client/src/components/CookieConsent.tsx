/*
 * CookieConsent.tsx — Cookie Consent Banner
 * متوافق مع GDPR + PDPL الإماراتي + PDPL السعودي
 * يُحفظ اختيار المستخدم في localStorage
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X, Settings, CheckCircle2, XCircle } from "lucide-react";

type ConsentState = "accepted" | "rejected" | "pending";

const CONSENT_KEY = "mousa_cookie_consent";
const CONSENT_VERSION = "v1"; // زد هذا الرقم عند تغيير سياسة الكوكيز

interface CookiePreferences {
  necessary: boolean;   // دائماً true — لا يمكن إيقافها
  analytics: boolean;   // تحليلات الاستخدام
  marketing: boolean;   // إعلانات مستهدفة (مستقبلاً)
}

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function useCookieConsent() {
  const getSavedConsent = (): ConsentState => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) return "pending";
      const parsed = JSON.parse(saved);
      if (parsed.version !== CONSENT_VERSION) return "pending";
      return parsed.state as ConsentState;
    } catch {
      return "pending";
    }
  };

  const getSavedPrefs = (): CookiePreferences => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) return DEFAULT_PREFS;
      const parsed = JSON.parse(saved);
      return parsed.preferences ?? DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  };

  return { getSavedConsent, getSavedPrefs };
}

export default function CookieConsent() {
  const [state, setState] = useState<ConsentState>("pending");
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === CONSENT_VERSION) {
          setState(parsed.state);
          setPrefs(parsed.preferences ?? DEFAULT_PREFS);
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const saveConsent = (newState: ConsentState, newPrefs: CookiePreferences) => {
    const payload = {
      version: CONSENT_VERSION,
      state: newState,
      preferences: newPrefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    setState(newState);
  };

  const acceptAll = () => {
    const allPrefs = { necessary: true, analytics: true, marketing: true };
    setPrefs(allPrefs);
    saveConsent("accepted", allPrefs);
  };

  const rejectAll = () => {
    const minPrefs = { necessary: true, analytics: false, marketing: false };
    setPrefs(minPrefs);
    saveConsent("rejected", minPrefs);
  };

  const saveCustom = () => {
    saveConsent("accepted", prefs);
    setShowDetails(false);
  };

  // لا تُظهر البانر إذا أعطى المستخدم موافقته مسبقاً
  if (!mounted || state !== "pending") return null;

  return (
    <>
      {/* Overlay for details panel */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Details Panel */}
      {showDetails && (
        <div
          dir="rtl"
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 md:p-8"
          style={{
            background: "#0D1B2A",
            border: "1px solid rgba(212,160,23,0.2)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings size={20} style={{ color: "#D4A017" }} />
              <h3 className="font-bold text-lg" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                إعدادات ملفات الارتباط
              </h3>
            </div>
            <button onClick={() => setShowDetails(false)} style={{ color: "#8A9BB0" }}>
              <X size={20} />
            </button>
          </div>

          <p className="mb-6" style={{ color: "#8A9BB0", fontSize: "0.875rem", lineHeight: 1.7 }}>
            نستخدم ملفات الارتباط (Cookies) لتحسين تجربتك. يمكنك تخصيص موافقتك أدناه.
            لمزيد من المعلومات، اقرأ <Link href="/privacy"><span style={{ color: "#D4A017", cursor: "pointer" }}>سياسة الخصوصية</span></Link>.
          </p>

          <div className="space-y-4 mb-8">
            {/* Necessary */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.1)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm" style={{ color: "#E8EDF2" }}>ضرورية</span>
                  <span className="mr-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>مطلوبة دائماً</span>
                </div>
                <div className="w-10 h-5 rounded-full flex items-center" style={{ background: "#4ade80", justifyContent: "flex-end", padding: "2px" }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: "#fff" }} />
                </div>
              </div>
              <p style={{ color: "#8A9BB0", fontSize: "0.8rem" }}>
                تسجيل الدخول، الجلسات، الأمان. لا يمكن إيقافها.
              </p>
            </div>

            {/* Analytics */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: "#E8EDF2" }}>تحليلية</span>
                <button
                  onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                  className="w-10 h-5 rounded-full flex items-center transition-all"
                  style={{
                    background: prefs.analytics ? "#D4A017" : "#2A3A4A",
                    justifyContent: prefs.analytics ? "flex-end" : "flex-start",
                    padding: "2px",
                  }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: "#fff" }} />
                </button>
              </div>
              <p style={{ color: "#8A9BB0", fontSize: "0.8rem" }}>
                تساعدنا على فهم كيفية استخدام المنصة لتحسين الخدمة. البيانات مجهولة الهوية.
              </p>
            </div>

            {/* Marketing */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: "#E8EDF2" }}>تسويقية</span>
                <button
                  onClick={() => setPrefs(p => ({ ...p, marketing: !p.marketing }))}
                  className="w-10 h-5 rounded-full flex items-center transition-all"
                  style={{
                    background: prefs.marketing ? "#D4A017" : "#2A3A4A",
                    justifyContent: prefs.marketing ? "flex-end" : "flex-start",
                    padding: "2px",
                  }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: "#fff" }} />
                </button>
              </div>
              <p style={{ color: "#8A9BB0", fontSize: "0.8rem" }}>
                لعرض محتوى مخصص وإعلانات ذات صلة (مستقبلاً).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveCustom}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "linear-gradient(135deg,#D4A017,#B8860B)", color: "#050B15" }}
            >
              حفظ التفضيلات
            </button>
            <button
              onClick={rejectAll}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8A9BB0" }}
            >
              رفض الكل
            </button>
          </div>
        </div>
      )}

      {/* Main Banner */}
      {!showDetails && (
        <div
          dir="rtl"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 rounded-2xl p-5"
          style={{
            background: "#0D1B2A",
            border: "1px solid rgba(212,160,23,0.25)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(212,160,23,0.12)" }}>
              <Cookie size={18} style={{ color: "#D4A017" }} />
            </div>
            <div>
              <h4 className="font-bold mb-1" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: "0.95rem" }}>
                نستخدم ملفات الارتباط
              </h4>
              <p style={{ color: "#8A9BB0", fontSize: "0.8rem", lineHeight: 1.65 }}>
                نستخدم كوكيز ضرورية لتشغيل المنصة، وأخرى اختيارية لتحسين تجربتك.
                بالنقر على "قبول الكل" توافق على جميعها.{" "}
                <Link href="/privacy">
                  <span style={{ color: "#D4A017", cursor: "pointer" }}>سياسة الخصوصية</span>
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold text-xs transition-all"
              style={{ background: "linear-gradient(135deg,#D4A017,#B8860B)", color: "#050B15" }}
            >
              <CheckCircle2 size={13} />
              قبول الكل
            </button>
            <button
              onClick={rejectAll}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold text-xs transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              <XCircle size={13} />
              رفض
            </button>
            <button
              onClick={() => setShowDetails(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold text-xs transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8A9BB0" }}
            >
              <Settings size={13} />
              تخصيص
            </button>
          </div>
        </div>
      )}
    </>
  );
}
