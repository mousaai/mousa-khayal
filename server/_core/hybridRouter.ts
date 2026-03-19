/**
 * HybridRouter — محرك التوزيع الذكي للأحمال
 *
 * الاستراتيجية الهجينة:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Manus (مجاني) ← الأولوية الأولى دائماً               │
 * │  OpenAI / Replicate / R2 ← عند فشل Manus أو حمل عالٍ │
 * └─────────────────────────────────────────────────────────┘
 *
 * منطق التوزيع:
 * 1. LLM:    Manus → OpenAI (عند quota/خطأ)
 * 2. صور:    Manus → Replicate (عند بطء/خطأ)
 * 3. تخزين: Manus → R2 (عند حجم كبير > 10MB أو خطأ)
 *
 * مراقبة التكاليف:
 * - يسجّل كل استخدام في الذاكرة
 * - يُحسب التكلفة الفعلية لكل طلب
 * - يُقدّم تقرير شهري تقديري
 */

import { ENV } from "./env";

// ═══════════════════════════════════════════════════════════
// أنواع البيانات
// ═══════════════════════════════════════════════════════════

export type ServiceProvider = "manus" | "openai" | "replicate" | "r2";

export interface UsageRecord {
  timestamp: number;
  service: ServiceProvider;
  operation: "llm" | "image" | "storage";
  tokens?: number;       // للـ LLM
  images?: number;       // لتوليد الصور
  storageBytes?: number; // للتخزين
  cost: number;          // بالدولار
  success: boolean;
  fallback: boolean;     // هل كان هذا fallback؟
}

// ═══════════════════════════════════════════════════════════
// أسعار الخدمات (بالدولار)
// ═══════════════════════════════════════════════════════════

const PRICING = {
  openai: {
    mini_input: 0.15 / 1_000_000,   // $0.15/M token
    mini_output: 0.60 / 1_000_000,  // $0.60/M token
    pro_input: 2.50 / 1_000_000,    // $2.50/M token
    pro_output: 10.00 / 1_000_000,  // $10.00/M token
  },
  replicate: {
    flux_schnell: 0.003,  // $0.003/صورة
    flux_dev: 0.025,      // $0.025/صورة
  },
  r2: {
    storage_gb: 0.015,    // $0.015/GB/شهر (بعد 10GB مجاناً)
    class_a: 4.50 / 1_000_000,  // $4.50/M عملية
    class_b: 0.36 / 1_000_000,  // $0.36/M عملية
  },
  manus: {
    // مجاني ضمن الاشتراك
    cost: 0,
  },
};

// ═══════════════════════════════════════════════════════════
// سجل الاستخدام (في الذاكرة — يُعاد تعيينه عند إعادة التشغيل)
// ═══════════════════════════════════════════════════════════

class UsageTracker {
  private records: UsageRecord[] = [];
  private manusFailures = 0;
  private lastManusFailure = 0;
  private MANUS_COOLDOWN_MS = 5 * 60 * 1000; // 5 دقائق

  record(entry: UsageRecord) {
    this.records.push(entry);
    // احتفظ بآخر 1000 سجل فقط في الذاكرة
    if (this.records.length > 1000) {
      this.records = this.records.slice(-1000);
    }
  }

  recordManusFailure() {
    this.manusFailures++;
    this.lastManusFailure = Date.now();
  }

  resetManusFailures() {
    this.manusFailures = 0;
  }

  /**
   * هل Manus في فترة تبريد؟ (فشل مؤخراً)
   */
  isManusOnCooldown(): boolean {
    if (this.manusFailures === 0) return false;
    return Date.now() - this.lastManusFailure < this.MANUS_COOLDOWN_MS;
  }

  /**
   * تقرير التكاليف
   */
  getCostReport(): {
    total: number;
    byService: Record<ServiceProvider, number>;
    byOperation: Record<string, number>;
    manusUsagePercent: number;
    fallbackPercent: number;
    recordCount: number;
  } {
    const byService: Record<ServiceProvider, number> = {
      manus: 0, openai: 0, replicate: 0, r2: 0,
    };
    const byOperation: Record<string, number> = {
      llm: 0, image: 0, storage: 0,
    };
    let total = 0;
    let manusCount = 0;
    let fallbackCount = 0;

    for (const r of this.records) {
      if (!r.success) continue;
      byService[r.service] = (byService[r.service] || 0) + r.cost;
      byOperation[r.operation] = (byOperation[r.operation] || 0) + r.cost;
      total += r.cost;
      if (r.service === "manus") manusCount++;
      if (r.fallback) fallbackCount++;
    }

    const successCount = this.records.filter(r => r.success).length;

    return {
      total,
      byService,
      byOperation,
      manusUsagePercent: successCount > 0 ? (manusCount / successCount) * 100 : 0,
      fallbackPercent: successCount > 0 ? (fallbackCount / successCount) * 100 : 0,
      recordCount: this.records.length,
    };
  }
}

export const usageTracker = new UsageTracker();

// ═══════════════════════════════════════════════════════════
// HybridLLM — Manus أولاً، OpenAI عند الفشل
// ═══════════════════════════════════════════════════════════

import type { InvokeParams, InvokeResult } from "./llm";

