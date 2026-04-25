# دليل النشر والإعداد — khayal.mousa.ai

> **ملاحظة أمنية:** هذا الملف يحتوي على مراجع للمتغيرات الحساسة. القيم الفعلية محفوظة في GitHub Secrets وعلى السيرفر فقط.

---

## معلومات السيرفر

| المعلومة | القيمة |
|---|---|
| **IP** | `204.168.191.251` |
| **المستخدم** | `root` |
| **كلمة المرور** | `Mousa@2030qol` |
| **مجلد المشروع** | `/var/www/mousa-khayal/` |
| **منفذ التطبيق** | `3007` |
| **Node.js** | `v22.22.2` |
| **PM2** | `v6.0.14` |
| **اسم PM2 Process** | `khayal` |

---

## إعداد nginx

الملف: `/etc/nginx/sites-available/mousa-subdomains`

```nginx
# khayal.mousa.ai → port 3007
server {
    listen 443 ssl;
    server_name khayal.mousa.ai;
    ssl_certificate /etc/letsencrypt/live/khayal.mousa.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/khayal.mousa.ai/privkey.pem;

    # خدمة الصور المرفوعة محلياً
    location /uploads/ {
        alias /var/www/mousa-khayal/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## متغيرات البيئة (ecosystem.config.cjs)

### ⚠️ قاعدة مهمة: استخدم دائماً `pm2 delete khayal && pm2 start ecosystem.config.cjs --only khayal` بدلاً من `pm2 restart` لضمان تطبيق المتغيرات الجديدة.

```javascript
module.exports = {
  apps: [{
    name: "khayal",
    script: "./dist/index.js",
    instances: 1,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3007,

      // ── قاعدة البيانات ──────────────────────────────────────
      // TiDB Cloud (MySQL compatible)
      DATABASE_URL: "mysql://...",  // ← من GitHub Secret: DATABASE_URL

      // ── المصادقة ────────────────────────────────────────────
      JWT_SECRET: "...",            // ← من GitHub Secret: JWT_SECRET

      // ── منصة mousa.ai ───────────────────────────────────────
      // PLATFORM_API_KEY: المفتاح الرئيسي للمنصة — يجب أن يكون 64 حرف hex
      // المفتاح الصحيح: 25b19f2d29338948cabbb46f136e4405511a1910989328d0c915ee9a76b523cf
      PLATFORM_API_KEY: "...",      // ← من GitHub Secret: PLATFORM_API_KEY
      MOUSA_API_KEY: "khayal@mousa30",
      MOUSA_BASE_URL: "https://www.mousa.ai",
      MOUSA_PLATFORM_ID: "khayal",
      WEBHOOK_SECRET: "...",        // ← من GitHub Secret: WEBHOOK_SECRET

      // ── توليد الصور ─────────────────────────────────────────
      OPENAI_API_KEY: "sk-proj-...", // ← من GitHub Secret: OPENAI_API_KEY
      GOOGLE_AI_KEY: "AIzaSy...",    // ← من GitHub Secret: GOOGLE_AI_KEY
      REPLICATE_API_TOKEN: "r8_...", // ← من GitHub Secret: REPLICATE_API_TOKEN

      // ── Cloudflare R2 (تخزين الصور) ─────────────────────────
      // ⚠️ ملاحظة: R2 API قد يفشل من بعض IPs بسبب TLS handshake
      // الـ fallback: تخزين محلي في /var/www/mousa-khayal/uploads/
      CLOUDFLARE_R2_ACCOUNT_ID: "7be657d30f13aa149c3d96198dbcd9be",
      CLOUDFLARE_R2_BUCKET_NAME: "khayal-images",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "...",    // ← من GitHub Secret
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "...", // ← من GitHub Secret
      CLOUDFLARE_R2_PUBLIC_URL: "https://pub-e920f6673856499dbfce9032856b54ef.r2.dev",
    }
  }]
};
```

---

## GitHub Secrets المُضافة

الـ Secrets التالية مُضافة على: `https://github.com/[repo]/settings/secrets/actions`

| Secret | الوصف |
|---|---|
| `DATABASE_URL` | TiDB Cloud connection string |
| `JWT_SECRET` | مفتاح تشفير الجلسات |
| `PLATFORM_API_KEY` | مفتاح منصة khayal في mousa.ai (64 حرف hex) |
| `MOUSA_API_KEY` | `khayal@mousa30` |
| `WEBHOOK_SECRET` | مفتاح التحقق من Webhooks |
| `OPENAI_API_KEY` | مفتاح OpenAI (DALL-E 3) |
| `GOOGLE_AI_KEY` | مفتاح Google Gemini |
| `REPLICATE_API_TOKEN` | مفتاح Replicate (Flux) |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 Access Key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 Secret Key |
| `SSH_HOST` | `204.168.191.251` |
| `SSH_USER` | `root` |
| `SSH_PASSWORD` | كلمة مرور SSH |

