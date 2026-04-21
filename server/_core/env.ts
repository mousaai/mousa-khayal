export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // OpenAI API Key — لتوليد الصور عبر DALL-E 3
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Google AI — مستقل عن مانوس
  googleAiKey: process.env.GOOGLE_AI_KEY ?? "",
  // Stability AI — توليد صور احترافية
  stabilityApiKey: process.env.STABILITY_API_KEY ?? "",
  // Cloudflare R2 — تخزين مستقل
  r2AccountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "",
  r2PublicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  runwayApiKey: process.env.RUNWAY_API_KEY ?? "",
  replicateApiToken: process.env.REPLICATE_API_TOKEN ?? "",
  // Mousa.ai platform integration — PLATFORM_API_KEY هو المفتاح الصحيح
  platformApiKey: process.env.PLATFORM_API_KEY ?? "",
  platformId: process.env.PLATFORM_ID ?? "khayal",
  mousaBaseUrl: process.env.MOUSA_BASE_URL ?? process.env.MOUSA_API_BASE ?? "https://www.mousa.ai",
  mousaWebhookSecret: process.env.MOUSA_WEBHOOK_SECRET ?? "",
  mousaCreditsPerSession: parseInt(process.env.MOUSA_CREDITS_PER_SESSION ?? "25", 10),
};
