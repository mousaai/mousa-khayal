import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar";
import en from "./locales/en";
import ur from "./locales/ur";
import hi from "./locales/hi";
import fr from "./locales/fr";

export const SUPPORTED_LANGUAGES = [
  { code: "ar", name: "العربية", dir: "rtl", flag: "🇦🇪" },
  { code: "en", name: "English", dir: "ltr", flag: "🇬🇧" },
  { code: "ur", name: "اردو", dir: "rtl", flag: "🇵🇰" },
  { code: "hi", name: "हिंदी", dir: "ltr", flag: "🇮🇳" },
  { code: "fr", name: "Français", dir: "ltr", flag: "🇫🇷" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Determine initial language:
// 1. Check URL ?lang= param first
// 2. Then check localStorage
// 3. Default to Arabic (never use browser language)
function getInitialLanguage(): string {
  const SUPPORTED = ["ar", "en", "ur", "hi", "fr"];
  try {
    // Check URL query param
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
    // Check localStorage
    const stored = localStorage.getItem("mousa_lang");
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    // SSR or localStorage unavailable
  }
  // Default: Arabic
  return "ar";
}

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      ur: { translation: ur },
      hi: { translation: hi },
      fr: { translation: fr },
    },
    lng: initialLang,           // Set language explicitly — no auto-detection
    fallbackLng: "ar",
    supportedLngs: ["ar", "en", "ur", "hi", "fr"],
    interpolation: {
      escapeValue: false,
    },
  });

// Persist language changes to localStorage
i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("mousa_lang", lng);
  } catch { /* ignore */ }
});

export default i18n;
