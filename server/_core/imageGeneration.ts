/**
 * imageGeneration.ts — Replicate Flux (رئيسي) + Google Gemini Flash (احتياطي)
 *
 * يحافظ على نفس الواجهة الخارجية (generateImage) حتى لا يحتاج أي ملف آخر للتغيير.
 *
 * النماذج المتاحة:
 *   - "schnell"  → black-forest-labs/flux-schnell   (3-5 ثوانٍ، تكلفة أقل 10x، للمعاينة)
 *   - "pro"      → black-forest-labs/flux-1.1-pro   (10-20 ثانية، أعلى جودة، للإنتاج)
 *
 * image_prompt_strength يُضبط تلقائياً:
 *   - 0.15-0.25 → كلمات "تخيلني / صورني / أنا" (الحفاظ على الهوية)
 *   - 0.30-0.40 → تعديل أسلوب عام (تطبيق الأسلوب مع الحفاظ على الهيكل)
 */
import { ENV } from "./env";
import { storagePut } from "../storage";
import { trackImageGen } from "../costTracker";

export type ImageQuality = "schnell" | "pro";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** جودة التوليد: "schnell" للمعاينة السريعة، "pro" للإنتاج (افتراضي: "pro") */
  quality?: ImageQuality;
};

export type GenerateImageResponse = {
  url?: string;
};

// ── كشف قوة التحويل الشخصي من الـ prompt ─────────────────────────────────
function detectImagePromptStrength(prompt: string): number {
  const lower = prompt.toLowerCase();
  // كلمات تدل على تحويل شخصي — نحافظ على الهوية أكثر
  const personalKeywords = [
    "تخيلني", "صورني", "أنا في", "أنا ب", "ضعني في", "حولني",
    "imagine me", "put me in", "place me in", "i am in", "me as",
    "me in", "my face", "وجهي", "شخصيتي",
  ];
  const isPersonal = personalKeywords.some(kw => lower.includes(kw));
  return isPersonal ? 0.2 : 0.35;
}

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

// ── توليد صورة بـ Replicate (Schnell أو Pro) ──────────────────────────────
async function generateWithFlux(
  prompt: string,
  quality: ImageQuality,
  referenceImageUrl?: string
): Promise<{ imageUrl: string }> {
  const token = ENV.replicateApiToken;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured");

  const isSchnell = quality === "schnell";
  const modelPath = isSchnell
    ? "black-forest-labs/flux-schnell"
    : "black-forest-labs/flux-1.1-pro";

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: "16:9",
    output_format: "jpg",
    output_quality: isSchnell ? 80 : 90,
    ...(isSchnell ? {} : { safety_tolerance: 5 }),
    ...(isSchnell ? { num_inference_steps: 4 } : {}),
  };

  // image-to-image: إذا كان هناك صورة مرجعية (فقط في Pro — Schnell لا يدعمه)
  if (referenceImageUrl && !isSchnell) {
    input.image_prompt = referenceImageUrl;
    input.image_prompt_strength = detectImagePromptStrength(prompt);
  }

  const apiUrl = isSchnell
    ? "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions"
    : "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";

  const res = await fetch(apiUrl, {
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

  // نتيجة فورية
  if (data.status === "succeeded") {
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    if (output) return { imageUrl: output };
  }

  // لا تزال processing
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
  const quality: ImageQuality = options.quality ?? "pro";
  const isEditing = options.originalImages && options.originalImages.length > 0;
  const referenceImageUrl = options.originalImages?.find(img => img.url && !img.url.startsWith("data:"))?.url;

  let imageUrl: string | undefined;
  let imageBuffer: Buffer | undefined;
  let mimeType = "image/jpeg";
  let usedProvider = `replicate-flux-${quality}`;

  // المحاولة الأولى: Replicate Flux (Schnell أو Pro)
  try {
    const result = await generateWithFlux(options.prompt, quality, referenceImageUrl);
    imageUrl = result.imageUrl;
    console.log(`[ImageGen] ✅ Replicate Flux ${quality} نجح`);
  } catch (err) {
    console.warn(`[ImageGen] ⚠️ Replicate Flux ${quality} فشل، التحويل إلى Gemini Flash:`, (err as Error).message);
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
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const { url: storedUrl } = await storagePut(
    `generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
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
