/**
 * Smart Query Router — Cost Optimization Engine
 * 
 * Routing priority (cheapest first):
 * 1. FAQ Cache exact/fuzzy match → 0 LLM cost
 * 2. Building Code lookup → 0 LLM cost
 * 3. Calculation Rule execution → 0 LLM cost
 * 4. Climate/Material data lookup → 0 LLM cost
 * 5. Decision Tree traversal → 0 LLM cost
 * 6. LLM with compressed prompt + local context → minimal cost
 */

import { getDb } from "../db";
import {
  faqCache, buildingCodes, calculationRules, climateData,
  constructionMaterials, designStandards, propertyMarketData, decisionTrees
} from "../../drizzle/schema";
import { eq, like, and, or, desc, sql } from "drizzle-orm";

// Helper to get db instance
async function getDbInstance() { return (await getDb())!; }

export type Platform = "fada" | "raqaba" | "harara" | "maskan" | "code" | "khayal";

export interface QueryContext {
  platform: Platform;
  query: string;
  /** Optional: emirate context */
  emirate?: string;
  /** Optional: structured data extracted from conversation */
  structuredData?: Record<string, unknown>;
}

export interface RouterResult {
  /** How the query was answered */
  source: "faq_cache" | "building_code" | "calculation" | "climate_data" | "material_data" | "decision_tree" | "llm";
  /** The answer content */
  answer: string;
  /** Credits cost (0 for local, 3-5 for LLM) */
  creditCost: number;
  /** Confidence 0-100 */
  confidence: number;
  /** Additional structured data */
  data?: Record<string, unknown>;
  /** Whether to also send to LLM for enrichment */
  needsLLMEnrichment?: boolean;
}

// ─────────────────────────────────────────────
// Keyword extraction helpers
// ─────────────────────────────────────────────

const CODE_KEYWORDS = [
  "كود", "اشتراط", "متطلب", "حد أدنى", "حد أقصى", "مسموح", "إلزامي", "معيار",
  "مواصفة", "نظام", "لائحة", "قانون", "تشريع", "code", "requirement", "standard",
  "minimum", "maximum", "mandatory", "regulation", "dbc", "adibc", "fire code",
  "ارتفاع", "مسافة", "عرض", "مساحة", "نسبة", "معامل"
];

const CLIMATE_KEYWORDS = [
  "مناخ", "طقس", "حرارة", "رطوبة", "شمس", "إشعاع", "رياح", "درجة حرارة",
  "تصميم", "صيف", "شتاء", "climate", "temperature", "humidity", "solar", "wind",
  "cooling degree", "heating degree", "تبريد", "تدفئة"
];

const HVAC_KEYWORDS = [
  "تكييف", "تبريد", "hvac", "حمل حراري", "طن تبريد", "كيلوواط", "u-value",
  "عزل", "shgc", "زجاج", "جدار", "سقف", "أرضية", "cooling load", "heat gain",
  "insulation", "thermal", "حرارة", "طاقة", "كفاءة"
];

const PROPERTY_KEYWORDS = [
  "سعر", "إيجار", "عقار", "شقة", "فيلا", "رهن", "قرض", "دفعة أولى", "roi",
  "عائد", "استثمار", "منطقة", "price", "rent", "property", "mortgage", "loan",
  "down payment", "return", "investment", "area", "district"
];

const MATERIAL_KEYWORDS = [
  "مواد", "خرسانة", "حديد", "عزل", "زجاج", "طوب", "رخام", "بلاط", "دهان",
  "سعر", "مورد", "material", "concrete", "steel", "insulation", "glass", "tile",
  "paint", "supplier", "cost", "تكلفة"
];

const FIRE_KEYWORDS = [
  "حريق", "إطفاء", "رشاش", "إنذار", "هروب", "مخرج", "fire", "sprinkler",
  "alarm", "evacuation", "exit", "travel distance", "مسافة", "إخلاء"
];

function detectIntent(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];
  
  if (CODE_KEYWORDS.some(k => q.includes(k))) intents.push("code_lookup");
  if (CLIMATE_KEYWORDS.some(k => q.includes(k))) intents.push("climate_data");
  if (HVAC_KEYWORDS.some(k => q.includes(k))) intents.push("hvac_calculation");
  if (PROPERTY_KEYWORDS.some(k => q.includes(k))) intents.push("property_data");
  if (MATERIAL_KEYWORDS.some(k => q.includes(k))) intents.push("material_data");
  if (FIRE_KEYWORDS.some(k => q.includes(k))) intents.push("fire_safety");
  
  return intents;
}

