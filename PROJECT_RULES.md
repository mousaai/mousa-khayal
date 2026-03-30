# PROJECT_RULES.md — mousa.ai المرجعية الشاملة

> **هذا الملف هو Single Source of Truth للمشروع بأكمله.**
> يجب قراءته قبل أي تاسك جديد. آخر تحديث: 2026-03-23

> 🧠 **ابدأ بقراءة `MEMORY.md` أولاً** — يحتوي على ملخص الحالة الكاملة، القرارات الاستراتيجية، وآخر تحديثات المشروع.

---

## 1. هوية المشروع

**mousa.ai** — منظومة رقمية ذكية للبناء والعمران، تتكون من منصة رئيسية وخمس منصات فرعية متخصصة.

| الجانب | التفاصيل |
|---|---|
| الاسم التجاري | mousa.ai |
| الشعار | منظومة رقمية متكاملة للبناء والعمران |
| الجمهور المستهدف | المهندسون، المصممون، أصحاب المشاريع |
| اللغة الأساسية | العربية (RTL) |
| الدومين الرسمي | `www.mousa.ai` |
| نمط التصميم | Obsidian + Gold (أسود عميق + ذهبي) |
| الخط الرئيسي | IBM Plex Arabic |

---

## 2. الهيكل المعماري

```
mousa.ai (المنصة الرئيسية)
├── Auth & Credits (مركزي)
├── فضاء   FADA    → sarahdesign-umc8qbss.manus.space
├── رقابة  RAQABA  → khaledinspec-vbvhhdsv.manus.space
├── حرارة  HARARA  → thermabuild-x9xsnp5r.manus.space
├── مسكن   MASKAN  → famhousing-glcsxkkd.manus.space
└── كود    CODE    → archicodesa-wzq39rwg.manus.space
```

**المنصة الرئيسية** تتولى:
- إدارة حسابات المستخدمين (OAuth عبر Manus)
- نظام الكريدت (الشحن، الخصم، السجل)
- Token Handoff للمنصات الفرعية
- Credit Deduction API للمنصات الفرعية

---

## 3. روابط المنصات الفرعية (الصحيحة والمؤكدة)

> ⚠️ **تحذير:** رقابة وكود كانا مبدّلَين في النسخ السابقة. الروابط أدناه هي الصحيحة.

| المنصة | الاسم العربي | الرابط الصحيح | ملاحظة |
|---|---|---|---|
| fada | فضاء | `https://sarahdesign-umc8qbss.manus.space/` | التصميم الداخلي |
| **raqaba** | **رقابة** | **`https://khaledinspec-vbvhhdsv.manus.space/`** | الإشراف الميداني |
| harara | حرارة | `https://thermabuild-x9xsnp5r.manus.space/` | الكفاءة الطاقوية |
| maskan | مسكن | `https://famhousing-glcsxkkd.manus.space/` | الاحتياجات السكنية |
| **code** | **كود** | **`https://archicodesa-wzq39rwg.manus.space/`** | كودات البناء |

---

## 4. نظام الكريدت

### تكاليف المنصات

| المنصة | التكلفة (كريدت) |
|---|---|
| فضاء (fada) | 20 |
| رقابة (raqaba) | 30 |
| حرارة (harara) | 35 |
| مسكن (maskan) | 15 |
| كود (code) | 10 |

### باقات الشراء (Stripe)

| الباقة | الكريدت | السعر |
|---|---|---|
| starter | 500 | $9.99 |
| professional | 2000 | $29.99 |
| enterprise | 5000 | $59.99 |

### قواعد الكريدت
- كل مستخدم جديد يحصل على **200 كريدت مجاناً** عند التسجيل
- الخصم يتم مركزياً عبر المنصة الرئيسية فقط
- لا يمكن للمنصات الفرعية خصم كريدت مباشرة — يجب استخدام Credit API

---

## 5. بروتوكولات التكامل (مُنفَّذة)

### أ. Token Handoff ✅ (مُنفَّذ)

**الهدف:** تمرير هوية المستخدم للمنصة الفرعية تلقائياً دون إعادة تسجيل دخول.

