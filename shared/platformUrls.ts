/**
 * mousa.ai — Central Platform URLs Configuration
 * All sub-platform external links are defined here.
 * Update this file when platform URLs change.
 */

export const PLATFORM_URLS = {
  fada: "https://sarahdesign-umc8qbss.manus.space/",
  raqaba: "https://archicodesa-wzq39rwg.manus.space/",
  harara: "https://thermabuild-x9xsnp5r.manus.space/",
  maskan: "https://famhousing-glcsxkkd.manus.space/",
  code: "https://khaledinspec-vbvhhdsv.manus.space/",
} as const;

export type PlatformKey = keyof typeof PLATFORM_URLS;

export const PLATFORMS_CONFIG = [
  {
    id: "fada" as PlatformKey,
    name: "فضاء",
    nameEn: "FADA",
    tagline: "المستشار الذكي للديكور الداخلي",
    url: PLATFORM_URLS.fada,
  },
  {
    id: "raqaba" as PlatformKey,
    name: "رقابة",
    nameEn: "RAQABA",
    tagline: "المشرف الميداني الذكي",
    url: PLATFORM_URLS.raqaba,
  },
  {
    id: "harara" as PlatformKey,
    name: "حرارة",
    nameEn: "HARARA",
    tagline: "محلل الكفاءة الطاقوية",
    url: PLATFORM_URLS.harara,
  },
  {
    id: "maskan" as PlatformKey,
    name: "مسكن",
    nameEn: "MASKAN",
    tagline: "محلل الاحتياجات السكنية",
    url: PLATFORM_URLS.maskan,
  },
  {
    id: "code" as PlatformKey,
    name: "كود",
    nameEn: "CODE",
    tagline: "مرجع الكودات الهندسية",
    url: PLATFORM_URLS.code,
  },
] as const;
