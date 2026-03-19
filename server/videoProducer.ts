/**
 * VideoProducer v3.0 — منتج الفيديو الاحترافي
 * النسخة 3.0 — مارس 2026
 *
 * Pipeline المحسّن:
 * صور → ElevenLabs TTS → Runway Image-to-Video → Ken Burns (Fallback) → ترجمة → دمج → موسيقى → S3
 *
 * المبادئ:
 * 1. السيناريو أولاً — النص القوي قبل التقنية
 * 2. الصورة تخدم النص وتعززه
 * 3. Runway يحرّك الصور (Image-to-Video) — Ken Burns كـ Fallback
 * 4. ElevenLabs يولّد الصوت الاحترافي — صمت كـ Fallback
 * 5. الانتقالات تربط المشاهد بسلاسة (8 انتقالات)
 * 6. الموسيقى تصنع المزاج
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import sharp from "sharp";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { ElevenLabsEngine, selectVoiceForDomain, type ElevenLabsVoiceId } from "./elevenLabsEngine";
import { detectFilmGenre, getGenreDNA, type FilmGenre } from "./filmGenreEngine";
import { RunwayEngine, selectMotionForDomain } from "./runwayEngine";

// تعيين مسار ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ═══════════════════════════════════════════════════════════
// الأنواع — النسخة 3.0
// ═══════════════════════════════════════════════════════════

/** 8 تأثيرات حركة Ken Burns (Fallback عند عدم توفر Runway) */
export type MotionEffect =
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "shake"
  | "rotate"
  | "bounce"
  | "spiral";

/** 8 انتقالات بين المشاهد */
export type TransitionEffect =
  | "fade"
  | "dissolve"
  | "wipe_left"
  | "wipe_right"
  | "zoom_fade"
  | "blur_fade"
  | "slide_left"
  | "slide_right";

/** 5 أنواع مشاهد */
export type SceneType =
  | "b_roll"
  | "talking_head"
  | "animation"
  | "screen_recording"
  | "mixed";

/** نسب الأبعاد المدعومة */
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

/** وضع الإنتاج */
export type ProductionMode = "draft" | "production";

export interface VideoScene {
  imagePrompt: string;
  subtitle: string;
  narration?: string;
  duration: number;
  zoom: MotionEffect;
  transition?: TransitionEffect;
  sceneType?: SceneType;
}

/** كل أصوات ElevenLabs المدعومة */
export type VoiceId =
  | "ar_male" | "ar_female" | "en_male" | "en_female"
  | "ar_male_formal" | "ar_male_energetic" | "ar_male_calm"
  | "ar_female_formal" | "ar_female_emotional" | "ar_female_marketing"
  | "en_male_formal" | "en_male_energetic"
  | "en_female_formal" | "en_female_emotional"
  | "documentary_narrator";

export interface VideoScript {
  title: string;
  language: "ar" | "en";
  voice: VoiceId;
  narration: string;
  scenes: VideoScene[];
  domain?: string;
  musicMood?: string;
  /** صورة مرفقة من المستخدم — تُستخدم كإطار بداية للمشهد الأول */
  referenceImageUrl?: string;
  /** وصف البطل/الشخصية الرئيسية للحفاظ على الاتساق عبر المشاهد */
  characterDescription?: string;
  /** نوع الفيلم المكتشف */
  filmGenre?: FilmGenre;
}

export interface VideoJob {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  currentStep: string;
  videoUrl?: string;
  error?: string;
  metrics?: {
    durationMs?: number;
    fileSizeMB?: number;
    sceneCount?: number;
    costEstimate?: number;
    usedElevenLabs?: boolean;
    usedRunway?: boolean;
  };
}

export interface VideoProductionOptions {
  aspectRatio?: AspectRatio;
  mode?: ProductionMode;
  musicPath?: string;
  musicVolume?: number;
  useRunway?: boolean;   // تفعيل Runway Image-to-Video (افتراضي: true)
  useElevenLabs?: boolean; // تفعيل ElevenLabs TTS (افتراضي: true)
  quality?: "fast" | "pro"; // جودة الفيديو: fast=720p/ultrafast, pro=1080p/medium+xfade (افتراضي: fast)
  /** تفعيل Character Consistency — الحفاظ على ملامح البطل في كل مشهد */
  enableCharacterConsistency?: boolean;
}

// ═══════════════════════════════════════════════════════════
// الإعدادات — النسخة 3.0
// ═══════════════════════════════════════════════════════════

// إعدادات الدقة لكل وضع
const ASPECT_CONFIGS_FAST: Record<AspectRatio, { width: number; height: number; runwayRatio: string }> = {
  "16:9": { width: 1280, height: 720, runwayRatio: "1280:720" },
  "9:16": { width: 720, height: 1280, runwayRatio: "720:1280" },
  "1:1":  { width: 1080, height: 1080, runwayRatio: "1104:832" },
  "4:3":  { width: 1024, height: 768, runwayRatio: "1104:832" },
};

const ASPECT_CONFIGS_PRO: Record<AspectRatio, { width: number; height: number; runwayRatio: string }> = {
  "16:9": { width: 1920, height: 1080, runwayRatio: "1280:720" },
  "9:16": { width: 1080, height: 1920, runwayRatio: "720:1280" },
  "1:1":  { width: 1080, height: 1080, runwayRatio: "1104:832" },
  "4:3":  { width: 1440, height: 1080, runwayRatio: "1104:832" },
};

// للتوافق مع الكود القديم الذي يستخدم ASPECT_CONFIGS مباشرة
const ASPECT_CONFIGS = ASPECT_CONFIGS_FAST;