export async function hybridInvokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const startTime = Date.now();

  // ── المحاولة الأولى: Manus (مجاني) ──────────────────────────────────────────
  if (ENV.forgeApiKey && ENV.forgeApiUrl && !usageTracker.isManusOnCooldown()) {
    try {
      const { invokeLLMWithManus } = await import("./manusLLM");
      const result = await invokeLLMWithManus(params);

      usageTracker.record({
        timestamp: startTime,
        service: "manus",
        operation: "llm",
        tokens: result.usage?.total_tokens,
        cost: 0, // مجاني
        success: true,
        fallback: false,
      });

      return result;
    } catch (err) {
      const errMsg = (err as Error).message;
      console.warn(`[HybridLLM] Manus failed: ${errMsg} → switching to OpenAI`);
      usageTracker.recordManusFailure();
    }
  }

  // ── المحاولة الثانية: OpenAI (مدفوع) ────────────────────────────────────────
  if (ENV.openaiApiKey) {
    const { invokeLLM } = await import("./llm");
    try {
      const result = await invokeLLM(params);
      const isMini = !params.model || params.model === "mini";
      const inputTokens = result.usage?.prompt_tokens ?? 0;
      const outputTokens = result.usage?.completion_tokens ?? 0;
      const cost = isMini
        ? inputTokens * PRICING.openai.mini_input + outputTokens * PRICING.openai.mini_output
        : inputTokens * PRICING.openai.pro_input + outputTokens * PRICING.openai.pro_output;

      usageTracker.record({
        timestamp: startTime,
        service: "openai",
        operation: "llm",
        tokens: result.usage?.total_tokens,
        cost,
        success: true,
        fallback: true,
      });

      return result;
    } catch (err) {
      usageTracker.record({
        timestamp: startTime,
        service: "openai",
        operation: "llm",
        cost: 0,
        success: false,
        fallback: true,
      });
      throw err;
    }
  }

  throw new Error("[HybridLLM] No LLM provider available. Configure BUILT_IN_FORGE_API_KEY or OPENAI_API_KEY.");
}

// ═══════════════════════════════════════════════════════════
// HybridImage — Manus أولاً، Replicate عند الفشل
// ═══════════════════════════════════════════════════════════

import type { GenerateImageOptions, GenerateImageResponse } from "./imageGeneration";

export async function hybridGenerateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const startTime = Date.now();

  // ── المحاولة الأولى: Manus (مجاني) ──────────────────────────────────────────
  if (ENV.forgeApiKey && ENV.forgeApiUrl && !usageTracker.isManusOnCooldown()) {
    try {
      const { generateWithManus } = await import("./manusImage");
      const result = await generateWithManus(options);

      usageTracker.record({
        timestamp: startTime,
        service: "manus",
        operation: "image",
        images: 1,
        cost: 0,
        success: true,
        fallback: false,
      });

      return result;
    } catch (err) {
      console.warn(`[HybridImage] Manus failed: ${(err as Error).message} → switching to Replicate`);
      usageTracker.recordManusFailure();
    }
  }

  // ── المحاولة الثانية: Replicate (مدفوع) ─────────────────────────────────────
  if (ENV.replicateApiToken) {
    const { generateImage } = await import("./imageGeneration");
    try {
      const result = await generateImage(options);
      const cost = options.quality === "pro"
        ? PRICING.replicate.flux_dev
        : PRICING.replicate.flux_schnell;

      usageTracker.record({
        timestamp: startTime,
        service: "replicate",
        operation: "image",
        images: 1,
        cost,
        success: true,
        fallback: true,
      });

      return result;
    } catch (err) {
      usageTracker.record({
        timestamp: startTime,
        service: "replicate",
        operation: "image",
        cost: 0,
        success: false,
        fallback: true,
      });
      throw err;
    }
  }

  throw new Error("[HybridImage] No image generation provider available.");
}

// ═══════════════════════════════════════════════════════════
// HybridStorage — R2 للملفات الكبيرة، Manus للصغيرة
// ═══════════════════════════════════════════════════════════

const R2_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB — ملفات أكبر تذهب لـ R2

export async function hybridStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const startTime = Date.now();
  const dataSize = typeof data === "string"
    ? Buffer.byteLength(data)
    : (data as Buffer).length;

  // ── ملفات كبيرة (>5MB): R2 أولاً (بدون رسوم نقل) ───────────────────────────
  if (dataSize > R2_THRESHOLD_BYTES && ENV.cloudflareR2AccessKeyId) {
    try {
      const { storagePut } = await import("../storage");
      const result = await storagePut(relKey, data, contentType);

      usageTracker.record({
        timestamp: startTime,
        service: "r2",
        operation: "storage",
        storageBytes: dataSize,
        cost: PRICING.r2.class_a, // تكلفة عملية واحدة
        success: true,
        fallback: false,
      });

      return result;
    } catch (err) {
      console.warn(`[HybridStorage] R2 failed for large file: ${(err as Error).message}`);
    }
  }

  // ── ملفات صغيرة (<5MB): Manus أولاً (مجاني) ─────────────────────────────────
  if (ENV.forgeApiKey && ENV.forgeApiUrl) {
    try {
      const { storagePut } = await import("../storage");
      const result = await storagePut(relKey, data, contentType);

      usageTracker.record({
        timestamp: startTime,
        service: "manus",
        operation: "storage",
        storageBytes: dataSize,
        cost: 0,
        success: true,
        fallback: false,
      });

      return result;
    } catch (err) {
      console.warn(`[HybridStorage] Manus failed: ${(err as Error).message} → switching to R2`);
    }
  }

  // ── Fallback: R2 ─────────────────────────────────────────────────────────────
  if (ENV.cloudflareR2AccessKeyId) {
    const { storagePut } = await import("../storage");
    const result = await storagePut(relKey, data, contentType);

    usageTracker.record({
      timestamp: startTime,
      service: "r2",
      operation: "storage",
      storageBytes: dataSize,
      cost: PRICING.r2.class_a,
      success: true,
      fallback: true,
    });

    return result;
  }

  throw new Error("[HybridStorage] No storage provider available.");
}

// ═══════════════════════════════════════════════════════════
// تقرير التكاليف — للوحة التحكم
// ═══════════════════════════════════════════════════════════

export function getCostReport() {
  return usageTracker.getCostReport();
}
