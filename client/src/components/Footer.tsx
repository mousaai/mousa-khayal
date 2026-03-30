/*
 * mousa.ai — Footer v3.0
 * Design: Obsidian + Gold, IBM Plex Arabic, RTL, clean and elegant
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Zap, Mail, Globe } from "lucide-react";

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const InstagramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const PLATFORMS = [
  { name: "فضاء", desc: "الديكور الداخلي", path: "/fada" },
  { name: "رقابة", desc: "الإشراف الميداني", path: "/raqaba" },
  { name: "حرارة", desc: "الكفاءة الطاقوية", path: "/harara" },
  { name: "مسكن", desc: "الاحتياجات السكنية", path: "/maskan" },
  { name: "كود", desc: "كودات البناء", path: "/code" },
];

const LINKS = [
  { name: "الأسعار والباقات", path: "/pricing" },
  { name: "لوحة التحكم", path: "/dashboard" },
  { name: "الأسئلة الشائعة", path: "/faq" },
  { name: "تواصل معنا", path: "/contact" },
];

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer style={{ background: "#050B15", borderTop: "1px solid rgba(212,160,23,0.08)" }}>
      <div className="container py-10 md:py-16">

        {/* Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 md:gap-10 mb-12">

          {/* Brand Column */}
          <div className="md:col-span-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #D4A017, #B8860B)",
                  color: "#050B15",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                AI
              </div>
              <span
                className="font-bold text-lg"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E8EDF2" }}
              >
                mousa<span style={{ color: "#D4A017" }}>.ai</span>
              </span>
            </div>

            <p className="mb-4" style={{ color: "#8A9BB0", fontSize: "0.875rem", lineHeight: 1.75, maxWidth: "280px" }}>
              منظومة ذكاء اصطناعي متكاملة لقطاع البناء والعمران — من الفكرة الأولى حتى التسليم النهائي.
            </p>

            <div className="flex items-center gap-2 mb-6">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(212,160,23,0.08)",
                  border: "1px solid rgba(212,160,23,0.20)",
                  color: "#D4A017",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                }}
              >
                <Zap size={10} />
                ذكاء البناء والعمران
              </span>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <a
                href="mailto:mousa@almaskanengineering.com"
                className="flex items-center gap-2 transition-colors"
                style={{ color: "#8A9BB0", fontSize: "0.82rem" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}
              >
                <Mail size={13} />
                mousa@almaskanengineering.com
              </a>
              <div className="flex items-center gap-2" style={{ color: "#8A9BB0", fontSize: "0.82rem" }}>
                <Globe size={13} />
                mousa.ai
              </div>
            </div>
          </div>

          {/* Platforms Column */}
          <div className="md:col-span-4">
            <h4
              className="font-bold mb-5 text-sm"
              style={{ color: "#E8EDF2", letterSpacing: "0.04em" }}
            >
              المنصات
            </h4>
            <ul className="space-y-3">
              {PLATFORMS.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div
                      className="flex items-center gap-2 cursor-pointer transition-all group"
                    >
                      <span
                        className="font-semibold text-sm transition-colors"
                        style={{ color: "#E8EDF2" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#E8EDF2")}
                      >
                        {item.name}
                      </span>
                      <span style={{ color: "#8A9BB0", fontSize: "0.78rem" }}>— {item.desc}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column */}
          <div className="md:col-span-4">
            <h4
              className="font-bold mb-5 text-sm"
              style={{ color: "#E8EDF2", letterSpacing: "0.04em" }}
            >
              الخدمات
            </h4>
            <ul className="space-y-3 mb-8">
              {LINKS.map((item) => (
                <li key={item.name}>
                  <Link href={item.path}>
                    <span
                      className="text-sm cursor-pointer transition-colors"
                      style={{ color: "#8A9BB0" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link href="/dashboard">
              <button
                className="btn-gold text-sm"
                style={{ padding: "0.625rem 1.5rem" }}
              >
                ابدأ مجاناً
                <Zap size={13} />
              </button>
            </Link>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="flex items-center gap-3 mb-8">
          <span style={{ color: "#8A9BB0", fontSize: "0.78rem" }}>تابعنا:</span>
          {[
            { href: "https://x.com/mousa_ai", label: "X / Twitter", Icon: XIcon },
            { href: "https://instagram.com/mousa.ai", label: "Instagram", Icon: InstagramIcon },
            { href: "https://linkedin.com/company/mousa-ai", label: "LinkedIn", Icon: LinkedInIcon },
          ].map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: "rgba(212,160,23,0.06)",
                border: "1px solid rgba(212,160,23,0.12)",
                color: "#8A9BB0",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,160,23,0.15)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#D4A017";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(212,160,23,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,160,23,0.06)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#8A9BB0";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(212,160,23,0.12)";
              }}
            >
              <Icon />
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="gold-divider mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-start">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <p style={{ color: "#8A9BB0", fontSize: "0.78rem" }}>
              © 2026 mousa.ai — {t("footer.rights")}
              <span style={{ opacity: 0.45, marginInlineStart: "0.5rem", fontSize: "0.72rem" }}>· ت.ت CN-1288934</span>
            </p>
            <div className="flex items-center gap-3">
              <Link href="/terms">
                <span className="text-xs cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
                  {t("footer.terms")}
                </span>
              </Link>
              <span style={{ color: "rgba(212,160,23,0.3)", fontSize: "0.7rem" }}>|</span>
              <Link href="/privacy">
                <span className="text-xs cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
                  {t("footer.privacy")}
                </span>
              </Link>
              <span style={{ color: "rgba(212,160,23,0.3)", fontSize: "0.7rem" }}>|</span>
              <Link href="/refund">
                <span className="text-xs cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
                  {t("footer.refund")}
                </span>
              </Link>
              <span style={{ color: "rgba(212,160,23,0.3)", fontSize: "0.7rem" }}>|</span>
              <Link href="/contact">
                <span className="text-xs cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
                  تواصل معنا
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="text-xs"
              style={{
                color: "#D4A017",
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.7,
              }}
            >
              v3.0
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
              style={{
                background: "rgba(212,160,23,0.06)",
                border: "1px solid rgba(212,160,23,0.12)",
                color: "#8A9BB0",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#4ade80" }}
              />
              النظام يعمل
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
