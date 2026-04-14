/**
 * mediaRoutes.ts — endpoints لرفع الملفات وتحويل الصوت إلى نص
 * POST /api/transcribe      — يقبل ملف صوتي ويعيد النص
 * POST /api/upload          — يقبل صورة أو مستند ويعيد URL
 * POST /api/convert-video   — يحوّل WebM إلى MP4 H.264 (مدعوم على iOS/Android)
 */
import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { nanoid } from "nanoid";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = Router();

// multer في الذاكرة (بدون حفظ على القرص)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB للفيديو
});

// ===== تحويل الصوت إلى نص =====
router.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرسال ملف صوتي" });
    }

    // رفع الصوت إلى S3 مؤقتاً
    const ext = req.file.mimetype.includes("webm") ? "webm" : "mp4";
    const key = `audio-temp/${nanoid()}.${ext}`;
    const { url: audioUrl } = await storagePut(key, req.file.buffer, req.file.mimetype);

    // تحويل الصوت إلى نص — يكتشف اللغة تلقائياً
    const lang = (req.body?.language as string) || undefined;
    const result = await transcribeAudio({
      audioUrl,
      language: lang, // undefined = auto-detect
      prompt: "Describe an architectural or imaginative scene",
    });

    if ("error" in result) {
      return res.status(500).json({ error: result.error });
    }

    return res.json({ text: (result as any).text, language: (result as any).language });
  } catch (err: any) {
    console.error("[Transcribe] Error:", err);
    return res.status(500).json({ error: "فشل تحويل الصوت", details: err?.message });
  }
});

// ===== رفع ملف (صورة أو مستند) =====
// ── تشخيص مؤقت: فحص متغيرات R2 في الإنتاج ──
router.get("/api/debug/storage", (req, res) => {
  res.json({
    r2AccountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID ? `${process.env.CLOUDFLARE_R2_ACCOUNT_ID.slice(0, 8)}...` : 'MISSING',
    r2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? `${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID.slice(0, 8)}...` : 'MISSING',
    r2SecretKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? `SET(${process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY.slice(0,8)}...)` : 'MISSING',
    r2BucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'MISSING',
    r2PublicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  });
});

router.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرسال ملف" });
    }

    const ext = req.file.originalname.split(".").pop() || "bin";
    const key = `uploads/${nanoid()}.${ext}`;
    const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

    return res.json({ url, name: req.file.originalname, type: req.file.mimetype });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    return res.status(500).json({ error: "فشل رفع الملف", details: err?.message });
  }
});

// ===== تحويل WebM إلى MP4 H.264 (مدعوم على iOS/Android) =====
// يستقبل ملف WebM ويُعيد MP4 H.264 يعمل على جميع الأجهزة
router.post("/api/convert-video", upload.single("video"), async (req, res) => {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `khayal_input_${nanoid()}.webm`);
  const outputPath = path.join(tmpDir, `khayal_output_${nanoid()}.mp4`);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرسال ملف فيديو" });
    }

    // حفظ WebM مؤقتاً على القرص
    fs.writeFileSync(inputPath, req.file.buffer);

    // تحويل إلى MP4 H.264 باستخدام ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset fast",        // سرعة تحويل جيدة
          "-crf 23",             // جودة متوازنة
          "-movflags +faststart", // يُمكّن التشغيل التدريجي على الموبايل
          "-pix_fmt yuv420p",    // متوافق مع iOS/Android
          "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2", // ضمان أبعاد زوجية
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // قراءة الملف المُحوَّل
    const mp4Buffer = fs.readFileSync(outputPath);
    const title = (req.body?.title as string) || "khayal";
    const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_").slice(0, 60);

    // رفع إلى S3 للتخزين الدائم
    const key = `videos/${safeTitle}_${nanoid(8)}.mp4`;
    const { url } = await storagePut(key, mp4Buffer, "video/mp4");

    // إرسال الملف مباشرة للمتصفح مع header التحميل
    res.set("Content-Type", "video/mp4");
    res.set("Content-Disposition", `attachment; filename="${safeTitle}.mp4"`);
    res.set("Content-Length", String(mp4Buffer.length));
    res.set("X-Video-URL", url); // رابط S3 للتخزين
    return res.send(mp4Buffer);

  } catch (err: any) {
    console.error("[ConvertVideo] Error:", err?.message);
    return res.status(500).json({ error: "فشل تحويل الفيديو", details: err?.message });
  } finally {
    // تنظيف الملفات المؤقتة
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
});

// ===== Image Proxy — لحل مشكلة CORS في الصور الخارجية =====
// يُستخدم من الواجهة لتحميل الصور وتسجيل الفيديو بدون مشاكل CORS
router.get("/api/proxy-image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "url required" });

  // التحقق من أن الرابط صالح
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  // السماح فقط بـ HTTPS
  if (parsedUrl.protocol !== "https:") {
    return res.status(403).json({ error: "only https allowed" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KhayalAI/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "upstream error" });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400"); // cache 24h
    res.set("Access-Control-Allow-Origin", "*");
    return res.send(buffer);
  } catch (err: any) {
    console.error("[Proxy] Error fetching image:", err?.message);
    return res.status(502).json({ error: "proxy fetch failed", details: err?.message });
  }
});

export default router;
