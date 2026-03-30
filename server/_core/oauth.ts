import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as jose from "jose";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse the state parameter — supports both:
 * - Legacy format: btoa(redirectUri)  (old plain base64)
 * - New format:    btoa(JSON.stringify({ redirectUri, returnPath }))
 */
function parseState(state: string): { redirectUri: string; returnPath: string } {
  try {
    const decoded = atob(state);
    // Try JSON first (new format)
    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed.redirectUri === "string") {
        return {
          redirectUri: parsed.redirectUri,
          returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : "/",
        };
      }
    } catch {
      // Not JSON — legacy format: decoded string is the redirectUri
    }
    // Legacy: decoded is just the redirectUri
    return { redirectUri: decoded, returnPath: "/" };
  } catch {
    return { redirectUri: "/", returnPath: "/" };
  }
}

/**
 * Determine the final redirect destination after login.
 * Supports relative paths and full URLs to mousa.ai / *.mousa.ai.
 */
function buildSafeReturnPath(returnPath: string): string {
  if (returnPath.startsWith("/")) return returnPath;
  if (returnPath.startsWith("https://") || returnPath.startsWith("http://")) {
    try {
      const url = new URL(returnPath);
      const isMousaDomain =
        url.hostname === "mousa.ai" ||
        url.hostname === "www.mousa.ai" ||
        url.hostname.endsWith(".mousa.ai");
      if (isMousaDomain) return returnPath;
    } catch {
      // Invalid URL — fall through to default
    }
  }
  return "/";
}

export function registerOAuthRoutes(app: Express) {
  // ─── Main OAuth callback ─────────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const { returnPath } = parseState(state);

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const safeReturnPath = buildSafeReturnPath(returnPath);

      // ── Check if we need to transfer the session to mousa.ai ──────────────
      // When the OAuth callback lands on manus.space but the user needs to end
      // up on mousa.ai (or a subdomain), we can't set a .mousa.ai cookie from
      // manus.space. Instead we store a one-time token in the SHARED DATABASE
      // and redirect to mousa.ai/api/oauth/transfer which reads it and sets the cookie.
      // Using DB (not JWT) avoids JWT_SECRET mismatch between manus.space and Hetzner.
      const currentHost = req.hostname; // e.g. "mousai-ai-6ppferrq.manus.space"
      const isMousaDomain =
        currentHost === "mousa.ai" ||
        currentHost === "www.mousa.ai" ||
        currentHost.endsWith(".mousa.ai");

      const targetIsMousa =
        safeReturnPath.startsWith("https://mousa.ai") ||
        safeReturnPath.startsWith("https://www.mousa.ai") ||
        safeReturnPath.includes(".mousa.ai") ||
        (safeReturnPath.startsWith("/") && isMousaDomain);

      if (!isMousaDomain && targetIsMousa) {
        // Store token in shared DB — works across different server instances
        const transferToken = await db.createOAuthTransferToken(sessionToken, safeReturnPath);
        const transferUrl = `https://mousa.ai/api/oauth/transfer?token=${encodeURIComponent(transferToken)}`;
        console.log(`[OAuth] DB transfer token created, redirecting to mousa.ai`);
        res.redirect(302, transferUrl);
        return;
      }

      // Normal flow: set cookie directly on this domain
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[OAuth] Login successful for ${userInfo.openId}, redirecting to ${safeReturnPath}`);
      res.redirect(302, safeReturnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── Session transfer endpoint (mousa.ai only) ───────────────────────────
  // Receives a one-time DB token from the manus.space callback,
  // looks it up in the shared database, sets the session cookie on .mousa.ai,
  // then redirects to the final destination.
  app.get("/api/oauth/transfer", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");

    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    let sessionToken: string;
    let returnPath: string;

    // ── Try DB token first (new format) ──────────────────────────────────────
    const dbEntry = await db.consumeOAuthTransferToken(token);
    if (dbEntry) {
      sessionToken = dbEntry.sessionToken;
      returnPath = dbEntry.returnPath;
      console.log(`[OAuth] DB transfer token consumed, returnPath=${returnPath}`);
    } else {
      // ── Fallback: try JWT token (legacy manus.space format) ──────────────
      // The manus.space server may still be running old code that creates JWT tokens.
      // We verify and extract the payload here so login still works.
      try {
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const { payload } = await jose.jwtVerify(token, secret);
        const p = payload as { sessionToken?: string; returnPath?: string };
        if (!p.sessionToken || typeof p.sessionToken !== "string") {
          throw new Error("missing sessionToken in JWT payload");
        }
        sessionToken = p.sessionToken;
        returnPath = typeof p.returnPath === "string" ? p.returnPath : "/";
        console.log(`[OAuth] Legacy JWT transfer token accepted, returnPath=${returnPath}`);
      } catch (jwtErr) {
        console.warn("[OAuth] Transfer token invalid (not DB, not valid JWT):", jwtErr);
        res.redirect(302, "/?error=session_expired");
        return;
      }
    }

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    const safeReturnPath = buildSafeReturnPath(returnPath);
    console.log(`[OAuth] Session transferred to mousa.ai, redirecting to ${safeReturnPath}`);
    res.redirect(302, safeReturnPath);
  });
}
