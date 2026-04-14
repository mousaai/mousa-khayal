/**
 * credit-costs.ts — جدول تكاليف عمليات خيال بالكريدت
 * وفق دليل فضاء v2.0 — أبريل 2026
 */

export const CREDIT_COSTS = {
  // === مشاهد الفيديو ===
  scene: 20,           // مشهد واحد (20 كريدت)
  scene_hd: 30,        // مشهد HD
  
  // === جلسات الفيلم ===
  script_only: 5,      // سيناريو فقط بدون فيديو
  film_short: 350,     // فيلم قصير (حتى 5 مشاهد)
  film_medium: 700,    // فيلم متوسط (حتى 10 مشاهد)
  film_long: 1400,     // فيلم طويل (حتى 20 مشهد)
  
  // === جلسات متقدمة ===
  autonomous: 200,     // جلسة ذاتية كاملة
  surprise: 100,       // جلسة مفاجأة
  
  // === تصميم ===
  design_basic: 40,    // تصميم أساسي
  design_full: 80,     // تصميم كامل
  
  // === الافتراضي ===
  default: 20,         // تكلفة افتراضية لمشهد واحد
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

/**
 * حساب تكلفة جلسة بناءً على عدد المشاهد
 * المنطق: 20 كريدت لكل مشهد
 */
export function calculateSessionCost(sceneCount: number): number {
  return sceneCount * CREDIT_COSTS.scene;
}

/**
 * الحد الأدنى للرصيد لتشغيل مشهد واحد
 */
export const MIN_BALANCE_FOR_SCENE = CREDIT_COSTS.scene;
