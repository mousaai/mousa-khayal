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

function isR2Configured(): boolean {
  return !!(
    ENV.r2AccountId &&
    ENV.r2AccessKeyId &&
    ENV.r2SecretAccessKey &&
    ENV.r2BucketName
  );
}

let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
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
  if (ENV.r2PublicUrl) {
    const base = ENV.r2PublicUrl.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  // fallback: R2 public dev URL بناءً على account ID
  return `https://${ENV.r2AccountId}.r2.cloudflarestorage.com/${ENV.r2BucketName}/${key}`;
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
        Bucket: ENV.r2BucketName,
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