**التدفق:**
```
المستخدم يضغط على بطاقة منصة
    ↓
trpc.platform.generateToken.mutate({ platform: "fada" })
    ↓
Server: ينشئ JWT مؤقت (5 دقائق) موقّع بـ JWT_SECRET
    ↓
يعيد: { token, platformUrl: "https://.../?token=JWT" }
    ↓
window.open(platformUrl, "_blank")
    ↓
المنصة الفرعية تستقبل ?token= وتتحقق منه عبر /api/platform/verify-token
```

**الـ tRPC Procedure:**
```ts
trpc.platform.generateToken.useMutation({
  onSuccess: (data) => window.open(data.platformUrl, "_blank"),
})
```

**REST Endpoint للمنصات الفرعية:**
```
POST /api/platform/verify-token
Headers: Authorization: Bearer <platform-api-key>
         X-Platform-ID: fada
Body: { token: "JWT_TOKEN" }
Response: { valid: true, userId, name, email, creditBalance, sufficient }
```

---

### ب. Credit Deduction API ✅ (مُنفَّذ)

**الهدف:** المنصات الفرعية تخصم كريدت من حساب المستخدم مركزياً.

**REST Endpoints:**

```
POST /api/platform/deduct-credits
Headers: Authorization: Bearer <platform-api-key>
         X-Platform-ID: raqaba
Body: { userId: 42, amount: 30, description: "تحليل موقع البناء" }
Response: { success: true, newBalance: 470, deducted: 30 }

Error (رصيد غير كافٍ):
Status: 402
{ error: "رصيد الكريدت غير كافٍ", currentBalance: 5, required: 30,
  upgradeUrl: "https://www.mousa.ai/pricing?ref=raqaba" }
```

```
GET /api/platform/check-balance?userId=42
Headers: Authorization: Bearer <platform-api-key>
         X-Platform-ID: harara
Response: { balance: 500, sufficient: true, platformCost: 35, upgradeUrl: "..." }
```

---

### ج. Upgrade Redirect ✅ (مُنفَّذ)

عند نفاد الكريدت في أي منصة فرعية، يُوجَّه المستخدم لـ:
```
https://www.mousa.ai/pricing?ref=<platform-id>&return=<encoded-url>
```

---

### د. Platform Info API ✅ (مُنفَّذ)

```
GET /api/platform/info
Response: { platforms: {...}, pricingUrl, dashboardUrl }
```

لا يحتاج مصادقة — للاستخدام العام.

---

## 6. مفاتيح API للمنصات الفرعية

> ⚠️ **للتطوير فقط.** في الإنتاج، يجب تعيين environment variables.

| المنصة | Environment Variable | القيمة الافتراضية (dev) |
|---|---|---|
| fada | `PLATFORM_API_KEY_FADA` | `dev-key-fada-mousa2024` |
| raqaba | `PLATFORM_API_KEY_RAQABA` | `dev-key-raqaba-mousa2024` |
| harara | `PLATFORM_API_KEY_HARARA` | `dev-key-harara-mousa2024` |
| maskan | `PLATFORM_API_KEY_MASKAN` | `dev-key-maskan-mousa2024` |
| code | `PLATFORM_API_KEY_CODE` | `dev-key-code-mousa2024` |

---

## 7. الملفات الرئيسية للتكامل

```
server/platformApi.ts      ← REST API للمنصات الفرعية (verify-token, deduct-credits, check-balance)
server/routers.ts          ← tRPC: platform.generateToken procedure
server/platformApi.test.ts ← Vitest tests (10 tests — all passing)
client/src/pages/Home.tsx  ← Token Handoff عند الضغط على بطاقات المنصات
client/src/pages/Dashboard.tsx ← Token Handoff في لوحة التحكم
```

---

## 8. قاعدة البيانات

### الجداول الموجودة

| الجدول | الغرض |
|---|---|
| `users` | المستخدمون (openId, name, email, role, stripeCustomerId) |
| `credit_wallets` | محافظ الكريدت (balance, totalEarned, totalSpent) |
| `credit_transactions` | سجل كل عمليات الكريدت |
| `ai_sessions` | جلسات AI (platform, title, creditsUsed, summary) |
| `ai_messages` | رسائل كل جلسة |
| `payments` | سجل مدفوعات Stripe |
| `user_project_profiles` | ملفات المشاريع المحفوظة لكل منصة |