---

## إجراءات النشر

### نشر يدوي (عند تعديل الكود محلياً)

```bash
# 1. بناء المشروع
cd /home/ubuntu/tashkila-3d-walkthrough
pnpm build

# 2. ضغط dist
tar czf /tmp/dist.tar.gz dist/

# 3. رفع للسيرفر
sshpass -p 'Mousa@2030qol' scp -o StrictHostKeyChecking=no \
  /tmp/dist.tar.gz root@204.168.191.251:/tmp/

# 4. فك الضغط وإعادة التشغيل على السيرفر
sshpass -p 'Mousa@2030qol' ssh -o StrictHostKeyChecking=no root@204.168.191.251 "
  cd /var/www/mousa-khayal &&
  tar xzf /tmp/dist.tar.gz &&
  pm2 delete khayal &&
  pm2 start ecosystem.config.cjs --only khayal &&
  pm2 save
"
```

### نشر تلقائي (GitHub Actions)

Push لـ `main` branch يُشغّل `.github/workflows/deploy.yml` تلقائياً.

---

## تشخيص المشاكل الشائعة

### 1. `PLATFORM_API_KEY` يُعطي 401

**السبب:** PM2 يحتفظ بالمتغيرات القديمة حتى بعد `pm2 restart --update-env`.

**الحل:**
```bash
cd /var/www/mousa-khayal
pm2 delete khayal
pm2 start ecosystem.config.cjs --only khayal
pm2 save
```

**تحقق:** `pm2 env [id] | grep PLATFORM_API_KEY` — يجب أن يكون 64 حرف hex.

---

### 2. `Database: Access denied`

**السبب:** `DATABASE_URL` في PM2 يختلف عن القيمة في `ecosystem.config.cjs`.

**الحل:** نفس الحل أعلاه (delete + start).

**تحقق:** `pm2 env [id] | grep DATABASE_URL`

---

### 3. R2 TLS Handshake Failure

**السبب:** Cloudflare R2 API يرفض الاتصال من IP السيرفر (`204.168.191.251`).

**الحل التلقائي:** الكود يستخدم Local Storage كـ fallback — الصور تُحفظ في `/var/www/mousa-khayal/uploads/` وتُخدَّم عبر nginx على `/uploads/`.

**للتحقق من الـ fallback يعمل:**
```bash
ls /var/www/mousa-khayal/uploads/
curl https://khayal.mousa.ai/uploads/test.jpg
```

---

### 4. `REPLICATE_API_TOKEN not configured`

**السبب:** المتغير موجود في ecosystem.config.cjs لكن PM2 يقرأ قيمة قديمة.

**الحل:** delete + start (نفس الحل أعلاه).

---

### 5. `BUILT_IN_FORGE_API_URL not configured`

**السبب:** هذا المتغير خاص بـ Manus platform ولا يمكن الحصول عليه خارجها.

**الحل:** الكود يستخدم `OPENAI_API_KEY` كـ fallback تلقائياً للـ LLM.

---

## Cloudflare R2 — معلومات الـ Bucket

| المعلومة | القيمة |
|---|---|
| **Account ID** | `7be657d30f13aa149c3d96198dbcd9be` |
| **Bucket Name** | `khayal-images` |
| **Region** | Eastern Europe (EEUR) |
| **Public URL** | `https://pub-e920f6673856499dbfce9032856b54ef.r2.dev` |
| **S3 Endpoint** | `https://7be657d30f13aa149c3d96198dbcd9be.r2.cloudflarestorage.com` |

---

## هيكل المشروع على السيرفر

```
/var/www/mousa-khayal/
├── dist/                    ← الكود المبني (لا تعدّله يدوياً)
│   ├── index.js             ← السيرفر
│   └── public/              ← الـ frontend المبني
├── uploads/                 ← الصور المرفوعة (fallback من R2)
├── ecosystem.config.cjs     ← إعدادات PM2 والمتغيرات
├── package.json
└── node_modules/
```

---

## أوامر PM2 المفيدة

```bash
# عرض حالة جميع التطبيقات
pm2 list

# عرض logs khayal
pm2 logs khayal --lines 50

# عرض متغيرات البيئة
pm2 env [process_id]

# إعادة تشغيل صحيحة (تُطبّق المتغيرات الجديدة)
pm2 delete khayal && pm2 start ecosystem.config.cjs --only khayal && pm2 save

# حفظ قائمة العمليات (لإعادة التشغيل بعد reboot)
pm2 save
pm2 startup  # لتشغيل PM2 تلقائياً عند بدء النظام
```
