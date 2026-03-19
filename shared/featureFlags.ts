/**
 * Feature Flags — خيال
 * =====================
 * يتحكم في تفعيل/إيقاف الميزات بدون حذف أي كود.
 * عند الرغبة في إعادة تفعيل ميزة، غيّر القيمة إلى true فقط.
 *
 * الإعدادات المحفوظة لميزة الفيديو:
 *   - Runway ML: image_to_video, 10s, 720p
 *   - ElevenLabs: multilingual_v2, arabic TTS
 *   - VideoProducer: multi-scene, music, subtitles
 *   - AutonomousDirector: scene transitions, camera angles
 *
 * سبب الإيقاف المؤقت: تسريع المنصة والتركيز على الصور (مارس 2026)
 * لإعادة التفعيل: اضبط ENABLE_VIDEO = true
 */

export const FEATURE_FLAGS = {
  /**
   * ميزة الفيديو الكاملة (Runway + ElevenLabs + VideoProducer)
   * false = إيقاف مؤقت لتسريع المنصة
   * true  = تفعيل كامل
   */
  ENABLE_VIDEO: false,

  /**
   * التعليق الصوتي (ElevenLabs TTS)
   * مرتبط بـ ENABLE_VIDEO — يُفعَّل تلقائياً معه
   */
  ENABLE_VOICE: false,

  /**
   * توليد الصور (Replicate Flux + Manus fallback)
   * true دائماً — هذا القلب الأساسي للمنصة
   */
  ENABLE_IMAGE: true,

  /**
   * الدردشة الذكية (LLM)
   * true دائماً
   */
  ENABLE_CHAT: true,

  /**
   * السيناريوهات والنصوص
   * true دائماً
   */
  ENABLE_SCRIPT: true,

  /**
   * لوحة المراقبة (/monitor)
   * true للمالك فقط
   */
  ENABLE_MONITOR: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * التحقق من تفعيل ميزة معينة
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * إعدادات الفيديو المحفوظة (للرجوع إليها عند إعادة التفعيل)
 */
export const VIDEO_CONFIG_PRESERVED = {
  runway: {
    model: "gen4_turbo",
    duration: 10,        // ثانية
    resolution: "720p",
    ratio: "16:9",
    motionStrength: 0.7,
  },
  elevenlabs: {
    model: "eleven_multilingual_v2",
    language: "ar",
    stability: 0.5,
    similarityBoost: 0.75,
  },
  videoProducer: {
    maxScenes: 8,
    transitionDuration: 0.5,
    musicEnabled: true,
    subtitlesEnabled: true,
    exportFormats: ["mp4", "webm"],
  },
  autonomousDirector: {
    cameraAngles: ["wide", "medium", "close", "aerial"],
    transitionStyles: ["cut", "fade", "dissolve"],
    pacePresets: ["cinematic", "fast", "documentary"],
  },
} as const;
