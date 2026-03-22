/**
 * developerRouter.ts — بيانات صفحة المطور
 * يوفر معلومات التكامل مع Mousa.ai والتسعيرة
 */
import { publicProcedure, router } from "./_core/trpc";
import { getCreditsPerSession, isMousaEnabled } from "./mousaCreditsService";

// التسعيرة المتدرجة المقترحة حسب نوع الجلسة
export const PRICING_TIERS = [
  {
    id: "scene",
    nameAr: "مشهد واحد",
    nameEn: "Single Scene",
    descAr: "توليد 3–8 صور سينمائية لمشهد واحد",
    cost: 30,
    unit: "كريدت/جلسة",
    features: ["3–8 صور عالية الجودة", "تحليل وصف ذكي", "دعم صور مرجعية"],
  },
  {
    id: "film_short",
    nameAr: "فيلم قصير",
    nameEn: "Short Film",
    descAr: "فيلم مدته 15–60 ثانية (3–12 مشهد)",
    cost: 50,
    unit: "كريدت/جلسة",
    features: ["3–12 مشهد متتابع", "موسيقى تصويرية", "تعليق صوتي AI"],
    recommended: true,
  },
  {
    id: "film_long",
    nameAr: "فيلم طويل",
    nameEn: "Long Film",
    descAr: "فيلم مدته 1–5 دقائق (12–37 مشهد)",
    cost: 100,
    unit: "كريدت/جلسة",
    features: ["12–37 مشهد", "توليد على دفعات", "جودة إنتاجية عالية"],
  },
  {
    id: "film_epic",
    nameAr: "فيلم ملحمي",
    nameEn: "Epic Film",
    descAr: "فيلم مدته 5–30 دقيقة (37+ مشهد)",
    cost: 200,
    unit: "كريدت/جلسة",
    features: ["37+ مشهد", "معالجة موزعة", "جودة سينمائية احترافية"],
  },
];

export const developerRouter = router({
  // بيانات التكامل الكاملة مع Mousa.ai
  getPlatformInfo: publicProcedure.query(async () => {
    const costPerSession = getCreditsPerSession();
    const enabled = isMousaEnabled();

    // جلب بيانات المنصة من Mousa.ai
    let platformData: any = null;
    try {
      const res = await fetch(`${process.env.MOUSA_BASE_URL ?? "https://www.mousa.ai"}/api/platform/info`, {
        headers: {
          Authorization: `Bearer ${process.env.MOUSA_API_KEY ?? ""}`,
          "X-Platform-ID": process.env.MOUSA_PLATFORM_ID ?? "khayal",
        },
      });
      if (res.ok) {
        const data = await res.json();
        platformData = data?.platforms ?? null;
      }
    } catch (err) {
      console.error("[developerRouter] Failed to fetch platform info:", err);
    }

    const khayalPlatform = platformData?.khayal ?? null;

    return {
      // بيانات التكامل
      integration: {
        enabled,
        platformId: process.env.MOUSA_PLATFORM_ID ?? "khayal",
        baseUrl: process.env.MOUSA_BASE_URL ?? "https://www.mousa.ai",
        platformUrl: "https://khayal.mousa.ai",
        upgradeUrl: "https://www.mousa.ai/pricing?ref=khayal",
        dashboardUrl: "https://www.mousa.ai/dashboard",
      },
      // التسعيرة الحالية
      currentPricing: {
        costPerSession,
        registeredCost: khayalPlatform?.cost ?? null,
        registeredUrl: khayalPlatform?.url ?? null,
        isInSync: khayalPlatform?.cost === costPerSession,
        needsUpdate: khayalPlatform?.url !== "https://khayal.mousa.ai/",
      },
      // التسعيرة المقترحة
      proposedPricing: PRICING_TIERS,
      // جميع المنصات للمقارنة
      allPlatforms: platformData
        ? Object.entries(platformData).map(([id, v]: [string, any]) => ({
            id,
            nameAr: v.nameAr,
            nameEn: v.nameEn,
            cost: v.cost,
            url: v.url,
            isKhayal: id === "khayal",
          }))
        : [],
    };
  }),
});