### أنواع المعاملات في credit_transactions
- `welcome_bonus` — 200 كريدت عند التسجيل
- `purchase` — شراء عبر Stripe
- `usage` — استخدام منصة
- `admin_grant` — منحة إدارية
- `admin_deduct` — خصم إداري
- `refund` — استرداد

---

## 9. المتغيرات البيئية

### متغيرات النظام (محقونة تلقائياً)
```
DATABASE_URL            ← MySQL/TiDB
JWT_SECRET              ← لتوقيع session cookies وplatform tokens
VITE_APP_ID             ← Manus OAuth App ID
OAUTH_SERVER_URL        ← Manus OAuth backend
VITE_OAUTH_PORTAL_URL   ← Manus login portal
OWNER_OPEN_ID           ← openId صاحب المشروع (admin تلقائياً)
OWNER_NAME              ← اسم صاحب المشروع
BUILT_IN_FORGE_API_URL  ← Manus built-in APIs
BUILT_IN_FORGE_API_KEY  ← مفتاح server-side
STRIPE_SECRET_KEY       ← Stripe secret
STRIPE_WEBHOOK_SECRET   ← Stripe webhook
VITE_STRIPE_PUBLISHABLE_KEY ← Stripe public key
```

### متغيرات التكامل (يجب إضافتها للإنتاج)
```
PLATFORM_API_KEY_FADA    ← مفتاح API لمنصة فضاء
PLATFORM_API_KEY_RAQABA  ← مفتاح API لمنصة رقابة
PLATFORM_API_KEY_HARARA  ← مفتاح API لمنصة حرارة
PLATFORM_API_KEY_MASKAN  ← مفتاح API لمنصة مسكن
PLATFORM_API_KEY_CODE    ← مفتاح API لمنصة كود
```

---

## 10. بنية الملفات

```
mousa-ai/
├── client/src/
│   ├── pages/
│   │   ├── Home.tsx          ← الصفحة الرئيسية + Token Handoff
│   │   ├── Dashboard.tsx     ← لوحة تحكم المستخدم + Token Handoff
│   │   ├── Pricing.tsx       ← صفحة الأسعار + Stripe Checkout
│   │   ├── Admin.tsx         ← لوحة الإدارة (admin only)
│   │   ├── Terms.tsx         ← الشروط والأحكام
│   │   └── Privacy.tsx       ← سياسة الخصوصية
│   └── components/
│       ├── DiamondHero.tsx   ← Hero section الرئيسي
│       └── Navbar.tsx        ← شريط التنقل
├── server/
│   ├── platformApi.ts        ← REST API للمنصات الفرعية ⭐
│   ├── platformApi.test.ts   ← Tests (10 tests)
│   ├── routers.ts            ← tRPC procedures (platform.generateToken)
│   ├── db.ts                 ← Database helpers
│   ├── stripeHelper.ts       ← Stripe checkout
│   ├── stripeWebhook.ts      ← Stripe webhook handler
│   └── stripeProducts.ts     ← Credit packages definition
├── drizzle/schema.ts         ← Database schema
└── PROJECT_RULES.md          ← هذا الملف
```

---

## 11. قواعد التطوير الإلزامية

### قواعد عامة
1. **لا تعدّل** `server/_core/` إلا لأسباب بنيوية
2. **كل procedure جديدة** تحتاج test في `server/*.test.ts`
3. **الكريدت يُخصم مركزياً** فقط — لا تضف خصم في المنصات الفرعية مباشرة
4. **JWT_SECRET** يُستخدم لكل من session cookies وplatform tokens
5. **CORS مفعّل** على `/api/platform/*` لأن المنصات الفرعية على دومينات مختلفة

### قواعد الواجهة
1. **Token Handoff تلقائي** — عند الضغط على أي بطاقة منصة وهو مسجّل
2. **فتح في تبويب جديد** — `window.open(..., "_blank")`
3. **toast للأخطاء** — استخدم `toast.error()` من sonner
4. **RTL دائماً** — `dir="rtl"` على الـ containers الرئيسية

### قواعد الأمان
1. **Platform API Keys** لا تُعرض في الـ frontend أبداً
2. **Token Handoff** صلاحيته 5 دقائق فقط
3. **verify-token** يتحقق من `platform` field لمنع استخدام token منصة في منصة أخرى

---

## 12. Checklist للمنصات الفرعية

عند تطوير أي منصة فرعية، يجب:

