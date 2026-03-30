import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const handleChange = (code: LangCode) => {
    i18n.changeLanguage(code);
    // Update document direction and lang attribute
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = code;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-sm font-medium px-2"
          style={{ color: "rgba(212,160,23,0.9)" }}
        >
          <Globe size={15} />
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px]"
        style={{
          background: "rgba(8,14,26,0.97)",
          border: "1px solid rgba(212,160,23,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className="gap-2 cursor-pointer"
            style={{
              color: i18n.language === lang.code ? "rgb(212,160,23)" : "rgba(255,255,255,0.8)",
              fontWeight: i18n.language === lang.code ? 600 : 400,
            }}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {i18n.language === lang.code && (
              <span className="mr-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
