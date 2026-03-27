/**
 * const.ts — OAuth Bridge Fix for mousa.ai Sub-Platforms
 *
 * Problem: Sub-platforms (fada.mousa.ai, raqaba.mousa.ai, etc.) use
 * window.location.origin as redirect_uri, but these domains are NOT
 * registered in Manus OAuth → causes "redirect_uri domain not allowed" error.
 *
 * Solution: Route OAuth through mousa.ai (the registered domain) using
 * the OAuth Bridge endpoint: /api/platform/login-redirect
 *
 * Flow:
 * 1. User clicks "Sign In" on fada.mousa.ai
 * 2. Browser redirects to: https://mousa.ai/api/platform/login-redirect?platform=fada&returnTo=https://fada.mousa.ai/
 * 3. mousa.ai starts OAuth with redirect_uri=https://mousa.ai/api/oauth/callback (registered ✅)
 * 4. After auth success, mousa.ai generates platform token and redirects back to fada.mousa.ai/?token=...
 */

const MOUSA_AI_BASE = "https://mousa.ai";
const PLATFORM_NAME = "khayal";

/**
 * Detect current platform name from hostname
 * fada.mousa.ai → "fada"
 * raqaba.mousa.ai → "raqaba"
 * etc.
 */
function getCurrentPlatform(): string {
  if (typeof window === "undefined") return "unknown";
  const hostname = window.location.hostname;
  const match = hostname.match(/^([a-z]+)\.mousa\.ai$/);
  return match ? match[1] : "unknown";
}

/**
 * Build the OAuth login URL that routes through mousa.ai
 * Instead of: https://manus.im/app-auth?redirectUri=fada.mousa.ai/api/oauth/callback (❌ not allowed)
 * We use:     https://mousa.ai/api/platform/login-redirect?platform=fada&returnTo=fada.mousa.ai (✅ registered)
 */
export function getLoginUrl(returnPath?: string): string {
  const platform = getCurrentPlatform();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const returnTo = returnPath
    ? `${currentOrigin}${returnPath}`
    : `${currentOrigin}/`;

  const params = new URLSearchParams({
    platform,
    returnTo,
  });

  return `${MOUSA_AI_BASE}/api/platform/login-redirect?${params.toString()}`;
}

/**
 * Get the platform token from URL params (set by mousa.ai after OAuth)
 * Call this on app startup to extract and store the SSO token
 */
export function extractTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    // Clean the URL after extracting token
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return token;
  }
  return null;
}

/**
 * App configuration
 */
export const APP_ID = "6PpfERRQXfuwb7GGi2gFrK";
export const OAUTH_PORTAL_URL = "https://manus.im";