### ما تحتاجه من المنصة الرئيسية
- [ ] **مفتاح API** — `PLATFORM_API_KEY_<NAME>` (اطلبه من صاحب المشروع)
- [ ] **معرّف المنصة** — أحد: `fada | raqaba | harara | maskan | code`

### ما يجب تنفيذه في المنصة الفرعية
- [ ] **استقبال ?token=** من URL عند التحميل
- [ ] **التحقق من Token** عبر `POST /api/platform/verify-token`
- [ ] **التحقق من الرصيد** قبل كل طلب AI عبر `GET /api/platform/check-balance`
- [ ] **خصم الكريدت** بعد نجاح طلب AI عبر `POST /api/platform/deduct-credits`
- [ ] **Upgrade Redirect** عند رصيد غير كافٍ: `https://www.mousa.ai/pricing?ref=<platform>`

### مثال كامل (JavaScript/TypeScript)

```typescript
const MOUSA_API = "https://www.mousa.ai";
const PLATFORM_ID = "raqaba"; // غيّر حسب المنصة
const API_KEY = process.env.PLATFORM_API_KEY_RAQABA;

// 1. عند تحميل الصفحة — استقبال Token Handoff
const urlToken = new URLSearchParams(window.location.search).get("token");
if (urlToken) {
  const res = await fetch(`${MOUSA_API}/api/platform/verify-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "X-Platform-ID": PLATFORM_ID,
    },
    body: JSON.stringify({ token: urlToken }),
  });
  const data = await res.json();
  if (data.valid) {
    // المستخدم موثّق — userId, name, email, creditBalance متاحة
    setUser({ id: data.userId, name: data.name, balance: data.creditBalance });
  }
}

// 2. قبل كل طلب AI — التحقق من الرصيد
const balanceRes = await fetch(
  `${MOUSA_API}/api/platform/check-balance?userId=${userId}`,
  { headers: { "Authorization": `Bearer ${API_KEY}`, "X-Platform-ID": PLATFORM_ID } }
);
const { sufficient, upgradeUrl } = await balanceRes.json();
if (!sufficient) {
  window.open(upgradeUrl, "_blank");
  return;
}

// 3. بعد نجاح طلب AI — خصم الكريدت
const deductRes = await fetch(`${MOUSA_API}/api/platform/deduct-credits`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
    "X-Platform-ID": PLATFORM_ID,
  },
  body: JSON.stringify({ userId, description: "تحليل موقع البناء" }),
});
const { newBalance } = await deductRes.json();
```

---

## 13. خارطة الطريق

### مُنجَز ✅
- [x] المنصة الرئيسية (Home, Dashboard, Pricing, Admin)
- [x] نظام الكريدت الكامل
- [x] Stripe Payment Integration
- [x] Token Handoff API
- [x] Credit Deduction API
- [x] إصلاح روابط المنصات الفرعية (رقابة/كود كانا مبدّلَين)
- [x] CORS للمنصات الفرعية
- [x] Vitest Tests (10 tests)

### قيد التطوير 🔄
- [ ] Memory & Session Enhancement (Phase 12)
- [ ] Admin Dashboard كامل (Phase 5)
- [ ] SEO meta tags (Phase 7)

### مستقبلي 📋
- [ ] تعيين مفاتيح API الإنتاجية للمنصات الفرعية
- [ ] Webhook من المنصات الفرعية للمنصة الرئيسية (إشعارات)
- [ ] Analytics dashboard للاستخدام عبر المنصات

---

## 14. سجل التغييرات

| التاريخ | التغيير |
|---|---|
| 2026-03-17 | إنشاء PROJECT_RULES.md الأولي |
| 2026-03-17 | إصلاح روابط رقابة/كود المبدّلة في App.tsx, Home.tsx, Dashboard.tsx |
| 2026-03-17 | بناء Token Handoff API (server/platformApi.ts + tRPC procedure) |
| 2026-03-17 | بناء Credit Deduction API (POST /api/platform/deduct-credits) |
| 2026-03-17 | بناء Balance Check API (GET /api/platform/check-balance) |
| 2026-03-17 | تفعيل Token Handoff في Home.tsx وDashboard.tsx |
| 2026-03-17 | إضافة 10 Vitest tests لـ Platform API |
| 2026-03-17 | تحديث PROJECT_RULES.md بكل التغييرات |
