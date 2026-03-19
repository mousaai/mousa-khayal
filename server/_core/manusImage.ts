/**
 * manusImage.ts — استدعاء Manus Built-in Image Generation مباشرة
 *
 * يُستخدم من قِبل HybridRouter كـ provider أول (مجاني)
 * قبل الانتقال لـ Replicate عند الفشل
 */

import { ENV } from "./env";
import type { GenerateImageOptions, GenerateImageResponse } from "./imageGeneration";

export async function generateWithManus(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiKey || !ENV.forgeApiUrl) {
    throw new Error("Manus Image not configured: BUILT_IN_FORGE_API_KEY or BUILT_IN_FORGE_API_URL missing");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const url = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(url, {
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
    throw new Error(`Manus image generation failed (${response.status}): ${detail}`);
  }

  const result = await response.json() as {
    image: { b64Json: string; mimeType: string };
  };

  // حفظ الصورة في التخزين
  const { storagePut } = await import("../storage");
  const buffer = Buffer.from(result.image.b64Json, "base64");
  const ext = result.image.mimeType.split("/")[1] || "png";
  const { url: imageUrl } = await storagePut(
    `generated/${Date.now()}-manus.${ext}`,
    buffer,
    result.image.mimeType
  );

  return { url: imageUrl };
}
