/**
 * imageGeneration.ts — Google Imagen 4 مباشرة (مستقل عن مانوس)
 *
 * يحافظ على نفس الواجهة الخارجية (generateImage) حتى لا يحتاج أي ملف آخر للتغيير.
 * النموذج: imagen-4.0-generate-001 (أفضل جودة من Google - أحدث نموذج)
 * Fallback: gemini-2.5-flash-image
 */
import { GoogleGenAI, Modality } from "@google/genai";
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

function getClient(): GoogleGenAI {
  const key = ENV.googleAiKey;
  if (!key) throw new Error("GOOGLE_AI_KEY is not configured");
  return new GoogleGenAI({ apiKey: key });
}

/** توليد صورة جديدة باستخدام Imagen 4 */
async function generateNewImage(client: GoogleGenAI, prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await client.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
      outputMimeType: "image/jpeg",
    },
  });

  const image = response.generatedImages?.[0]?.image;
  if (!image?.imageBytes) {
    throw new Error("Imagen 4: لم يتم إرجاع بيانات الصورة");
  }

  return { buffer: Buffer.from(image.imageBytes), mimeType: "image/jpeg" };
}

/** تعديل صورة أو توليد بـ Gemini 2.5 Flash Image (fallback) */
async function generateWithGeminiFlash(
  client: GoogleGenAI,
  prompt: string,
  originalImages?: GenerateImageOptions["originalImages"]
): Promise<{ buffer: Buffer; mimeType: string }> {
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
            const res = await fetch(img.url);
            const arrayBuffer = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const contentType = res.headers.get("content-type") || img.mimeType || "image/jpeg";
            parts.push({ inlineData: { mimeType: contentType, data: base64 } });
          } catch {
            console.warn("[ImageGen] فشل تحميل الصورة:", img.url);
          }
        }
      }
    }
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
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

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const client = getClient();
  const isEditing = options.originalImages && options.originalImages.length > 0;

  let imageBuffer: Buffer;
  let mimeType = "image/jpeg";

  if (isEditing) {
    // للتعديل: نستخدم Gemini Flash مباشرة (يدعم multimodal input/output)
    const result = await generateWithGeminiFlash(client, options.prompt, options.originalImages);
    imageBuffer = result.buffer;
    mimeType = result.mimeType;
  } else {
    // للتوليد: نجرب Imagen 3 أولاً ثم Gemini Flash كـ fallback
    try {
      const result = await generateNewImage(client, options.prompt);
      imageBuffer = result.buffer;
      mimeType = result.mimeType;
    } catch (err) {
      console.warn("[ImageGen] Imagen 4 فشل، التحويل إلى Gemini Flash Image:", (err as Error).message);
      const result = await generateWithGeminiFlash(client, options.prompt);
      imageBuffer = result.buffer;
      mimeType = result.mimeType;
    }
  }

  // رفع الصورة إلى التخزين
  const { url } = await storagePut(
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

  return { url };
}
