/**
 * storage.ts — Cloudflare R2 مباشرة (مستقل عن مانوس)
 *
 * يحافظ على نفس الواجهة (storagePut / storageGet) حتى لا يحتاج أي ملف آخر للتغيير.
 * Fallback: Manus Storage proxy إذا لم تتوفر R2 credentials
 *
 * بعد تفعيل Public Development URL على bucket khayal-media:
 * - storagePut تُعيد رابطاً عاماً دائماً (pub-XXX.r2.dev/key)
 * - storageGet تُعيد نفس الرابط العام الدائم
 * - لا حاجة لـ presigned URLs بعد الآن
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cloudflare R2 Client
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// قيم R2 — تُقرأ من process.env أولاً، ثم ENV، ثم القيم الثابتة المعروفة
// القيم الثابتة تضمن عمل R2 حتى لو لم تُحقَن المتغيرات في بيئة الإنتاج
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || ENV.r2AccountId || "0eb1cab4bfc427fa89e6669d5ce8d81f";
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || ENV.r2BucketName || "khayal-media";
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ENV.r2PublicUrl || "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev";
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ENV.r2AccessKeyId;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ENV.r2SecretAccessKey;

function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2Client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** بناء URL عام دائم للملف في R2 */
function buildPublicUrl(key: string): string {
  const base = R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
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
    const client = getR2Client();
    const body = typeof data === "string" ? Buffer.from(data) : data;

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    // الآن bucket عام — نُعيد رابطاً عاماً دائماً بدلاً من presigned URL
    const url = buildPublicUrl(key);
    return { key, url };
  }

  if (isManusFallbackConfigured()) {
    // ━━ Manus Storage كـ fallback ━━
    return manusPut(relKey, data, contentType);
  }

  throw new Error("لا توجد credentials للتخزين: يرجى ضبط CLOUDFLARE_R2_* أو BUILT_IN_FORGE_API_*");
}

export async function storageGet(
  relKey: string,
  _expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (isR2Configured()) {
    // ━━ Cloudflare R2: رابط عام دائم (bucket عام الآن) ━━
    const url = buildPublicUrl(key);
    return { key, url };
  }

  if (isManusFallbackConfigured()) {
    return manusGet(relKey);
  }

  throw new Error("لا توجد credentials للتخزين");
}
