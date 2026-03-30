/* 
 * Navbar — mousa.ai
 * Design: Blueprint Intelligence | Slate Ink #0D1B2A | Amber #D4A017 | RTL-First
 * v5.0 — Shows user avatar/name when authenticated
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, LogIn, LogOut, User, Zap, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";

const platforms = [
  { nameKey: "platforms.fada.name", subtitleKey: "platforms.fada.tagline", path: "/fada", icon: "🏛️", color: "#D4A017" },
  { nameKey: "platforms.raqaba.name", subtitleKey: "platforms.raqaba.tagline", path: "/raqaba", icon: "🔍", color: "#4A9B7F" },
  { nameKey: "platforms.harara.name", subtitleKey: "platforms.harara.tagline", path: "/harara", icon: "🌡️", color: "#E2724A" },
  { nameKey: "platforms.maskan.name", subtitleKey: "platforms.maskan.tagline", path: "/maskan", icon: "🏠", color: "#5B8DD9" },
  { nameKey: "platforms.code.name", subtitleKey: "platforms.code.tagline", path: "/code", icon: "📋", color: "#9B7FE2" },
  { nameKey: "platforms.khayal.name", subtitleKey: "platforms.khayal.tagline", path: "/khayal", icon: "✨", color: "#E2724A" },
];

function colorToRgb(hex: string): string {
  const map: Record<string, string> = {
    "#D4A017": "212,160,23",
    "#4A9B7F": "74,155,127",
    "#E2724A": "226,114,74",
    "#5B8DD9": "91,141,217",
    "#9B7FE2": "155,127,226",
    "#2563EB": "37,99,235",
  };
  return map[hex] || "212,160,23";
}

/** Get initials from name for avatar fallback */
function getInitials(name: string | null | undefined): string {
  if (!name) return "م";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Navbar() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [location] = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location === path;

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)" }}>
                <span className="text-[#0D1B2A] font-bold text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AI</span>
              </div>
              <span className="font-bold text-white text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                mousa<span style={{ color: "#D4A017" }}>.ai</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Platforms Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPlatformsOpen(!platformsOpen)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: platformsOpen ? "#D4A017" : "#B0C0D4" }}
                onMouseEnter={() => setPlatformsOpen(true)}
                onMouseLeave={() => setPlatformsOpen(false)}
              >
                {t('nav.platforms')}
                <ChevronDown size={14} className={`transition-transform ${platformsOpen ? "rotate-180" : ""}`} />
              </button>

              {platformsOpen && (
                <div
                  className="absolute top-full mt-1 right-0 w-64 rounded-xl py-2 shadow-2xl"
                  style={{ background: "#091422", border: "1px solid rgba(212,160,23,0.15)", zIndex: 100 }}
                  onMouseEnter={() => setPlatformsOpen(true)}
                  onMouseLeave={() => setPlatformsOpen(false)}
                >
                  {platforms.map((p) => (
                    <Link key={p.path} href={p.path}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                        style={{ background: isActive(p.path) ? "rgba(212,160,23,0.08)" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isActive(p.path) ? "rgba(212,160,23,0.08)" : "transparent")}
                        onClick={() => setPlatformsOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                          style={{ background: `rgba(${colorToRgb(p.color)},0.15)` }}>
                          {p.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white">{t(p.nameKey, { defaultValue: p.nameKey })}</div>
                          <div className="text-xs" style={{ color: p.color, opacity: 0.85 }}>{t(p.subtitleKey, { defaultValue: p.subtitleKey })}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/pricing">
              <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ color: isActive("/pricing") ? "#D4A017" : "#B0C0D4" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive("/pricing") ? "#D4A017" : "#B0C0D4")}>
                {t('nav.pricing')}
              </button>
            </Link>
            <Link href="/faq">
              <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ color: isActive("/faq") ? "#D4A017" : "#B0C0D4" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive("/faq") ? "#D4A017" : "#B0C0D4")}>
                {t('nav.faq')}
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ color: isActive("/contact") ? "#D4A017" : "#B0C0D4" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive("/contact") ? "#D4A017" : "#B0C0D4")}>
                {t('nav.contact')}
              </button>
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />

            {/* ── Authenticated: User Avatar + Dropdown ── */}
            {!loading && isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                  style={{
                    background: userMenuOpen ? "rgba(212,160,23,0.15)" : "rgba(212,160,23,0.08)",
                    border: "1px solid rgba(212,160,23,0.25)",
                  }}
                >
                  {/* Avatar circle */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                  >
                    {getInitials(user.name)}
                  </div>
                  {/* Name */}
                  <span className="text-sm font-semibold max-w-[120px] truncate" style={{ color: "#E8E0D0" }}>
                    {user.name || user.email || "المستخدم"}
                  </span>
                  <ChevronDown size={13} style={{ color: "#D4A017" }} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div
                    className="absolute top-full mt-2 left-0 w-52 rounded-xl py-2 shadow-2xl"
                    style={{ background: "#091422", border: "1px solid rgba(212,160,23,0.15)", zIndex: 100 }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(212,160,23,0.1)" }}>
                      <div className="text-sm font-semibold text-white truncate">{user.name || "المستخدم"}</div>
                      {user.email && <div className="text-xs truncate mt-0.5" style={{ color: "#8A9BB0" }}>{user.email}</div>}
                    </div>

                    {/* Menu items */}
                    <Link href="/dashboard">
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
                        style={{ color: "#B0C0D4" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#E8E0D0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#B0C0D4"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User size={14} />
                        لوحة التحكم
                      </div>
                    </Link>

                    <Link href="/credits">
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
                        style={{ color: "#B0C0D4" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#E8E0D0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#B0C0D4"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Zap size={14} />
                        رصيد الكريدت
                      </div>
                    </Link>

                    <div className="my-1" style={{ borderTop: "1px solid rgba(212,160,23,0.08)" }} />

                    {/* Logout */}
                    <button
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-sm transition-colors"
                      style={{ color: "#E2724A" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(226,114,74,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                    >
                      <LogOut size={14} />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : !loading ? (
              /* ── Unauthenticated: Login + Register buttons ── */
              <>
                <a href={getLoginUrl()} rel="noopener noreferrer">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.2)", color: "#D4A017" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,160,23,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(212,160,23,0.08)")}>
                    <LogIn size={14} />
                    <span className="text-sm font-medium">{t('nav.login')}</span>
                  </button>
                </a>
                <a href={getLoginUrl()} rel="noopener noreferrer">
                  <button className="btn-gold text-sm px-4 py-2">{t('hero.ctaSecondary')}</button>
                </a>
              </>
            ) : (
              /* Loading skeleton */
              <div className="w-28 h-9 rounded-xl animate-pulse" style={{ background: "rgba(212,160,23,0.08)" }} />
            )}
          </div>

          {/* Mobile: Language Switcher always visible + Menu Button */}
          <div className="md:hidden flex items-center gap-1.5">
            <LanguageSwitcher />
            {/* Mobile user avatar if authenticated */}
            {!loading && isAuthenticated && user && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
              >
                {getInitials(user.name)}
              </div>
            )}
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} style={{ color: "#D4A017" }} /> : <Menu size={18} style={{ color: "#B0C0D4" }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: "#0D1B2A", borderTop: "1px solid rgba(212,160,23,0.1)" }}>
          <div className="container py-4 space-y-1">
            {/* Mobile user info if authenticated */}
            {!loading && isAuthenticated && user && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl" style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.12)" }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A017, #F0C040)", color: "#0D1B2A" }}
                >
                  {getInitials(user.name)}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{user.name || "المستخدم"}</div>
                  {user.email && <div className="text-xs" style={{ color: "#8A9BB0" }}>{user.email}</div>}
                </div>
              </div>
            )}

            {platforms.map((p) => (
              <Link key={p.path} href={p.path}>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
                  style={{ background: isActive(p.path) ? "rgba(212,160,23,0.08)" : "transparent" }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{p.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{t(p.nameKey, { defaultValue: p.nameKey })}</span>
                    <span className="text-xs" style={{ color: p.color, opacity: 0.85 }}>{t(p.subtitleKey, { defaultValue: p.subtitleKey })}</span>
                  </div>
                </div>
              </Link>
            ))}
            <div className="gold-line my-3" />
            <Link href="/pricing">
              <div className="px-4 py-3 rounded-lg cursor-pointer text-white" onClick={() => setMobileOpen(false)}>{t('nav.pricing')}</div>
            </Link>
            <Link href="/faq">
              <div className="px-4 py-3 rounded-lg cursor-pointer text-white" onClick={() => setMobileOpen(false)}>{t('nav.faq')}</div>
            </Link>
            <Link href="/contact">
              <div className="px-4 py-3 rounded-lg cursor-pointer text-white" onClick={() => setMobileOpen(false)}>{t('nav.contact')}</div>
            </Link>

            {!loading && isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer" style={{ color: "#D4A017" }} onClick={() => setMobileOpen(false)}>
                    <User size={15} />
                    لوحة التحكم
                  </div>
                </Link>
                <button
                  className="flex items-center gap-2 px-4 py-3 rounded-lg w-full text-right"
                  style={{ color: "#E2724A" }}
                  onClick={() => { setMobileOpen(false); logout(); }}
                >
                  <LogOut size={15} />
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <a href={getLoginUrl()} rel="noopener noreferrer" className="block">
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer" style={{ color: "#D4A017" }} onClick={() => setMobileOpen(false)}>
                  <LogIn size={15} />
                  {t('nav.login')} / {t('hero.ctaSecondary')}
                </div>
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
