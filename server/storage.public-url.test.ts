/**
 * storage.public-url.test.ts
 * يتحقق من أن storagePut تُعيد رابطاً عاماً دائماً بعد تفعيل Public Development URL
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ENV to simulate R2 configured with public URL
vi.mock("./_core/env", () => ({
  ENV: {
    r2AccountId: "0eb1cab4bfc427fa8",
    r2AccessKeyId: "test-access-key",
    r2SecretAccessKey: "test-secret-key",
    r2BucketName: "khayal-media",
    r2PublicUrl: "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev",
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

// Mock S3Client to avoid real network calls
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
}));

describe("storage public URL", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("storagePut returns a permanent public URL (not presigned)", async () => {
    // Re-import after mocks are set
    const { storagePut } = await import("./storage");
    const result = await storagePut("generated/test-image.png", Buffer.from("fake"), "image/png");

    expect(result.key).toBe("generated/test-image.png");
    expect(result.url).toBe(
      "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/generated/test-image.png"
    );
    // يجب ألا يحتوي على X-Amz-Signature (علامة presigned URL)
    expect(result.url).not.toContain("X-Amz-Signature");
    expect(result.url).not.toContain("X-Amz-Expires");
  });

  it("storageGet returns a permanent public URL (not presigned)", async () => {
    const { storageGet } = await import("./storage");
    const result = await storageGet("generated/test-image.png");

    expect(result.key).toBe("generated/test-image.png");
    expect(result.url).toBe(
      "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/generated/test-image.png"
    );
    expect(result.url).not.toContain("X-Amz-Signature");
  });

  it("normalizes leading slashes in key", async () => {
    const { storagePut } = await import("./storage");
    const result = await storagePut("/uploads/photo.jpg", Buffer.from("fake"), "image/jpeg");
    expect(result.key).toBe("uploads/photo.jpg");
    expect(result.url).toBe(
      "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/uploads/photo.jpg"
    );
  });
});
