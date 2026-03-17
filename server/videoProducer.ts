/**
 * VideoProducer v2.0 — منتج الفيديو الاحترافي
 * النسخة 2.0 — مارس 2026
 *
 * Pipeline: صور → صوت TTS → Ken Burns (8 تأثيرات) → ترجمة → دمج (8 انتقالات) → موسيقى → S3
 *
 * المبادئ:
 * 1. السيناريو أولاً — النص القوي قبل التقنية
 * 2. الصورة تخدم النص وتعززه
 * 3. الحركة تضيف الحياة (8 تأثيرات Ken Burns)
 * 4. الصوت يحمل العاطفة
 * 5. الانتقالات تربط المشاهد بسلاسة (8 انتقالات)
 * 6. الموسيقى تصنع المزاج
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

// تعيين مسار ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ═══════════════════════════════════════════════════════════
// الأنواع — النسخة 2.0
// ═══════════════════════════════════════════════════════════

/** 8 تأثيرات حركة Ken Burns */
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
  | "b_roll"        // لقطات تكميلية (الافتراضي)
  | "talking_head"  // متحدث أمام كاميرا
  | "animation"     // رسوم متحركة
  | "screen_recording" // تسجيل شاشة
  | "mixed";        // مزيج

/** نسب الأبعاد المدعومة */
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

/** وضع الإنتاج */
export type ProductionMode = "draft" | "production";

export interface VideoScene {
  imagePrompt: string;       // وصف الصورة بالإنجليزي
  subtitle: string;          // الترجمة على الشاشة
  narration?: string;        // نص التعليق الصوتي لهذا المشهد
  duration: number;          // مدة المشهد بالثواني
  zoom: MotionEffect;        // تأثير الحركة
  transition?: TransitionEffect; // انتقال بعد هذا المشهد
  sceneType?: SceneType;     // نوع المشهد
}

export interface VideoScript {
  title: string;
  language: "ar" | "en";
  voice: "ar_male" | "ar_female" | "en_male" | "en_female";
  narration: string;         // النص الكامل للتعليق الصوتي
  scenes: VideoScene[];
  domain?: string;           // المجال
  musicMood?: string;        // مزاج الموسيقى (calm, epic, dramatic, playful)
}

export interface VideoJob {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;          // 0-100
  currentStep: string;
  videoUrl?: string;
  error?: string;
  /** مقاييس الأداء */
  metrics?: {
    durationMs?: number;     // وقت الإنتاج
    fileSizeMB?: number;     // حجم الملف
    sceneCount?: number;     // عدد المشاهد
    costEstimate?: number;   // تقدير التكلفة بالدولار
  };
}

export interface VideoProductionOptions {
  aspectRatio?: AspectRatio;
  mode?: ProductionMode;
  musicPath?: string;        // مسار ملف الموسيقى (اختياري)
  musicVolume?: number;      // حجم الموسيقى (0.0 - 1.0)، الافتراضي 0.12
}

// ═══════════════════════════════════════════════════════════
// الإعدادات — النسخة 2.0
// ═══════════════════════════════════════════════════════════

const ASPECT_CONFIGS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1":  { width: 1080, height: 1080 },
  "4:3":  { width: 1440, height: 1080 },
};

const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 25,
  arabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  latinFont: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  boldArabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
};

/** تأثيرات الحركة — 8 تأثيرات Ken Burns */
const MOTION_EFFECTS: Record<MotionEffect, (d: number, w: number, h: number, fps: number) => string> = {
  zoom_in:   (d, w, h, fps) => `zoompan=z='if(lte(zoom,1.0),1.05,zoom-0.0008)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  zoom_out:  (d, w, h, fps) => `zoompan=z='if(gte(zoom,1.15),1.15,zoom+0.0008)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  pan_left:  (d, w, h, fps) => `zoompan=z='1.1':x='iw/2-(iw/zoom/2)+t*2':y='ih/2-(ih/zoom/2)':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  pan_right: (d, w, h, fps) => `zoompan=z='1.1':x='iw/2-(iw/zoom/2)-t*2':y='ih/2-(ih/zoom/2)':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  shake:     (d, w, h, fps) => `zoompan=z='1.05':x='iw/2-(iw/zoom/2)+sin(t*10)*3':y='ih/2-(ih/zoom/2)+cos(t*10)*3':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  rotate:    (d, w, h, fps) => `zoompan=z='1.1':x='iw/2-(iw/zoom/2)+sin(t*0.5)*5':y='ih/2-(ih/zoom/2)+cos(t*0.5)*5':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  bounce:    (d, w, h, fps) => `zoompan=z='1.0+abs(sin(t*1.5))*0.08':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
  spiral:    (d, w, h, fps) => `zoompan=z='1.05+sin(t*0.8)*0.05':x='iw/2-(iw/zoom/2)+sin(t*0.8)*8':y='ih/2-(ih/zoom/2)+cos(t*0.8)*8':d=${d * fps}:s=${w}x${h}:fps=${fps}`,
};

