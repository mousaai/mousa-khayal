/**
 * voiceTranscription.ts — Google Gemini Audio مباشرة (مستقل عن مانوس)
 *
 * يحافظ على نفس الواجهة الخارجية (transcribeAudio) حتى لا يحتاج أي ملف آخر للتغيير.
 * النموذج: gemini-2.5-flash (يدعم audio input مباشرة)
 * Fallback: gemini-2.0-flash
 *
 * المزايا مقارنة بـ Whisper:
 * - يدعم العربية بشكل ممتاز
 * - أسرع في الاستجابة
 * - يفهم السياق ويصحح الأخطاء تلقائياً
 * - مجاني ضمن حصة Google AI
 */
import { GoogleGenAI } from "@google/genai";
import { ENV } from "./env";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types — نفس الواجهة الأصلية
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getClient(): GoogleGenAI {
  const key = ENV.googleAiKey;
  if (!key) throw new Error("GOOGLE_AI_KEY is not configured");
  return new GoogleGenAI({ apiKey: key });
}

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
  };
  return mimeToExt[mimeType] || "audio";
}

function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
    ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
    nl: "Dutch", pl: "Polish", tr: "Turkish", sv: "Swedish",
  };
  return langMap[langCode] || langCode;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main transcribeAudio — drop-in replacement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    if (!ENV.googleAiKey) {
      // Fallback: Manus Whisper إذا لم يتوفر Google AI Key
      return transcribeWithManus(options);
    }

    // تحميل الصوت من URL
    let audioBuffer: Buffer;
    let mimeType: string;

    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get("content-type") || "audio/mpeg";

      // فحص الحجم (25MB حد Gemini)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 25) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 25MB`,
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // بناء prompt التفريغ
    const langHint = options.language
      ? `The audio is in ${getLanguageName(options.language)}. `
      : "";
    const customPrompt = options.prompt ? `Context: ${options.prompt}. ` : "";
    const systemPrompt = `${langHint}${customPrompt}Transcribe the audio accurately. Return ONLY the transcribed text, nothing else. Preserve punctuation and paragraph breaks.`;

    // استدعاء Gemini مع الصوت
    const client = getClient();
    const base64Audio = audioBuffer.toString("base64");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType as "audio/mpeg" | "audio/wav" | "audio/mp4" | "audio/webm",
                data: base64Audio,
              },
            },
          ],
        },
      ],
      config: { maxOutputTokens: 8192 },
    });

    const transcribedText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!transcribedText.trim()) {
      return {
        error: "No speech detected in audio",
        code: "TRANSCRIPTION_FAILED",
        details: "Gemini returned empty transcription",
      };
    }

    // بناء استجابة بنفس شكل Whisper
    return {
      task: "transcribe",
      language: options.language || "ar",
      duration: 0, // Gemini لا يعيد المدة
      text: transcribedText.trim(),
      segments: [
        {
          id: 0,
          seek: 0,
          start: 0,
          end: 0,
          text: transcribedText.trim(),
          tokens: [],
          temperature: 0,
          avg_logprob: 0,
          compression_ratio: 1,
          no_speech_prob: 0,
        },
      ],
    };
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Manus Whisper Fallback (يُستخدم فقط إذا لم يتوفر GOOGLE_AI_KEY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function transcribeWithManus(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return {
      error: "Voice transcription service is not configured",
      code: "SERVICE_ERROR",
      details: "Neither GOOGLE_AI_KEY nor BUILT_IN_FORGE_API_KEY is set",
    };
  }

  try {
    const response = await fetch(options.audioUrl);
    if (!response.ok) {
      return { error: "Failed to download audio", code: "INVALID_FORMAT" };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") || "audio/mpeg";
    const sizeMB = audioBuffer.length / (1024 * 1024);

    if (sizeMB > 16) {
      return { error: "File too large", code: "FILE_TOO_LARGE" };
    }

    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const prompt = options.prompt || (options.language
      ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}`
      : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);

    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL("v1/audio/transcriptions", baseUrl).toString();

    const whisperResponse = await fetch(fullUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.forgeApiKey}`, "Accept-Encoding": "identity" },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${whisperResponse.status} ${whisperResponse.statusText}${errorText ? `: ${errorText}` : ""}`,
      };
    }

    const result = await whisperResponse.json() as WhisperResponse;
    if (!result.text || typeof result.text !== "string") {
      return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
    }

    return result;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
