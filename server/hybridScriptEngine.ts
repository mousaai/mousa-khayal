/**
 * HybridScriptEngine — محرك السيناريو الهجين الذكي
 *
 * الأولوية:
 * 1. البحث في DB (مجاني، فوري)
 * 2. LLM خارجي (إن كان متاحاً) + حفظ النتيجة في DB
 * 3. توليد محلي ذكي (دائماً يعمل) + حفظ في DB
 *
 * كل نتيجة تُحفظ → المكتبة تكبر → الاعتماد على الخارج يقل
 */

import { getDb } from "./db";
import { scriptLibrary, productionMemory } from "../drizzle/schema";
import { eq, desc, sql, like, or } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import {
  generateScriptFromText,
  detectDomainAndGenre,
} from "./scriptGenerator";

export interface VideoScene {
  label: string;
  prompt: string;
  caption: string;
  duration?: number;
}

export interface VideoScript {
  title: string;
  scenes: VideoScene[];
  narration?: string;
  musicMood?: string;
  genre?: string;
  style?: string;
}

export type ScriptSource = "db" | "llm" | "local";

export interface HybridScriptResult {
  script: VideoScript;
  source: ScriptSource;
  dbId?: number;
  confidence: number; // 0-100
}

// ═══════════════════════════════════════════════════════════
// البحث في DB
// ═══════════════════════════════════════════════════════════

