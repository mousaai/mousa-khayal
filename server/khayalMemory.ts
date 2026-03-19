/**
 * khayalMemory.ts — ذاكرة خيال الذاتية
 * ════════════════════════════════════════════════════════════════
 *
 * خيال تتذكر كل مستخدم وتتعلم من تفضيلاته مع كل إنتاج.
 * تُستشار هذه الذاكرة في autonomousDirector لتحسين القرارات.
 *
 * مبدأ التعلم:
 *   - بعد كل إنتاج ناجح: تُحدَّث الإحصاءات
 *   - التفضيل المُستخلص = الأكثر تكراراً (weighted average)
 *   - بعد 3 إنتاجات: خيال تبدأ بالتخصيص الذاتي
 */
import { getDb } from "./db";
import { userPreferences } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface KhayalMemorySnapshot {
  userId: string;
  totalProductions: number;
  preferredGenre: string | null;
  preferredVoice: string | null;
  preferredAspectRatio: string | null;
  preferredSceneCount: number;
  preferredStyle: string | null;
  preferredDuration: string | null;
  genreHistory: Record<string, number>;
  voiceHistory: Record<string, number>;
  domainHistory: Record<string, number>;
  hasMemory: boolean; // true إذا كان لدى خيال معلومات كافية
}

export interface ProductionRecord {
  genre: string;
  voiceId: string;
  aspectRatio: string;
  sceneCount: number;
  style: string;
  duration: string;
  domain: string;
}

// ══════════════════════════════════════════════════════════════
// قراءة ذاكرة المستخدم
// ══════════════════════════════════════════════════════════════
export async function getMemory(userId: string): Promise<KhayalMemorySnapshot> {
  const empty: KhayalMemorySnapshot = {
    userId,
    totalProductions: 0,
    preferredGenre: null,
    preferredVoice: null,
    preferredAspectRatio: null,
    preferredSceneCount: 5,
    preferredStyle: null,
    preferredDuration: null,
    genreHistory: {},
    voiceHistory: {},
    domainHistory: {},
    hasMemory: false,
  };

  try {
    const db = await getDb();
    if (!db) return empty;

    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (!rows[0]) return empty;

    const row = rows[0];
    return {
      userId,
      totalProductions: row.totalProductions ?? 0,
      preferredGenre: row.preferredGenre ?? null,
      preferredVoice: row.preferredVoice ?? null,
      preferredAspectRatio: row.preferredAspectRatio ?? null,
      preferredSceneCount: row.preferredSceneCount ?? 5,
      preferredStyle: row.preferredStyle ?? null,
      preferredDuration: row.preferredDuration ?? null,
      genreHistory: (row.genreHistory as Record<string, number>) ?? {},
      voiceHistory: (row.voiceHistory as Record<string, number>) ?? {},
      domainHistory: (row.domainHistory as Record<string, number>) ?? {},
      hasMemory: (row.totalProductions ?? 0) >= 3,
    };
  } catch {
    return empty;
  }
}

// ══════════════════════════════════════════════════════════════
// تحديث الذاكرة بعد إنتاج ناجح
// ══════════════════════════════════════════════════════════════
export async function recordProduction(
  userId: string,
  record: ProductionRecord
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // قراءة السجل الحالي
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const existing = rows[0];

    // تحديث التاريخ
    const genreHistory = ((existing?.genreHistory as Record<string, number>) ?? {});
    const voiceHistory = ((existing?.voiceHistory as Record<string, number>) ?? {});
    const domainHistory = ((existing?.domainHistory as Record<string, number>) ?? {});

    genreHistory[record.genre] = (genreHistory[record.genre] ?? 0) + 1;
    voiceHistory[record.voiceId] = (voiceHistory[record.voiceId] ?? 0) + 1;
    domainHistory[record.domain] = (domainHistory[record.domain] ?? 0) + 1;

    // استخلاص التفضيل الأقوى
    const preferredGenre = topKey(genreHistory);
    const preferredVoice = topKey(voiceHistory);
    const totalProductions = (existing?.totalProductions ?? 0) + 1;

    // حساب متوسط عدد المشاهد (weighted)
    const prevCount = existing?.preferredSceneCount ?? 5;
    const preferredSceneCount = Math.round(
      (prevCount * (totalProductions - 1) + record.sceneCount) / totalProductions
    );

    const data = {
      userId,
      preferredGenre,
      preferredVoice,
      preferredAspectRatio: record.aspectRatio,
      preferredSceneCount,
      preferredStyle: record.style,
      preferredDuration: record.duration,
      totalProductions,
      genreHistory,
      voiceHistory,
      domainHistory,
      lastProductionAt: new Date(),
    };

    if (existing) {
      await db
        .update(userPreferences)
        .set(data)
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values(data);
    }
  } catch (e) {
    console.error("[khayalMemory] recordProduction error:", e);
  }
}

// ══════════════════════════════════════════════════════════════
// مساعد: أكثر مفتاح تكراراً في كائن الإحصاءات
// ══════════════════════════════════════════════════════════════
function topKey(history: Record<string, number>): string | null {
  const entries = Object.entries(history);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

// ══════════════════════════════════════════════════════════════
// تحويل الذاكرة إلى تلميحات للـ autonomousDirector
// ══════════════════════════════════════════════════════════════
export function memoryToHints(memory: KhayalMemorySnapshot): string {
  if (!memory.hasMemory) return "";

  const hints: string[] = [];

  if (memory.preferredGenre) {
    hints.push(`المستخدم يفضل نوع "${memory.preferredGenre}" (${memory.genreHistory[memory.preferredGenre] ?? 1} مرة)`);
  }
  if (memory.preferredVoice) {
    hints.push(`الصوت المفضل: ${memory.preferredVoice}`);
  }
  if (memory.preferredAspectRatio) {
    hints.push(`نسبة الشاشة المفضلة: ${memory.preferredAspectRatio}`);
  }
  if (memory.preferredSceneCount && memory.preferredSceneCount !== 5) {
    hints.push(`يفضل ${memory.preferredSceneCount} مشاهد`);
  }
  if (memory.preferredStyle) {
    hints.push(`الأسلوب البصري المفضل: ${memory.preferredStyle}`);
  }

  const topDomain = topKey(memory.domainHistory);
  if (topDomain) {
    hints.push(`أكثر مجال إنتاجاً: ${topDomain}`);
  }

  return hints.length > 0
    ? `\n\n[ذاكرة خيال — ${memory.totalProductions} إنتاج سابق]\n${hints.join("\n")}`
    : "";
}