const CONFIG = {
  width: 1280,
  height: 720,
  fps: 24,
  arabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  latinFont: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  boldArabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
};

/** تأثيرات الحركة — 8 تأثيرات Ken Burns (Fallback)
 * يستخدم scale+crop بدلاً من zoompan لضمان التوافق مع جميع أبعاد الصور وصيغ الألوان
 * الصورة تُكبَّر 30% ثم يُطبَّق crop متحرك لإنتاج تأثير الحركة
 */
const MOTION_EFFECTS: Record<MotionEffect, (d: number, w: number, h: number, fps: number) => string> = {
  // zoom_in: تكبير من الخارج للداخل — crop يبدأ من الحواف ويتحرك للمركز
  // format=yuv420p في النهاية (بعد crop) لتجنب "Error reinitializing filters!"
  zoom_in:   (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2*(1-t/10)':'(ih-${h})/2*(1-t/10)',format=yuv420p`,
  // zoom_out: تكبير من الداخل للخارج — crop يبدأ من المركز ويتحرك للحواف
  zoom_out:  (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2*min(1,t/8)':'(ih-${h})/2*min(1,t/8)',format=yuv420p`,
  // pan_left: تحريك من اليمين لليسار
  pan_left:  (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'min(iw-${w},(iw-${w})*min(1,t/8))':'(ih-${h})/2',format=yuv420p`,
  // pan_right: تحريك من اليسار لليمين
  pan_right: (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'max(0,(iw-${w})*(1-min(1,t/8)))':'(ih-${h})/2',format=yuv420p`,
  // shake: اهتزاز خفيف
  shake:     (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2+sin(t*8)*4':'(ih-${h})/2+cos(t*8)*4',format=yuv420p`,
  // rotate: حركة دائرية ناعمة
  rotate:    (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2+sin(t*0.5)*6':'(ih-${h})/2+cos(t*0.5)*6',format=yuv420p`,
  // bounce: ارتداد عمودي
  bounce:    (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2':'(ih-${h})/2+abs(sin(t*1.5))*6',format=yuv420p`,
  // spiral: حركة لولبية
  spiral:    (_d, w, h) => `scale=${Math.round(w*1.3)}:${Math.round(h*1.3)}:flags=lanczos,crop=${w}:${h}:'(iw-${w})/2+sin(t*0.8)*8':'(ih-${h})/2+cos(t*0.8)*8',format=yuv420p`,
};

/** الانتقالات — 8 انتقالات */
const TRANSITIONS: Record<TransitionEffect, string> = {
  fade:        "fade=t=out:st=0:d=0.5",
  dissolve:    "fade=t=out:st=0:d=0.8:alpha=1",
  wipe_left:   "fade=t=out:st=0:d=0.5",
  wipe_right:  "fade=t=out:st=0:d=0.5",
  zoom_fade:   "fade=t=out:st=0:d=0.6",
  blur_fade:   "fade=t=out:st=0:d=0.7",
  slide_left:  "fade=t=out:st=0:d=0.5",
  slide_right: "fade=t=out:st=0:d=0.5",
};

/** خريطة الصوت القديم → ElevenLabs */
const LEGACY_VOICE_MAP: Record<string, ElevenLabsVoiceId> = {
  ar_male:   "ar_male_formal",
  ar_female: "ar_female_formal",
  en_male:   "en_male_formal",
  en_female: "en_female_formal",
};

/** وضع المسودة يستخدم نماذج أسرع */
const PRODUCTION_MODELS: Record<ProductionMode, { tts: string }> = {
  draft:      { tts: "eleven_turbo_v2_5" },
  production: { tts: "eleven_multilingual_v2" },
};

// ═══════════════════════════════════════════════════════════
// المنتج الرئيسي — النسخة 3.0
// ═══════════════════════════════════════════════════════════

export class VideoProducer {
  private workDir: string = "";
  private startTime: number = 0;
  private elevenLabs: ElevenLabsEngine;
  private runway: RunwayEngine;

  constructor() {
    this.elevenLabs = new ElevenLabsEngine();
    this.runway = new RunwayEngine();
  }

  async produce(
    script: VideoScript,
    options: VideoProductionOptions = {},
    onProgress?: (job: Partial<VideoJob>) => void
  ): Promise<string> {
    this.workDir = await fs.mkdtemp(path.join(os.tmpdir(), "khayal-video-"));
    this.startTime = Date.now();

    const {
      aspectRatio = "16:9",
      mode = "production",
      musicPath,
      musicVolume = 0.12,
      useRunway = true,
      useElevenLabs = true,
      quality = "fast",
    } = options;

    // اختيار الدقة حسب وضع الجودة
    const dims = quality === "pro"
      ? ASPECT_CONFIGS_PRO[aspectRatio]
      : ASPECT_CONFIGS_FAST[aspectRatio];

    const report = (step: string, progress: number) => {
      onProgress?.({ status: "processing", currentStep: step, progress });
      console.log(`[VideoProducer] ${progress}% — ${step}`);
    };

    let usedElevenLabs = false;
    let usedRunway = false;

    try {
      // ── الخطوة 1: توليد الصور ──────────────────────────
      // كشف نوع الفيلم إذا لم يُحدَّد
      const filmGenre = script.filmGenre ?? detectFilmGenre(
        script.title + " " + (script.domain ?? ""),
        !!script.referenceImageUrl
      );
      const genreDNA = getGenreDNA(filmGenre);
      console.log(`[VideoProducer] نوع الفيلم: ${genreDNA.labelAr} (${filmGenre})`);

      report(`توليد الصور بالتوازي (${genreDNA.labelAr})...`, 5);
      const imagePaths = await this.generateImages(
        script.scenes,
        dims,
        report,
        script.referenceImageUrl,
        script.characterDescription,
        filmGenre
      );

      // ── الخطوة 2: توليد الصوت (ElevenLabs) ─────────────
      report("توليد الصوت الاحترافي (ElevenLabs)...", 35);
      let audioPath: string | null = null;
      if (useElevenLabs) {
        audioPath = await this.generateAudioElevenLabs(script, mode);
        if (audioPath) usedElevenLabs = true;
      }

      // ── الخطوة 3: تحريك الصور (Runway) أو Ken Burns ────
      let scenePaths: string[];
      if (useRunway) {
        report("تحريك الصور بـ Runway Gen-4...", 50);
        const runwayResults = await this.generateRunwayVideos(
          imagePaths,
          script.scenes,
          dims,
          script.domain ?? "cinematic",
          report
        );
        usedRunway = runwayResults.some((r) => r !== null);

        // بناء المشاهد: Runway أو Ken Burns Fallback
        report("تجميع المشاهد مع الترجمة...", 72);
        scenePaths = await this.buildScenesWithRunway(
          script.scenes,
          imagePaths,
          runwayResults,
          dims,
          report,
          quality
        );
      } else {
        // Ken Burns فقط
        report("بناء المشاهد مع حركة Ken Burns...", 55);
        scenePaths = await this.buildScenes(script.scenes, imagePaths, dims, report, quality);
      }

            // ── الخطوة 4: دمج المشاهد ────────────────────
      const mergeLabel = quality === "pro"
        ? "دمج المشاهد مع انتقالات سينمائية..."
        : "دمج المشاهد..."
      report(mergeLabel, 80);
      const transitions = script.scenes.map(s => s.transition);
      const mergedPath = await this.mergeScenes(scenePaths, transitions, quality);

      // ── الخطوة 5: إضافة الصوت ──────────────────────────
      report("إضافة الصوت...", 88);
      let finalPath = audioPath
        ? await this.assembleVideo(mergedPath, audioPath)
        : mergedPath;

      // ── الخطوة 6: الموسيقى الخلفية ─────────────────────
      if (musicPath) {
        report("إضافة الموسيقى الخلفية...", 92);
        finalPath = await this.addBackgroundMusic(finalPath, musicPath, musicVolume);
      }

      // ── الخطوة 7: رفع الفيديو ──────────────────────────
      report("رفع الفيديو...", 95);
      const videoUrl = await this.uploadVideo(finalPath, script.title);

      const durationMs = Date.now() - this.startTime;
      const stat = await fs.stat(finalPath).catch(() => null);
      const fileSizeMB = stat ? stat.size / (1024 * 1024) : 0;

      report("اكتمل الإنتاج!", 100);
      onProgress?.({
        status: "done",
        progress: 100,
        videoUrl,
        metrics: {
          durationMs,
          fileSizeMB: Math.round(fileSizeMB * 10) / 10,
          sceneCount: script.scenes.length,
          costEstimate: this.estimateCost(script.scenes.length, mode, usedElevenLabs, usedRunway),
          usedElevenLabs,
          usedRunway,
        },
      });

      await fs.rm(this.workDir, { recursive: true, force: true });
      return videoUrl;
    } catch (err) {
      await fs.rm(this.workDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 1: توليد الصور
  // ─────────────────────────────────────────────────────────

  private async generateImages(
    scenes: VideoScene[],
    dims: { width: number; height: number },
    onProgress?: (step: string, pct: number) => void,
    referenceImageUrl?: string,
    characterDescription?: string,
    filmGenre?: FilmGenre
  ): Promise<string[]> {
    const { generateImage } = await import("./_core/imageGeneration");

    // الحصول على DNA النوع السينمائي
    const genre = filmGenre ?? "general";
    const genreDNA = getGenreDNA(genre);

    // جزء Character Consistency للإضافة لكل prompt
    const characterPart = characterDescription
      ? `MAIN CHARACTER (MUST appear in this scene): ${characterDescription}. Preserve exact facial features, skin tone, hair, and distinctive appearance. `
      : "";

    onProgress?.(`توليد ${scenes.length} صورة بالتوازي...`, 5);

    // توليد جميع الصور بشكل متوازي (60-70% أسرع)
    const results = await Promise.allSettled(
      scenes.map(async (scene, i) => {
        const imgPath = path.join(this.workDir, `scene_${i + 1}.png`);

        // بناء prompt مخصص للنوع السينمائي
        const genreEnhancedPrompt = `${genreDNA.promptPrefix} ${characterPart}${scene.imagePrompt}, ${genreDNA.lightingStyle}, ${genreDNA.colorGrading}, ${genreDNA.promptSuffix}, ultra photorealistic, 8K`;

        // retry تلقائي 3 محاولات
        let imageUrl: string | undefined;
        let lastErr: Error | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const genOptions: Parameters<typeof generateImage>[0] = {
              prompt: genreEnhancedPrompt,
            };

            // المشهد الأول: استخدم الصورة المرفقة كمرجع بصري (image-to-image)
            if (i === 0 && referenceImageUrl) {
              genOptions.originalImages = [{ url: referenceImageUrl, mimeType: "image/jpeg" }];
              console.log(`[VideoProducer] المشهد 1: استخدام الصورة المرفقة كمرجع بصري`);
            }

            const res = await generateImage(genOptions);
            imageUrl = res.url;
            if (imageUrl) break;
          } catch (e: any) {
            lastErr = e;
            console.warn(`[VideoProducer] generateImage attempt ${attempt}/3 failed for scene ${i+1}: ${e.message}`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }

        if (!imageUrl) throw new Error(`فشل توليد صورة المشهد ${i + 1}: ${lastErr?.message ?? "unknown"}`);

        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());

        await sharp(buffer)
          .resize(dims.width, dims.height, { fit: "cover" })
          .png()
          .toFile(imgPath);

        console.log(`  ✓ صورة ${i + 1}/${scenes.length} جاهزة (${genre})`);
        return imgPath;
      })
    );

    onProgress?.(`تم توليد الصور بالتوازي`, 30);

    // تجميع النتائج بنفس الترتيب الأصلي
    const paths: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        paths.push(r.value);
      } else {
        // في حالة فشل مشهد واحد: استخدم placeholder
        console.error(`[VideoProducer] فشل توليد صورة ${i+1}:`, r.reason);
        // إنشاء صورة placeholder بسيطة
        const placeholderPath = path.join(this.workDir, `scene_${i + 1}.png`);
        await sharp({
          create: {
            width: dims.width,
            height: dims.height,
            channels: 3,
            background: { r: 10, g: 10, b: 20 },
          },
        }).png().toFile(placeholderPath);
        paths.push(placeholderPath);
      }
    }

    return paths;
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 2: توليد الصوت (ElevenLabs)
  // ─────────────────────────────────────────────────────────

  private async generateAudioElevenLabs(
    script: VideoScript,
    mode: ProductionMode = "production"
  ): Promise<string | null> {
    const audioPath = path.join(this.workDir, "narration.mp3");

    // اختيار الصوت المناسب
    const domain = script.domain ?? "educational";
    const gender = script.voice.includes("female") ? "female" : "male";
    const elevenVoice = LEGACY_VOICE_MAP[script.voice] ??
      selectVoiceForDomain(script.language, domain, gender);

    const ttsModel = mode === "production"
      ? "eleven_multilingual_v2"
      : "eleven_turbo_v2_5";

    try {
      const audioBuffer = await this.elevenLabs.generateSpeech({
        voice: elevenVoice,
        text: script.narration,
        model: ttsModel as any,
      });

      if (!audioBuffer) {
        console.warn("[VideoProducer] ElevenLabs TTS فشل — سيتم الإنتاج بدون صوت");
        return null;
      }

      await fs.writeFile(audioPath, audioBuffer);
      console.log(`  ✓ صوت ElevenLabs جاهز: ${audioPath}`);
      return audioPath;
    } catch (e) {
      console.warn(`[VideoProducer] ElevenLabs error: ${e} — سيتم الإنتاج بدون صوت`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 3: تحريك الصور بـ Runway
  // ─────────────────────────────────────────────────────────

  private async generateRunwayVideos(
    imagePaths: string[],
    scenes: VideoScene[],
    dims: { width: number; height: number; runwayRatio: string },
    domain: string,
    onProgress?: (step: string, pct: number) => void
  ): Promise<Array<string | null>> {
    const results: Array<string | null> = [];

    for (let i = 0; i < imagePaths.length; i++) {
      onProgress?.(
        `تحريك مشهد ${i + 1}/${imagePaths.length} بـ Runway...`,
        50 + Math.round((i / imagePaths.length) * 20)
      );

      // رفع الصورة إلى S3 أولاً (Runway يحتاج URL عام)
      const imgBuffer = await fs.readFile(imagePaths[i]);
      const imgKey = `runway-input/scene_${i + 1}_${Date.now()}.png`;
      const { url: imageUrl } = await storagePut(imgKey, imgBuffer, "image/png");

      const motionPreset = selectMotionForDomain(domain, i);
      const videoUrl = await this.runway.imageToVideo({
        imageUrl,
        motionPreset,
        duration: 5,
        ratio: dims.runwayRatio as any,
        promptText: scenes[i].imagePrompt,
      });

      results.push(videoUrl);
      console.log(`  [Runway] مشهد ${i + 1}: ${videoUrl ? "✓ متحرك" : "✗ Ken Burns Fallback"}`);
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────
  // بناء المشاهد مع Runway أو Ken Burns Fallback
  // ─────────────────────────────────────────────────────────

  private async buildScenesWithRunway(
    scenes: VideoScene[],
    imagePaths: string[],
    runwayVideos: Array<string | null>,
    dims: { width: number; height: number },
    onProgress?: (step: string, pct: number) => void,
    quality: "fast" | "pro" = "fast"
  ): Promise<string[]> {
    const scenePaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const outputPath = path.join(this.workDir, `scene_${i + 1}_final.mp4`);

      // تحديث التقدم بشكل أدق: كل مشهد يأخذ ~6% من 72 إلى 78
      const sceneProgress = 72 + Math.round((i / scenes.length) * 6);
      onProgress?.(
        `تجميع مشهد ${i + 1}/${scenes.length} (${Math.round((i / scenes.length) * 100)}%)...`,
        sceneProgress
      );

      // رسم الترجمة على الصورة
      const imgWithSub = path.join(this.workDir, `scene_${i + 1}_sub.png`);
      await this.drawSubtitle(imagePaths[i], scene.subtitle, imgWithSub, dims);

      if (runwayVideos[i]) {
        // استخدام فيديو Runway + إضافة الترجمة عليه
        try {
          await this.addSubtitleToVideo(runwayVideos[i]!, scene.subtitle, scene.duration, dims, outputPath);
          console.log(`  ✓ مشهد ${i + 1} (Runway + ترجمة)`);
        } catch (subtitleErr: any) {
          // إذا فشلت إضافة الترجمة، نستخدم فيديو Runway مباشرة بدون ترجمة
          console.warn(`  ⚠ مشهد ${i + 1}: فشل إضافة الترجمة — استخدام Runway بدون ترجمة`);
          try {
            // تحميل فيديو Runway مباشرة وإعادة ترميزه
            await this.downloadAndReencodeVideo(runwayVideos[i]!, scene.duration, dims, outputPath);
            console.log(`  ✓ مشهد ${i + 1} (Runway بدون ترجمة)`);
          } catch (reencodeErr: any) {
            // Fallback نهائي: Ken Burns
            console.warn(`  ⚠ مشهد ${i + 1}: فشل إعادة الترميز — Ken Burns Fallback`);
            const motion = scene.zoom ?? "zoom_in";
            await this.buildSceneVideo(imgWithSub, scene.duration, motion, dims, outputPath, quality);
            console.log(`  ✓ مشهد ${i + 1} (Ken Burns Fallback)`);
          }
        }
      } else {
        // Fallback: Ken Burns
        const motion = scene.zoom ?? "zoom_in";
        await this.buildSceneVideo(imgWithSub, scene.duration, motion, dims, outputPath, quality);
        console.log(`  ✓ مشهد ${i + 1} (Ken Burns Fallback: ${motion})`);
      }

      scenePaths.push(outputPath);
    }

    return scenePaths;
  }

  // ─────────────────────────────────────────────────────────
  // إضافة ترجمة على فيديو Runway
  // ─────────────────────────────────────────────────────────

  private async addSubtitleToVideo(
    videoUrl: string,
    subtitle: string,
    duration: number,
    dims: { width: number; height: number },
    outputPath: string
  ): Promise<void> {
    // تحميل الفيديو كملف محلي أولاً لتجنب SIGSEGV عند قراءة URL مباشرة
    const tmpPath = outputPath + ".sub_tmp.mp4";
    try {
      await this.downloadFile(videoUrl, tmpPath);
    } catch (dlErr: any) {
      console.warn(`[VideoProducer] addSubtitleToVideo downloadFile error: ${dlErr.message}`);
      throw dlErr;
    }

    return new Promise((resolve, reject) => {
      const isArabic = /[\u0600-\u06ff]/.test(subtitle);
      const fontFile = isArabic ? CONFIG.arabicFont : CONFIG.latinFont;
      const fontSize = isArabic ? 48 : 42;
      const escapedSubtitle = subtitle.replace(/'/g, "\\'").replace(/:/g, "\\:");

      ffmpeg()
        .input(tmpPath)
        .duration(duration)
        .videoFilter([
          // خلفية شبه شفافة
          `drawbox=y=${dims.height - 130}:color=black@0.55:width=${dims.width}:height=110:t=fill`,
          // خط أزرق
          `drawbox=y=${dims.height - 130}:color=0x4488FF@0.8:width=${dims.width}:height=3:t=fill`,
          // النص
          `drawtext=fontfile=${fontFile}:text='${escapedSubtitle}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${dims.height - 80}:shadowcolor=black@0.7:shadowx=2:shadowy=2`,
        ])
        .videoCodec("libx264")
        .outputOptions(["-preset ultrafast", "-crf 20", "-pix_fmt yuv420p"])
        .output(outputPath)
        .on("end", () => {
          fs.unlink(tmpPath).catch(() => {});
          resolve();
        })
        .on("error", (err: Error) => {
          fs.unlink(tmpPath).catch(() => {});
          console.warn(`[VideoProducer] addSubtitleToVideo error: ${err.message} — using Ken Burns fallback`);
          reject(err);
        })
        .run();
    });
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 3 (Fallback): بناء المشاهد بـ Ken Burns
  // ─────────────────────────────────────────────────────────

  private async buildScenes(
    scenes: VideoScene[],
    imagePaths: string[],
    dims: { width: number; height: number },
    onProgress?: (step: string, pct: number) => void,
    quality: "fast" | "pro" = "fast"
  ): Promise<string[]> {
    const scenePaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imgPath = imagePaths[i];
      const outputPath = path.join(this.workDir, `scene_${i + 1}_final.mp4`);

      // تحديث دقيق لكل مشهد: 55% إلى 75%
      const sceneProgress = 55 + Math.round((i / scenes.length) * 20);
      onProgress?.(
        `بناء مشهد ${i + 1}/${scenes.length}... (${Math.round(((i + 1) / scenes.length) * 100)}%)`,
        sceneProgress
      );

      const imgWithSub = path.join(this.workDir, `scene_${i + 1}_sub.png`);
      await this.drawSubtitle(imgPath, scene.subtitle, imgWithSub, dims);

      const motion = scene.zoom ?? "zoom_in";
      await this.buildSceneVideo(imgWithSub, scene.duration, motion, dims, outputPath, quality);

      scenePaths.push(outputPath);
      console.log(`  ✓ مشهد ${i + 1} جاهز (Ken Burns: ${motion})`);
    }

    return scenePaths;
  }

  // ─────────────────────────────────────────────────────────
  // رسم الترجمة (خلفية شبه شفافة + ظل + خط عربي)
  // ─────────────────────────────────────────────────────────

  private async drawSubtitle(
    imgPath: string,
    subtitle: string,
    outputPath: string,
    dims: { width: number; height: number }
  ): Promise<void> {
    const isArabic = /[\u0600-\u06ff]/.test(subtitle);
    const fontSize = isArabic ? 52 : 46;
    const textDirection = isArabic ? "rtl" : "ltr";
    const fontFamily = isArabic ? "Noto Naskh Arabic" : "DejaVu Sans";

    const svgText = `
<svg width="${dims.width}" height="${dims.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>
  <rect x="0" y="${dims.height - 130}" width="${dims.width}" height="110" fill="rgba(0,0,0,0.55)" rx="0"/>
  <rect x="0" y="${dims.height - 130}" width="${dims.width}" height="3" fill="rgba(68,136,255,0.8)"/>
  <text x="${dims.width / 2 + 2}" y="${dims.height - 57}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" fill="rgba(0,0,0,0.7)" direction="${textDirection}">${this.escapeXml(subtitle)}</text>
  <text x="${dims.width / 2}" y="${dims.height - 60}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" fill="white" direction="${textDirection}" filter="url(#shadow)">${this.escapeXml(subtitle)}</text>
</svg>`;

    await sharp(imgPath)
      .resize(dims.width, dims.height)
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .png()
      .toFile(outputPath);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // ─────────────────────────────────────────────────────────
  // تحميل فيديو Runway وإعادة ترميزه بدون ترجمة
  // ─────────────────────────────────────────────────────────

  private async downloadAndReencodeVideo(
    videoUrl: string,
    duration: number,
    dims: { width: number; height: number },
    outputPath: string
  ): Promise<void> {
    // تحميل الفيديو كملف محلي أولاً لتجنب SIGSEGV عند قراءة URL مباشرة
    const tmpPath = outputPath + ".tmp.mp4";
    await this.downloadFile(videoUrl, tmpPath);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(tmpPath)
        .duration(duration)
        .videoCodec("libx264")
        .outputOptions(["-preset ultrafast", "-crf 20", "-pix_fmt yuv420p"])
        .output(outputPath)
        .on("end", () => {
          fs.unlink(tmpPath).catch(() => {});
          resolve();
        })
        .on("error", (err: Error) => {
          fs.unlink(tmpPath).catch(() => {});
          console.warn(`[VideoProducer] downloadAndReencodeVideo error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  private downloadFile(url: string, destPath: string, timeoutMs = 30_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = url.startsWith("https") ? https : http;
      const file = fsSync.createWriteStream(destPath);
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        file.close();
        fs.unlink(destPath).catch(() => {});
        reject(new Error(`downloadFile timeout after ${timeoutMs}ms: ${url.slice(0, 80)}`));
      }, timeoutMs);

      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) {
          file.close();
          fs.unlink(destPath).catch(() => {});
          reject(err);
        } else {
          file.close(() => resolve());
        }
      };

      proto.get(url, (res: any) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          clearTimeout(timer);
          settled = true;
          file.close();
          this.downloadFile(res.headers.location, destPath, timeoutMs).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          done(new Error(`HTTP ${res.statusCode} downloading video`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => done());
        file.on("error", (err: Error) => done(err));
        res.on("error", (err: Error) => done(err));
      }).on("error", (err: Error) => done(err));
    });
  }

  // ─────────────────────────────────────────────────────────
  // بناء مقطع فيديو مشهد واحد (8 تأثيرات Ken Burns)
  // ─────────────────────────────────────────────────────────

  private buildSceneVideo(
    imgPath: string,
    duration: number,
    motion: MotionEffect,
    dims: { width: number; height: number },
    outputPath: string,
    quality: "fast" | "pro" = "fast"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const motionFn = MOTION_EFFECTS[motion] ?? MOTION_EFFECTS["zoom_in"];
      // MOTION_EFFECTS تتضمن scale+format+crop بشكل كامل
      const fullFilter = motionFn(duration, dims.width, dims.height, CONFIG.fps);

      const preset = quality === "pro" ? "medium" : "ultrafast";
      const crf = quality === "pro" ? 18 : 23;
      console.log(`[buildSceneVideo] imgPath=${imgPath} dims=${dims.width}x${dims.height} motion=${motion} quality=${quality}`);

      ffmpeg()
        .input(imgPath)
        .inputOptions(["-loop 1"])
        .videoFilter(fullFilter)
        .duration(duration)
        .fps(CONFIG.fps)
        .videoCodec("libx264")
        .outputOptions([`-preset ${preset}`, `-crf ${crf}`, "-pix_fmt yuv420p"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => {
          console.error(`[buildSceneVideo] ffmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }
  // ─────────────────────────────────────────────────────────
  // الخطوة 4: دمج المشاهد
  // ─────────────────────────────────────────────────────────

  private mergeScenes(
    scenePaths: string[],
    transitions?: Array<TransitionEffect | undefined>,
    quality: "fast" | "pro" = "fast"
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const mergedPath = path.join(this.workDir, "merged.mp4");

      // إذا مشهد واحد فقط أو وضع سريع: concat مباشر
      if (scenePaths.length === 1 || quality === "fast") {
        const concatFile = path.join(this.workDir, "concat.txt");
        const concatContent = scenePaths.map(p => `file '${p}'`).join("\n");
        await fs.writeFile(concatFile, concatContent);
        ffmpeg()
          .input(concatFile)
          .inputOptions(["-f concat", "-safe 0"])
          .videoCodec("copy")
          .output(mergedPath)
          .on("end", () => resolve(mergedPath))
          .on("error", (err: Error) => reject(err))
          .run();
        return;
      }

      // وضع احترافي: xfade انتقالات سينمائية بين المشاهد
      // خريطة الانتقالات إلى أسماء xfade المدعومة في FFmpeg
      const XFADE_MAP: Record<TransitionEffect, string> = {
        fade:       "fade",
        dissolve:   "dissolve",
        wipe_left:  "wipeleft",
        wipe_right: "wiperight",
        zoom_fade:  "zoomin",
        blur_fade:  "fadeblack",
        slide_left: "slideleft",
        slide_right: "slideright",
      };

      const XFADE_DURATION = 0.8; // ثانية للانتقال

      try {
        // حساب offset لكل انتقال بناءً على مدة المشاهد
        // نحتاج مدة كل مشهد — نقرأها من ffprobe
        const getDuration = (filePath: string): Promise<number> =>
          new Promise((res, rej) => {
            ffmpeg.ffprobe(filePath, (err: any, data: any) => {
              if (err) rej(err);
              else res(data.format.duration as number);
            });
          });

        const durations = await Promise.all(scenePaths.map(getDuration));

        // بناء filter_complex لـ xfade
        let cmd = ffmpeg();
        scenePaths.forEach(p => cmd.input(p));

        let filterParts: string[] = [];
        let currentLabel = "[0:v]";
        let cumulativeOffset = 0;

        for (let i = 1; i < scenePaths.length; i++) {
          const transition = transitions?.[i - 1];
          const xfadeType = transition ? (XFADE_MAP[transition] ?? "fade") : "fade";
          const offset = Math.max(0.1, cumulativeOffset + durations[i - 1] - XFADE_DURATION);
          cumulativeOffset = offset;
          const outLabel = i === scenePaths.length - 1 ? "[vout]" : `[v${i}]`;
          filterParts.push(
            `${currentLabel}[${i}:v]xfade=transition=${xfadeType}:duration=${XFADE_DURATION}:offset=${offset.toFixed(2)}${outLabel}`
          );
          currentLabel = outLabel;
        }

        const preset = quality === "pro" ? "medium" : "ultrafast";
        const crf = quality === "pro" ? 18 : 23;

        cmd
          .complexFilter(filterParts.join(";")+";")
          .outputOptions([
            "-map", "[vout]",
            "-c:v", "libx264",
            `-preset ${preset}`,
            `-crf ${crf}`,
            "-pix_fmt", "yuv420p",
          ])
          .output(mergedPath)
          .on("end", () => resolve(mergedPath))
          .on("error", (err: Error) => {
            // Fallback: concat بدون انتقالات إذا فشل xfade
            console.warn(`[mergeScenes] xfade failed, falling back to concat: ${err.message}`);
            const concatFile = path.join(this.workDir, "concat_fb.txt");
            const concatContent = scenePaths.map(p => `file '${p}'`).join("\n");
            fs.writeFile(concatFile, concatContent).then(() => {
              ffmpeg()
                .input(concatFile)
                .inputOptions(["-f concat", "-safe 0"])
                .videoCodec("copy")
                .output(mergedPath)
                .on("end", () => resolve(mergedPath))
                .on("error", (err2: Error) => reject(err2))
                .run();
            }).catch(reject);
          })
          .run();
      } catch (probeErr) {
        // Fallback إذا فشل ffprobe
        console.warn(`[mergeScenes] ffprobe failed, using concat: ${probeErr}`);
        const concatFile = path.join(this.workDir, "concat_fb2.txt");
        const concatContent = scenePaths.map(p => `file '${p}'`).join("\n");
        await fs.writeFile(concatFile, concatContent);
        ffmpeg()
          .input(concatFile)
          .inputOptions(["-f concat", "-safe 0"])
          .videoCodec("copy")
          .output(mergedPath)
          .on("end", () => resolve(mergedPath))
          .on("error", (err: Error) => reject(err))
          .run();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 5: إضافة الصوت
  // ─────────────────────────────────────────────────────────

  private assembleVideo(
    mergedPath: string,
    audioPath: string | null
  ): Promise<string> {
    if (!audioPath) return Promise.resolve(mergedPath);
    return new Promise((resolve, reject) => {
      const finalPath = path.join(this.workDir, "with_audio.mp4");

      ffmpeg()
        .input(mergedPath)
        .input(audioPath)
        .videoCodec("copy")
        .audioCodec("aac")
        .audioBitrate("192k")
        .outputOptions(["-shortest"])
        .output(finalPath)
        .on("end", () => resolve(finalPath))
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 6: الموسيقى الخلفية
  // ─────────────────────────────────────────────────────────

  private addBackgroundMusic(
    videoPath: string,
    musicPath: string,
    vol: number = 0.12
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const finalPath = path.join(this.workDir, "final.mp4");

      ffmpeg()
        .input(videoPath)
        .input(musicPath)
        .outputOptions([
          "-filter_complex",
          `[1:a]volume=${vol}[m];[0:a][m]amix=inputs=2:duration=first[a]`,
          "-map", "0:v",
          "-map", "[a]",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "192k",
        ])
        .output(finalPath)
        .on("end", () => resolve(finalPath))
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  // ─────────────────────────────────────────────────────────
  // رفع الفيديو إلى S3
  // ─────────────────────────────────────────────────────────

  private async uploadVideo(filePath: string, title: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06ff]/g, "_").slice(0, 40);
    const timestamp = Date.now();
    const key = `videos/${safeTitle}-${timestamp}.mp4`;

    const { url } = await storagePut(key, buffer, "video/mp4");
    console.log(`  ✓ الفيديو مرفوع: ${url}`);
    return url;
  }

  // ─────────────────────────────────────────────────────────
  // تقدير التكلفة
  // ─────────────────────────────────────────────────────────

  private estimateCost(
    sceneCount: number,
    mode: ProductionMode,
    usedElevenLabs: boolean,
    usedRunway: boolean
  ): number {
    const imageCost = sceneCount * 0.04; // DALL-E 3
    const ttsCost = usedElevenLabs ? (mode === "production" ? 0.03 : 0.01) : 0;
    const runwayCost = usedRunway ? sceneCount * 0.05 : 0; // ~5 credits/scene
    return Math.round((imageCost + ttsCost + runwayCost) * 100) / 100;
  }
}

// ═══════════════════════════════════════════════════════════
// مولّد السيناريو الذكي v3.0
// ═══════════════════════════════════════════════════════════

export async function generateVideoScript(
  userInput: string,
  language: "ar" | "en" = "ar",
  voice: VoiceId = "ar_male",
  sceneCount: number = 6,
  characterDescription?: string,
  referenceImageUrl?: string
): Promise<VideoScript> {
  // كشف نوع الفيلم تلقائياً
  const filmGenre = detectFilmGenre(userInput, !!referenceImageUrl);
  const genreDNA = getGenreDNA(filmGenre);
  console.log(`[generateVideoScript] نوع الفيلم: ${genreDNA.labelAr} (${filmGenre})`);

  // جزء Character Consistency للنظام
  const characterGuidance = characterDescription
    ? `\nCHARACTER CONSISTENCY RULE: The main character appears in EVERY scene with these EXACT features: ${characterDescription}. Include them naturally in each scene's imagePrompt.`
    : "";
  const systemPrompt = `أنت مخرج سينمائي محترف متخصص في إنتاج أفلام من نوع "${genreDNA.labelEn}" (${genreDNA.labelAr}).
أسلوب التصوير: ${genreDNA.cameraStyle}
الإضاءة: ${genreDNA.lightingStyle}
تدرج اللون: ${genreDNA.colorGrading}
أسلوب الراوي: ${genreDNA.narratorTone}
إيقاع القصة: ${genreDNA.paceDescription}${characterGuidance}
مهمتك: تحليل المحتوى المقدم وكتابة سيناريو فيديو احترافي وفق معادلة الجودة الكاملة.

معادلة الجودة:
جودة الفيديو = (السيناريو × 0.35) + (الصور × 0.30) + (الحركة × 0.10) + (الصوت × 0.20) + (الموسيقى × 0.05)

قواعد السيناريو الاحترافي:
1. السيناريو أولاً — النص القوي قبل التقنية
2. كل صورة تخدم الرسالة وتعززها
3. تنويع تأثيرات الحركة: zoom_in, zoom_out, pan_left, pan_right, shake, rotate, bounce, spiral
4. تنويع الانتقالات: fade, dissolve, wipe_left, wipe_right, zoom_fade, blur_fade, slide_left, slide_right
5. الصوت يحمل العاطفة والتعليم
6. الترجمة واضحة وموجزة

أنواع المحتوى المدعومة:
- تعليمي: حياة الحيوانات، العلوم، التاريخ، الجغرافيا، الأحياء
- قصصي: قصص أطفال، روايات، خرافات
- وثائقي: طبيعة، فضاء، بحار، غابات
- تسويقي: منتجات، خدمات، مشاريع
- معماري: مباني، مشاريع، تصاميم
- تاريخي: أحداث، شخصيات، حضارات
- علمي: فيزياء، كيمياء، رياضيات، طب
- فضائي: كواكب، نجوم، مجرات
- سينمائي: أفلام، مشاهد درامية، أكشن

أعد JSON بالتنسيق التالي بدون أي نص إضافي:
{
  "title": "عنوان الفيلم",
  "language": "${language}",
  "voice": "${voice}",
  "narration": "النص الكامل للتعليق الصوتي — يجب أن يكون متدفقاً وعاطفياً وتعليمياً",
  "domain": "نوع المحتوى",
  "musicMood": "calm|epic|dramatic|playful|mysterious|inspiring",
  "scenes": [
    {
      "imagePrompt": "وصف الصورة بالإنجليزي — احترافي وسينمائي ودقيق",
      "subtitle": "الترجمة على الشاشة بالعربي — موجزة وواضحة",
      "narration": "نص التعليق لهذا المشهد — تعليمي أو قصصي",
      "duration": 10,
      "zoom": "zoom_in",
      "transition": "fade",
      "sceneType": "b_roll"
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `اكتب سيناريو فيديو من نوع "${genreDNA.labelAr}" عن: "${userInput}"\nعدد المشاهد: ${sceneCount}\nاللغة: ${language === "ar" ? "العربية" : "الإنجليزية"}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "video_script",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            language: { type: "string", enum: ["ar", "en"] },
            voice: { type: "string", enum: ["ar_male", "ar_female", "en_male", "en_female"] },
            narration: { type: "string" },
            domain: { type: "string" },
            musicMood: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  imagePrompt: { type: "string" },
                  subtitle: { type: "string" },
                  narration: { type: "string" },
                  duration: { type: "number" },
                  zoom: { type: "string", enum: ["zoom_in", "zoom_out", "pan_left", "pan_right", "shake", "rotate", "bounce", "spiral"] },
                  transition: { type: "string", enum: ["fade", "dissolve", "wipe_left", "wipe_right", "zoom_fade", "blur_fade", "slide_left", "slide_right"] },
                  sceneType: { type: "string", enum: ["b_roll", "talking_head", "animation", "screen_recording", "mixed"] },
                },
                required: ["imagePrompt", "subtitle", "narration", "duration", "zoom", "transition", "sceneType"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "language", "voice", "narration", "domain", "musicMood", "scenes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const script = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  // إضافة بيانات النوع والشخصية
  return {
    ...script,
    filmGenre,
    characterDescription,
    referenceImageUrl,
  } as VideoScript;
}