async function searchInDB(query: string, sceneCount: number): Promise<HybridScriptResult | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const queryLower = query.toLowerCase();
    const words = queryLower.split(/[\s,،]+/).filter((w: string) => w.length > 2);
    if (words.length === 0) return null;

    const conditions = words.slice(0, 5).map((word: string) =>
      or(
        like(scriptLibrary.keywords, `%${word}%`),
        like(scriptLibrary.title, `%${word}%`),
        like(scriptLibrary.domain, `%${word}%`)
      )
    );

    const results = await db
      .select()
      .from(scriptLibrary)
      .where(or(...conditions))
      .orderBy(desc(scriptLibrary.useCount), desc(scriptLibrary.qualityScore))
      .limit(5);

    if (results.length === 0) return null;

    const best = results[0];

    const matchedWords = words.filter((w: string) =>
      (best.keywords || "").toLowerCase().includes(w) ||
      (best.title || "").toLowerCase().includes(w)
    );
    const confidence = Math.min(95, Math.round((matchedWords.length / words.length) * 100));
    if (confidence < 30) return null;

    // تحديث عداد الاستخدام
    await db
      .update(scriptLibrary)
      .set({ useCount: sql`${scriptLibrary.useCount} + 1` })
      .where(eq(scriptLibrary.id, best.id));

    const scenes = (best.scenes as VideoScene[]) || [];
    const adjustedScenes = adjustSceneCount(scenes, sceneCount);

    return {
      script: {
        title: best.title,
        scenes: adjustedScenes,
        narration: best.narration || undefined,
        musicMood: best.musicMood || undefined,
        genre: best.genre,
        style: best.style || undefined,
      },
      source: "db",
      dbId: best.id,
      confidence,
    };
  } catch (err) {
    console.warn("[HybridEngine] DB search failed:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// LLM خارجي
// ═══════════════════════════════════════════════════════════

async function generateWithLLM(query: string, sceneCount: number): Promise<HybridScriptResult | null> {
  try {
    const systemPrompt = `أنت مخرج سينمائي محترف. اكتب سيناريو فيديو قصير بالعربية. الرد JSON فقط.`;
    const userPrompt = `اكتب سيناريو فيديو عن: "${query}" بـ ${sceneCount} مشاهد. الشكل:
{"title":"...","scenes":[{"label":"...","prompt":"...english...","caption":"...عربي...","duration":5}],"narration":"...","musicMood":"ambient","genre":"documentary"}`;

    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    prompt: { type: "string" },
                    caption: { type: "string" },
                    duration: { type: "number" },
                  },
                  required: ["label", "prompt", "caption", "duration"],
                  additionalProperties: false,
                },
              },
              narration: { type: "string" },
              musicMood: { type: "string" },
              genre: { type: "string" },
            },
            required: ["title", "scenes", "narration", "musicMood", "genre"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = JSON.parse(content) as VideoScript;
    if (!parsed.title || !parsed.scenes?.length) return null;

    // احفظ في DB للاستخدام المستقبلي
    const { domain, genre, style } = detectDomainAndGenre(query);
    await saveToLibrary(parsed, query, domain, genre, style, "llm");

    return { script: parsed, source: "llm", confidence: 90 };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("412") || msg.includes("usage exhausted") || msg.includes("429")) {
      console.warn("[HybridEngine] LLM unavailable:", msg.slice(0, 80));
    } else {
      console.error("[HybridEngine] LLM error:", msg.slice(0, 150));
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// التوليد المحلي الذكي
// ═══════════════════════════════════════════════════════════

async function generateLocally(query: string, sceneCount: number): Promise<HybridScriptResult> {
  const generated = generateScriptFromText(query, sceneCount);
  const { domain, genre, style } = detectDomainAndGenre(query);

  await saveToLibrary(
    {
      title: generated.title,
      scenes: generated.scenes,
      narration: generated.narration,
      musicMood: generated.musicMood,
      genre: generated.genre,
    },
    query,
    domain,
    genre,
    style,
    "generated"
  );

  return {
    script: {
      title: generated.title,
      scenes: generated.scenes,
      narration: generated.narration,
      musicMood: generated.musicMood,
      genre: generated.genre,
      style: generated.style,
    },
    source: "local",
    confidence: 70,
  };
}

// ═══════════════════════════════════════════════════════════
// حفظ في المكتبة
// ═══════════════════════════════════════════════════════════

async function saveToLibrary(
  script: VideoScript,
  query: string,
  domain: string,
  genre: string,
  style: string,
  source: "generated" | "llm" | "user" | "seed"
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // تحقق من عدم التكرار
    const existing = await db
      .select({ id: scriptLibrary.id })
      .from(scriptLibrary)
      .where(eq(scriptLibrary.title, script.title))
      .limit(1);

    if (existing.length > 0) return;

    const keywords = [query, domain, genre, style, script.title].filter(Boolean).join(",");

    await db.insert(scriptLibrary).values({
      domain,
      genre,
      style,
      level: (script.scenes?.length || 5) <= 3 ? "simple" : (script.scenes?.length || 5) <= 5 ? "medium" : "advanced",
      language: "ar",
      title: script.title,
      titleEn: script.title,
      keywords,
      scenes: script.scenes as any,
      narration: script.narration || null,
      musicMood: script.musicMood || null,
      qualityScore: source === "llm" ? 90 : source === "user" ? 95 : 70,
      useCount: 1,
      successRate: 100,
      source,
    });

    console.log(`[HybridEngine] ✓ Saved: "${script.title}" (${source})`);
  } catch (err) {
    console.warn("[HybridEngine] Save failed:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// حفظ في ذاكرة الإنتاج
// ═══════════════════════════════════════════════════════════

export async function saveProductionMemory(params: {
  jobId: string;
  userInput: string;
  scriptResult: HybridScriptResult;
  imagePrompts?: string[];
  imageUrls?: string[];
  audioUrls?: string[];
  videoUrl?: string;
  success: boolean;
  durationMs?: number;
  userId?: number;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { domain, genre } = detectDomainAndGenre(params.userInput);

    await db.insert(productionMemory).values({
      jobId: params.jobId,
      userInput: params.userInput,
      normalizedInput: params.userInput.toLowerCase().trim(),
      detectedDomain: domain,
      detectedGenre: genre,
      scriptUsed: params.scriptResult.script as any,
      scriptSource: params.scriptResult.source === "db" ? "db" :
                    params.scriptResult.source === "llm" ? "llm" : "prebuilt",
      scriptLibraryId: params.scriptResult.dbId || null,
      imagePrompts: params.imagePrompts as any || null,
      imageUrls: params.imageUrls as any || null,
      audioUrls: params.audioUrls as any || null,
      videoUrl: params.videoUrl || null,
      success: params.success ? 1 : 0,
      durationMs: params.durationMs || null,
      userId: params.userId || null,
    });
  } catch (err) {
    console.warn("[HybridEngine] Production memory save failed:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// المحرك الرئيسي — الواجهة العامة
// ═══════════════════════════════════════════════════════════

export async function getScript(
  query: string,
  sceneCount: number = 5
): Promise<HybridScriptResult> {
  console.log(`[HybridEngine] Query: "${query.slice(0, 60)}"`);

  // 1. البحث في DB أولاً
  const dbResult = await searchInDB(query, sceneCount);
  if (dbResult) {
    console.log(`[HybridEngine] ✓ DB hit (${dbResult.confidence}% confidence)`);
    return dbResult;
  }

  // 2. LLM خارجي
  const llmResult = await generateWithLLM(query, sceneCount);
  if (llmResult) {
    console.log(`[HybridEngine] ✓ LLM generated`);
    return llmResult;
  }

  // 3. توليد محلي (دائماً يعمل)
  console.log(`[HybridEngine] ✓ Local generation`);
  return await generateLocally(query, sceneCount);
}

// ═══════════════════════════════════════════════════════════
// إحصاءات المكتبة
// ═══════════════════════════════════════════════════════════

export async function getLibraryStats(): Promise<{
  totalScripts: number;
  bySource: Record<string, number>;
  independenceRate: number;
  recentAdditions: number;
}> {
  try {
    const db = await getDb();
    if (!db) return { totalScripts: 0, bySource: {}, independenceRate: 0, recentAdditions: 0 };

    const total = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scriptLibrary);

    const bySourceRaw = await db
      .select({
        source: scriptLibrary.source,
        count: sql<number>`COUNT(*)`,
      })
      .from(scriptLibrary)
      .groupBy(scriptLibrary.source);

    const bySource: Record<string, number> = {};
    for (const row of bySourceRaw) {
      bySource[row.source || "unknown"] = Number(row.count);
    }

    const dbUsage = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionMemory)
      .where(eq(productionMemory.scriptSource, "db"));

    const totalProductions = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionMemory);

    const dbCount = Number(dbUsage[0]?.count || 0);
    const totalProd = Number(totalProductions[0]?.count || 0);
    const independenceRate = totalProd > 0 ? Math.round((dbCount / totalProd) * 100) : 0;

    const recentRaw = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scriptLibrary)
      .where(sql`${scriptLibrary.createdAt} > DATE_SUB(NOW(), INTERVAL 7 DAY)`);

    return {
      totalScripts: Number(total[0]?.count || 0),
      bySource,
      independenceRate,
      recentAdditions: Number(recentRaw[0]?.count || 0),
    };
  } catch (err) {
    console.warn("[HybridEngine] Stats failed:", err);
    return { totalScripts: 0, bySource: {}, independenceRate: 0, recentAdditions: 0 };
  }
}

// ═══════════════════════════════════════════════════════════
// مساعد: تعديل عدد المشاهد
// ═══════════════════════════════════════════════════════════

function adjustSceneCount(scenes: VideoScene[], targetCount: number): VideoScene[] {
  if (scenes.length === targetCount) return scenes;
  if (scenes.length > targetCount) return scenes.slice(0, targetCount);
  const result = [...scenes];
  while (result.length < targetCount) {
    const last = result[result.length - 1];
    result.push({ ...last, label: `مشهد ${result.length + 1}` });
  }
  return result;
}
