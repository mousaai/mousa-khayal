/**
 * Storage Helper — Cloudflare R2 (مستقل عن Manus)
 *
 * استراتيجية التكلفة المنخفضة:
 * - Cloudflare R2: مجاني حتى 10GB + بدون رسوم نقل (egress) — الأفضل للفيديوهات والصور
 * - Fallback: Manus Built-in إذا لم تكن مفاتيح R2 متاحة
 *
 * الأولوية: Cloudflare R2 → Manus (fallback)
 *
 * إعداد R2:
 * 1. أنشئ bucket في Cloudflare R2 Dashboard
 * 2. أنشئ API Token بصلاحية Admin Read & Write
 * 3. أضف المتغيرات: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID,
 *    CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME
 * 4. (اختياري) CLOUDFLARE_R2_PUBLIC_URL لروابط عامة مباشرة
 */

import { ENV } from "./_core/env";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Cloudflare R2 Client ─────────────────────────────────────────────────────
function getR2Client(): S3Client | null {
  const { cloudflareR2AccountId, cloudflareR2AccessKeyId, cloudflareR2SecretAccessKey } = ENV;
  if (!cloudflareR2AccountId || !cloudflareR2AccessKeyId || !cloudflareR2SecretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${cloudflareR2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cloudflareR2AccessKeyId,
      secretAccessKey: cloudflareR2SecretAccessKey,
    },
  });
}

// ─── R2: رفع ملف ─────────────────────────────────────────────────────────────
async function r2Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  if (!client) throw new Error("Cloudflare R2 not configured");

  const bucket = ENV.cloudflareR2BucketName || "khayal-media";
  const key = relKey.replace(/^\/+/, "");

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // إذا كان هناك رابط عام مخصص (Custom Domain)، استخدمه
  if (ENV.cloudflareR2PublicUrl) {
    const publicBase = ENV.cloudflareR2PublicUrl.replace(/\/+$/, "");
    return { key, url: `${publicBase}/${key}` };
  }

  // وإلا أنشئ رابطاً موقّعاً صالحاً لمدة 7 أيام
  const signedUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 7 * 24 * 60 * 60 } // 7 أيام
  );

  return { key, url: signedUrl };
}

// ─── R2: الحصول على رابط ─────────────────────────────────────────────────────
async function r2Get(relKey: string): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  if (!client) throw new Error("Cloudflare R2 not configured");

  const bucket = ENV.cloudflareR2BucketName || "khayal-media";
  const key = relKey.replace(/^\/+/, "");

  if (ENV.cloudflareR2PublicUrl) {
    const publicBase = ENV.cloudflareR2PublicUrl.replace(/\/+$/, "");
    return { key, url: `${publicBase}/${key}` };
  }

  const signedUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 7 * 24 * 60 * 60 }
  );

  return { key, url: signedUrl };
}

// ─── Manus Fallback ───────────────────────────────────────────────────────────
type StorageConfig = { baseUrl: string; apiKey: string };

function getManusConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("No storage configured: set CLOUDFLARE_R2_* or BUILT_IN_FORGE_API_URL/KEY");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildManusUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", relKey.replace(/^\/+/, ""));
  return url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

async function manusStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = buildManusUploadUrl(baseUrl, key);

  const bufData = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  const blob = new Blob([bufData.buffer.slice(bufData.byteOffset, bufData.byteOffset + bufData.byteLength)], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Manus storage upload failed (${response.status}): ${message}`);
  }

  const url = (await response.json()).url;
  return { key, url };
}

async function manusStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const key = relKey.replace(/^\/+/, "");
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", key);

  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { key, url: (await response.json()).url };
}

// ─── الدوال العامة — Manus أولاً (روابط عامة مضمونة)، R2 كـ fallback ──────────
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // استخدم Manus أولاً — روابط عامة مضمونة بدون مشاكل CORS أو 403
  if (ENV.forgeApiKey) {
    try {
      return await manusStoragePut(relKey, data, contentType);
    } catch (err) {
      console.warn(`[Storage] Manus failed, falling back to R2: ${(err as Error).message}`);
      // fallback لـ R2 إذا كانت المفاتيح متاحة
      if (ENV.cloudflareR2AccessKeyId && ENV.cloudflareR2SecretAccessKey) {
        return await r2Put(relKey, data, contentType);
      }
      throw err;
    }
  }

  // fallback لـ R2
  if (ENV.cloudflareR2AccessKeyId && ENV.cloudflareR2SecretAccessKey) {
    return await r2Put(relKey, data, contentType);
  }

  throw new Error("No storage configured: set BUILT_IN_FORGE_API_URL/KEY or CLOUDFLARE_R2_*");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (ENV.cloudflareR2AccessKeyId && ENV.cloudflareR2SecretAccessKey) {
    try {
      return await r2Get(relKey);
    } catch (err) {
      console.warn(`[Storage] R2 get failed, falling back to Manus: ${(err as Error).message}`);
      if (ENV.forgeApiKey) {
        return await manusStorageGet(relKey);
      }
      throw err;
    }
  }

  return await manusStorageGet(relKey);
}
