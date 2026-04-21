/**
 * imageGeneration.ts — نظام توليد الصور الهجين لمنصة خيال
 *
 * ═══════════════════════════════════════════════════════════════
 * ترتيب الأولوية (Waterfall Fallback):
 *
 *  1️⃣  OpenAI DALL-E 3               — جودة عالية، موثوق
 *  2️⃣  Gemini 3.1 Flash Image Preview  — الأحدث، أعلى جودة
 *  3️⃣  Gemini 2.5 Flash Image          — سريع جداً، جودة عالية
 *  4️⃣  Stability AI Ultra              — احترافي، $0.08/صورة
 *  5️⃣  Stability AI Core               — بديل أرخص، $0.03/صورة
 *  6️⃣  Replicate Flux Schnell          — احتياطي أخير، يحتاج رصيد
 *
 * الانتقال التلقائي: إذا فشل مزود (403/402/429/500) ينتقل للتالي
 * ═══════════════════════════════════════════════════════════════
 */

import { ENV } from "./env";
import { storagePut } from "../storage";

// ─── الأنواع ──────────────────────────────────────────────────────────────

export type ImageQuality = "schnell" | "pro";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  quality?: ImageQuality;
};

export type GenerateImageResponse = {
  url?: string;
  provider?: string;
};

type ProviderName =
  | "openai-dalle3"
  | "gemini-3.1-flash-image"
  | "gemini-2.5-flash-image"
  | "stability-ultra"
  | "stability-core"
  | "replicate-flux";

// ─── أخطاء قابلة للـ Fallback ─────────────────────────────────────────────

function shouldFallback(status: number): boolean {
  // 402 = رصيد منتهٍ، 403 = محجوب، 429 = rate limit، 5xx = خطأ خادم
  return [402, 403, 429, 500, 502, 503, 504].includes(status) || status === 0 || status === 401;
}

// ─── مساعد: تحويل URL صورة إلى Base64 ────────────────────────────────────

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith("data:")) {
      const [meta, data] = url.split(",");
      return { data, mimeType: meta.split(":")[1].split(";")[0] };
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {
      data: Buffer.from(buf).toString("base64"),
      mimeType: res.headers.get("content-type") || "image/jpeg",
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// المزود ١: OpenAI DALL-E 3
// ═══════════════════════════════════════════════════════════════

async function generateWithOpenAI(
  prompt: string
): Promise<Buffer> {
  const key = ENV.openAiApiKey;
  if (!key) throw Object.assign(new Error("OPENAI_API_KEY not configured"), { status: 401 });

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`OpenAI DALL-E HTTP ${res.status}: ${body.substring(0, 200)}`),
      { status: res.status }
    );
  }

  const data = await res.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message: string };
  };

  if (data.error) {
    throw Object.assign(new Error(`OpenAI error: ${data.error.message}`), { status: 400 });
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw Object.assign(new Error("OpenAI DALL-E: no image in response"), { status: 500 });
  }

  return Buffer.from(b64, "base64");
}

// ═══════════════════════════════════════════════════════════════
// المزود ٢ و٣: Google Gemini Image
// ═══════════════════════════════════════════════════════════════

async function generateWithGemini(
  model: "gemini-3.1-flash-image-preview" | "gemini-2.5-flash-image",
  prompt: string,
  originalImages?: GenerateImageOptions["originalImages"]
): Promise<Buffer> {
  const key = ENV.googleAiKey;
  if (!key) throw Object.assign(new Error("GOOGLE_AI_KEY not configured"), { status: 401 });

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (originalImages?.length) {
    for (const img of originalImages) {
      let b64: { data: string; mimeType: string } | null = null;
      if (img.b64Json) {
        b64 = { data: img.b64Json, mimeType: img.mimeType || "image/jpeg" };
      } else if (img.url) {
        b64 = await urlToBase64(img.url);
      }
      if (b64) parts.push({ inlineData: { mimeType: b64.mimeType, data: b64.data } });
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`Gemini ${model} HTTP ${res.status}: ${body.substring(0, 200)}`),
      { status: res.status }
    );
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
    error?: { message: string; code: number };
  };

  if (data.error) {
    throw Object.assign(new Error(`Gemini error: ${data.error.message}`), { status: data.error.code });
  }

  const imgPart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith("image/")
  );
  if (!imgPart?.inlineData?.data) {
    throw Object.assign(new Error(`Gemini ${model}: no image in response`), { status: 500 });
  }

  return Buffer.from(imgPart.inlineData.data, "base64");
}

