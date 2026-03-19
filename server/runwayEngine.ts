/**
 * RunwayEngine.ts — محرك Runway ML للتأثيرات البصرية وتحريك الصور
 * يستخدم Runway Gen-4 Turbo لتحويل الصور إلى مقاطع فيديو متحركة
 *
 * الميزات:
 * - Image-to-Video: تحريك الصور الثابتة (5 ثوانٍ لكل مشهد)
 * - Motion Presets: حركات مخصصة لكل نوع محتوى
 * - Fallback: إذا فشل Runway يُستخدم Ken Burns عبر FFmpeg
 */

import { ENV } from "./_core/env";

// ═══════════════════════════════════════════════════════════
// الأنواع
// ═══════════════════════════════════════════════════════════

export type RunwayMotionPreset =
  | "cinematic_pan"      // حركة سينمائية أفقية
  | "zoom_in_slow"       // تقريب بطيء
  | "zoom_out_reveal"    // إبعاد كاشف
  | "dramatic_push"      // دفع درامي
  | "floating_gentle"    // طفو هادئ
  | "action_shake"       // اهتزاز أكشن
  | "documentary_drift"  // انجراف وثائقي
  | "orbit_slow";        // دوران بطيء

export interface RunwayGenerateOptions {
  imageUrl: string;           // رابط الصورة المصدر أو base64 data URI
  imageBuffer?: Buffer;       // بيانات الصورة الخام (يُحوَّل إلى data URI تلقائياً)
  motionPreset?: RunwayMotionPreset;
  duration?: 5 | 10;          // مدة الفيديو بالثواني
  ratio?: "1280:768" | "768:1280" | "1104:832" | "832:1104" | "16:9" | "9:16";
  seed?: number;
  promptText?: string;        // نص اختياري لتوجيه الحركة
}

export interface RunwayTask {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  output?: string[];          // روابط الفيديو المنتج
  failure?: string;
  progress?: number;
}

// ═══════════════════════════════════════════════════════════
// Motion Prompts — نصوص الحركة لكل Preset
// ═══════════════════════════════════════════════════════════

const MOTION_PROMPTS: Record<RunwayMotionPreset, string> = {
  cinematic_pan: "Slow cinematic camera pan from left to right, smooth professional movement",
  zoom_in_slow: "Slow gentle zoom in toward the center, cinematic depth",
  zoom_out_reveal: "Slow zoom out revealing the full scene, dramatic reveal",
  dramatic_push: "Dramatic push forward into the scene, intense cinematic movement",
  floating_gentle: "Gentle floating camera movement, peaceful and serene",
  action_shake: "Dynamic handheld camera shake, action-packed energy",
  documentary_drift: "Slow documentary-style drift, observational and natural",
  orbit_slow: "Slow orbital camera movement around the subject",
};

// ═══════════════════════════════════════════════════════════
// اختيار الحركة المناسبة تلقائياً
// ═══════════════════════════════════════════════════════════

export function selectMotionForDomain(domain: string, sceneIndex: number): RunwayMotionPreset {
  const domainLower = domain.toLowerCase();

  if (domainLower.includes("action") || domainLower.includes("أكشن")) {
    return sceneIndex % 2 === 0 ? "action_shake" : "dramatic_push";
  }
  if (domainLower.includes("documentary") || domainLower.includes("وثائقي")) {
    return sceneIndex % 2 === 0 ? "documentary_drift" : "cinematic_pan";
  }
  if (domainLower.includes("cinematic") || domainLower.includes("سينمائي")) {
    const presets: RunwayMotionPreset[] = ["cinematic_pan", "dramatic_push", "zoom_in_slow", "zoom_out_reveal"];
    return presets[sceneIndex % presets.length];
  }
  if (domainLower.includes("educational") || domainLower.includes("تعليمي")) {
    return sceneIndex % 2 === 0 ? "zoom_in_slow" : "documentary_drift";
  }
  if (domainLower.includes("drama") || domainLower.includes("دراما")) {
    return sceneIndex % 2 === 0 ? "floating_gentle" : "dramatic_push";
  }
  if (domainLower.includes("nature") || domainLower.includes("طبيعي")) {
    return sceneIndex % 2 === 0 ? "floating_gentle" : "orbit_slow";
  }

  // افتراضي: تنويع بين الحركات السينمائية
  const defaults: RunwayMotionPreset[] = ["cinematic_pan", "zoom_in_slow", "zoom_out_reveal", "floating_gentle"];
  return defaults[sceneIndex % defaults.length];
}

// ═══════════════════════════════════════════════════════════
// محرك Runway الرئيسي
// ═══════════════════════════════════════════════════════════

