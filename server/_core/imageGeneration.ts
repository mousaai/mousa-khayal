/**
 * imageGeneration.ts — Replicate Flux Pro (رئيسي) + Google Gemini Flash (احتياطي)
 *
 * يحافظ على نفس الواجهة الخارجية (generateImage) حتى لا يحتاج أي ملف آخر للتغيير.
 * النموذج الرئيسي: black-forest-labs/flux-1.1-pro (أفضل جودة للمعمار والصور الشخصية)
 * للتعديل (image-to-image): black-forest-labs/flux-1.1-pro (يدعم image_prompt)
 * Fallback: Google Gemini Flash Image (في حال فشل Replicate)
 */
import { ENV } from "./env";
import { storagePut } from "../storage";
import { trackImageGen } from "../costTracker";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

// ── مساعد: انتظار نتيجة Replicate prediction ──────────────────────────────
async function waitForReplicate(predictionId: string, token: string, maxWaitMs = 120_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as { status: string; output?: string | string[]; error?: string };
    if (data.status === "succeeded") {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!output) throw new Error("Replicate: لم يتم إرجاع رابط الصورة");
      return output;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error || "unknown error"}`);
    }
  }
  throw new Error("Replicate: انتهت مهلة الانتظار");
}

// ── توليد صورة جديدة بـ Replicate Flux 1.1 Pro ────────────────────────────
async function generateWithFluxPro(
  prompt: string,
  referenceImageUrl?: string
): Promise<{ imageUrl: string }> {
  const token = ENV.replicateApiToken;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured");

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: "16:9",
    output_format: "jpg",
    output_quality: 90,
    safety_tolerance: 5,
  };

  // image-to-image: إذا كان هناك صورة مرجعية
  if (referenceImageUrl) {
    input.image_prompt = referenceImageUrl;
    input.image_prompt_strength = 0.3; // 0.3 = يحافظ على الهوية مع تطبيق الأسلوب الجديد
  }

  // إرسال الطلب مع Prefer: wait للنتيجة الفورية (حتى 60 ثانية)
  const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait=60",
    },
    body: JSON.stringify({ input }),
  });

  const data = await res.json() as { id?: string; status?: string; output?: string | string[]; error?: string };

  if (!res.ok) {
    throw new Error(`Replicate API error ${res.status}: ${JSON.stringify(data)}`);
  }

  // إذا جاءت النتيجة فوراً
  if (data.status === "succeeded") {
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    if (output) return { imageUrl: output };
  }

  // إذا لا تزال processing، انتظر
  if (data.id) {
    const imageUrl = await waitForReplicate(data.id, token);
    return { imageUrl };
  }

  throw new Error(`Replicate: استجابة غير متوقعة: ${JSON.stringify(data)}`);
}

// ── Fallback: Google Gemini Flash Image ───────────────────────────────────
async function generateWithGeminiFlashFallback(
  prompt: string,
  originalImages?: GenerateImageOptions["originalImages"]
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { GoogleGenAI, Modality } = await import("@google/genai");
  const key = ENV.googleAiKey;
  if (!key) throw new Error("GOOGLE_AI_KEY is not configured");
  const client = new GoogleGenAI({ apiKey: key });

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (originalImages && originalImages.length > 0) {
    for (const img of originalImages) {
      if (img.b64Json) {
        parts.push({ inlineData: { mimeType: img.mimeType || "image/jpeg", data: img.b64Json } });
      } else if (img.url) {
        if (img.url.startsWith("data:")) {
          const [meta, data] = img.url.split(",");
          const mimeType = meta.split(":")[1].split(";")[0];
          parts.push({ inlineData: { mimeType, data } });
        } else {
          try {
            const imgRes = await fetch(img.url);
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const contentType = imgRes.headers.get("content-type") || img.mimeType || "image/jpeg";
            parts.push({ inlineData: { mimeType: contentType, data: base64 } });
          } catch {
            console.warn("[ImageGen] فشل تحميل الصورة المرجعية:", img.url);
          }
        }
      }
    }
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts }],
    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini Flash: لم يتم إرجاع صورة");
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType || "image/jpeg",
  };
}

// ── الدالة الرئيسية ────────────────────────────────────────────────────────
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const isEditing = options.originalImages && options.originalImages.length > 0;
  const referenceImageUrl = options.originalImages?.find(img => img.url && !img.url.startsWith("data:"))?.url;

  let imageUrl: string | undefined;
  let imageBuffer: Buffer | undefined;
  let mimeType = "image/jpeg";
  let usedProvider = "replicate";

  // المحاولة الأولى: Replicate Flux 1.1 Pro
  try {
    const result = await generateWithFluxPro(options.prompt, referenceImageUrl);
    imageUrl = result.imageUrl;
    console.log("[ImageGen] ✅ Replicate Flux 1.1 Pro نجح");
  } catch (err) {
    console.warn("[ImageGen] ⚠️ Replicate فشل، التحويل إلى Gemini Flash:", (err as Error).message);
    usedProvider = "gemini";

    // Fallback: Google Gemini Flash Image
    try {
      const result = await generateWithGeminiFlashFallback(options.prompt, options.originalImages);
      imageBuffer = result.buffer;
      mimeType = result.mimeType;
      console.log("[ImageGen] ✅ Gemini Flash Image نجح (fallback)");
    } catch (fallbackErr) {
      console.error("[ImageGen] ❌ كلا المزودَين فشلا:", (fallbackErr as Error).message);
      throw new Error(`فشل توليد الصورة: ${(fallbackErr as Error).message}`);
    }
  }

  // إذا جاءت النتيجة من Replicate كـ URL، نحمّلها ونرفعها إلى R2
  if (imageUrl && !imageBuffer) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    } catch (downloadErr) {
      // إذا فشل التحميل، أعد الرابط المباشر من Replicate
      console.warn("[ImageGen] فشل تحميل الصورة من Replicate، استخدام الرابط المباشر:", (downloadErr as Error).message);
      trackImageGen({
        operation: isEditing ? "editImage" : "generateImage",
        count: 1,
        prompt: options.prompt.substring(0, 200),
      }).catch(() => {});
      return { url: imageUrl };
    }
  }

  if (!imageBuffer) throw new Error("لم يتم الحصول على بيانات الصورة");

  // رفع الصورة إلى R2 للتخزين الدائم
  const { url: storedUrl } = await storagePut(
    `generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
    imageBuffer,
    mimeType
  );

  // تسجيل التكلفة
  trackImageGen({
    operation: isEditing ? "editImage" : "generateImage",
    count: 1,
    prompt: options.prompt.substring(0, 200),
  }).catch(() => {});

  console.log(`[ImageGen] ✅ صورة مرفوعة إلى R2 (${usedProvider}):`, storedUrl);
  return { url: storedUrl };
}
