# OAuth Bridge Fix — تعليمات التطبيق

## المشكلة
عند فتح المنصة مباشرةً (مثل `fada.mousa.ai`)، يفشل تسجيل الدخول بخطأ:
```
[internal] authorization failed: invalid redirect_uri: redirect_uri domain 'fada.mousa.ai' not allowed for this project
```

## السبب
المنصات الفرعية تستخدم `window.location.origin` كـ `redirect_uri` في OAuth،
لكن هذه الـ domains غير مسجّلة في Manus OAuth — فقط `mousa.ai` مسجّل.

## الحل
استبدال `getLoginUrl()` في `client/src/const.ts` بالنسخة الموجودة في `src/const.ts` في هذا الـ repo.

### خطوات التطبيق

1. **انسخ الملف** `src/const.ts` من هذا الـ repo إلى `client/src/const.ts` في مشروع Manus
2. **تأكد من استيراده** في `client/src/main.tsx` و `client/src/pages/Home.tsx`
3. **ابنِ المشروع** وانشره

### كيف يعمل الحل

```
المستخدم يضغط "تسجيل الدخول" في fada.mousa.ai
    ↓
يُعاد توجيهه لـ: https://mousa.ai/api/platform/login-redirect?platform=fada&returnTo=https://fada.mousa.ai/
    ↓
mousa.ai يبدأ OAuth بـ redirect_uri=https://mousa.ai/api/oauth/callback ✅ (مسجّل)
    ↓
بعد نجاح المصادقة، mousa.ai يولّد platform token
    ↓
يُعاد توجيه المستخدم لـ: https://fada.mousa.ai/?token=eyJ...
    ↓
fada.mousa.ai يستخرج الـ token ويحفظه في localStorage
```

## ملاحظات
- `src/const.ts` يعمل تلقائياً — يكتشف اسم المنصة من الـ hostname
- لا تحتاج تعديل أي شيء آخر في الكود
- يعمل مع جميع المنصات الست (fada, raqaba, harara, maskan, code, khayal)