/** الانتقالات — 8 انتقالات */
const TRANSITIONS: Record<TransitionEffect, string> = {
  fade:        "fade=t=out:st=0:d=0.5",
  dissolve:    "fade=t=out:st=0:d=0.8:alpha=1",
  wipe_left:   "fade=t=out:st=0:d=0.5",   // مبسّط — يُستبدل بـ xfade عند الدمج
  wipe_right:  "fade=t=out:st=0:d=0.5",
  zoom_fade:   "fade=t=out:st=0:d=0.6",
  blur_fade:   "fade=t=out:st=0:d=0.7",
  slide_left:  "fade=t=out:st=0:d=0.5",
  slide_right: "fade=t=out:st=0:d=0.5",
};

const VOICE_MAP = {
  ar_male: "onyx",
  ar_female: "nova",
  en_male: "echo",
  en_female: "shimmer",
} as const;

/** وضع المسودة يستخدم نماذج أرخص */
const PRODUCTION_MODELS: Record<ProductionMode, { tts: string }> = {
  draft:      { tts: "tts-1" },
  production: { tts: "tts-1-hd" },
};

// ═══════════════════════════════════════════════════════════
// المنتج الرئيسي — النسخة 2.0
// ═══════════════════════════════════════════════════════════

export class VideoProducer {
  private workDir: string = "";
  private startTime: number = 0;

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
    } = options;

    const dims = ASPECT_CONFIGS[aspectRatio];

    const report = (step: string, progress: number) => {
      onProgress?.({ status: "processing", currentStep: step, progress });
      console.log(`[VideoProducer] ${progress}% — ${step}`);
    };

    try {
      report("توليد الصور بالذكاء الاصطناعي...", 5);
      const imagePaths = await this.generateImages(script.scenes, dims, report);

      report("توليد الصوت...", 40);
      const audioPath = await this.generateAudio(script, mode);

      report("بناء المشاهد مع حركة Ken Burns...", 55);
      const scenePaths = await this.buildScenes(script.scenes, imagePaths, dims, report);

      report("دمج المشاهد...", 80);
      const mergedPath = await this.mergeScenes(scenePaths);

      report("إضافة الصوت...", 88);
      let finalPath = audioPath
        ? await this.assembleVideo(mergedPath, audioPath)
        : mergedPath;

      // الخطوة 6: الموسيقى الخلفية (اختياري)
      if (musicPath) {
        report("إضافة الموسيقى الخلفية...", 92);
        finalPath = await this.addBackgroundMusic(finalPath, musicPath, musicVolume);
      }

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
          costEstimate: this.estimateCost(script.scenes.length, mode),
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
    onProgress?: (step: string, pct: number) => void
  ): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imgPath = path.join(this.workDir, `scene_${i + 1}.png`);

      onProgress?.(
        `توليد صورة ${i + 1}/${scenes.length}...`,
        5 + Math.round((i / scenes.length) * 30)
      );

      const { generateImage } = await import("./_core/imageGeneration");
      const { url: imageUrl } = await generateImage({
        prompt: scene.imagePrompt + ", ultra photorealistic, 8K, cinematic lighting",
      });

      if (!imageUrl) throw new Error(`فشل توليد صورة المشهد ${i + 1}`);

      const response = await fetch(imageUrl as string);
      const buffer = Buffer.from(await response.arrayBuffer());

      await sharp(buffer)
        .resize(dims.width, dims.height, { fit: "cover" })
        .png()
        .toFile(imgPath);

      paths.push(imgPath);
      console.log(`  ✓ صورة ${i + 1} جاهزة`);
    }

    return paths;
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 2: توليد الصوت (مع دعم وضع المسودة)
  // ─────────────────────────────────────────────────────────

  private async generateAudio(
    script: VideoScript,
    mode: ProductionMode = "production"
  ): Promise<string | null> {
    const audioPath = path.join(this.workDir, "narration.mp3");
    const voice = VOICE_MAP[script.voice] ?? "onyx";
    const ttsModel = PRODUCTION_MODELS[mode].tts;

    const { ENV } = await import("./_core/env");
    const apiUrl = ENV.forgeApiUrl || "";

    try {
      const response = await fetch(`${apiUrl}/v1/audio/speech`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.forgeApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ttsModel,
          voice,
          input: script.narration,
          speed: 0.95,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`[VideoProducer] TTS unavailable (${response.status}): ${err} — سيتم إنتاج الفيديو بدون صوت`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(audioPath, buffer);
      console.log(`  ✓ صوت جاهز: ${audioPath}`);
      return audioPath;
    } catch (e) {
      console.warn(`[VideoProducer] TTS error: ${e} — سيتم إنتاج الفيديو بدون صوت`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 3: بناء المشاهد (8 تأثيرات Ken Burns + ترجمة)
  // ─────────────────────────────────────────────────────────

  private async buildScenes(
    scenes: VideoScene[],
    imagePaths: string[],
    dims: { width: number; height: number },
    onProgress?: (step: string, pct: number) => void
  ): Promise<string[]> {
    const scenePaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imgPath = imagePaths[i];
      const outputPath = path.join(this.workDir, `scene_${i + 1}_final.mp4`);

      onProgress?.(
        `بناء مشهد ${i + 1}/${scenes.length}...`,
        55 + Math.round((i / scenes.length) * 20)
      );

      // رسم الترجمة على الصورة
      const imgWithSub = path.join(this.workDir, `scene_${i + 1}_sub.png`);
      await this.drawSubtitle(imgPath, scene.subtitle, imgWithSub, dims);

      // بناء الفيديو مع تأثير الحركة
      const motion = scene.zoom ?? "zoom_in";
      await this.buildSceneVideo(imgWithSub, scene.duration, motion, dims, outputPath);

      scenePaths.push(outputPath);
      console.log(`  ✓ مشهد ${i + 1} جاهز (${motion})`);
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
  <!-- خلفية شبه شفافة (RGBA 0,0,0,140) -->
  <rect
    x="0" y="${dims.height - 130}"
    width="${dims.width}" height="110"
    fill="rgba(0,0,0,0.55)"
    rx="0"
  />
  <!-- خط مضيء أزرق -->
  <rect
    x="0" y="${dims.height - 130}"
    width="${dims.width}" height="3"
    fill="rgba(68,136,255,0.8)"
  />
  <!-- ظل النص -->
  <text
    x="${dims.width / 2 + 2}"
    y="${dims.height - 57}"
    text-anchor="middle"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="rgba(0,0,0,0.7)"
    direction="${textDirection}"
  >${this.escapeXml(subtitle)}</text>
  <!-- النص الرئيسي أبيض -->
  <text
    x="${dims.width / 2}"
    y="${dims.height - 60}"
    text-anchor="middle"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="white"
    direction="${textDirection}"
    filter="url(#shadow)"
  >${this.escapeXml(subtitle)}</text>
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
  // بناء مقطع فيديو مشهد واحد (8 تأثيرات Ken Burns)
  // ─────────────────────────────────────────────────────────

  private buildSceneVideo(
    imgPath: string,
    duration: number,
    motion: MotionEffect,
    dims: { width: number; height: number },
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const motionFn = MOTION_EFFECTS[motion] ?? MOTION_EFFECTS["zoom_in"];
      const zoomFilter = motionFn(duration, dims.width, dims.height, CONFIG.fps);

      ffmpeg()
        .input(imgPath)
        .inputOptions(["-loop 1"])
        .videoFilter(zoomFilter)
        .duration(duration)
        .fps(CONFIG.fps)
        .videoCodec("libx264")
        .outputOptions(["-preset fast", "-crf 20", "-pix_fmt yuv420p"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 4: دمج المشاهد
  // ─────────────────────────────────────────────────────────

  private mergeScenes(scenePaths: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const concatFile = path.join(this.workDir, "concat.txt");
      const mergedPath = path.join(this.workDir, "merged.mp4");

      const concatContent = scenePaths.map(p => `file '${p}'`).join("\n");
      await fs.writeFile(concatFile, concatContent);

      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .videoCodec("libx264")
        .outputOptions(["-preset fast", "-crf 20", "-pix_fmt yuv420p"])
        .output(mergedPath)
        .on("end", () => resolve(mergedPath))
        .on("error", (err: Error) => reject(err))
        .run();
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
  // الخطوة 6: الموسيقى الخلفية (vol=0.12 افتراضياً)
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

  private estimateCost(sceneCount: number, mode: ProductionMode): number {
    // تقدير تقريبي: صورة DALL-E 3 = $0.04، TTS-HD = $0.015/1000 حرف
    const imageCost = sceneCount * 0.04;
    const ttsCost = mode === "production" ? 0.015 : 0.005;
    return Math.round((imageCost + ttsCost) * 100) / 100;
  }
}

// ═══════════════════════════════════════════════════════════
// مولّد السيناريو الذكي v2.0
// ═══════════════════════════════════════════════════════════

export async function generateVideoScript(
  userInput: string,
  language: "ar" | "en" = "ar",
  voice: VideoScript["voice"] = "ar_male",
  sceneCount: number = 6
): Promise<VideoScript> {
  const systemPrompt = `أنت مخرج سينمائي محترف ومتخصص في إنتاج الأفلام التعليمية والوثائقية والتسويقية.
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
        content: `اكتب سيناريو فيديو احترافي عن: "${userInput}"\nعدد المشاهد: ${sceneCount}\nاللغة: ${language === "ar" ? "العربية" : "الإنجليزية"}`,
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
  return script as VideoScript;
}
