/* 
 * App.tsx — mousa.ai Router
 * All routes connected | RTL | Navy/Gold
 * Sub-platforms are independent external apps — redirect on access
 * PERF: All pages are lazy-loaded for faster initial load
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useMousaWidget } from "./hooks/useMousaWidget";
import FeedbackWidget from "./components/FeedbackWidget";
import { useAuth } from "./_core/hooks/useAuth";

// ─── Critical: Home loads eagerly (first paint) ───────────────────────────
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// ─── Sub-platform hostname detection ─────────────────────────────────────
// Maps subdomain → platform page component
const SUBDOMAIN_PLATFORM_MAP: Record<string, string> = {
  "fada":   "fada",
  "raqaba": "raqaba",
  "harara": "harara",
  "maskan": "maskan",
  "code":   "code",
  "khayal": "khayal",
};

/** Returns the platform id if the current hostname is a sub-platform domain */
function getSubdomainPlatform(): string | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  // Match fada.mousa.ai, raqaba.mousa.ai, etc.
  const match = hostname.match(/^([a-z]+)\.mousa\.ai$/);
  if (match && SUBDOMAIN_PLATFORM_MAP[match[1]]) {
    return SUBDOMAIN_PLATFORM_MAP[match[1]];
  }
  return null;
}

// ─── Lazy: All other pages load on-demand ─────────────────────────────────
const Pricing           = lazy(() => import("./pages/Pricing"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Admin             = lazy(() => import("./pages/Admin"));
const Terms             = lazy(() => import("./pages/Terms"));
const Privacy           = lazy(() => import("./pages/Privacy"));
const Refund            = lazy(() => import("./pages/Refund"));
const Contact           = lazy(() => import("./pages/Contact"));
const FAQ               = lazy(() => import("./pages/FAQ"));
const PartnerPortal     = lazy(() => import("./pages/PartnerPortal"));
const Archive           = lazy(() => import("./pages/Archive"));
const Gigs              = lazy(() => import("./pages/Gigs"));
const ExpertCorrections = lazy(() => import("./pages/ExpertCorrections"));
const DigitalTwin       = lazy(() => import("./pages/DigitalTwin"));
const Login             = lazy(() => import("./pages/Login"));
const Register          = lazy(() => import("./pages/Register"));
const ForgotPassword    = lazy(() => import("./pages/ForgotPassword"));
const PlatformAnalytics = lazy(() => import("./pages/PlatformAnalytics"));
const FeedbackAdmin     = lazy(() => import("./pages/FeedbackAdmin"));
const Referral          = lazy(() => import("./pages/Referral"));
const PlatformRedirectPage = lazy(() => import("./pages/PlatformRedirect"));

// ─── Lazy: PlatformIntroPopup (heavy component) ───────────────────────────
const PlatformIntroPopup = lazy(() => import("./components/PlatformIntroPopup"));

// ─── Lazy: Platform pages for sub-domain routing ─────────────────────────
const Fada    = lazy(() => import("./pages/Fada"));
const Raqaba  = lazy(() => import("./pages/Raqaba"));
const Harara  = lazy(() => import("./pages/Harara"));
const Maskan  = lazy(() => import("./pages/Maskan"));
const Code    = lazy(() => import("./pages/Code"));
const Khayal  = lazy(() => import("./pages/Khayal"));

const PLATFORM_COMPONENTS: Record<string, React.ComponentType> = {
  fada:   Fada,
  raqaba: Raqaba,
  harara: Harara,
  maskan: Maskan,
  code:   Code,
  khayal: Khayal,
};

// ─── Minimal loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080E1A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid rgba(240,192,64,0.15)",
        borderTopColor: "#f0c040",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// External platform URLs — each sub-platform is an independent app
const EXTERNAL_PLATFORM_URLS: Record<string, string> = {
  "/fada":    "https://fada.mousa.ai/",
  "/raqaba":  "https://raqaba.mousa.ai/",
  "/harara":  "https://harara.mousa.ai/",
  "/maskan":  "https://maskan.mousa.ai/",
  "/code":    "https://code.mousa.ai/",
  "/khayal":  "https://khayal.mousa.ai/",
};

// Platform redirect with intro video popup
// If user is already authenticated, skip popup and redirect directly
function PlatformRedirect({ platform, to }: { platform: string; to: string }) {
  const { isAuthenticated, loading } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth check
    if (isAuthenticated) {
      // User is logged in — redirect directly without popup
      const currentLang = localStorage.getItem("mousa_lang") || "ar";
      const targetUrl = new URL(to);
      targetUrl.searchParams.set("lang", currentLang);
      window.location.replace(targetUrl.toString());
    } else {
      // Not logged in — show intro popup
      setShowPopup(true);
    }
  }, [isAuthenticated, loading, to]);

  const handleClose = () => {
    setShowPopup(false);
    try { window.close(); } catch { /* ignore */ }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ minHeight: "100vh", background: "#080E1A" }}>
      {showPopup && (
        <Suspense fallback={<PageLoader />}>
          <PlatformIntroPopup
            platform={platform}
            targetUrl={to}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </div>
  );
}

