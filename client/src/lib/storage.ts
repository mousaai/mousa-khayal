/**
 * Frontend storage helper — uploads files to Manus S3 proxy
 * Uses VITE_FRONTEND_FORGE_API_URL and VITE_FRONTEND_FORGE_API_KEY
 */

const FORGE_URL = (import.meta.env.VITE_FRONTEND_FORGE_API_URL as string | undefined)?.replace(/\/+$/, "");
const FORGE_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY as string | undefined;

export async function storagePut(
  relKey: string,
  data: Uint8Array | ArrayBuffer | Blob,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!FORGE_URL || !FORGE_KEY) {
    throw new Error("Storage credentials not configured (VITE_FRONTEND_FORGE_API_URL / VITE_FRONTEND_FORGE_API_KEY)");
  }

  const uploadUrl = new URL("v1/storage/upload", FORGE_URL + "/");
  uploadUrl.searchParams.set("path", relKey.replace(/^\/+/, ""));

  // fetch requires BodyInit — convert Uint8Array to its underlying ArrayBuffer
  const body: BodyInit = data instanceof Uint8Array
    ? data.buffer as ArrayBuffer
    : data instanceof ArrayBuffer
      ? data
      : data;

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FORGE_KEY}`,
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Storage upload failed (${response.status}): ${text}`);
  }

  const result = await response.json() as { url?: string; key?: string; path?: string };
  const url = result.url ?? `${FORGE_URL}/v1/storage/download?path=${encodeURIComponent(relKey)}`;
  return { key: relKey, url };
}
