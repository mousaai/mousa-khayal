export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Independent OpenAI-compatible API — takes priority over Manus Forge when set
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "",
  // Manus Forge (fallback when OPENAI_API_KEY is not set)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeWebhookSecretLive: process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? "",
  platformApiKeyFada: process.env.PLATFORM_API_KEY_FADA ?? "",
  platformApiKeyRaqaba: process.env.PLATFORM_API_KEY_RAQABA ?? "",
  platformApiKeyHarara: process.env.PLATFORM_API_KEY_HARARA ?? "",
  platformApiKeyMaskan: process.env.PLATFORM_API_KEY_MASKAN ?? "",
  platformApiKeyCode: process.env.PLATFORM_API_KEY_CODE ?? "",
  platformApiKeyKhayal: process.env.PLATFORM_API_KEY_KHAYAL ?? "",
};
