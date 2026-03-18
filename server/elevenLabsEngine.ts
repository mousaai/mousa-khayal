/**
 * ElevenLabsEngine.ts — محرك الصوت الاحترافي
 * يوفر 11 صوتاً احترافياً (عربي/إنجليزي) لمنصة خيال
 *
 * الأصوات المدعومة:
 * - عربي ذكر: رسمي / حماسي / هادئ
 * - عربي أنثى: رسمي / عاطفي / تسويقي
 * - إنجليزي ذكر: رسمي / حماسي
 * - إنجليزي أنثى: رسمي / عاطفي
 * - راوٍ وثائقي
 */

import { ENV } from "./_core/env";

// ═══════════════════════════════════════════════════════════
// الأنواع
// ═══════════════════════════════════════════════════════════

export type ElevenLabsVoiceId =
  | "ar_male_formal"       // عربي ذكر رسمي
  | "ar_male_energetic"    // عربي ذكر حماسي
  | "ar_male_calm"         // عربي ذكر هادئ
  | "ar_female_formal"     // عربي أنثى رسمي
  | "ar_female_emotional"  // عربي أنثى عاطفي
  | "ar_female_marketing"  // عربي أنثى تسويقي
  | "en_male_formal"       // إنجليزي ذكر رسمي
  | "en_male_energetic"    // إنجليزي ذكر حماسي
  | "en_female_formal"     // إنجليزي أنثى رسمي
  | "en_female_emotional"  // إنجليزي أنثى عاطفي
  | "documentary_narrator"; // راوٍ وثائقي

export interface ElevenLabsVoiceConfig {
  id: string;           // معرّف الصوت في ElevenLabs
  name: string;         // الاسم العربي
  language: "ar" | "en";
  gender: "male" | "female";
  style: string;
  stability: number;    // 0.0 - 1.0
  similarity_boost: number; // 0.0 - 1.0
  style_exaggeration: number; // 0.0 - 1.0
  use_speaker_boost: boolean;
}

export interface TTSOptions {
  voice: ElevenLabsVoiceId;
  text: string;
  model?: "eleven_multilingual_v2" | "eleven_turbo_v2_5" | "eleven_flash_v2_5";
  speed?: number; // 0.7 - 1.2
}

// ═══════════════════════════════════════════════════════════
// خريطة الأصوات — 11 صوت احترافي
// ═══════════════════════════════════════════════════════════

/**
 * خريطة الأصوات المدعومة
 * نستخدم أصوات ElevenLabs المدعومة للعربية والإنجليزية
 *
 * ملاحظة: معرّفات الأصوات هذه هي أصوات ElevenLabs الرسمية
 * - eleven_multilingual_v2 يدعم العربية بشكل ممتاز
 */
export const ELEVEN_VOICES: Record<ElevenLabsVoiceId, ElevenLabsVoiceConfig> = {
  // ── عربي ذكر ──────────────────────────────────────────
  ar_male_formal: {
    id: "pNInz6obpgDQGcFmaJgB", // Adam - صوت ذكر رسمي
    name: "عربي ذكر رسمي",
    language: "ar",
    gender: "male",
    style: "formal",
    stability: 0.75,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: true,
  },
  ar_male_energetic: {
    id: "VR6AewLTigWG4xSOukaG", // Arnold - صوت ذكر حماسي
    name: "عربي ذكر حماسي",
    language: "ar",
    gender: "male",
    style: "energetic",
    stability: 0.55,
    similarity_boost: 0.75,
    style_exaggeration: 0.3,
    use_speaker_boost: true,
  },
  ar_male_calm: {
    id: "ErXwobaYiN019PkySvjV", // Antoni - صوت ذكر هادئ
    name: "عربي ذكر هادئ",
    language: "ar",
    gender: "male",
    style: "calm",
    stability: 0.85,
    similarity_boost: 0.70,
    style_exaggeration: 0.0,
    use_speaker_boost: false,
  },

  // ── عربي أنثى ─────────────────────────────────────────
  ar_female_formal: {
    id: "EXAVITQu4vr4xnSDxMaL", // Bella - صوت أنثى رسمي
    name: "عربي أنثى رسمي",
    language: "ar",
    gender: "female",
    style: "formal",
    stability: 0.75,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: true,
  },
  ar_female_emotional: {
    id: "MF3mGyEYCl7XYWbV9V6O", // Elli - صوت أنثى عاطفي
    name: "عربي أنثى عاطفي",
    language: "ar",
    gender: "female",
    style: "emotional",
    stability: 0.50,
    similarity_boost: 0.75,
    style_exaggeration: 0.45,
    use_speaker_boost: true,
  },
  ar_female_marketing: {
    id: "jBpfuIE2acCO8z3wKNLl", // Gigi - صوت أنثى تسويقي
    name: "عربي أنثى تسويقي",
    language: "ar",
    gender: "female",
    style: "marketing",
    stability: 0.60,
    similarity_boost: 0.80,
    style_exaggeration: 0.35,
    use_speaker_boost: true,
  },

  // ── إنجليزي ذكر ───────────────────────────────────────
  en_male_formal: {
    id: "onwK4e9ZLuTAKqWW03F9", // Daniel - صوت ذكر رسمي إنجليزي
    name: "English Male Formal",
    language: "en",
    gender: "male",
    style: "formal",
    stability: 0.80,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: true,
  },
  en_male_energetic: {
    id: "TxGEqnHWrfWFTfGW9XjX", // Josh - صوت ذكر حماسي إنجليزي
    name: "English Male Energetic",
    language: "en",
    gender: "male",
    style: "energetic",
    stability: 0.55,
    similarity_boost: 0.75,
    style_exaggeration: 0.3,
    use_speaker_boost: true,
  },

  // ── إنجليزي أنثى ──────────────────────────────────────
  en_female_formal: {
    id: "21m00Tcm4TlvDq8ikWAM", // Rachel - صوت أنثى رسمي إنجليزي
    name: "English Female Formal",
    language: "en",
    gender: "female",
    style: "formal",
    stability: 0.75,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: true,
  },
  en_female_emotional: {
    id: "AZnzlk1XvdvUeBnXmlld", // Domi - صوت أنثى عاطفي إنجليزي
    name: "English Female Emotional",
    language: "en",
    gender: "female",
    style: "emotional",
    stability: 0.50,
    similarity_boost: 0.75,
    style_exaggeration: 0.4,
    use_speaker_boost: true,
  },

  // ── راوٍ وثائقي ───────────────────────────────────────
  documentary_narrator: {
    id: "IKne3meq5aSn9XLyUdCD", // Charlie - راوٍ وثائقي
    name: "راوٍ وثائقي",
    language: "en",
    gender: "male",
    style: "documentary",
    stability: 0.85,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    use_speaker_boost: false,
  },
};