function Router() {
  // If we're on a sub-platform domain (e.g. fada.mousa.ai), render that platform directly
  const subdomainPlatform = getSubdomainPlatform();
  if (subdomainPlatform) {
    const PlatformComponent = PLATFORM_COMPONENTS[subdomainPlatform];
    if (PlatformComponent) {
      return (
        <Suspense fallback={<PageLoader />}>
          <PlatformComponent />
        </Suspense>
      );
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />

        {/* Sub-platform routes → show intro video popup then redirect */}
        <Route path="/fada">
          <PlatformRedirect platform="fada" to={EXTERNAL_PLATFORM_URLS["/fada"]} />
        </Route>
        <Route path="/raqaba">
          <PlatformRedirect platform="raqaba" to={EXTERNAL_PLATFORM_URLS["/raqaba"]} />
        </Route>
        <Route path="/harara">
          <PlatformRedirect platform="harara" to={EXTERNAL_PLATFORM_URLS["/harara"]} />
        </Route>
        <Route path="/maskan">
          <PlatformRedirect platform="maskan" to={EXTERNAL_PLATFORM_URLS["/maskan"]} />
        </Route>
        <Route path="/code">
          <PlatformRedirect platform="code" to={EXTERNAL_PLATFORM_URLS["/code"]} />
        </Route>
        {/* GAP-W001-001: /khayal route */}
        <Route path="/khayal">
          <PlatformRedirect platform="khayal" to={EXTERNAL_PLATFORM_URLS["/khayal"]} />
        </Route>

        <Route path="/pricing" component={Pricing} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={Admin} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/refund" component={Refund} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/partner" component={PartnerPortal} />
        <Route path="/archive" component={Archive} />
        <Route path="/gigs" component={Gigs} />
        <Route path="/corrections" component={ExpertCorrections} />
        <Route path="/digital-twin" component={DigitalTwin} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/analytics" component={PlatformAnalytics} />
        <Route path="/admin/feedback" component={FeedbackAdmin} />
        <Route path="/referral" component={Referral} />
        <Route path="/redirect" component={PlatformRedirectPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppInner() {
  useMousaWidget();
  return null;
}

function App() {
  const { i18n } = useTranslation();

  // Apply language from URL param (set by getLoginUrl to preserve language across OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get("lang");
    const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    if (langParam && supportedCodes.includes(langParam as any) && i18n.language !== langParam) {
      i18n.changeLanguage(langParam);
      // Clean the lang param from URL without reload
      params.delete("lang");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  useEffect(() => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = lang.code;
    }
  }, [i18n.language]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#162236",
                border: "1px solid rgba(201,168,76,0.2)",
                color: "#F0EDE6",
                direction: "rtl",
              },
            }}
          />
          <AppInner />
          <Router />
          <CookieConsent />
          <FeedbackWidget floating={true} platform="general" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
