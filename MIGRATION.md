# دليل هجرة منصة خيال من Manus إلى بيئة مستقلة

## نظرة عامة

منصة خيال مبنية حالياً على Manus وتعتمد على خدمات داخلية (Forge APIs) لتشغيل الذكاء الاصطناعي. هذا الدليل يشرح كيفية نقل المنصة إلى خادم مستقل مع الاحتفاظ بكل الوظائف.

---

## نقاط التبعية على Manus

| الخدمة | الملف | البديل المستقل |
|--------|-------|----------------|
| LLM (Gemini/GPT) | `server/_core/llm.ts` | OpenAI API مباشرة |
| توليد الصور | `server/_core/imageGeneration.ts` | OpenAI DALL-E 3 أو Replicate |
| قاعدة البيانات | `DATABASE_URL` | MySQL / TiDB Cloud |
| التخزين (S3) | `server/storage.ts` | Cloudflare R2 أو AWS S3 |
| المصادقة | Mousa.ai OAuth | Mousa.ai (لا تتغير) |
| الإشعارات | `server/_core/notification.ts` | Webhook مباشر |

---

## خطوات الهجرة

### الخطوة 1: تجهيز الخادم

```bash
# متطلبات الخادم
# - Ubuntu 22.04 LTS
# - Docker + Docker Compose
# - 4 GB RAM كحد أدنى
# - 20 GB تخزين

# تثبيت Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### الخطوة 2: استنساخ الكود

```bash
git clone https://github.com/YOUR_ORG/tashkila-3d-walkthrough.git
cd tashkila-3d-walkthrough
```

### الخطوة 3: إعداد متغيرات البيئة

```bash
cp env.example.txt .env
# عبّئ القيم في .env (راجع قسم "المتغيرات المطلوبة" أدناه)
nano .env
```

### الخطوة 4: استبدال Manus Forge APIs

#### 4.1 استبدال LLM

افتح `server/_core/llm.ts` وغيّر:

```typescript
// قبل الهجرة (Manus Forge)
const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

// بعد الهجرة (OpenAI مباشرة)
const resolveApiUrl = () => "https://api.openai.com/v1/chat/completions";
```

وغيّر المفتاح:

```typescript
// قبل
authorization: `Bearer ${ENV.forgeApiKey}`,

// بعد
authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
```

وغيّر النموذج:

```typescript
// قبل
model: "gemini-2.5-flash",

// بعد
model: "gpt-4o",
```

#### 4.2 استبدال توليد الصور

افتح `server/_core/imageGeneration.ts` واستبدل المحتوى بـ:

```typescript
import OpenAI from "openai";
import { storagePut } from "server/storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(options: GenerateImageOptions) {
  if (options.originalImages && options.originalImages.length > 0) {
    // تعديل صورة موجودة
    const response = await openai.images.edit({
      image: await fetch(options.originalImages[0].url!).then(r => r.blob()),
      prompt: options.prompt,
      model: "dall-e-2",
      size: "1024x1024",
    });
    const imageUrl = response.data[0].url!;
    const buffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const { url } = await storagePut(`generated/${Date.now()}.png`, Buffer.from(buffer), "image/png");
    return { url };
  } else {
    // توليد صورة جديدة
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
}
```

تثبيت الحزمة:

```bash
pnpm add openai
```

#### 4.3 استبدال الإشعارات

افتح `server/_core/notification.ts` وغيّر `notifyOwner` لإرسال webhook مباشر أو بريد إلكتروني:

```typescript
export async function notifyOwner({ title, content }: { title: string; content: string }) {
  // مثال: إرسال إلى Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `*${title}*\n${content}` }),
    });
  }
  return true;
}
```

### الخطوة 5: تشغيل قاعدة البيانات وتطبيق المخطط

```bash
# تشغيل MySQL فقط أولاً
docker compose up mysql -d

# انتظر حتى تصبح جاهزة
docker compose ps

# تطبيق مخطط قاعدة البيانات
pnpm install
pnpm db:push
```

### الخطوة 6: بناء وتشغيل التطبيق

```bash
# بناء وتشغيل كل الخدمات
docker compose up -d --build

# التحقق من السجلات
docker compose logs -f khayal
```

### الخطوة 7: إعداد SSL (للإنتاج)

```bash
# تثبيت Certbot
sudo apt install certbot

# الحصول على شهادة SSL
sudo certbot certonly --standalone -d khayal.mousa.ai

# نسخ الشهادات
sudo cp /etc/letsencrypt/live/khayal.mousa.ai/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/khayal.mousa.ai/privkey.pem ./ssl/

# تشغيل Nginx
docker compose --profile production up -d nginx
```

### الخطوة 8: التحقق من عمل المنصة

```bash
# فحص الصحة
curl https://khayal.mousa.ai/api/health

# فحص قاعدة البيانات
docker compose exec mysql mysql -u khayal -pkhayal_pass_2026 khayal -e "SHOW TABLES;"
```

---

## المتغيرات المطلوبة

| المتغير | المصدر | ملاحظة |
|---------|--------|--------|
| `DATABASE_URL` | خادمك | `mysql://user:pass@host:3306/khayal` |
| `JWT_SECRET` | `openssl rand -hex 64` | سري — لا تشاركه |
| `OPENAI_API_KEY` | platform.openai.com | لـ LLM وتوليد الصور |
| `RUNWAY_API_KEY` | app.runwayml.com | لتوليد الفيديو |
| `REPLICATE_API_TOKEN` | replicate.com | بديل لتوليد الصور |
| `ELEVENLABS_API_KEY` | elevenlabs.io | للتعليق الصوتي |
| `MOUSA_API_KEY` | mousa.ai | لنظام الكريدت |
| `MOUSA_PLATFORM_ID` | mousa.ai | معرّف منصتك |
| `CLOUDFLARE_R2_*` | Cloudflare Dashboard | للتخزين السحابي |
| `VITE_APP_ID` | mousa.ai | لـ OAuth |

---

## هجرة البيانات

```bash
# تصدير البيانات من Manus (قبل الهجرة)
# استخدم لوحة قاعدة البيانات في Manus لتصدير CSV أو SQL dump

# استيراد البيانات في الخادم الجديد
docker compose exec -T mysql mysql -u khayal -pkhayal_pass_2026 khayal < backup.sql
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `Cannot connect to database` | تحقق من `DATABASE_URL` وأن MySQL تعمل |
| `OPENAI_API_KEY is not configured` | أضف المفتاح في `.env` |
| `Patch failed` | شغّل `pnpm install --no-frozen-lockfile` |
| `Port 3000 already in use` | `docker compose down` ثم أعد التشغيل |
| شاشة "حدث خطأ غير متوقع" | تحقق من `docker compose logs khayal` |

---

## ملاحظات مهمة

- **Mousa.ai OAuth**: لا يتغير — المصادقة تعمل بنفس الطريقة بعد الهجرة
- **Cloudflare R2**: متوافق مع AWS S3 API — `server/storage.ts` يعمل بدون تعديل
- **wouter patch**: الـ patch مُضمَّن في المشروع ويُطبَّق تلقائياً عند `pnpm install`
- **pnpm-lock.yaml**: لا تحذفه — يضمن تطابق الإصدارات مع الـ patch

---

*آخر تحديث: أبريل 2026*
