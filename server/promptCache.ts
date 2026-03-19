/**
 * Prompt Cache — تخزين الصور المولّدة لتجنّب التكرار
 * كل prompt يُحوَّل إلى SHA256 hash → يُبحث في DB → إذا وُجد يُعاد مباشرة
 * إذا لم يوجد → يُولَّد → يُحفظ في DB للمرة القادمة
 */

import crypto from "crypto";
import { getDb } from "./db";
import { imageCache } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// Hash Utility
// ═══════════════════════════════════════════════════════════

export function hashPrompt(prompt: string, width: number, height: number): string {
  return crypto
    .createHash("sha256")
    .update(`${prompt}::${width}x${height}`)
    .digest("hex")
    .slice(0, 64);
}

// ═══════════════════════════════════════════════════════════
// Cache Lookup
// ═══════════════════════════════════════════════════════════

export async function getCachedImage(
  prompt: string,
  width: number,
  height: number
): Promise<string | null> {
  try {
    const db = await getDb();
    const hash = hashPrompt(prompt, width, height);

    const rows = await db
      .select({ imageUrl: imageCache.imageUrl, id: imageCache.id })
      .from(imageCache)
      .where(eq(imageCache.promptHash, hash))
      .limit(1);

    if (rows.length === 0) return null;

    // تحديث hitCount وlastUsedAt
    await db
      .update(imageCache)
      .set({
        hitCount: sql`${imageCache.hitCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(imageCache.id, rows[0].id));

    console.log(`[PromptCache] HIT — ${prompt.slice(0, 60)}...`);
    return rows[0].imageUrl;
  } catch (err: any) {
    console.warn(`[PromptCache] lookup error: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// Cache Store
// ═══════════════════════════════════════════════════════════

export async function cacheImage(
  prompt: string,
  imageUrl: string,
  width: number,
  height: number
): Promise<void> {
  try {
    const db = await getDb();
    const hash = hashPrompt(prompt, width, height);

    await db
      .insert(imageCache)
      .values({
        promptHash: hash,
        prompt: prompt.slice(0, 2000), // حد أقصى لطول النص
        imageUrl,
        width,
        height,
        hitCount: 0,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          imageUrl,
          hitCount: sql`${imageCache.hitCount} + 1`,
          lastUsedAt: new Date(),
        },
      });

    console.log(`[PromptCache] STORED — ${prompt.slice(0, 60)}...`);
  } catch (err: any) {
    console.warn(`[PromptCache] store error: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Cache Stats
// ═══════════════════════════════════════════════════════════

export async function getCacheStats(): Promise<{
  totalImages: number;
  totalHits: number;
  hitRate: number;
}> {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalHits: sql<number>`SUM(${imageCache.hitCount})`,
      })
      .from(imageCache);

    const totalImages = Number(rows[0]?.count ?? 0);
    const totalHits = Number(rows[0]?.totalHits ?? 0);
    const hitRate = totalImages > 0 ? Math.round((totalHits / (totalImages + totalHits)) * 100) : 0;

    return { totalImages, totalHits, hitRate };
  } catch {
    return { totalImages: 0, totalHits: 0, hitRate: 0 };
  }
}
