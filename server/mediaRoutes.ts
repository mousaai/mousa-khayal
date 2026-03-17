/**
 * mediaRoutes.ts — endpoints لرفع الملفات وتحويل الصوت إلى نص
 * POST /api/transcribe — يقبل ملف صوتي ويعيد النص
 * POST /api/upload    — يقبل صورة أو مستند ويعيد URL
 */
import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { nanoid } from "nanoid";

const router = Router();

// multer في الذاكرة (بدون حفظ على القرص)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
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
