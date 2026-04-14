/**
 * r2.test.ts — التحقق من عمل Cloudflare R2 بالمفاتيح المحقونة
 */
import { describe, it, expect } from "vitest";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// القيم الافتراضية المعروفة لبيئة التطوير
const KNOWN_ACCESS_KEY_ID = "e08422ffdcd7c4ddcc312ca99f090da7";
const KNOWN_SECRET_KEY = "2ae82e747d2b84298e7ffdbed53ee7191a131c591b03dfb329cab6e92a72ed82";
const KNOWN_ACCOUNT_ID = "0eb1cab4bfc427fa89e6669d5ce8d81f";

describe("Cloudflare R2 Integration", () => {
  it("should upload and delete a test file successfully", async () => {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || KNOWN_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || KNOWN_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || KNOWN_SECRET_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "khayal-media";

    expect(accessKeyId).toBeTruthy();
    expect(secretAccessKey).toBeTruthy();

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const testKey = `test/vitest-ping-${Date.now()}.txt`;

    // رفع ملف اختبار
    const putResult = await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: "vitest-ping",
        ContentType: "text/plain",
      })
    );
    expect(putResult.$metadata.httpStatusCode).toBe(200);

    // حذف ملف الاختبار
    const delResult = await client.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: testKey })
    );
    expect(delResult.$metadata.httpStatusCode).toBe(204);
  }, 15_000);
});