// ═══════════════════════════════════════════════════════════════
// المزود ٣ و٤: Stability AI
// ═══════════════════════════════════════════════════════════════

async function generateWithStability(
  tier: "ultra" | "core",
  prompt: string
): Promise<Buffer> {
  const key = ENV.stabilityApiKey;
  if (!key) throw Object.assign(new Error("STABILITY_API_KEY not configured"), { status: 401 });

  const endpoint =
    tier === "ultra"
      ? "https://api.stability.ai/v2beta/stable-image/generate/ultra"
      : "https://api.stability.ai/v2beta/stable-image/generate/core";

  const fd = new FormData();
  fd.append("prompt", prompt);
  fd.append("output_format", "jpeg");
  fd.append("aspect_ratio", "16:9");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    body: fd,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`Stability AI ${tier} HTTP ${res.status}: ${body.substring(0, 200)}`),
      { status: res.status }
    );
  }

  const data = await res.json() as { image?: string; errors?: string[] };

  if (data.errors?.length) {
    throw Object.assign(new Error(`Stability AI: ${data.errors.join(", ")}`), { status: 400 });
  }
  if (!data.image) {
    throw Object.assign(new Error("Stability AI: no image returned"), { status: 500 });
  }

  return Buffer.from(data.image, "base64");
}

// ═══════════════════════════════════════════════════════════════
// المزود ٥: Replicate Flux Schnell
// ═══════════════════════════════════════════════════════════════

async function waitForReplicate(id: string, token: string, maxMs = 120_000): Promise<string> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json() as { status: string; output?: string | string[]; error?: string };
    if (d.status === "succeeded") {
      const out = Array.isArray(d.output) ? d.output[0] : d.output;
      if (!out) throw new Error("Replicate: empty output");
      return out;
    }
    if (d.status === "failed" || d.status === "canceled") {
      throw Object.assign(new Error(`Replicate ${d.status}: ${d.error || "unknown"}`), { status: 500 });
    }
  }
  throw Object.assign(new Error("Replicate: timeout"), { status: 504 });
}

async function generateWithReplicate(
  prompt: string,
  referenceImageUrl?: string
): Promise<Buffer> {
  const token = ENV.replicateApiToken;
  if (!token) throw Object.assign(new Error("REPLICATE_API_TOKEN not configured"), { status: 401 });

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: "16:9",
    output_format: "jpg",
    output_quality: 80,
    num_inference_steps: 4,
  };
  if (referenceImageUrl) {
    input.image_prompt = referenceImageUrl;
    input.image_prompt_strength = 0.3;
  }

  const res = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(90_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`Replicate HTTP ${res.status}: ${body.substring(0, 200)}`),
      { status: res.status }
    );
  }

  const data = await res.json() as {
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
  };

  let imageUrl: string;
  if (data.status === "succeeded") {
    imageUrl = Array.isArray(data.output) ? data.output[0] : (data.output as string);
  } else if (data.id) {
    imageUrl = await waitForReplicate(data.id, token);
  } else {
    throw Object.assign(new Error(`Replicate unexpected: ${JSON.stringify(data)}`), { status: 500 });
  }

  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok)
    throw Object.assign(new Error(`Replicate image fetch HTTP ${imgRes.status}`), { status: imgRes.status });
  return Buffer.from(await imgRes.arrayBuffer());
}

