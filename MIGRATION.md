# دليل نشر منصة خيال على سيرفر موسى

## نظرة عامة

هذا الدليل يشرح نقل منصة خيال من Manus إلى سيرفر موسى المستقل باستخدام PM2 على المنفذ 3007.

**الحالة الحالية:**
- المنصة في **FREE_MODE** — كل زائر يحصل على رصيد غير محدود بدون تسجيل دخول
- مفتاح Runway ML جاهز مع 5,000 credits
- لا حاجة لأي مصادقة Mousa.ai

---

## متطلبات السيرفر

| المتطلب | الإصدار |
|---------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| PM2 | آخر إصدار |
| MySQL | 8.0+ |
| Nginx | 1.24+ |

---

## خطوات النشر

### الخطوة 1: رفع الملفات

```bash
# على جهازك المحلي — ارفع الحزمة إلى السيرفر
scp khayal-deploy.zip user@YOUR_SERVER:/var/www/

# على السيرفر
cd /var/www/
unzip khayal-deploy.zip -d mousa-khayal
cd mousa-khayal
```

### الخطوة 2: إعداد متغيرات البيئة

```bash
# انسخ ملف البيئة
cp env.example.txt .env

# عبّئ القيم المطلوبة
nano .env
```

**القيم الإلزامية في .env:**

```bash
DATABASE_URL=mysql://khayal:YOUR_DB_PASS@localhost:3306/khayal
JWT_SECRET=YOUR_64_CHAR_HEX  # openssl rand -hex 64
OPENAI_API_KEY=sk-YOUR_KEY
RUNWAY_API_KEY=key_24a1b54e6a4297451f547c50026aa7eaef4fd04833cbb87ae828bdf0f0c2c008ca88f7f4219adbe39e8e8303bae5726c92c114fa0f19e91077054b7a751ac916
ELEVENLABS_API_KEY=YOUR_KEY
CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_KEY
CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_KEY
CLOUDFLARE_R2_ACCOUNT_ID=YOUR_ID
CLOUDFLARE_R2_BUCKET_NAME=khayal-storage
PORT=3007
NODE_ENV=production
```

### الخطوة 3: إنشاء قاعدة البيانات

```bash
# أنشئ قاعدة البيانات في MySQL
mysql -u root -p -e "
  CREATE DATABASE IF NOT EXISTS khayal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'khayal'@'localhost' IDENTIFIED BY 'YOUR_DB_PASS';
  GRANT ALL PRIVILEGES ON khayal.* TO 'khayal'@'localhost';
  FLUSH PRIVILEGES;
"
```

### الخطوة 4: تثبيت الحزم وبناء المشروع

```bash
cd /var/www/mousa-khayal

# تثبيت الحزم (--unsafe-perm مهم لـ sharp وpdfkit)
pnpm install --unsafe-perm

# تطبيق مخطط قاعدة البيانات
pnpm db:push

# بناء المشروع للإنتاج
pnpm build
```

### الخطوة 5: تشغيل المنصة بـ PM2

```bash
# تثبيت PM2 إذا لم يكن موجوداً
npm install -g pm2

# تشغيل المنصة
pm2 start ecosystem.config.cjs

# حفظ إعدادات PM2 لإعادة التشغيل التلقائي
pm2 save
pm2 startup

# التحقق من الحالة
pm2 status
pm2 logs khayal --lines 50
```

### الخطوة 6: إعداد Nginx

```bash
# انسخ إعداد Nginx
sudo cp nginx.conf /etc/nginx/sites-available/khayal
sudo ln -s /etc/nginx/sites-available/khayal /etc/nginx/sites-enabled/

# تعديل المنفذ في nginx.conf
# تأكد من أن proxy_pass يشير إلى http://localhost:3007
sudo nano /etc/nginx/sites-available/khayal
```

**إعداد Nginx للسيرفر المستقل (بدون Docker):**

