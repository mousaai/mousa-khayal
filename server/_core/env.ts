export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Manus built-in (fallback إذا لم تتوفر مفاتيح مستقلة)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // ─── مفاتيح مستقلة عن Manus ───────────────────────────────────────────────
  // LLM: OpenAI (GPT-4o-mini افتراضياً، GPT-4o للمعقد)
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // توليد الصور: Replicate Flux Schnell ($0.003/صورة)
  replicateApiToken: process.env.REPLICATE_API_TOKEN ?? "",
  // التخزين: Cloudflare R2 (مجاني حتى 10GB + بدون رسوم نقل)
  cloudflareR2AccountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? "",
  cloudflareR2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
  cloudflareR2SecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  cloudflareR2BucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "",
  cloudflareR2PublicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "",
  // ─── الخدمات الخارجية الأخرى ───────────────────────────────────────────────
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  runwayApiKey: process.env.RUNWAY_API_KEY ?? "",
};