// ═══════════════════════════════════════════════════════════════
// الدالة الرئيسية — Waterfall Hybrid
// ═══════════════════════════════════════════════════════════════

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const { prompt, originalImages, quality = "pro" } = options;

  const refUrl = originalImages?.find((img) => img.url && !img.url.startsWith("data:"))?.url;

  // ─── قائمة المزودين بترتيب الأولوية ─────────────────────────
  const providers: Array<{ name: ProviderName; fn: () => Promise<Buffer>; ext: string }> = [
    {
      name: "openai-dalle3",
      fn: () => generateWithOpenAI(prompt),
      ext: "png",
    },
    {
      name: "gemini-3.1-flash-image",
      fn: () => generateWithGemini("gemini-3.1-flash-image-preview", prompt, originalImages),
      ext: "png",
    },
    {
      name: "gemini-2.5-flash-image",
      fn: () => generateWithGemini("gemini-2.5-flash-image", prompt, originalImages),
      ext: "png",
    },
    {
      name: "stability-ultra",
      fn: () => generateWithStability("ultra", prompt),
      ext: "jpg",
    },
    {
      name: "stability-core",
      fn: () => generateWithStability("core", prompt),
      ext: "jpg",
    },
    {
      name: "replicate-flux",
      fn: () => generateWithReplicate(prompt, refUrl),
      ext: "jpg",
    },
  ];

  // إذا كانت الجودة "schnell" نبدأ من Gemini 2.5 (أسرع)
  const ordered = quality === "schnell" ? providers.slice(1) : providers;

  let lastError: Error | null = null;
  let usedProvider: ProviderName | null = null;
  let imageBuffer: Buffer | null = null;
  let ext = "jpg";

  for (const provider of ordered) {
    try {
      console.log(`[ImageGen] 🔄 محاولة: ${provider.name}`);
      imageBuffer = await provider.fn();
      usedProvider = provider.name;
      ext = provider.ext;
      console.log(`[ImageGen] ✅ نجح: ${provider.name} (${imageBuffer.length} bytes)`);
      break;
    } catch (err) {
      const error = err as Error & { status?: number };
      lastError = error;
      const status = error.status ?? 0;
      console.warn(
        `[ImageGen] ⚠️ فشل ${provider.name} (HTTP ${status}): ${error.message.substring(0, 120)}`
      );

      if (shouldFallback(status)) {
        continue; // انتقل للمزود التالي
      }
      break; // خطأ غير متوقع — توقف
    }
  }

  if (!imageBuffer || !usedProvider) {
    const errMsg = lastError?.message ?? "جميع مزودي توليد الصور فشلوا";
    console.error("[ImageGen] ❌ جميع المزودين فشلوا:", errMsg);
    throw new Error(`فشل توليد الصورة: ${errMsg}`);
  }

  // ─── رفع الصورة إلى Cloudflare R2 ────────────────────────────
  const fileKey = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  const { url: storedUrl } = await storagePut(fileKey, imageBuffer, mimeType);

  console.log(`[ImageGen] ✅ مرفوعة إلى R2 عبر ${usedProvider}: ${storedUrl}`);

  return { url: storedUrl, provider: usedProvider };
}

// ─── فحص حالة المزودين ───────────────────────────────────────────────────

export async function checkProvidersHealth(): Promise<
  Record<ProviderName, "ok" | "error" | "unconfigured">
> {
  const results: Record<string, "ok" | "error" | "unconfigured"> = {};

  // Gemini
  if (!ENV.googleAiKey) {
    results["gemini-3.1-flash-image"] = "unconfigured";
    results["gemini-2.5-flash-image"] = "unconfigured";
  } else {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.googleAiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      const status = r.ok ? "ok" : "error";
      results["gemini-3.1-flash-image"] = status;
      results["gemini-2.5-flash-image"] = status;
    } catch {
      results["gemini-3.1-flash-image"] = "error";
      results["gemini-2.5-flash-image"] = "error";
    }
  }

  // Stability AI
  if (!ENV.stabilityApiKey) {
    results["stability-ultra"] = "unconfigured";
    results["stability-core"] = "unconfigured";
  } else {
    try {
      const r = await fetch("https://api.stability.ai/v1/user/account", {
        headers: { Authorization: `Bearer ${ENV.stabilityApiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      const status = r.ok ? "ok" : "error";
      results["stability-ultra"] = status;
      results["stability-core"] = status;
    } catch {
      results["stability-ultra"] = "error";
      results["stability-core"] = "error";
    }
  }

  // Replicate
  if (!ENV.replicateApiToken) {
    results["replicate-flux"] = "unconfigured";
  } else {
    try {
      const r = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${ENV.replicateApiToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      results["replicate-flux"] = r.ok ? "ok" : "error";
    } catch {
      results["replicate-flux"] = "error";
    }
  }

  return results as Record<ProviderName, "ok" | "error" | "unconfigured">;
}
