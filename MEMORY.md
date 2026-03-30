# 🧠 MEMORY.md — ذاكرة mousa.ai الدائمة
> **اقرأ هذا الملف أولاً في كل جلسة جديدة قبل أي عمل.**
> آخر تحديث: 23 مارس 2026 — إضافة خارطة الطريق للاستقلالية التقنية

---

## ⚡ ملخص الجلسة الأخيرة (23 مارس 2026)

**ما تم إنجازه:**
- إنشاء بريزنتيشن خارطة الطريق الكاملة للاستقلالية التقنية (14 شريحة)
- توثيق خارطة الطريق في MEMORY.md (القسم 13 الجديد)

**الوضع الحالي للمنصة:**
- ⛔ جميع المنصات موقوفة بسبب نفاد رصيد Manus (0 كريدت)
- ✅ الكود كامل ويعمل — المشكلة فقط في الفاتورة
- 🔑 الخطوة الفورية المطلوبة: شراء إضافة كريدت Manus (AED 79.99 لـ 2,000 كريدت)

---

## 1. هوية المشروع والمالك

| البند | التفاصيل |
|---|---|
| **اسم المشروع** | mousa.ai — المنظومة الرقمية الذكية للبناء والعمران |
| **الدومين الرسمي** | `www.mousa.ai` |
| **المالك** | صاحب المشروع (OWNER_OPEN_ID في env) — يُعامَل دائماً كـ admin |
| **اللغة الأساسية** | العربية (RTL) — مع دعم EN, UR, FR |
| **نمط التصميم** | Obsidian + Gold (أسود عميق #080E1A + ذهبي #D4A017) |
| **الخط الرئيسي** | IBM Plex Arabic |
| **المسار في السيرفر** | `/home/ubuntu/mousa-ai` |
| **Dev Server** | `https://3000-ierj5fdbuu8bkisnyy28w-4e740894.sg1.manus.computer` |
| **الموقع المنشور** | `https://www.mousa.ai` |

---

## 2. المنصات الفرعية الست — الروابط الصحيحة المؤكدة

> ⚠️ **هذه الروابط مُضبوطة في الكود وتعمل فعلاً عبر DNS:**

| المنصة | الاسم | الرابط الفعلي | حالة DNS |
|---|---|---|---|
| fada | فضاء — التصميم الداخلي | `https://fada.mousa.ai/` | ✅ يعمل |
| raqaba | رقابة — الإشراف الميداني | `https://raqaba.mousa.ai/` | ✅ يعمل |
| harara | حرارة — الكفاءة الطاقوية | `https://harara.mousa.ai/` | ✅ يعمل |
| maskan | مسكن — الاحتياجات السكنية | `https://maskan.mousa.ai/` | ⚠️ SSL يحتاج ربط يدوي في Manus Settings |
| code | كود — كودات البناء | `https://code.mousa.ai/` | ✅ يعمل |
| khayal | خيال — مولد المرئيات 3D | `https://khayal.mousa.ai/` | ✅ يعمل |

**ملاحظة:** الروابط الفعلية على Manus هي:
- fada → `sarahdesign-umc8qbss.manus.space`
- raqaba → `khaledinspec-vbvhhdsv.manus.space`
- harara → `thermabuild-x9xsnp5r.manus.space`
- maskan → `famhousing-glcsxkkd.manus.space`
- code → `archicodesa-wzq39rwg.manus.space`
- khayal → `tashkila3d-bxekpajg.manus.space`

---

## 3. نظام الكريدت

| المعلومة | القيمة |
|---|---|
| كريدت ترحيبي | 200 كريدت مجاناً لكل مستخدم جديد |
| سعر الكريدت | $0.02 USD |
| تكلفة فضاء | 20 كريدت (ديناميكي من DB) |
| تكلفة رقابة | 30 كريدت |
| تكلفة حرارة | 35 كريدت |
| تكلفة مسكن | 15 كريدت |
| تكلفة كود | 10 كريدت |
| تكلفة خيال | 25 كريدت |
| تكلفة ثاني الذكي (widget) | 5 كريدت/رسالة |

### باقات الشراء (Stripe — بالدولار)
| الباقة | الكريدت | السعر |
|---|---|---|
| Starter | 500 | $9.99 |
| Professional | 2000 | $29.99 |
| Enterprise | 5000 | $59.99 |

---

## 4. بروتوكولات التكامل مع المنصات الفرعية

### Token Handoff (مُنفَّذ ✅)
```
المستخدم يضغط على بطاقة منصة
    ↓
window.open() فوراً (قبل async — لتجنب حجب Safari)
    ↓
trpc.platform.generateToken.mutate({ platform: "fada" })
    ↓
يُعيد: { token, platformUrl: "https://fada.mousa.ai/?token=JWT" }
    ↓
المنصة الفرعية تستقبل ?token= وتتحقق منه
```

### Credit API للمنصات الفرعية
```
GET  /api/platform/user-by-openid?openId=<openId>  ← جديد ✅ (Phase 73)
POST /api/platform/verify-token
POST /api/platform/deduct-credits
GET  /api/platform/check-balance?userId=<id>
GET  /api/platform/pricing (عام — بدون مصادقة)
GET  /api/platform/info
POST /api/platform/smart-query
POST /api/platform/pricing-webhook
```

**user-by-openid — التفاصيل:**
```
GET https://www.mousa.ai/api/platform/user-by-openid?openId={openId}
Headers:
  Authorization: Bearer {MOUSA_PLATFORM_API_KEY}
  X-Platform-ID: fada
Response 200: { userId, balance, token }
Response 404: { error: "USER_NOT_FOUND" }
```
> يُستخدم عندما يفتح المستخدم المنصة الفرعية مباشرةً (بدون token handoff) وهو مسجّل دخوله عبر Manus OAuth.

### مفاتيح API (في Manus Secrets)
```
PLATFORM_API_KEY_FADA
PLATFORM_API_KEY_RAQABA
PLATFORM_API_KEY_HARARA
PLATFORM_API_KEY_MASKAN
PLATFORM_API_KEY_CODE
PLATFORM_API_KEY_KHAYAL
```
> **ملاحظة مهمة:** المفاتيح الحالية متطابقة (staging). يجب تغييرها لقيم فريدة قبل الإنتاج الكامل.

---

## 5. ثاني الذكي (Widget)

| البند | التفاصيل |
|---|---|
| **الملف** | `client/public/mousa-widget.js` |
| **الإصدار** | v5.0 |
| **الصوت الذكوري** | ثاني (Thani) — ElevenLabs voice ID: `6LC8fQJu1Jg3bglhviXA` |
| **الصوت الأنثوي** | اليازية — ElevenLabs |
| **تكلفة الرسالة** | 5 كريدت |
| **API endpoint** | `POST /api/widget/chat` |
| **Public API** | `window.ThaniWidget` (alias: `window.MousaWidget`) |
| **الأوامر المدعومة** | NAVIGATE, FILL_FORM, FILL_CHAT_INPUT, CLICK_SMART, OPEN_PLATFORM, MOVE_ORB, PLAY_VIDEO, SKIP_VIDEO, SET_VOICE |

---

## 6. قاعدة البيانات — الجداول الرئيسية

| الجدول | الغرض |
|---|---|
| `users` | المستخدمون (openId, name, email, role, passwordHash, loginMethod) |
| `credit_wallets` | محافظ الكريدت |
| `credit_transactions` | سجل كل عمليات الكريدت |
| `ai_sessions` | جلسات AI (platform, title, creditsUsed, summary) |
| `ai_messages` | رسائل كل جلسة |
| `payments` | سجل مدفوعات Stripe |
| `subscriptions` | اشتراكات Stripe الشهرية |
| `refund_requests` | طلبات الاسترداد |
| `session_credit_refunds` | استرداد كريدت الجلسات الفاشلة |
| `system_health_checks` | سجل فحوصات صحة المنصات |
| `system_incidents` | الحوادث المكتشفة |
| `system_auto_fixes` | الإصلاحات التلقائية |
| `owner_alerts` | تنبيهات المالك |
| `platform_pricing_rules` | معادلات التسعير الديناميكي |
| `partners` | الشركاء (موردون، مقاولون، مطورون) |
| `partner_projects` | مشاريع الشركاء |
| `partner_services` | خدمات الشركاء |
| `discount_codes` | كوبونات الخصم |
| `referrals` | برنامج الإحالة |
| `user_feedback` | آراء وتقييمات المستخدمين |
| `error_reports` | تقارير الأخطاء |
| `gig_tasks` | مهام السوق الحر |
| `expert_corrections` | تصحيحات الخبراء |
| `projects` | مشاريع التوأم الرقمي |
| `project_documents` | وثائق المشاريع |

---

## 7. هيكل الملفات الرئيسية

```
mousa-ai/
├── client/src/
│   ├── pages/
│   │   ├── Home.tsx              ← الصفحة الرئيسية (Token Handoff + i18n)
│   │   ├── Dashboard.tsx         ← لوحة تحكم المستخدم
│   │   ├── Pricing.tsx           ← الأسعار (Stripe + كوبونات + مقارنة)
│   │   ├── Admin.tsx             ← لوحة الإدارة (9 تبويبات)
│   │   ├── Login.tsx             ← تسجيل دخول بالبريد أو OAuth
│   │   ├── Register.tsx          ← تسجيل جديد
│   │   ├── FAQ.tsx               ← الأسئلة الشائعة
│   │   ├── Contact.tsx           ← تواصل معنا
│   │   ├── Partner.tsx           ← بوابة الشركاء
│   │   ├── Gigs.tsx              ← سوق المهام الحر
│   │   ├── ExpertCorrections.tsx ← تصحيحات الخبراء
│   │   ├── DigitalTwin.tsx       ← التوأم الرقمي
│   │   ├── PlatformMonitor.tsx   ← لوحة مراقبة المنصات (جديد)
│   │   └── CostDashboard.tsx     ← داشبورد التكاليف (مدمج في Admin)
│   ├── components/
│   │   ├── DiamondHero.tsx       ← Hero section (i18n مُطبَّق)
│   │   ├── Navbar.tsx            ← شريط التنقل (i18n + LanguageSwitcher)
│   │   ├── Footer.tsx            ← الذيل
│   │   ├── PlatformIntroPopup.tsx← نافذة الفيديو التعريفي
│   │   └── PricingRulesAdmin.tsx ← إدارة معادلات التسعير
│   └── i18n/
│       ├── ar.ts, en.ts, ur.ts, fr.ts ← ملفات الترجمة
├── server/
│   ├── platformApi.ts            ← REST API للمنصات الفرعية ⭐
│   ├── routers.ts                ← tRPC procedures الرئيسية
│   ├── healthMonitor.ts          ← مراقبة صحة المنصات (يعمل كل 5 دقائق)
│   ├── monitorDb.ts              ← DB helpers للمراقبة
│   ├── widgetApi.ts              ← API ثاني الذكي
│   ├── stripeWebhook.ts          ← معالج Stripe webhooks
│   └── stripeProducts.ts         ← تعريف الباقات
├── client/public/
│   └── mousa-widget.js           ← ثاني الذكي (v5.0)
├── MEMORY.md                     ← هذا الملف (اقرأه أولاً!)
├── PROJECT_RULES.md              ← قواعد التطوير التفصيلية
└── todo.md                       ← سجل كل المهام (73 مرحلة مكتملة)
```

---

## 8. تبويبات لوحة الإدارة (/admin)

| # | التبويب | المحتوى |
|---|---|---|
| 1 | نظرة عامة | إحصائيات عامة + KPIs |
| 2 | المستخدمون | قائمة المستخدمين + منح/خصم كريدت |
| 3 | الاشتراكات | إدارة اشتراكات Stripe |
| 4 | الاسترداد | طلبات الاسترداد المالي |
| 5 | الشركاء | التحقق من الشركاء |
| 6 | الملاحظات | آراء المستخدمين + تقارير الأخطاء |
| 7 | التحليلات | رسوم بيانية للاستخدام والإيرادات |
| 8 | معادلات التسعير | إدارة تكاليف المنصات |
| 9 | التكاليف | داشبورد التكاليف الشهرية |
| 10 | 🛡️ مراقبة المنصات | صحة المنصات + الحوادث + الإصلاحات التلقائية |

---

## 9. حالة المنظومة الحالية

### ما يعمل بشكل مثالي ✅
- نظام الكريدت الكامل (شحن + خصم + سجل)
- Stripe Checkout + Webhooks + اشتراكات شهرية
- Token Handoff للمنصات الفرعية (Safari-safe)
- ثاني الذكي v5.0 (ElevenLabs TTS + STT + Barge-in)
- نظام المراقبة الاستباقية (HealthMonitor كل 5 دقائق)
- لوحة الإدارة الشاملة (10 تبويبات)
- دعم 4 لغات (AR, EN, UR, FR) مع RTL/LTR
- نظام الإحالة + كوبونات الخصم
- بوابة الشركاء + سوق المهام + تصحيحات الخبراء
- التوأم الرقمي للمشاريع
- نظام تقارير الأخطاء + جمع الآراء
- تسجيل الدخول المستقل (بريد + كلمة مرور) بدون Manus

### يحتاج إجراء يدوي ⚠️
- `maskan.mousa.ai` — SSL يحتاج ربط يدوي في Manus Settings → Domains
- مفاتيح API المنصات الفرعية متطابقة (staging) — تحتاج قيم فريدة للإنتاج

### مهام مؤجلة 📋
- نظام الذاكرة الطويلة الأمد (user_memory, user_reports)
- قاعدة المعرفة المحلية (building_codes, climate_data)
- تطبيق الترجمة على باقي الصفحات (DashboardLayout جزئياً)
- Phase 54: استقلالية كاملة عن Manus (OpenAI مباشر)

---

## 10. قواعد التطوير الإلزامية

1. **قبل أي جلسة جديدة:** اقرأ هذا الملف + `PROJECT_RULES.md`
2. **كل procedure جديدة** تحتاج test في `server/*.test.ts`
3. **الكريدت يُخصم مركزياً** فقط — لا تضف خصم في المنصات الفرعية مباشرة
4. **window.open() قبل await** دائماً — لتجنب حجب Safari
5. **CORS مفعّل** على `/api/platform/*` لأن المنصات الفرعية على نطاقات مختلفة
6. **لا تعدّل** `server/_core/` إلا لأسباب بنيوية
7. **TypeScript 0 errors** قبل كل checkpoint
8. **RTL دائماً** — `dir="rtl"` على الـ containers الرئيسية

---

## 11. سجل القرارات الاستراتيجية المهمة

| التاريخ | القرار |
|---|---|
| مارس 2026 | تبديل روابط رقابة/كود كانا مبدّلَين — تم التصحيح |
| مارس 2026 | Token Handoff: window.open() قبل async لتجنب Safari popup blocker |
| مارس 2026 | التسعير الديناميكي: المنصات الفرعية تحدد أسعارها — check-balance يُرسل الرصيد فقط |
| مارس 2026 | ElevenLabs TTS: صوت ثاني (Mousa uae) + اليازية — مع retry 3 مرات |
| مارس 2026 | الاستقلالية عن Manus: إضافة تسجيل دخول بالبريد + OpenAI fallback |
| مارس 2026 | دمج CostDashboard في Admin كتبويب بدلاً من صفحة منفصلة |
| مارس 2026 | إزالة openPlatformWithToken من PlatformIntroPopup — كان يُسبب 401 |
| 23 مارس 2026 | **قرار الاستقلالية:** الانتقال لخادم Hetzner Linux مستقل (Ubuntu 22.04) بدلاً من WSL2 — لضمان أقصى كفاءة مع Manus كأداة تطوير |

---

## 12. كيفية تحديث هذا الملف

في نهاية كل جلسة عمل مهمة، أضف:
- أي قرار استراتيجي جديد في القسم 11
- أي تغيير في الروابط أو الجداول في الأقسام 2-6
- تحديث حالة المنظومة في القسم 9
- تحديث التاريخ في أعلى الملف

---

## 13. 🗺️ خارطة الطريق للاستقلالية التقنية

> **القرار النهائي:** الانتقال لخادم Linux مستقل على Hetzner مع الحفاظ على Manus كأداة تطوير فقط.
> **البريزنتيشن:** manus-slides://QEJqVb5PpdgRq8arAkVCBM (14 شريحة، مارس 2026)

### الهدف النهائي
```
الآن:        Manus → يملك + يطور + يستضيف
المستهدف:    أنت → تملك + تستضيف (Hetzner €49.70/شهر)
             Manus → يطور فقط (بأمرك)
             GitHub → جسر التسليم التلقائي (60 ثانية)
```

### المراحل الأربع — حالة التنفيذ

#### المرحلة 1: الأساس والبنية التحتية (الأسبوع 1-2)
**الحالة:** ⏳ في الانتظار — تحتاج بيانات الخادم من المالك

**ما يتطلبه المالك (مرة واحدة):**
- [ ] شراء خادم Hetzner — Ubuntu 22.04 LTS — i9-9900K، 64GB RAM، 2TB NVMe — €49.70/شهر
  - الرابط: hetzner.com/dedicated → Server Auction
- [ ] إرسال بيانات الوصول: عنوان IP + كلمة مرور root

**ما ينفذه Manus بعد استلام البيانات:**
- [ ] تثبيت Node.js 22، MySQL 8، Nginx، PM2، Certbot
- [ ] إعداد GitHub Actions للنشر التلقائي عند كل push
- [ ] شهادات SSL لـ: www.mousa.ai + *.mousa.ai
- [ ] اختبار الاتصال والأداء
- [ ] صفحة اختبار على server.mousa.ai

**مؤشر النجاح:** الخادم يستجيب على server.mousa.ai بصفحة اختبار ✅

---

#### المرحلة 2: نقل الكود والتشغيل (الأسبوع 2-3)
**الحالة:** ⏳ تنتظر اكتمال المرحلة 1

**ما ينفذه Manus:**
- [ ] استنساخ الكود من GitHub للخادم
- [ ] إعداد متغيرات البيئة (نسخ من Manus Secrets)
- [ ] تشغيل mousa.ai على الخادم الجديد (للاختبار)
- [ ] اختبار جميع الوظائف: تسجيل الدخول، الكريدت، المنصات الست
- [ ] التحقق من Token Handoff لجميع المنصات الست

**الوضع المستهدف:**
- mousa.ai يعمل على خادمك (للاختبار)
- mousa.ai يعمل على Manus (للإنتاج — لا يزال)
- أي تعديل من Manus ينتشر للخادمين تلقائياً

**مؤشر النجاح:** جميع الوظائف تعمل على الخادم الجديد بنفس كفاءة Manus ✅

---

#### المرحلة 3: نقل البيانات والتحقق (الأسبوع 3-5)
**الحالة:** ⏳ تنتظر اكتمال المرحلة 2

**ما ينفذه Manus:**
- [ ] تصدير كامل لقاعدة البيانات من Manus (SQL dump)
- [ ] استيراد البيانات للخادم الجديد
- [ ] التحقق من كل جدول: users, credit_wallets, payments, ai_sessions
- [ ] تشغيل المنصتين معاً لأسبوع كامل (مزامنة مستمرة)
- [ ] مقارنة 100% بين قاعدتي البيانات قبل التحويل

**مؤشر النجاح:** قاعدة البيانات كاملة على الخادم، محققة، لا فقدان بيانات ✅

---

#### المرحلة 4: التحويل النهائي والاستقلال الكامل (الأسبوع 6-8)
**الحالة:** ⏳ تنتظر اكتمال المرحلة 3

**ما ينفذه Manus (يوم التحويل):**
- [ ] تحديث DNS: www.mousa.ai → خادم Hetzner
- [ ] التحقق من الاتصال الكامل (خلال 5 دقائق)
- [ ] مراقبة مكثفة لأول 24 ساعة
- [ ] تحديث Stripe Webhook URL → www.mousa.ai/api/stripe/webhook
- [ ] تأكيد استقلالية جميع المنصات الست
- [ ] إلغاء اشتراك Manus Pro (اختياري — يبقى للتطوير)

**مؤشر النجاح:** www.mousa.ai يعمل 100% على خادمك المستقل بصفر توقف ✅

---

### آلية التطوير المستمر بعد الاستقلال
```
طلب تعديل → Manus يكتب الكود → GitHub → GitHub Actions → خادمك → حي خلال 60 ثانية
```

**ما تملكه للأبد:**
- الكود كاملاً في GitHub (ملكيتك)
- قاعدة البيانات على خادمك (ملكيتك)
- النطاق www.mousa.ai (ملكيتك)
- Manus = مطور تعاقدي، لا مالك

### مقارنة التكاليف
| البند | الوضع الحالي | بعد الاستقلال |
|---|---|---|
| Manus Pro | $39/شهر | $0 (اختياري للتطوير) |
| خادم Hetzner | $0 | €49.70/شهر |
| خطر التوقف | مرتفع | صفر |
| ملكية البيانات | Manus | أنت |

### الخطوات الفورية المطلوبة من المالك الآن
1. **اليوم:** شراء إضافة كريدت Manus (AED 79.99) لاستعادة المنصة
2. **هذا الأسبوع:** شراء خادم Hetzner وإرسال بيانات الوصول
3. **بعدها:** Manus يتولى كل شيء

---

## 14. كيفية تحديث هذا الملف

في نهاية كل جلسة عمل مهمة، أضف:
- أي قرار استراتيجي جديد في القسم 11
- أي تغيير في الروابط أو الجداول في الأقسام 2-6
- تحديث حالة المنظومة في القسم 9
- **تحديث حالة مراحل خارطة الطريق في القسم 13** (غيّر ⏳ إلى ✅ عند الإنجاز)
- تحديث التاريخ في أعلى الملف

---

*ملف الذاكرة الدائمة لـ mousa.ai — يُحدَّث في كل جلسة*
