/**
 * Image Generation Helper — Replicate Flux Schnell (مستقل عن Manus)
 *
 * استراتيجية التكلفة المنخفضة:
 * - Flux Schnell: $0.003/صورة — الأسرع والأرخص (333 صورة بـ $1)
 * - Flux Dev: $0.025/صورة — جودة أعلى للحالات الاستثنائية
 * - Fallback: Manus Built-in إذا لم يكن REPLICATE_API_TOKEN متاحاً
 *
 * الأولوية: Replicate → Manus (fallback)
 */
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /**
   * quality: اختر جودة الصورة
   * - "fast": Flux Schnell — $0.003/صورة (الافتراضي)
   * - "pro": Flux Dev — $0.025/صورة (للحالات الاستثنائية)
   */
  quality?: "fast" | "pro";
  width?: number;
  height?: number;
};

export type GenerateImageResponse = {
  url?: string;
};

// ─── Replicate Flux Schnell ───────────────────────────────────────────────────
async function generateWithReplicate(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiToken = ENV.replicateApiToken;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN is not configured");

  // اختيار النموذج حسب الجودة المطلوبة
  const model =
    options.quality === "pro"
      ? "black-forest-labs/flux-dev"       // $0.025/صورة
      : "black-forest-labs/flux-schnell";  // $0.003/صورة (الافتراضي)

  const width = options.width ?? 1280;
  const height = options.height ?? 720;

  // إذا كانت هناك صورة أصلية، نستخدم Flux Fill للتعديل
  const hasOriginalImage =
    options.originalImages && options.originalImages.length > 0;

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    width,
    height,
    num_outputs: 1,
    output_format: "webp",
    output_quality: 85,
    go_fast: options.quality !== "pro",
    num_inference_steps: options.quality === "pro" ? 28 : 4,
  };

  if (hasOriginalImage && options.originalImages![0].url) {
    input.image = options.originalImages![0].url;
  }

  // إنشاء prediction
  const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiToken}`,
      prefer: "wait=60", // انتظر حتى 60 ثانية قبل الإرجاع
    },
    body: JSON.stringify({ input }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate prediction failed (${createRes.status}): ${err}`);
  }

  const prediction = await createRes.json() as {
    id: string;
    status: string;
    output?: string[];
    error?: string;
    urls?: { get: string };
  };

  // إذا اكتملت فوراً (prefer: wait)
  if (prediction.status === "succeeded" && prediction.output?.[0]) {
    return { url: prediction.output[0] };
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate generation failed: ${prediction.error}`);
  }

  // polling إذا لم تكتمل بعد
  const pollUrl = prediction.urls?.get ?? `https://api.replicate.com/v1/predictions/${prediction.id}`;
  const maxAttempts = 30;
  const pollInterval = 2000; // 2 ثانية

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const pollRes = await fetch(pollUrl, {
      headers: { authorization: `Bearer ${apiToken}` },
    });

    if (!pollRes.ok) continue;

    const result = await pollRes.json() as {
      status: string;
      output?: string[];
      error?: string;
    };

    if (result.status === "succeeded" && result.output?.[0]) {
      return { url: result.output[0] };
    }

    if (result.status === "failed") {
      throw new Error(`Replicate generation failed: ${result.error}`);
    }
  }

  throw new Error("Replicate generation timed out after 60 seconds");
}

// ─── Manus Fallback ───────────────────────────────────────────────────────────
async function generateWithManus(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const { storagePut } = await import("server/storage");

  if (!ENV.forgeApiUrl) throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  if (!ENV.forgeApiKey) throw new Error("BUILT_IN_FORGE_API_KEY is not configured");

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Manus image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json() as {
    image: { b64Json: string; mimeType: string };
  };
  const buffer = Buffer.from(result.image.b64Json, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, result.image.mimeType);
  return { url };
}

// ─── الدالة الرئيسية — Replicate أولاً، Manus كـ fallback ────────────────────
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // إذا كان Replicate متاحاً، استخدمه (أرخص وأسرع)
  if (ENV.replicateApiToken) {
    try {
      return await generateWithReplicate(options);
    } catch (err) {
      console.warn(`[ImageGen] Replicate failed, falling back to Manus: ${(err as Error).message}`);
      // fallback لـ Manus إذا فشل Replicate
      if (ENV.forgeApiKey) {
        return await generateWithManus(options);
      }
      throw err;
    }
  }

  // إذا لم يكن Replicate متاحاً، استخدم Manus
  if (ENV.forgeApiKey) {
    return await generateWithManus(options);
  }

  throw new Error("No image generation service configured. Set REPLICATE_API_TOKEN or BUILT_IN_FORGE_API_KEY.");
}
