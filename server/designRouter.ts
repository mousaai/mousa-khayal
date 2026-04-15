/**
 * designRouter.ts — محرك التصاميم المعمارية لمنصة خيال
 * ─────────────────────────────────────────────────────────────
 * وفق دليل مطور منصة خيال (khayal.mousa.ai)
 *
 * الميزات:
 * 1. توليد تصميم جديد (مع تكلفة حسب النوع)
 * 2. معرض التصاميم (تصاميم المستخدم السابقة)
 * 3. التعديل التدريجي (تعديل تصميم موجود بوصف إضافي)
 * 4. أنماط محددة مسبقاً (عصري، إسلامي، خليجي، معاصر)
 * 5. مشاركة التصاميم (رابط عام)
 * 6. تحميل بدقة عالية (4K URL)
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { getDb } from "./db";
import { architecturalDesigns } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { checkMousaBalance, deductMousaCredits, getMousaUserIdFromUser } from "./mousaCreditsService";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// الأنماط المحددة مسبقاً — وفق الدليل
// ═══════════════════════════════════════════════════════════════
export const DESIGN_STYLES = {
  modern: {
    label: "عصري",
    labelEn: "Modern Contemporary",
    description: "تصميم عصري نظيف بخطوط بسيطة وزجاج وفولاذ",
    prompt: "modern contemporary architecture, clean lines, glass and steel, minimalist design, open spaces, natural light",
    icon: "🏙️",
  },
  islamic: {
    label: "إسلامي",
    labelEn: "Islamic Architecture",
    description: "عمارة إسلامية بزخارف هندسية وأقواس وعناصر تراثية",
    prompt: "Islamic architecture with geometric patterns and arabesque details, mashrabiya screens, pointed arches, ornate tilework, traditional Islamic motifs",
    icon: "🕌",
  },
  gulf: {
    label: "خليجي",
    labelEn: "Gulf Architecture",
    description: "عمارة خليجية بعناصر سعودية وخليجية تقليدية",
    prompt: "Gulf architecture with traditional Saudi elements, wind towers, courtyard design, local stone and plaster, regional vernacular architecture",
    icon: "🏜️",
  },
  contemporary: {
    label: "معاصر",
    labelEn: "Contemporary Minimalist",
    description: "تصميم معاصر بسيط بمواد طبيعية وفضاءات مفتوحة",
    prompt: "contemporary minimalist design, natural materials, warm wood and stone, seamless indoor-outdoor connection, sustainable architecture",
    icon: "🌿",
  },
} as const;

export const DESIGN_TYPES = {
  exterior: {
    label: "واجهة خارجية",
    labelEn: "Exterior Facade",
    prompt: "exterior facade architectural render",
    cost: 35,
    icon: "🏛️",
  },
  interior: {
    label: "تصميم داخلي",
    labelEn: "Interior Design",
    prompt: "interior design render, photorealistic",
    cost: 35,
    icon: "🛋️",
  },
  floor_plan: {
    label: "مسقط أفقي",
    labelEn: "Floor Plan",
    prompt: "architectural floor plan drawing, top-down view, clean technical drawing",
    cost: 25,
    icon: "📐",
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// buildArabicPrompt — بناء prompt احترافي بالإنجليزية
// ═══════════════════════════════════════════════════════════════
export function buildArabicPrompt(input: {
  prompt: string;
  style: keyof typeof DESIGN_STYLES;
  type: keyof typeof DESIGN_TYPES;
  referenceImageUrl?: string;
}): string {
  const stylePrompt = DESIGN_STYLES[input.style]?.prompt || DESIGN_STYLES.modern.prompt;
  const typePrompt = DESIGN_TYPES[input.type]?.prompt || DESIGN_TYPES.exterior.prompt;

  const base = `${typePrompt}, ${stylePrompt}, ${input.prompt}, professional architectural visualization, high quality render, photorealistic, 8K resolution, dramatic lighting, ultra detailed`;

  if (input.referenceImageUrl) {
    return `${base}, maintain exact proportions and geometry from reference image, refined version with enhanced details`;
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════
// حساب تكلفة التصميم
// ═══════════════════════════════════════════════════════════════
function calculateCost(type: keyof typeof DESIGN_TYPES, hasReference: boolean): number {
  const baseCost = DESIGN_TYPES[type]?.cost || 35;
  return hasReference ? baseCost + 5 : baseCost; // +5 كريدت للتعديل بمرجع
}

// ═══════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════
export const designRouter = router({

  // ── الأنماط المتاحة ──────────────────────────────────────────
  getStyles: publicProcedure.query(() => {
    return Object.entries(DESIGN_STYLES).map(([key, val]) => ({
      id: key as keyof typeof DESIGN_STYLES,
      ...val,
    }));
  }),

  getTypes: publicProcedure.query(() => {
    return Object.entries(DESIGN_TYPES).map(([key, val]) => ({
      id: key as keyof typeof DESIGN_TYPES,
      ...val,
    }));
  }),

  // ── توليد تصميم جديد ─────────────────────────────────────────
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
      style: z.enum(["modern", "islamic", "gulf", "contemporary"]).default("modern"),
      type: z.enum(["exterior", "interior", "floor_plan"]).default("exterior"),
      referenceImageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: number }).id;
      const _mousaUserId_design = getMousaUserIdFromUser(ctx.user ?? null);
      const cost = calculateCost(input.type, !!input.referenceImageUrl);

      // 1. التحقق من الرصيد
      const balanceData = _mousaUserId_design ? await checkMousaBalance(_mousaUserId_design) : null;
      if (balanceData && balanceData.balance < cost) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `تحتاج ${cost} كريدت لتوليد هذا التصميم`,
        });
      }

      // 2. بناء الـ prompt
      const imagePrompt = buildArabicPrompt({
        prompt: input.prompt,
        style: input.style,
        type: input.type,
        referenceImageUrl: input.referenceImageUrl,
      });

      // 3. توليد الصورة
      const { url: tempImageUrl } = await generateImage({
        prompt: imagePrompt,
        originalImages: input.referenceImageUrl
          ? [{ url: input.referenceImageUrl, mimeType: "image/jpeg" }]
          : undefined,
      });

      // 4. حفظ الصورة في S3 (لا تعرض URL مؤقت مباشرةً)
      let permanentUrl = tempImageUrl;
      let imageKey: string | undefined;
      try {
        const imageResponse = await fetch(tempImageUrl as string);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        imageKey = `khayal/${userId}/${Date.now()}.jpg`;
        const { url } = await storagePut(imageKey, imageBuffer, "image/jpeg");
        permanentUrl = url;
      } catch (err) {
        console.error("[designRouter] S3 upload failed, using temp URL:", err);
        // استمر بالـ URL المؤقت إذا فشل الرفع
      }

      // 5. حفظ التصميم في قاعدة البيانات
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [design] = await db.insert(architecturalDesigns).values({
        userId: userId.toString(),
        prompt: input.prompt,
        style: input.style,
        type: input.type,
        imageUrl: permanentUrl,
        imageKey,
        referenceImageUrl: input.referenceImageUrl,
        creditsCost: cost,
      }).$returningId();

      // 6. خصم الكريدت
      if (_mousaUserId_design) {
        await deductMousaCredits(
          _mousaUserId_design,
          `تصميم ${DESIGN_TYPES[input.type as keyof typeof DESIGN_TYPES].label}: ${DESIGN_STYLES[input.style as keyof typeof DESIGN_STYLES].label}`,
          { amount: cost }
        );
      }

      // 7. جلب التصميم المحفوظ
      const [saved] = await db.select().from(architecturalDesigns).where(eq(architecturalDesigns.id, design.id));

      return saved;
    }),

  // ── معرض التصاميم (تصاميم المستخدم السابقة) ─────────────────
  getMyDesigns: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string | number }).id?.toString() || "";
      const db = await getDb();
      if (!db) return { designs: [], total: 0 };

      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const designs = await db
        .select()
        .from(architecturalDesigns)
        .where(eq(architecturalDesigns.userId, userId))
        .orderBy(desc(architecturalDesigns.createdAt))
        .limit(limit)
        .offset(offset);

      return { designs, total: designs.length };
    }),

  // ── التعديل التدريجي (تعديل تصميم موجود) ────────────────────
  refine: protectedProcedure
    .input(z.object({
      designId: z.number(),
      refinementPrompt: z.string().min(5, "وصف التعديل يجب أن يكون 5 أحرف على الأقل"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: number }).id;
      const _mousaUserId_refine = getMousaUserIdFromUser(ctx.user ?? null);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // جلب التصميم الأصلي
      const [original] = await db
        .select()
        .from(architecturalDesigns)
        .where(and(
          eq(architecturalDesigns.id, input.designId),
          eq(architecturalDesigns.userId, userId.toString())
        ));

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التصميم غير موجود" });
      }

      const cost = calculateCost(original.type, true);

      // التحقق من الرصيد
      const refineBalance = _mousaUserId_refine ? await checkMousaBalance(_mousaUserId_refine) : null;
      if (refineBalance && refineBalance.balance < cost) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `تحتاج ${cost} كريدت لتعديل هذا التصميم`,
        });
      }

      // بناء prompt التعديل
      const refinedPrompt = buildArabicPrompt({
        prompt: `${original.prompt}, ${input.refinementPrompt}`,
        style: original.style,
        type: original.type,
        referenceImageUrl: original.imageUrl,
      });

      // توليد الصورة المعدّلة
      const { url: tempImageUrl } = await generateImage({
        prompt: refinedPrompt,
        originalImages: [{ url: original.imageUrl, mimeType: "image/jpeg" }],
      });

      // حفظ في S3
      let permanentUrl = tempImageUrl;
      let imageKey: string | undefined;
      try {
        const imageResponse = await fetch(tempImageUrl as string);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        imageKey = `khayal/${userId}/${Date.now()}-refined.jpg`;
        const { url } = await storagePut(imageKey, imageBuffer, "image/jpeg");
        permanentUrl = url;
      } catch (err) {
        console.error("[designRouter] S3 upload failed:", err);
      }

      // حفظ التصميم المعدّل كتصميم جديد
      const [newDesign] = await db.insert(architecturalDesigns).values({
        userId: userId.toString(),
        prompt: `${original.prompt} — تعديل: ${input.refinementPrompt}`,
        style: original.style,
        type: original.type,
        imageUrl: permanentUrl,
        imageKey,
        referenceImageUrl: original.imageUrl,
        creditsCost: cost,
      }).$returningId();

      // خصم الكريدت
      if (_mousaUserId_refine) {
        await deductMousaCredits(
          _mousaUserId_refine,
          `تعديل تصميم: ${DESIGN_STYLES[original.style as keyof typeof DESIGN_STYLES]?.label || original.style}`,
          { amount: cost }
        );
      }

      const [saved] = await db.select().from(architecturalDesigns).where(eq(architecturalDesigns.id, newDesign.id));
      return saved;
    }),

  // ── مشاركة التصميم (رابط عام) ────────────────────────────────
  share: protectedProcedure
    .input(z.object({ designId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string | number }).id?.toString() || "";
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [design] = await db
        .select()
        .from(architecturalDesigns)
        .where(and(
          eq(architecturalDesigns.id, input.designId),
          eq(architecturalDesigns.userId, userId)
        ));

      if (!design) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التصميم غير موجود" });
      }

      // إذا كان لديه رمز مشاركة بالفعل، أعده
      if (design.shareToken) {
        return { shareToken: design.shareToken, shareUrl: `/design/${design.shareToken}` };
      }

      // إنشاء رمز مشاركة جديد
      const shareToken = crypto.randomBytes(16).toString("hex");

      await db
        .update(architecturalDesigns)
        .set({ shareToken, isPublic: 1 })
        .where(eq(architecturalDesigns.id, input.designId));

      return { shareToken, shareUrl: `/design/${shareToken}` };
    }),

  // ── جلب تصميم مشترك (عام) ────────────────────────────────────
  getSharedDesign: publicProcedure
    .input(z.object({ shareToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [design] = await db
        .select()
        .from(architecturalDesigns)
        .where(and(
          eq(architecturalDesigns.shareToken, input.shareToken),
          eq(architecturalDesigns.isPublic, 1)
        ));

      return design || null;
    }),

  // ── حذف تصميم ─────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ designId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string | number }).id?.toString() || "";
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .delete(architecturalDesigns)
        .where(and(
          eq(architecturalDesigns.id, input.designId),
          eq(architecturalDesigns.userId, userId)
        ));

      return { success: true };
    }),
});