export class RunwayEngine {
  private apiKey: string;
  private baseUrl = "https://api.dev.runwayml.com/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ENV.runwayApiKey;
  }

  /**
   * تحويل صورة إلى فيديو متحرك باستخدام Runway Gen-4 Turbo
   * يعيد رابط الفيديو المنتج أو null عند الفشل
   */
  async imageToVideo(options: RunwayGenerateOptions): Promise<string | null> {
    if (!this.apiKey) {
      console.warn("[Runway] API key not configured — skipping image-to-video");
      return null;
    }

    const motionPreset = options.motionPreset ?? "cinematic_pan";
    const promptText = options.promptText ?? MOTION_PROMPTS[motionPreset];
    const duration = options.duration ?? 5;
    // تحويل النسب القديمة إلى النسب الصحيحة المقبولة من Runway API
    const rawRatio = options.ratio ?? "1280:768";
    const ratio = this.normalizeRatio(rawRatio);

    try {
      console.log(`  [Runway] بدء تحريك الصورة: ${motionPreset} (${ratio})`);

      // تحويل الصورة إلى base64 data URI إذا كانت URL خارجية
      let promptImage: string;
      if (options.imageBuffer) {
        promptImage = `data:image/png;base64,${options.imageBuffer.toString("base64")}`;
      } else if (options.imageUrl.startsWith("data:")) {
        promptImage = options.imageUrl;
      } else {
        // تحميل الصورة وتحويلها إلى base64
        const imgResp = await fetch(options.imageUrl);
        if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        const mimeType = imgResp.headers.get("content-type") || "image/png";
        promptImage = `data:${mimeType};base64,${imgBuf.toString("base64")}`;
      }

      // إنشاء مهمة التوليد
      const createResponse = await fetch(`${this.baseUrl}/image_to_video`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          model: "gen4_turbo",
          promptImage,
          promptText,
          duration,
          ratio,
          ...(options.seed ? { seed: options.seed } : {}),
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.warn(`[Runway] Create task failed (${createResponse.status}): ${errorText}`);
        return null;
      }

      const task = await createResponse.json() as RunwayTask;
      console.log(`  [Runway] مهمة أُنشئت: ${task.id}`);

      // الانتظار حتى اكتمال المهمة (polling)
      const videoUrl = await this.pollTask(task.id);
      return videoUrl;
    } catch (err) {
      console.warn(`[Runway] Error: ${err}`);
      return null;
    }
  }

  /**
   * متابعة حالة المهمة حتى الاكتمال
   */
  private async pollTask(taskId: string, maxWaitMs = 120000): Promise<string | null> {
    const startTime = Date.now();
    const pollInterval = 3000; // كل 3 ثوانٍ

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollInterval));

      try {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
        });

        if (!response.ok) {
          console.warn(`[Runway] Poll failed (${response.status})`);
          return null;
        }

        const task = await response.json() as RunwayTask;
        console.log(`  [Runway] حالة المهمة: ${task.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);

        if (task.status === "SUCCEEDED" && task.output && task.output.length > 0) {
          console.log(`  ✓ [Runway] فيديو جاهز: ${task.output[0]}`);
          return task.output[0];
        }

        if (task.status === "FAILED") {
          console.warn(`[Runway] Task failed: ${task.failure}`);
          return null;
        }
      } catch (err) {
        console.warn(`[Runway] Poll error: ${err}`);
        return null;
      }
    }

    console.warn(`[Runway] Timeout after ${maxWaitMs / 1000}s`);
    return null;
  }

  /**
   * تحويل النسب إلى الصيغة المقبولة من Runway API
   */
  private normalizeRatio(ratio: string): string {
    // النسب المقبولة من Runway API: "1280:720"|"720:1280"|"1104:832"|"832:1104"|"960:960"|"1584:672"
    const map: Record<string, string> = {
      "1280:720":  "1280:720",
      "720:1280":  "720:1280",
      "1280:768":  "1280:720",  // تصحيح النسبة الخاطئة
      "768:1280":  "720:1280",  // تصحيح النسبة الخاطئة
      "1104:832":  "1104:832",
      "832:1104":  "832:1104",
      "960:960":   "960:960",
      "1584:672":  "1584:672",
      "16:9":      "1280:720",
      "9:16":      "720:1280",
      "1:1":       "960:960",
      "4:3":       "1104:832",
    };
    return map[ratio] ?? "1280:720";
  }

  /**
   * التحقق من صحة API Key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/organizations`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "X-Runway-Version": "2024-11-06",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * تحويل مجموعة صور إلى مقاطع فيديو بالتوازي
   * مع Fallback تلقائي عند الفشل
   */
  async batchImageToVideo(
    imageUrls: string[],
    domain: string,
    onProgress?: (index: number, total: number) => void
  ): Promise<Array<string | null>> {
    const results: Array<string | null> = [];

    // معالجة متسلسلة (لتجنب تجاوز rate limits)
    for (let i = 0; i < imageUrls.length; i++) {
      onProgress?.(i + 1, imageUrls.length);
      const motionPreset = selectMotionForDomain(domain, i);
      const videoUrl = await this.imageToVideo({
        imageUrl: imageUrls[i],
        motionPreset,
        duration: 5,
        ratio: "1280:768" as any,
      });
      results.push(videoUrl);
      console.log(`  [Runway] ${i + 1}/${imageUrls.length}: ${videoUrl ? "✓" : "✗ (fallback)"}`);
    }

    return results;
  }
}

// ═══════════════════════════════════════════════════════════
// Instance مشترك
// ═══════════════════════════════════════════════════════════

export const runwayEngine = new RunwayEngine();
