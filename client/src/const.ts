export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * The Manus-hosted domain for this project (always allowed as OAuth redirect_uri).
 * mousa.ai is NOT registered as an allowed OAuth redirect domain, so we must
 * use the manus.space domain for the OAuth callback, then transfer the session
 * to mousa.ai via /api/oauth/transfer.
 */
const MANUS_SPACE_ORIGIN = "https://mousai-ai-6ppferrq.manus.space";

/** Sub-platform domains that share the main OAuth callback */
const MOUSA_SUBDOMAINS = new Set(["fada", "raqaba", "harara", "maskan", "code", "khayal"]);

/**
 * Returns true if the current hostname is a mousa.ai sub-platform domain
 * (e.g. fada.mousa.ai, raqaba.mousa.ai)
 */
function isSubdomainHost(): boolean {
  if (typeof window === "undefined") return false;
  const match = window.location.hostname.match(/^([a-z]+)\.mousa\.ai$/);
  return !!(match && MOUSA_SUBDOMAINS.has(match[1]));
}

/**
 * Returns true if the current hostname is mousa.ai or www.mousa.ai
 */
function isMousaMainHost(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "mousa.ai" ||
    window.location.hostname === "www.mousa.ai"
  );
}

/**
 * Generate login URL at runtime.
 *
 * Strategy:
 * - Always use the manus.space domain as redirectUri (it's the registered OAuth app domain).
 * - Encode the final returnPath (mousa.ai or subdomain) in the state so the server
 *   can issue a transfer token and redirect back to mousa.ai after OAuth completes.
 *
 * @param returnPath - Path or full URL to redirect to after successful login
 */
export const getLoginUrl = (returnPath: string = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Always use manus.space for the OAuth callback (it's the registered redirect_uri)
  const redirectUri = `${MANUS_SPACE_ORIGIN}/api/oauth/callback`;

  // Embed current language in returnPath so it's preserved after OAuth redirect
  // This ensures the user returns to the same language they were using before login
  const currentLang = typeof window !== "undefined"
    ? localStorage.getItem("mousa_lang") || "ar"
    : "ar";
  // Only add lang param if returnPath doesn't already have it
  const addLangToPath = (path: string): string => {
    try {
      if (path.startsWith("http")) {
        const u = new URL(path);
        if (!u.searchParams.has("lang")) u.searchParams.set("lang", currentLang);
        return u.toString();
      } else {
        const sep = path.includes("?") ? "&" : "?";
        return path.includes("lang=") ? path : `${path}${sep}lang=${currentLang}`;
      }
    } catch { return path; }
  };
  returnPath = addLangToPath(returnPath);

  // Determine the final destination after login
  let finalReturnPath: string;

  if (isSubdomainHost()) {
    // On fada.mousa.ai etc. — return to the subdomain after login
    const subdomainOrigin = window.location.origin;
    finalReturnPath = returnPath.startsWith("/")
      ? `${subdomainOrigin}${returnPath}`
      : returnPath;
  } else if (isMousaMainHost()) {
    // On mousa.ai — return to mousa.ai after login
    finalReturnPath = returnPath.startsWith("/")
      ? `https://mousa.ai${returnPath}`
      : returnPath;
  } else {
    // On manus.space preview or localhost — use relative path (no transfer needed)
    finalReturnPath = returnPath;
  }

  // Encode both redirectUri and returnPath in state so server can redirect correctly
  const statePayload = JSON.stringify({ redirectUri, returnPath: finalReturnPath });
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
