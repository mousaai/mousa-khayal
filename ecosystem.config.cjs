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
        WEBHOOK_SECRET: "816350e1619ed3ad26351ebfcfc3c65f9ba22929941767e4bbaa9f16b5cdeca7",
        EXTERNAL_URL: "https://khayal.mousa.ai",
      },
      error_file: "/var/log/pm2/khayal-error.log",
      out_file: "/var/log/pm2/khayal-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
