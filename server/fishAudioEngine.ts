/**
 * fishAudioEngine.ts — محرك Fish Audio TTS
 *
 * Fish Audio: بديل احترافي لـ ElevenLabs
 * - جودة عالية تتفوق على ElevenLabs في الاختبارات العمياء (TTS-Arena)
 * - يدعم العربية بشكل ممتاز
 * - سعر تنافسي جداً
 * - API بسيط: POST /v1/tts مع reference_id للصوت
 *
 * الأصوات العربية المُضمّنة (reference_id من مكتبة Fish Audio):
 *   cbdbcd3cb1684b8bbf2a2f7951b282a9 — أنثى عربية هادئة (MSA)
 *   + أصوات إضافية يمكن إضافتها لاحقاً من fish.audio/voice-library
 *
 * التوثيق: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */

import { ENV } from "./_core/env";
import type { ElevenLabsVoiceId } from "./elevenLabsEngine";

// ═══════════════════════════════════════════════════════════
// أصوات Fish Audio المُضمّنة
// ═══════════════════════════════════════════════════════════

/**
 * معرّفات أصوات Fish Audio من مكتبة الأصوات العامة
 * يمكن إضافة المزيد من: https://fish.audio/voice-library/?lang=ar
 */
export const FISH_VOICES: Record<string, { id: string; name: string; lang: string; gender: string }> = {
  // ── عربي ──────────────────────────────────────────────────
  ar_female_calm: {
    id: "cbdbcd3cb1684b8bbf2a2f7951b282a9",
    name: "عربي أنثى هادئة (MSA)",
    lang: "ar",
    gender: "female",
  },
  // ── افتراضي عربي ذكر (نستخدم نفس الصوت مع تعديل prosody) ──
  ar_male_default: {
    id: "cbdbcd3cb1684b8bbf2a2f7951b282a9",
    name: "عربي افتراضي",
    lang: "ar",
    gender: "neutral",
  },
};

/**
 * خريطة من ElevenLabsVoiceId → Fish Audio reference_id
 * نستخدم أفضل صوت عربي متاح لجميع الأنواع
 * يمكن تحديث هذه الخريطة بإضافة أصوات مخصصة من Fish Audio
 */
const ELEVEN_TO_FISH: Record<ElevenLabsVoiceId, string> = {
  ar_male_formal:      "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  ar_male_energetic:   "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  ar_male_calm:        "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  ar_female_formal:    "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  ar_female_emotional: "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  ar_female_marketing: "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  en_male_formal:      "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  en_male_energetic:   "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  en_female_formal:    "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  en_female_emotional: "cbdbcd3cb1684b8bbf2a2f7951b282a9",
  documentary_narrator:"cbdbcd3cb1684b8bbf2a2f7951b282a9",
};

// ═══════════════════════════════════════════════════════════
// محرك Fish Audio
// ═══════════════════════════════════════════════════════════

export class FishAudioEngine {
  private apiKey: string;
  private baseUrl = "https://api.fish.audio";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (process.env.FISH_AUDIO_API_KEY ?? "");
  }

  /**
   * توليد صوت من نص باستخدام Fish Audio API
   * @param text النص المراد تحويله
   * @param voiceId معرّف الصوت (ElevenLabsVoiceId أو Fish Audio reference_id مباشرة)
   * @param quality "normal" للجودة الأفضل، "balanced" لتوازن السرعة، "low" للأسرع
   * @returns Buffer بصيغة MP3 أو null عند الفشل
   */
  async generateSpeech(
    text: string,
    voiceId: ElevenLabsVoiceId | string = "ar_male_formal",
    quality: "normal" | "balanced" | "low" = "normal"
  ): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn("[FishAudio] FISH_AUDIO_API_KEY غير مُضبوط — تخطي TTS");
      return null;
    }

    // تحويل ElevenLabsVoiceId إلى Fish Audio reference_id
    const referenceId =
      voiceId in ELEVEN_TO_FISH
        ? ELEVEN_TO_FISH[voiceId as ElevenLabsVoiceId]
        : voiceId; // إذا كان reference_id مباشراً

    try {
      console.log(`[FishAudio] توليد صوت: ref=${referenceId.slice(0, 8)}..., quality=${quality}, chars=${text.length}`);

      const response = await fetch(`${this.baseUrl}/v1/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          model: "s2-pro", // أفضل نموذج متاح
        },
        body: JSON.stringify({
          text,
          reference_id: referenceId,
          format: "mp3",
          mp3_bitrate: 128,
          sample_rate: 44100,
          latency: quality,
          normalize: true,
          chunk_length: 300,
          temperature: 0.7,
          top_p: 0.7,
          repetition_penalty: 1.2,
        }),
        signal: AbortSignal.timeout(90_000), // 90 ثانية timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[FishAudio] فشل (${response.status}): ${errorText.slice(0, 300)}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`  ✓ [FishAudio] صوت جاهز: ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.warn(`[FishAudio] خطأ: ${err}`);
      return null;
    }
  }

  /**
   * التحقق من أن API Key مُضبوط
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  /**
   * الحصول على قائمة الأصوات المتاحة
   */
  getAvailableVoices() {
    return Object.entries(FISH_VOICES).map(([id, v]) => ({
      id,
      referenceId: v.id,
      name: v.name,
      lang: v.lang,
      gender: v.gender,
    }));
  }
}

// Instance مشترك
export const fishAudioEngine = new FishAudioEngine();
