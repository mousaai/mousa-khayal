/**
 * useIntroVideo — جلب فيديو تعريفي من mousa.ai Video Library API
 * API عام لا يحتاج مصادقة، يدعم: ar | en | ur | fr
 *
 * Slug mapping:
 *   fada    → sarah-ai
 *   raqaba  → khalid-inspect
 *   harara  → thermabuild
 *   maskan  → fam-housing
 *   code    → archicode
 *   khayal  → tashkila3d
 */

import { useState, useEffect, useCallback } from "react";

const VIDEO_API_BASE = "https://mousa-videos-dhirhndb.manus.space/api/trpc";

export interface IntroVideo {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  language: string;
  requestedLang: string;
  version: string;
  launchDate: number;
}

/** Map internal platform IDs → API slugs */
export const PLATFORM_SLUG_MAP: Record<string, string> = {
  fada: "sarah-ai",
  raqaba: "khalid-inspect",
  harara: "thermabuild",
  maskan: "fam-housing",
  code: "archicode",
  khayal: "tashkila3d",
};

/** Cache to avoid redundant fetches */
const cache: Record<string, IntroVideo | null> = {};

export function useIntroVideo(platformId: string, lang: string) {
  const slug = PLATFORM_SLUG_MAP[platformId] ?? platformId;
  // Normalize lang: only ar/en/ur/fr supported
  const normalizedLang = ["ar", "en", "ur", "fr"].includes(lang) ? lang : "ar";
  const cacheKey = `${slug}:${normalizedLang}`;

  const [video, setVideo] = useState<IntroVideo | null>(
    cache[cacheKey] !== undefined ? cache[cacheKey] : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideo = useCallback(async () => {
    if (cache[cacheKey] !== undefined) {
      setVideo(cache[cacheKey]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const input = encodeURIComponent(
        JSON.stringify({ json: { slug, lang: normalizedLang } })
      );
      const res = await fetch(
        `${VIDEO_API_BASE}/releases.getIntro?input=${input}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const result: IntroVideo | null =
        data?.result?.data?.json ?? null;
      cache[cacheKey] = result;
      setVideo(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      cache[cacheKey] = null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, slug, normalizedLang]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  return { video, loading, error, refetch: fetchVideo };
}