// ═══════════════════════════════════════════════════════════
// اختيار الصوت المناسب تلقائياً
// ═══════════════════════════════════════════════════════════

/**
 * يختار الصوت المناسب تلقائياً بناءً على:
 * - اللغة (عربي/إنجليزي)
 * - نوع الفيلم (وثائقي/تسويقي/تعليمي/...)
 * - الجنس المفضل
 */
export function selectVoiceForDomain(
  language: "ar" | "en",
  domain: string,
  gender: "male" | "female" = "male"
): ElevenLabsVoiceId {
  const domainLower = domain.toLowerCase();

  // وثائقي → راوٍ وثائقي
  if (domainLower.includes("documentary") || domainLower.includes("وثائقي")) {
    return "documentary_narrator";
  }

  // تسويقي → صوت تسويقي
  if (domainLower.includes("marketing") || domainLower.includes("تسويقي")) {
    return language === "ar" ? "ar_female_marketing" : "en_female_formal";
  }

  // دراما/عاطفي → صوت عاطفي
  if (
    domainLower.includes("drama") ||
    domainLower.includes("دراما") ||
    domainLower.includes("emotional") ||
    domainLower.includes("عاطفي")
  ) {
    return language === "ar"
      ? (gender === "female" ? "ar_female_emotional" : "ar_male_calm")
      : (gender === "female" ? "en_female_emotional" : "en_male_formal");
  }

  // أكشن/حماسي → صوت حماسي
  if (
    domainLower.includes("action") ||
    domainLower.includes("أكشن") ||
    domainLower.includes("energetic") ||
    domainLower.includes("cinematic")
  ) {
    return language === "ar" ? "ar_male_energetic" : "en_male_energetic";
  }

  // تعليمي/علمي → صوت رسمي هادئ
  if (
    domainLower.includes("educational") ||
    domainLower.includes("تعليمي") ||
    domainLower.includes("scientific") ||
    domainLower.includes("علمي")
  ) {
    return language === "ar"
      ? (gender === "female" ? "ar_female_formal" : "ar_male_calm")
      : (gender === "female" ? "en_female_formal" : "en_male_formal");
  }

  // افتراضي: رسمي
  if (language === "ar") {
    return gender === "female" ? "ar_female_formal" : "ar_male_formal";
  } else {
    return gender === "female" ? "en_female_formal" : "en_male_formal";
  }
}

// ═══════════════════════════════════════════════════════════
// محرك ElevenLabs الرئيسي
// ═══════════════════════════════════════════════════════════

export class ElevenLabsEngine {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ENV.elevenLabsApiKey;
  }

  /**
   * توليد صوت من نص
   * يعيد Buffer بصيغة MP3
   */
  async generateSpeech(options: TTSOptions): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn("[ElevenLabs] API key not configured — skipping TTS");
      return null;
    }

    const voiceConfig = ELEVEN_VOICES[options.voice];
    if (!voiceConfig) {
      console.warn(`[ElevenLabs] Unknown voice: ${options.voice}`);
      return null;
    }

    const model = options.model ?? "eleven_multilingual_v2";

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceConfig.id}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text: options.text,
            model_id: model,
            voice_settings: {
              stability: voiceConfig.stability,
              similarity_boost: voiceConfig.similarity_boost,
              style: voiceConfig.style_exaggeration,
              use_speaker_boost: voiceConfig.use_speaker_boost,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[ElevenLabs] TTS failed (${response.status}): ${errorText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`  ✓ [ElevenLabs] صوت جاهز: ${voiceConfig.name} — ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.warn(`[ElevenLabs] Error: ${err}`);
      return null;
    }
  }

  /**
   * التحقق من صحة API Key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: { "xi-api-key": this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * الحصول على قائمة الأصوات المتاحة
   */
  getAvailableVoices(): Array<{
    id: ElevenLabsVoiceId;
    name: string;
    language: string;
    gender: string;
    style: string;
  }> {
    return Object.entries(ELEVEN_VOICES).map(([id, config]) => ({
      id: id as ElevenLabsVoiceId,
      name: config.name,
      language: config.language,
      gender: config.gender,
      style: config.style,
    }));
  }
}

// ═══════════════════════════════════════════════════════════
// Instance مشترك
// ═══════════════════════════════════════════════════════════

export const elevenLabsEngine = new ElevenLabsEngine();
