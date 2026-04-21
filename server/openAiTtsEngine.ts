/**
 * openAiTtsEngine.ts — محرك OpenAI TTS
 *
 * بديل اقتصادي لـ ElevenLabs:
 * - السعر: $15 / مليون حرف (tts-1) أو $30 / مليون حرف (tts-1-hd)
 * - يدعم العربية بشكل ممتاز
 * - 6 أصوات: alloy, echo, fable, onyx, nova, shimmer
 * - لا يحتاج اشتراكاً منفصلاً — يستخدم OPENAI_API_KEY الموجود
 *
 * خريطة الأصوات (تقريبية):
 *   ar_male_formal     → onyx   (ذكر رسمي عميق)
 *   ar_male_energetic  → echo   (ذكر حماسي)
 *   ar_male_calm       → alloy  (ذكر هادئ متوازن)
 *   ar_female_formal   → nova   (أنثى رسمية واضحة)
 *   ar_female_emotional→ shimmer (أنثى دافئة)
 *   ar_female_marketing→ nova   (أنثى تسويقية)
 *   en_male_formal     → onyx
 *   en_male_energetic  → echo
 *   en_female_formal   → nova
 *   en_female_emotional→ shimmer
 *   documentary_narrator→ fable (راوٍ وثائقي)
 */

import { ENV } from "./_core/env";
import type { ElevenLabsVoiceId } from "./elevenLabsEngine";

// ═══════════════════════════════════════════════════════════
// خريطة الأصوات: ElevenLabsVoiceId → OpenAI voice
// ═══════════════════════════════════════════════════════════

type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

const VOICE_MAP: Record<ElevenLabsVoiceId, OpenAIVoice> = {
  ar_male_formal:      "onyx",
  ar_male_energetic:   "echo",
  ar_male_calm:        "alloy",
  ar_female_formal:    "nova",
  ar_female_emotional: "shimmer",
  ar_female_marketing: "nova",
  en_male_formal:      "onyx",
  en_male_energetic:   "echo",
  en_female_formal:    "nova",
  en_female_emotional: "shimmer",
  documentary_narrator:"fable",
};

// ═══════════════════════════════════════════════════════════
// محرك OpenAI TTS
// ═══════════════════════════════════════════════════════════

export class OpenAiTtsEngine {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ENV.openAiApiKey;
  }

  /**
   * توليد صوت من نص باستخدام OpenAI TTS
   * @param text النص المراد تحويله
   * @param voice معرّف الصوت (ElevenLabsVoiceId أو OpenAIVoice مباشرة)
   * @param model tts-1 (سريع/رخيص) أو tts-1-hd (جودة عالية)
   * @returns Buffer بصيغة MP3 أو null عند الفشل
   */
  async generateSpeech(
    text: string,
    voice: ElevenLabsVoiceId | OpenAIVoice = "ar_male_formal",
    model: "tts-1" | "tts-1-hd" = "tts-1"
  ): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn("[OpenAI TTS] OPENAI_API_KEY غير مُضبوط — تخطي TTS");
      return null;
    }

    // تحويل ElevenLabsVoiceId إلى OpenAI voice
    const openAiVoice: OpenAIVoice =
      voice in VOICE_MAP
        ? VOICE_MAP[voice as ElevenLabsVoiceId]
        : (voice as OpenAIVoice);

    try {
      console.log(`[OpenAI TTS] توليد صوت: voice=${openAiVoice}, model=${model}, chars=${text.length}`);

      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice: openAiVoice,
          response_format: "mp3",
          speed: 1.0,
        }),
        signal: AbortSignal.timeout(60_000), // 60 ثانية timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OpenAI TTS] فشل (${response.status}): ${errorText.slice(0, 200)}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`  ✓ [OpenAI TTS] صوت جاهز: ${openAiVoice} — ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.warn(`[OpenAI TTS] خطأ: ${err}`);
      return null;
    }
  }

  /**
   * التحقق من صحة API Key
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith("sk-"));
  }
}

// Instance مشترك
export const openAiTtsEngine = new OpenAiTtsEngine();
