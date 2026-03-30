/**
 * storage.ts — mousa.ai
 * Hybrid storage: AWS S3 directly (when AWS_* env vars set) OR Manus Forge proxy (fallback)
 *
 * To use AWS S3 directly, set:
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=us-east-1
 *   AWS_S3_BUCKET=your-bucket-name
 *   AWS_S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com  (optional, for public URLs)
 *
 * To use Cloudflare R2, set:
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=auto
 *   AWS_S3_BUCKET=your-bucket-name
 *   AWS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
 */

import { ENV } from './_core/env';

// ── AWS S3 / R2 direct upload ──────────────────────────────────────────────

function isAwsConfigured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Lazy import to avoid loading AWS SDK when not needed
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const region = process.env.AWS_REGION ?? "us-east-1";
  const bucket = process.env.AWS_S3_BUCKET!;
  const endpoint = process.env.AWS_S3_ENDPOINT; // for R2 / custom S3

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  // Build public URL
  const publicUrlBase = process.env.AWS_S3_PUBLIC_URL;
  let url: string;
  if (publicUrlBase) {
    url = `${publicUrlBase.replace(/\/$/, "")}/${key}`;
  } else if (endpoint) {
    // R2 or custom endpoint
    url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  } else {
    url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  return { key, url };
}

async function s3Get(relKey: string): Promise<{ key: string; url: string }> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const region = process.env.AWS_REGION ?? "us-east-1";
  const bucket = process.env.AWS_S3_BUCKET!;
  const endpoint = process.env.AWS_S3_ENDPOINT;

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const key = relKey.replace(/^\/+/, "");
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  return { key, url };
}

// ── Manus Forge proxy (fallback) ───────────────────────────────────────────

type StorageConfig = { baseUrl: string; apiKey: string };

function getForgeConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("Storage credentials missing: set AWS_S3_BUCKET+AWS_ACCESS_KEY_ID or BUILT_IN_FORGE_API_URL+BUILT_IN_FORGE_API_KEY");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", relKey.replace(/^\/+/, ""));
  return url;
}

async function buildDownloadUrl(baseUrl: string, relKey: string, apiKey: string): Promise<string> {
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", relKey.replace(/^\/+/, ""));
  const response = await fetch(downloadApiUrl, { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toFormData(data: Buffer | Uint8Array | string, contentType: string, fileName: string): FormData {
  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data as unknown as BlobPart], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

async function forgePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getForgeConfig();
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: formData });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status} ${response.statusText}): ${message}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function forgeGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getForgeConfig();
  const key = relKey.replace(/^\/+/, "");
  return { key, url: await buildDownloadUrl(baseUrl, key, apiKey) };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Upload a file. Uses AWS S3/R2 directly if configured, otherwise Manus Forge.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (isAwsConfigured()) {
    return s3Put(relKey, data, contentType);
  }
  return forgePut(relKey, data, contentType);
}

/**
 * Get a download URL for a file. Uses AWS S3/R2 directly if configured, otherwise Manus Forge.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (isAwsConfigured()) {
    return s3Get(relKey);
  }
  return forgeGet(relKey);
}

/**
 * Returns which storage backend is active.
 */
export function getStorageBackend(): "aws-s3" | "manus-forge" {
  return isAwsConfigured() ? "aws-s3" : "manus-forge";
}
