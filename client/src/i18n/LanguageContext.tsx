/**
 * LanguageContext.tsx — سياق اللغة العالمي لمنصة خيال
 * يوفر اللغة الحالية والترجمات لجميع المكونات
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { TRANSLATIONS, ALL_LANGS, isRTLLang, type LangCode, type Translations } from "./translations";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: Translations;
  isRTL: boolean;
  /** كشف اللغة من النص المكتوب */
  detectLangFromText: (text: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "khayal_lang";

function detectLang(text: string): LangCode | null {
  if (text.length < 5) return null;
  if (/[\u0600-\u06FF]/.test(text)) {
    // تمييز الأوردو عن العربية بالأحرف الخاصة بالأوردو
    if (/[\u0679\u0688\u0691\u06BE\u06C1\u06C3\u06D2]/.test(text)) return "UR";
    return "AR";
  }
  if (/[àâçéèêëîïôùûüæœ]/i.test(text)) return "FR";
  if (/[a-zA-Z]/.test(text)) return "EN";
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    // قراءة من URL أولاً (?lang=EN)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang")?.toUpperCase() as LangCode;
    if (urlLang && ALL_LANGS.includes(urlLang)) return urlLang;
    // ثم من localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode;
    if (stored && ALL_LANGS.includes(stored)) return stored;
    // ثم من المتصفح
    const browserLang = navigator.language.slice(0, 2).toUpperCase();
    if (browserLang === "AR") return "AR";
    if (browserLang === "FR") return "FR";
    if (browserLang === "UR") return "UR";
    return "AR"; // الافتراضي
  });

  const isRTL = isRTLLang(lang);
  const t = TRANSLATIONS[lang];

  const setLang = useCallback((newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const detectLangFromText = useCallback((text: string) => {
    const detected = detectLang(text);
    if (detected) setLang(detected);
  }, [setLang]);

  // تحديث document.documentElement عند تغيير اللغة
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang.toLowerCase();
    html.dir = isRTL ? "rtl" : "ltr";
    // تحديث عنوان الصفحة حسب اللغة
    document.title = t.appName + " — " + t.appSubtitle;
  }, [lang, isRTL, t]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL, detectLangFromText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
