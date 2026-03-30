import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  // If on a known production domain (mousa.ai or subdomains), always treat as secure
  // This handles cases where the reverse proxy doesn't forward x-forwarded-proto
  const hostname = req.hostname;
  const isMousaDomain =
    hostname === "mousa.ai" ||
    hostname === "www.mousa.ai" ||
    hostname.endsWith(".mousa.ai");
  if (isMousaDomain) return true;

  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isLocal = LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);

  // Set cookie domain to .mousa.ai so the session is shared across all subdomains:
  // mousa.ai, fada.mousa.ai, raqaba.mousa.ai, harara.mousa.ai, etc.
  // This means a user who logs in on mousa.ai is automatically authenticated on all sub-platforms.
  let domain: string | undefined;
  if (!isLocal) {
    if (
      hostname === "mousa.ai" ||
      hostname === "www.mousa.ai" ||
      hostname.endsWith(".mousa.ai")
    ) {
      domain = ".mousa.ai";
    }
    // For Manus preview domains (.manus.space) or other hosts: no cross-subdomain domain needed
  }

  const secure = isSecureRequest(req);

  // Use sameSite: "lax" for mousa.ai domains:
  // - All subdomains (fada.mousa.ai, etc.) share the same .mousa.ai cookie domain
  // - "lax" is same-site for *.mousa.ai since they share the same eTLD+1
  // - "none" is NOT needed and causes issues on Safari iOS (ITP blocks it)
  // - "lax" works perfectly for subdomain cookie sharing
  const sameSite: CookieOptions["sameSite"] = "lax";

  console.log(`[Cookie] hostname=${hostname} domain=${domain} secure=${secure} sameSite=${sameSite}`);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
