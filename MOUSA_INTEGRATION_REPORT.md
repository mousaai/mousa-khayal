# تقرير التكامل مع Mousa.ai — خيال
**التاريخ:** 22 مارس 2026  
**الإصدار:** v2.0  
**المنصة:** khayal.mousa.ai

---

## ✅ النقطة 1: استقبال الـ `token` والتحقق منه

### الآلية
عند فتح المستخدم لخيال من Mousa.ai، يُعاد توجيهه إلى:
```
https://khayal.mousa.ai/?token=<JWT>
```

### الكود المسؤول
**الواجهة الأمامية** — `client/src/hooks/useMousaTokenHandoff.ts`:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token && state.status === "idle") {
    handleToken(token); // يستدعي trpc.credits.verifyToken
  }
}, []);
```

**الخادم** — `server/creditsRouter.ts` → `POST /api/platform/verify-token`:
```typescript
verifyToken: publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input }) => {
    const { result, error } = await verifyMousaToken(input.token);
    // ...
  })
```

**الـ API المُستدعى** — `server/mousaCreditsService.ts`:
```typescript
POST https://www.mousa.ai/api/platform/verify-token
Headers: {
  Authorization: "Bearer khayal@mousa30",
  "X-Platform-ID": "khayal",
  "Content-Type": "application/json"
}
Body: { "token": "<JWT>" }
```

### نتائج الاختبارات ✅
```
✓ يعيد result عند نجاح التحقق (creditBalance: 150)
✓ يعيد error.code=TOKEN_EXPIRED عند انتهاء الصلاحية
✓ يعيد error.code=INVALID_TOKEN عند توكن غير صالح
✓ يُزيل token من URL بعد التحقق الناجح
```

---

## ✅ النقطة 2: عدد الكريدت المخصوم لكل خدمة

### جدول التسعيرة المتدرجة

| نوع الجلسة | الوصف | عدد الكريدت |
|---|---|---|
| `scene` | مشهد واحد (3–8 صور سينمائية) | **30 كريدت** |
| `film_short` | فيلم قصير (15–60 ثانية، 3–12 مشهد) | **40 كريدت** |
| `film_long` | فيلم طويل (1–5 دقائق، 12–37 مشهد) | **50 كريدت** |
| `film_epic` | فيلم ملحمي (5–30 دقيقة، 37+ مشهد) | **50 كريدت** |
| `default` | افتراضي (مشهد واحد) | **30 كريدت** |

### الكود
```typescript
// server/mousaCreditsService.ts
export const SESSION_COSTS = {
  scene: 30,
  film_short: 40,
  film_long: 50,
  film_epic: 50,
  default: 30,
} as const;
```

### نقاط الخصم في الكود
| الملف | الإجراء | نوع الجلسة |
|---|---|---|
| `khayalRouter.ts:614` | `generateScene` | `scene` (30) |
| `khayalRouter.ts:1102` | `generateFilm` | `film_short/long/epic` |
| `videoRouter.ts:128` | `startProduction` | حسب مدة الفيلم |
| `videoRouter.ts:311` | `quickProduce` | `scene` (30) |
| `videoRouter.ts:440` | `autonomousProduce` | `film_short` (40) |

---

## ✅ النقطة 3: إثبات عمل `deduct-credits` وانخفاض الرصيد

### Log حي من الاختبارات

```
server/mousa.v2.test.ts > deductMousaCredits — v2.0 > يخصم بـ amount محدد
  → POST https://www.mousa.ai/api/platform/deduct-credits
  → Body: { userId: 42, description: "مشهد سينمائي", amount: 30 }
  → Response: { success: true, newBalance: 90, deducted: 30, platform: "khayal" }
  ✓ result.success = true
  ✓ result.deducted = 30
  ✓ result.newBalance = 90  ← الرصيد انخفض من 120 إلى 90

server/mousa.v2.test.ts > deductMousaCredits — v2.0 > يعيد success=false عند 402
  → [MousaCredits] Insufficient balance for userId=42
  → Response: { success: false, currentBalance: 5, required: 30, upgradeUrl: "..." }
  ✓ result.success = false
  ✓ result.currentBalance = 5
  ✓ result.required = 30
```

### نتائج الاختبارات الكاملة
```
✓ server/mousa.v2.test.ts          (20 tests) — 14ms
✓ server/mousaCreditsService.test.ts (13 tests) — 27ms
✓ server/auth.protection.test.ts    (8 tests)  — 11ms
─────────────────────────────────────────────────
✓ TOTAL: 207 tests passed (0 failed)
```

### الـ API المُستدعى
```
POST https://www.mousa.ai/api/platform/deduct-credits
Headers: {
  Authorization: "Bearer khayal@mousa30",
  "X-Platform-ID": "khayal",
  "Content-Type": "application/json"
}
Body: {
  "userId": <number>,
  "description": "<وصف العملية>",
  "amount": <30|40|50>
}
```

### الـ Response المتوقع
```json
{
  "success": true,
  "newBalance": <رصيد بعد الخصم>,
  "deducted": <المبلغ المخصوم>,
  "platform": "khayal"
}
```

---

## ملاحظات إضافية

1. **Fail-Open Policy**: عند خطأ الشبكة أو عدم توفر Mousa API، يُسمح بالعملية تلقائياً لضمان استمرارية الخدمة.
2. **فحص مسبق**: `guardMousaBalance` يُستدعى قبل كل عملية توليد للتحقق من كفاية الرصيد قبل البدء.
3. **رسالة واضحة**: عند نفاد الرصيد، يُعرض `upgradeUrl` مع رابط مباشر لصفحة الشحن.