```nginx
server {
    listen 80;
    server_name khayal.mousa.ai;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name khayal.mousa.ai;

    ssl_certificate /etc/letsencrypt/live/khayal.mousa.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/khayal.mousa.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# اختبار وإعادة تشغيل Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### الخطوة 7: SSL (إذا لم يكن موجوداً)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d khayal.mousa.ai
```

### الخطوة 8: التحقق من عمل المنصة

```bash
# فحص الصحة
curl http://localhost:3007/api/health

# أو من الإنترنت
curl https://khayal.mousa.ai/api/health

# مراقبة السجلات
pm2 logs khayal --lines 100
```

---

## أوامر PM2 المفيدة

```bash
pm2 status              # حالة جميع العمليات
pm2 restart khayal      # إعادة تشغيل خيال
pm2 stop khayal         # إيقاف خيال
pm2 logs khayal         # عرض السجلات
pm2 monit               # مراقبة مباشرة
pm2 reload khayal       # إعادة تشغيل بدون downtime
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `502 Bad Gateway` | `pm2 status` — تأكد أن khayal يعمل على port 3007 |
| `Cannot connect to database` | تحقق من `DATABASE_URL` في `.env` |
| `sharp: Installation failed` | `pnpm install --unsafe-perm` |
| `pdfkit: postinstall failed` | تأكد من وجود `.npmrc` مع `enable-pre-post-scripts=true` |
| `Module not found` | `pnpm install --no-frozen-lockfile` |
| الصفحة تحمّل لكن الـ API لا يعمل | تأكد أن `PORT=3007` في `.env` |

---

## نقاط التبعية على Manus

المنصة تعتمد حالياً على Manus Forge API لـ:

| الخدمة | الملف | البديل المستقل |
|--------|-------|----------------|
| LLM (Gemini/GPT) | `server/_core/llm.ts` | OpenAI API مباشرة |
| توليد الصور | `server/_core/imageGeneration.ts` | OpenAI DALL-E 3 |
| التخزين (S3) | `server/storage.ts` | Cloudflare R2 (جاهز) |

**ملاحظة:** إذا لم تُعدَّ `BUILT_IN_FORGE_API_KEY` على السيرفر المستقل، ستفشل عمليات LLM وتوليد الصور. راجع قسم "استبدال Manus Forge APIs" أدناه.

---

## استبدال Manus Forge APIs (للاستقلال الكامل)

### استبدال LLM

افتح `server/_core/llm.ts` وغيّر:

```typescript
// قبل (Manus Forge)
const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

// بعد (OpenAI مباشرة)
const resolveApiUrl = () => "https://api.openai.com/v1/chat/completions";
```

وغيّر المفتاح والنموذج:

```typescript
// المفتاح
authorization: `Bearer ${process.env.OPENAI_API_KEY}`,

// النموذج
model: "gpt-4o",
```

### استبدال توليد الصور

افتح `server/_core/imageGeneration.ts` واستبدل المحتوى:

```typescript
import OpenAI from "openai";
import { storagePut } from "../storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(options: { prompt: string; originalImages?: { url: string }[] }) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: options.prompt,
    size: "1024x1024",
    quality: "standard",
    response_format: "b64_json",
  });
  const b64 = response.data[0].b64_json!;
  const buffer = Buffer.from(b64, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
  return { url };
}
```

---

## الحالة الحالية للمنصة

| الميزة | الحالة |
|--------|--------|
| FREE_MODE | مفعّل — كل زائر بدون قيود |
| Runway ML | جاهز — 5,000 credits |
| ElevenLabs | يحتاج مفتاح |
| نظام الكريدت | معطّل (FREE_MODE) |
| تسجيل الدخول | غير مطلوب |

**لإعادة تفعيل نظام الكريدت:** غيّر `FREE_MODE = false` في `client/src/components/AuthGate.tsx`

---

*آخر تحديث: أبريل 2026*