function extractEmirate(query: string): string | null {
  const emirateMap: Record<string, string> = {
    "دبي": "dubai", "dubai": "dubai",
    "أبوظبي": "abu_dhabi", "ابوظبي": "abu_dhabi", "abu dhabi": "abu_dhabi",
    "الشارقة": "sharjah", "sharjah": "sharjah",
    "عجمان": "ajman", "ajman": "ajman",
    "رأس الخيمة": "ras_al_khaimah", "rak": "ras_al_khaimah",
    "الفجيرة": "fujairah", "fujairah": "fujairah",
    "أم القيوين": "umm_al_quwain",
  };
  
  const q = query.toLowerCase();
  for (const [key, val] of Object.entries(emirateMap)) {
    if (q.includes(key.toLowerCase())) return val;
  }
  return null;
}

function calculateTextSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsAArr = Array.from(wordsA);
  const intersection = new Set(wordsAArr.filter(w => wordsB.has(w)));
  const union = new Set([...wordsAArr, ...Array.from(wordsB)]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

// ─────────────────────────────────────────────
// Layer 1: FAQ Cache lookup
// ─────────────────────────────────────────────

async function checkFAQCache(ctx: QueryContext): Promise<RouterResult | null> {
  try {
    const cached = await (await getDbInstance()).select().from(faqCache)
      .where(
        and(
          or(eq(faqCache.platform, ctx.platform), eq(faqCache.platform, "all")),
          eq(faqCache.isActive, 1)
        )
      )
      .orderBy(desc(faqCache.hitCount))
      .limit(20);
    
    if (!cached.length) return null;
    
    // Find best match by keyword overlap
    let bestMatch = null;
    let bestScore = 0;
    
    for (const entry of cached) {
      const score = calculateTextSimilarity(ctx.query, entry.questionAr);
      const scoreEn = entry.questionEn ? calculateTextSimilarity(ctx.query, entry.questionEn) : 0;
      const maxScore = Math.max(score, scoreEn);
      
      if (maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = entry;
      }
    }
    
    // Threshold: 30% similarity = cache hit
    if (bestMatch && bestScore >= 0.30) {
      // Update hit count
      await (await getDbInstance()).update(faqCache)
        .set({ hitCount: sql`${faqCache.hitCount} + 1`, lastHitAt: new Date() })
        .where(eq(faqCache.id, bestMatch.id));
      
      return {
        source: "faq_cache",
        answer: bestMatch.answerAr,
        creditCost: 0,
        confidence: Math.min(95, Math.round(bestScore * 150)),
        data: { faqId: bestMatch.id, similarity: bestScore }
      };
    }
    
    return null;
  } catch (e) {
    console.error("[QueryRouter] FAQ cache error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Layer 2: Building Code lookup
// ─────────────────────────────────────────────

async function checkBuildingCodes(ctx: QueryContext): Promise<RouterResult | null> {
  try {
    const intents = detectIntent(ctx.query);
    if (!intents.includes("code_lookup") && !intents.includes("fire_safety")) return null;
    
    const emirate = extractEmirate(ctx.query) || ctx.emirate || "dubai";
    
    // Search by keyword in tags and title
    const keywords = ctx.query.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    
    const results = await (await getDbInstance()).select().from(buildingCodes)
      .where(
        and(
          or(
            eq(buildingCodes.emirate, emirate),
            eq(buildingCodes.emirate, "all")
          ),
          or(
            ...keywords.map(k => like(buildingCodes.titleAr, `%${k}%`)),
            ...keywords.map(k => like(buildingCodes.tags, `%${k}%`)),
            ...keywords.map(k => like(buildingCodes.contentAr, `%${k}%`))
          )
        )
      )
      .limit(3);
    
    if (!results.length) return null;
    
    // Format the response
    const primary = results[0];
    let answer = `## ${primary.titleAr}\n\n`;
    answer += `**المرجع:** ${primary.codeSystem} ${primary.edition} — ${primary.sectionNumber}\n\n`;
    answer += primary.contentAr + "\n\n";
    
    if (primary.minValue !== null || primary.maxValue !== null) {
      answer += `**القيم الرقمية:**\n`;
      if (primary.minValue !== null) answer += `- الحد الأدنى: **${primary.minValue} ${primary.unit || ""}**\n`;
      if (primary.maxValue !== null) answer += `- الحد الأقصى: **${primary.maxValue} ${primary.unit || ""}**\n`;
    }
    
    if (results.length > 1) {
      answer += `\n---\n*بنود ذات صلة: ${results.slice(1).map(r => r.sectionNumber + " " + r.titleAr).join("، ")}*`;
    }
    
    return {
      source: "building_code",
      answer,
      creditCost: 0,
      confidence: 88,
      data: { codes: results.map(r => ({ id: r.id, section: r.sectionNumber, title: r.titleAr })) }
    };
  } catch (e) {
    console.error("[QueryRouter] Building code error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Layer 3: Climate Data lookup
// ─────────────────────────────────────────────

async function checkClimateData(ctx: QueryContext): Promise<RouterResult | null> {
  try {
    const intents = detectIntent(ctx.query);
    if (!intents.includes("climate_data") && !intents.includes("hvac_calculation")) return null;
    
    const emirate = extractEmirate(ctx.query) || ctx.emirate || "dubai";
    
    // Get annual summary
    const data = await (await getDbInstance()).select().from(climateData)
      .where(eq(climateData.emirate, emirate as any))
      .orderBy(climateData.month);
    
    if (!data.length) return null;
    
    // Calculate annual stats
    const maxTemp = Math.max(...data.map(d => d.tempMaxAvg || 0));
    const minTemp = Math.min(...data.map(d => d.tempMinAvg || 0));
    const avgHumidity = data.reduce((s, d) => s + (d.humidityAvg || 0), 0) / data.length;
    const peakSolar = Math.max(...data.map(d => d.solarIrradiancePeak || 0));
    const designCooling = data[0]?.designTempCooling;
    const annualCDD = data.reduce((s, d) => s + (d.coolingDegreeDays || 0), 0);
    
    const emirateNames: Record<string, string> = {
      dubai: "دبي", abu_dhabi: "أبوظبي", sharjah: "الشارقة",
      ras_al_khaimah: "رأس الخيمة", fujairah: "الفجيرة"
    };
    
    const answer = `## البيانات المناخية — ${emirateNames[emirate] || emirate}

**ملخص المناخ السنوي:**
| المؤشر | القيمة |
|--------|--------|
| أقصى درجة حرارة (صيف) | ${maxTemp}°C |
| أدنى درجة حرارة (شتاء) | ${minTemp}°C |
| متوسط الرطوبة النسبية | ${avgHumidity.toFixed(0)}% |
| ذروة الإشعاع الشمسي | ${peakSolar} واط/م² |
| درجة حرارة التصميم للتبريد | ${designCooling}°C |
| أيام التبريد السنوية (CDD) | ${annualCDD.toFixed(0)} يوم·كلفن |

**توصيات تصميمية:**
- المناخ الإماراتي يتطلب تبريداً طوال 9-10 أشهر سنوياً
- الأسقف هي المصدر الأول للكسب الحراري (يُنصح بعزل R≥2.5)
- الواجهات الغربية والجنوبية تحتاج حماية شمسية (SHGC ≤ 0.25)
- يُنصح بزجاج Low-E مزدوج لتقليل الأحمال الحرارية

*المصدر: UAE National Meteorology Centre / ASHRAE Fundamentals 2021*`;
    
    return {
      source: "climate_data",
      answer,
      creditCost: 0,
      confidence: 92,
      data: { emirate, maxTemp, minTemp, avgHumidity, designCooling, annualCDD }
    };
  } catch (e) {
    console.error("[QueryRouter] Climate data error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Layer 4: Material Data lookup
// ─────────────────────────────────────────────

async function checkMaterialData(ctx: QueryContext): Promise<RouterResult | null> {
  try {
    const intents = detectIntent(ctx.query);
    if (!intents.includes("material_data")) return null;
    
    const keywords = ctx.query.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
    
    const results = await (await getDbInstance()).select().from(constructionMaterials)
      .where(
        or(
          ...keywords.map((k: string) => like(constructionMaterials.nameAr, `%${k}%`)),
          ...keywords.map((k: string) => like(constructionMaterials.nameEn, `%${k}%`))
        )
      )
      .limit(5);
    
    if (!results.length) return null;
    
    let answer = `## مواد البناء — الأسعار والمواصفات\n\n`;
    answer += `| المادة | الفئة | السعر | الوحدة | الموردون |\n`;
    answer += `|--------|-------|-------|--------|----------|\n`;
    
    for (const mat of results) {
      answer += `| ${mat.nameAr} | ${mat.category} | ${mat.priceAed ?? "—"} درهم | ${mat.priceUnit ?? "—"} | ${mat.suppliers?.split(",")[0] ?? "—"} |\n`;
    }
    
    // Add thermal properties if relevant
    const thermalMats = results.filter(m => m.thermalConductivity || m.uValue);
    if (thermalMats.length > 0) {
      answer += `\n**الخصائص الحرارية:**\n`;
      for (const mat of thermalMats) {
        if (mat.thermalConductivity) answer += `- ${mat.nameAr}: λ = ${mat.thermalConductivity} واط/م·كلفن\n`;
        if (mat.uValue) answer += `- ${mat.nameAr}: U-Value = ${mat.uValue} واط/م²·كلفن\n`;
        if (mat.shgc) answer += `- ${mat.nameAr}: SHGC = ${mat.shgc}\n`;
      }
    }
    
    answer += `\n*الأسعار تقريبية بالدرهم الإماراتي — Q4 2024*`;
    
    return {
      source: "material_data",
      answer,
      creditCost: 0,
      confidence: 85,
      data: { materials: results.map((m) => ({ id: m.id, name: m.nameAr, price: m.priceAed })) }
    };
  } catch (e) {
    console.error("[QueryRouter] Material data error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Layer 5: Decision Tree traversal
// ─────────────────────────────────────────────

async function checkDecisionTrees(ctx: QueryContext): Promise<RouterResult | null> {
  try {
    const trees = await (await getDbInstance()).select().from(decisionTrees)
      .where(
        and(
          or(eq(decisionTrees.platform, ctx.platform), eq(decisionTrees.platform, "all")),
          eq(decisionTrees.isActive, 1)
        )
      );
    
    if (!trees.length) return null;
    
    // Find matching tree by trigger condition similarity
    let bestTree = null;
    let bestScore = 0;
    
    for (const tree of trees) {
      const score = calculateTextSimilarity(ctx.query, tree.triggerCondition);
      if (score > bestScore) {
        bestScore = score;
        bestTree = tree;
      }
    }
    
    if (!bestTree || bestScore < 0.15) return null;
    
    const logic = bestTree.treeLogic as { question: string; branches: Array<{ condition: string; result: string }> };
    
    let answer = `## ${bestTree.nameAr}\n\n`;
    answer += `**${logic.question}**\n\n`;
    
    for (const branch of logic.branches) {
      answer += `**إذا ${branch.condition}:**\n${branch.result}\n\n`;
    }
    
    answer += `*الثقة: ${bestTree.confidenceScore}% — مبني على كودات البناء الإماراتية*`;
    
    return {
      source: "decision_tree",
      answer,
      creditCost: 0,
      confidence: bestTree.confidenceScore || 85,
      data: { treeId: bestTree.id, treeName: bestTree.nameAr }
    };
  } catch (e) {
    console.error("[QueryRouter] Decision tree error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Main Router Function
// ─────────────────────────────────────────────

export async function routeQuery(ctx: QueryContext): Promise<RouterResult> {
  // Try each layer in order (cheapest first)
  
  // Layer 1: FAQ Cache (fastest, most reliable)
  const faqResult = await checkFAQCache(ctx);
  if (faqResult && faqResult.confidence >= 60) {
    return faqResult;
  }
  
  // Layer 2: Building Code (for code/regulation queries)
  if (ctx.platform === "code" || detectIntent(ctx.query).includes("code_lookup")) {
    const codeResult = await checkBuildingCodes(ctx);
    if (codeResult) return codeResult;
  }
  
  // Layer 3: Climate Data (for thermal/HVAC queries)
  if (ctx.platform === "harara" || detectIntent(ctx.query).includes("climate_data")) {
    const climateResult = await checkClimateData(ctx);
    if (climateResult) return climateResult;
  }
  
  // Layer 4: Material Data (for material/cost queries)
  const materialResult = await checkMaterialData(ctx);
  if (materialResult) return materialResult;
  
  // Layer 5: Decision Trees (for structured decisions)
  const treeResult = await checkDecisionTrees(ctx);
  if (treeResult && treeResult.confidence >= 70) return treeResult;
  
  // Layer 6: LLM fallback (with local context enrichment)
  const localContext = await buildLocalContext(ctx);
  
  return {
    source: "llm",
    answer: "", // Will be filled by LLM
    creditCost: 5,
    confidence: 0,
    needsLLMEnrichment: true,
    data: { localContext }
  };
}

// ─────────────────────────────────────────────
// Build local context to enrich LLM prompts
// ─────────────────────────────────────────────

export async function buildLocalContext(ctx: QueryContext): Promise<string> {
  const parts: string[] = [];
  const intents = detectIntent(ctx.query);
  const emirate = extractEmirate(ctx.query) || ctx.emirate || "dubai";
  
  // Add relevant climate data
  if (intents.includes("climate_data") || intents.includes("hvac_calculation")) {
    const climate = await (await getDbInstance()).select().from(climateData)
      .where(and(eq(climateData.emirate, emirate as any), eq(climateData.month, 7))) // July = peak summer
      .limit(1);
    
    if (climate[0]) {
      const c = climate[0];
      parts.push(`[بيانات مناخية - ${emirate}] درجة حرارة التصميم: ${c.designTempCooling}°C، رطوبة: ${c.humidityAvg}%، إشعاع شمسي: ${c.solarIrradiancePeak} واط/م²`);
    }
  }
  
  // Add relevant building codes
  if (intents.includes("code_lookup") || intents.includes("fire_safety")) {
    const codes = await (await getDbInstance()).select({
      section: buildingCodes.sectionNumber,
      title: buildingCodes.titleAr,
      minValue: buildingCodes.minValue,
      maxValue: buildingCodes.maxValue,
      unit: buildingCodes.unit
    }).from(buildingCodes)
      .where(or(eq(buildingCodes.emirate, emirate), eq(buildingCodes.emirate, "all")))
      .limit(5);
    
    if (codes.length > 0) {
      const codesSummary = codes.map((c) => 
        `${c.section}: ${c.title}${c.minValue ? ` (الحد الأدنى: ${c.minValue}${c.unit ?? ""})` : ""}${c.maxValue ? ` (الحد الأقصى: ${c.maxValue}${c.unit ?? ""})` : ""}`
      ).join("\n");
      parts.push(`[كودات البناء ذات الصلة]\n${codesSummary}`);
    }
  }
  
  // Add calculation rules
  if (intents.includes("hvac_calculation")) {
    const rules = await (await getDbInstance()).select({
      nameAr: calculationRules.nameAr,
      formulaAr: calculationRules.formulaAr
    }).from(calculationRules)
      .where(and(eq(calculationRules.platform, ctx.platform), eq(calculationRules.isActive, 1)))
      .limit(2);
    
    if (rules.length > 0) {
      const rulesSummary = rules.map((r) => `${r.nameAr}:\n${r.formulaAr}`).join("\n\n");
      parts.push(`[قواعد الحساب]\n${rulesSummary}`);
    }
  }
  
  return parts.length > 0 
    ? `\n\n--- بيانات محلية للمساعدة ---\n${parts.join("\n\n")}\n---\n`
    : "";
}

// ─────────────────────────────────────────────
// Auto-cache LLM responses
// ─────────────────────────────────────────────

export async function cacheResponse(
  ctx: QueryContext,
  question: string,
  answer: string,
  qualityScore = 75
): Promise<void> {
  try {
    await (await getDbInstance()).insert(faqCache).values({
      platform: ctx.platform,
      questionAr: question,
      answerAr: answer,
      hitCount: 0,
      creditsSaved: 0,
      source: "auto",
      qualityScore,
      isActive: 1,
    }).onDuplicateKeyUpdate({ set: { answerAr: answer } });
  } catch (e) {
    console.error("[QueryRouter] Cache write error:", e);
  }
}

// ─────────────────────────────────────────────
// Statistics helper for admin dashboard
// ─────────────────────────────────────────────

export async function getRouterStats(): Promise<{
  totalCacheHits: number;
  totalCreditsSaved: number;
  topCachedQuestions: Array<{ question: string; hits: number }>;
}> {
  const stats = await (await getDbInstance()).select({
    totalHits: sql<number>`SUM(${faqCache.hitCount})`,
    totalSaved: sql<number>`SUM(${faqCache.creditsSaved})`,
  }).from(faqCache).where(eq(faqCache.isActive, 1));
  
  const top = await (await getDbInstance()).select({
    question: faqCache.questionAr,
    hits: faqCache.hitCount,
  }).from(faqCache)
    .where(eq(faqCache.isActive, 1))
    .orderBy(desc(faqCache.hitCount))
    .limit(5);
  
  return {
    totalCacheHits: stats[0]?.totalHits || 0,
    totalCreditsSaved: stats[0]?.totalSaved || 0,
    topCachedQuestions: top.map((t) => ({ question: t.question, hits: t.hits ?? 0 }))
  };
}
