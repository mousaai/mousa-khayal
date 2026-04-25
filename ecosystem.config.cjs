/**
 * ecosystem.config.cjs — إعدادات PM2 المحلية
 *
 * ⚠️ هذا الملف يحتوي على قيم placeholder فقط.
 * القيم الحقيقية تُكتب على السيرفر من GitHub Secrets عند كل deploy.
 * لا تضع قيماً حساسة حقيقية هنا — استخدم GitHub Secrets.
 *
 * للنشر اليدوي على السيرفر:
 *   pm2 delete khayal 2>/dev/null || true
 *   pm2 start ecosystem.config.cjs --only khayal
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "khayal",
      script: "./dist/index.js",
      cwd: "/var/www/mousa-khayal",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3007,
        EXTERNAL_URL: "https://khayal.mousa.ai",
        // القيم التالية تُكتب من GitHub Secrets عند كل deploy
        WEBHOOK_SECRET: "REPLACE_FROM_GITHUB_SECRETS",
        PLATFORM_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        JWT_SECRET: "REPLACE_FROM_GITHUB_SECRETS",
        DATABASE_URL: "REPLACE_FROM_GITHUB_SECRETS",
        MOUSA_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        OPENAI_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        GOOGLE_AI_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        REPLICATE_API_TOKEN: "REPLACE_FROM_GITHUB_SECRETS",
        ELEVENLABS_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        FISH_AUDIO_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        CLOUDFLARE_R2_ACCOUNT_ID: "REPLACE_FROM_GITHUB_SECRETS",
        CLOUDFLARE_R2_ACCESS_KEY_ID: "REPLACE_FROM_GITHUB_SECRETS",
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        CLOUDFLARE_R2_BUCKET_NAME: "REPLACE_FROM_GITHUB_SECRETS",
        CLOUDFLARE_R2_PUBLIC_URL: "REPLACE_FROM_GITHUB_SECRETS",
        VITE_APP_ID: "REPLACE_FROM_GITHUB_SECRETS",
        VITE_OAUTH_PORTAL_URL: "REPLACE_FROM_GITHUB_SECRETS",
        VITE_FRONTEND_FORGE_API_KEY: "REPLACE_FROM_GITHUB_SECRETS",
        VITE_FRONTEND_FORGE_API_URL: "REPLACE_FROM_GITHUB_SECRETS",
      },
      error_file: "/var/log/pm2/khayal-error.log",
      out_file: "/var/log/pm2/khayal-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
