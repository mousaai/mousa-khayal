/**
 * VideoProducer — منتج الفيديو الاحترافي
 * Pipeline: صور (DALL-E 3) → صوت (TTS) → Ken Burns (FFmpeg) → ترجمة عربية (sharp) → دمج → S3
 *
 * يتبع منهج الإخراج الاحترافي:
 * 1. السيناريو أولاً
 * 2. الصورة تخدم النص
 * 3. الحركة تضيف الحياة (Ken Burns)
 * 4. الصوت يحمل العاطفة
 * 5. الخط العربي حق
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
// الأنواع
// ═══════════════════════════════════════════════════════════

export interface VideoScene {
  imagePrompt: string;       // وصف الصورة بالإنجليزي لـ DALL-E
  subtitle: string;          // الترجمة على الشاشة (عربي أو إنجليزي)
  narration?: string;        // نص التعليق الصوتي لهذا المشهد (اختياري)
  duration: number;          // مدة المشهد بالثواني
  zoom: "in" | "out" | "pan_left" | "pan_right"; // حركة الكاميرا
}

export interface VideoScript {
  title: string;
  language: "ar" | "en";
  voice: "ar_male" | "ar_female" | "en_male" | "en_female";
  narration: string;         // النص الكامل للتعليق الصوتي
  scenes: VideoScene[];
  domain?: string;           // المجال (educational, cinematic, architectural...)
}

export interface VideoJob {
  jobId: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;          // 0-100
  currentStep: string;
  videoUrl?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// الإعدادات
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 25,
  arabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  latinFont: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  boldArabicFont: "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
};

const VOICE_MAP = {
  ar_male: "onyx",
  ar_female: "nova",
  en_male: "echo",
  en_female: "shimmer",
} as const;

// ═══════════════════════════════════════════════════════════
// المنتج الرئيسي
// ═══════════════════════════════════════════════════════════

export class VideoProducer {
  private workDir: string = "";

  async produce(
    script: VideoScript,
    onProgress?: (job: Partial<VideoJob>) => void
  ): Promise<string> {
    // إنشاء مجلد عمل مؤقت
    this.workDir = await fs.mkdtemp(path.join(os.tmpdir(), "khayal-video-"));

    const report = (step: string, progress: number) => {
      onProgress?.({ status: "processing", currentStep: step, progress });
      console.log(`[VideoProducer] ${progress}% — ${step}`);
    };

    try {
      report("توليد الصور بالذكاء الاصطناعي...", 5);
      const imagePaths = await this.generateImages(script.scenes, report);

      report("توليد الصوت العربي...", 40);
      const audioPath = await this.generateAudio(script);

      report("بناء المشاهد مع حركة Ken Burns...", 55);
      const scenePaths = await this.buildScenes(script.scenes, imagePaths, report);

      report("دمج المشاهد...", 80);
      const mergedPath = await this.mergeScenes(scenePaths);

      report("إضافة الصوت وتجميع الفيديو النهائي...", 88);
      const finalPath = await this.assembleVideo(mergedPath, audioPath);

      report("رفع الفيديو...", 95);
      const videoUrl = await this.uploadVideo(finalPath, script.title);

      report("اكتمل الإنتاج!", 100);

      // تنظيف الملفات المؤقتة
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
    onProgress?: (step: string, pct: number) => void
  ): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imgPath = path.join(this.workDir, `scene_${i + 1}.png`);

      onProgress?.(
        `توليد صورة ${i + 1}/${scenes.length}: ${scene.imagePrompt.slice(0, 40)}...`,
        5 + Math.round((i / scenes.length) * 30)
      );

      // استخدام generateImage من _core
      const { generateImage } = await import("./_core/imageGeneration");
      const { url: imageUrl } = await generateImage({
        prompt: scene.imagePrompt + ", ultra photorealistic, 8K, cinematic",
      });

      if (!imageUrl) throw new Error(`فشل توليد صورة المشهد ${i + 1}`);

      // تحميل الصورة وتحويلها إلى 1920×1080
      const response = await fetch(imageUrl as string);
      const buffer = Buffer.from(await response.arrayBuffer());

      await sharp(buffer)
        .resize(CONFIG.width, CONFIG.height, { fit: "cover" })
        .png()
        .toFile(imgPath);

      paths.push(imgPath);
      console.log(`  ✓ صورة ${i + 1} جاهزة`);
    }

    return paths;
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 2: توليد الصوت
  // ─────────────────────────────────────────────────────────

  private async generateAudio(script: VideoScript): Promise<string> {
    const audioPath = path.join(this.workDir, "narration.mp3");
    const voice = VOICE_MAP[script.voice] ?? "onyx";

    // استخدام Manus LLM API للـ TTS
    const { ENV } = await import("./_core/env");

    const apiUrl = ENV.forgeApiUrl || "";
    const response = await fetch(`${apiUrl}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.forgeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice,
        input: script.narration,
        speed: 0.95,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`TTS failed: ${err}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(audioPath, buffer);
    console.log(`  ✓ صوت جاهز: ${audioPath}`);
    return audioPath;
  }

  // ─────────────────────────────────────────────────────────
  // الخطوة 3: بناء المشاهد (Ken Burns + ترجمة)
  // ─────────────────────────────────────────────────────────

  private async buildScenes(
    scenes: VideoScene[],
    imagePaths: string[],
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
      await this.drawSubtitle(imgPath, scene.subtitle, imgWithSub);

      // بناء الفيديو مع Ken Burns
      await this.buildSceneVideo(imgWithSub, scene.duration, scene.zoom, outputPath);

      scenePaths.push(outputPath);
      console.log(`  ✓ مشهد ${i + 1} جاهز`);
    }

    return scenePaths;
  }

  // ─────────────────────────────────────────────────────────
  // رسم الترجمة على الصورة (sharp + SVG)
  // ─────────────────────────────────────────────────────────

  private async drawSubtitle(
    imgPath: string,
    subtitle: string,
    outputPath: string
  ): Promise<void> {
    const isArabic = /[\u0600-\u06ff]/.test(subtitle);
    const fontSize = isArabic ? 52 : 46;
    const textDirection = isArabic ? "rtl" : "ltr";
    const fontFamily = isArabic ? "Noto Naskh Arabic" : "DejaVu Sans";

    // إنشاء SVG للترجمة
    const svgText = `
<svg width="${CONFIG.width}" height="${CONFIG.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>
  <!-- خلفية شبه شفافة -->
  <rect
    x="0" y="${CONFIG.height - 130}"
    width="${CONFIG.width}" height="110"
    fill="rgba(0,0,0,0.6)"
    rx="0"
  />
  <!-- خط مضيء -->
  <rect
    x="0" y="${CONFIG.height - 130}"
    width="${CONFIG.width}" height="3"
    fill="rgba(68,136,255,0.8)"
  />
  <!-- النص -->
  <text
    x="${CONFIG.width / 2}"
    y="${CONFIG.height - 60}"
    text-anchor="middle"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="white"
    direction="${textDirection}"
    filter="url(#shadow)"
  >${this.escapeXml(subtitle)}</text>
</svg>`;

    await sharp(imgPath)
      .resize(CONFIG.width, CONFIG.height)
      .composite([{
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      }])
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
  // بناء مقطع فيديو مشهد واحد (Ken Burns)
  // ─────────────────────────────────────────────────────────

  private buildSceneVideo(
    imgPath: string,
    duration: number,
    zoom: VideoScene["zoom"],
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const framesCount = duration * CONFIG.fps;

      let zoomFilter: string;
      switch (zoom) {
        case "in":
          zoomFilter = `zoompan=z='if(lte(zoom,1.0),1.05,zoom-0.0008)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesCount}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}`;
          break;
        case "out":
          zoomFilter = `zoompan=z='if(gte(zoom,1.15),1.15,zoom+0.0008)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesCount}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}`;
          break;
        case "pan_left":
          zoomFilter = `zoompan=z='1.1':x='iw/2-(iw/zoom/2)+t*2':y='ih/2-(ih/zoom/2)':d=${framesCount}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}`;
          break;
        case "pan_right":
          zoomFilter = `zoompan=z='1.1':x='iw/2-(iw/zoom/2)-t*2':y='ih/2-(ih/zoom/2)':d=${framesCount}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}`;
          break;
        default:
          zoomFilter = `zoompan=z='1.05':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${framesCount}:s=${CONFIG.width}x${CONFIG.height}:fps=${CONFIG.fps}`;
      }

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
    audioPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const finalPath = path.join(this.workDir, "final.mp4");

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
  // الخطوة 6: رفع الفيديو إلى S3
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
}

// ═══════════════════════════════════════════════════════════
// مولّد السيناريو الذكي (يستخدم domainEngine + scriptEngine)
// ═══════════════════════════════════════════════════════════

export async function generateVideoScript(
  userInput: string,
  language: "ar" | "en" = "ar",
  voice: VideoScript["voice"] = "ar_male",
  sceneCount: number = 6
): Promise<VideoScript> {
  const systemPrompt = `أنت مخرج سينمائي محترف ومتخصص في إنتاج الأفلام التعليمية والوثائقية والتسويقية.
مهمتك: تحليل المحتوى المقدم وكتابة سيناريو فيديو احترافي.

قواعد السيناريو الاحترافي:
1. السيناريو أولاً — النص القوي قبل التقنية
2. كل صورة تخدم الرسالة وتعززها
3. الحركة تضيف الحياة (تنويع zoom in/out/pan)
4. الصوت يحمل العاطفة
5. الترجمة واضحة وموجزة

أنواع المحتوى المدعومة:
- تعليمي: حياة الحيوانات، العلوم، التاريخ، الجغرافيا
- قصصي: قصص أطفال، روايات، خرافات
- وثائقي: طبيعة، فضاء، بحار، غابات
- تسويقي: منتجات، خدمات، مشاريع
- معماري: مباني، مشاريع، تصاميم
- تاريخي: أحداث، شخصيات، حضارات

أعد JSON بالتنسيق التالي بدون أي نص إضافي:
{
  "title": "عنوان الفيلم",
  "language": "${language}",
  "voice": "${voice}",
  "narration": "النص الكامل للتعليق الصوتي — يجب أن يكون متدفقاً وعاطفياً",
  "domain": "نوع المحتوى",
  "scenes": [
    {
      "imagePrompt": "وصف الصورة بالإنجليزي — احترافي وسينمائي",
      "subtitle": "الترجمة على الشاشة بالعربي",
      "narration": "نص التعليق لهذا المشهد",
      "duration": 10,
      "zoom": "in"
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
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  imagePrompt: { type: "string" },
                  subtitle: { type: "string" },
                  narration: { type: "string" },
                  duration: { type: "number" },
                  zoom: { type: "string", enum: ["in", "out", "pan_left", "pan_right"] },
                },
                required: ["imagePrompt", "subtitle", "narration", "duration", "zoom"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "language", "voice", "narration", "domain", "scenes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const script = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  return script as VideoScript;
}
