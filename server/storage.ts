/**
 * storage.ts — Cloudflare R2 مباشرة (مستقل عن مانوس)
 *
 * يحافظ على نفس الواجهة (storagePut / storageGet) حتى لا يحتاج أي ملف آخر للتغيير.
 * Fallback 1: Manus Storage proxy إذا لم تتوفر R2 credentials
 * Fallback 2: Local File Storage — يحفظ الملفات محلياً ويخدمها عبر Express
 *
 * بعد تفعيل Public Development URL على bucket khayal-media:
 * - storagePut تُعيد رابطاً عاماً دائماً (pub-XXX.r2.dev/key)
 * - storageGet تُعيد نفس الرابط العام الدائم
 * - لا حاجة لـ presigned URLs بعد الآن
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";
import fs from "fs";
import path from "path";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cloudflare R2 Client
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// قيم R2 — تُقرأ من process.env في وقت الاستدعاء (ليس وقت تحميل الوحدة)
// هذا يضمن قراءة أحدث قيمة بعد تحديث المتغيرات
function getR2Config() {
  return {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || "0eb1cab4bfc427fa89e6669d5ce8d81f",
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || "khayal-media",
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev",
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  };
}

function isR2Configured(): boolean {
  const cfg = getR2Config();
  return !!(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
}

function getR2Client(): S3Client {
  // إنشاء client جديد في كل مرة لضمان استخدام أحدث المفاتيح
  const cfg = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** بناء URL عام دائم للملف في R2 */
function buildPublicUrl(key: string): string {
  const base = getR2Config().publicUrl.replace(/\/+$/, "");
  return `${base}/${key}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Local File Storage Fallback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** مجلد التخزين المحلي — خارج dist لتجنب حذفه عند البناء */
function getLocalStorageDir(): string {
  // في الإنتاج: /var/www/mousa-khayal/uploads/
  // في التطوير: <project_root>/uploads/
  const baseDir = process.env.NODE_ENV === "production"
    ? path.resolve(import.meta.dirname, "..", "uploads")
    : path.resolve(import.meta.dirname, "../..", "uploads");
  return baseDir;
}

/** URL عام للملف المحلي */
function buildLocalUrl(key: string): string {
  const externalUrl = process.env.EXTERNAL_URL || "https://khayal.mousa.ai";
  return `${externalUrl.replace(/\/+$/, "")}/uploads/${key}`;
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const storageDir = getLocalStorageDir();
  const filePath = path.join(storageDir, key);

  // إنشاء المجلدات الوسيطة إذا لم تكن موجودة
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  // كتابة الملف
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await fs.promises.writeFile(filePath, buffer);

  const url = buildLocalUrl(key);
  console.log(`[Storage] Local fallback: saved ${key} → ${url}`);
  return { key, url };
}

async function localGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = buildLocalUrl(key);
  return { key, url };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Manus Storage Fallback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isManusFallbackConfigured(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function toFormData(data: Buffer | Uint8Array | string, contentType: string, fileName: string): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as unknown as ArrayBuffer], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

async function manusPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const key = normalizeKey(relKey);
  const uploadUrl = new URL(`v1/storage/upload`, `${baseUrl}/`);
  uploadUrl.searchParams.set("path", key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: buildAuthHeaders(ENV.forgeApiKey),
    body: formData,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Manus Storage upload failed (${response.status}): ${message}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function manusGet(relKey: string): Promise<{ key: string; url: string }> {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const key = normalizeKey(relKey);
  const downloadApiUrl = new URL(`v1/storage/downloadUrl`, `${baseUrl}/`);
  downloadApiUrl.searchParams.set("path", key);
  const response = await fetch(downloadApiUrl.toString(), {
    method: "GET",
    headers: buildAuthHeaders(ENV.forgeApiKey),
  });
  const url = (await response.json()).url;
  return { key, url };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (isR2Configured()) {
    // ━━ Cloudflare R2 مباشرة ━━
    try {
      const client = getR2Client();
      const body = typeof data === "string" ? Buffer.from(data) : data;

      await client.send(
        new PutObjectCommand({
          Bucket: getR2Config().bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );

      // الآن bucket عام — نُعيد رابطاً عاماً دائماً بدلاً من presigned URL
      const url = buildPublicUrl(key);
      return { key, url };
    } catch (r2Error) {
      console.warn(`[Storage] R2 failed (${(r2Error as Error).message}), falling back to local storage`);
      // الـ fallback للتخزين المحلي
    }
  }

  if (isManusFallbackConfigured()) {
    // ━━ Manus Storage كـ fallback ━━
    try {
      return await manusPut(relKey, data, contentType);
    } catch (manusError) {
      console.warn(`[Storage] Manus fallback failed (${(manusError as Error).message}), using local storage`);
    }
  }

  // ━━ Local File Storage كـ fallback أخير ━━
  return localPut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string,
  _expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (isR2Configured()) {
    // ━━ Cloudflare R2: رابط عام دائم (bucket عام الآن) ━━
    // نتحقق أولاً إذا كان الملف موجوداً محلياً (من fallback سابق)
    const localPath = path.join(getLocalStorageDir(), key);
    if (fs.existsSync(localPath)) {
      return localGet(relKey);
    }
    const url = buildPublicUrl(key);
    return { key, url };
  }

  if (isManusFallbackConfigured()) {
    return manusGet(relKey);
  }

  return localGet(relKey);
}
