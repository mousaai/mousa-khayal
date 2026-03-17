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

    // تحويل الصوت إلى نص
    const result = await transcribeAudio({
      audioUrl,
      language: "ar",
      prompt: "تفريغ وصف معماري أو خيالي",
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

export default router;
