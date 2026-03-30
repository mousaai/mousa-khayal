# mousa.ai — المرجع الشامل الدائم
> آخر تحديث: 28 مارس 2026 | يجب قراءة هذا الملف في بداية كل جلسة عمل

---

## 1. هوية المشروع

- **الاسم:** mousa.ai — المنظومة الرقمية الذكية للبناء والعمران
- **النطاق الرئيسي:** www.mousa.ai
- **المشروع في Manus:** mousa-ai
- **GitHub:** mousaai/mousa-ai (وجميع repos الفرعية)

---

## 2. المنصات الست الفرعية

| المنصة | الاسم العربي | الرابط | GitHub Repo | منصة Manus |
|--------|-------------|--------|-------------|------------|
| FADA | فضاء | fada.mousa.ai | mousaai/mousa-fada | ✅ مرتبطة |
| RAQABA | رقابة | raqaba.mousa.ai | mousaai/mousa-raqaba | ✅ مرتبطة |
| HARARA | حرارة | harara.mousa.ai | mousaai/mousa-harara | ✅ مرتبطة |
| MASKAN | مسكن | maskan.mousa.ai | mousaai/mousa-maskan | ✅ مرتبطة |
| CODE | كود | code.mousa.ai | mousaai/mousa-code | ✅ مرتبطة |
| KHAYAL | خيال | khayal.mousa.ai | mousaai/mousa-khayal | ✅ مرتبطة |

---

## 3. البنية التحتية (خادم مستقل)

### الخادم الحقيقي — Hetzner
- **IP:** 204.168.191.251
- **النوع:** CX32 — Helsinki (hel1)
- **OS:** Ubuntu 24.04 LTS
- **المستخدم:** root
- **كلمة المرور:** !MousaAI@2026#Secure
- **SSH Port:** 22
- **أمر الاتصال:** `ssh root@204.168.191.251`
- **التكلفة:** €7.49/شهر

### البرمجيات المثبتة
- Node.js v22.13.0 LTS
- pnpm v9.x
- PM2 v5.x (Cluster Mode × 2)
- Nginx 1.18.0 (Reverse Proxy)
- Certbot Let's Encrypt (SSL تلقائي)
- UFW Firewall (Ports: 22, 80, 443)
- rclone v1.68.x (Cloud Sync)

### مسار التطبيق على الخادم
```
/var/www/mousa-ai/
├── dist/
│   └── index.js  ← Entry Point
├── node_modules/
├── package.json
└── ecosystem.config.cjs  ← PM2 Config
```

### Nginx Virtual Hosts
جميع النطاقات السبعة (mousa.ai + 6 فرعية) تُوجَّه لـ `localhost:3000`

### SSL
- **النوع:** Wildcard + SAN — Let's Encrypt
- **انتهاء الصلاحية:** 2026-23 (تجديد تلقائي)
- **مسار:** `/etc/letsencrypt/live/mousa.ai/`

---

## 4. النسخ الاحتياطي — 3 طبقات

| الطبقة | الوصف | الاحتفاظ |
|--------|-------|----------|
| محلية | `/root/backups/` على الخادم — يومياً 2:00 ص | 7 أيام |
| Cloudflare R2 | رفع تلقائي بعد كل نسخة | 365 يوم |
| TiDB Cloud | قاعدة البيانات — نسخ احتياطي مدمج تلقائي | ∞ |

### Cloudflare R2
- **Bucket:** mousa-ai-backups
- **Access Key ID:** 92974218e8ea1a4a6be7e5ca8ecf1e1e
- **Secret Access Key:** 36d0f1645d761eda48bb4c66a100f7015caf3a978fec2bbebe5488ce6f198cc2
- **Endpoint:** https://0eb1cab4bfc427fa89e6669d5ce8d81f.r2.cloudflarestorage.com
- **API Token:** cfat_eIyc41f7sDJu4dzgFBXy5P7KYcuN9hSVWvrG4IFM625e6f21

### GitHub Actions SSH Key
- **Public Key:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILr8MijLdbT0n1HoCvGc1BvbITONEHWzPkFC5gOXrjpY github-actions@mousa.ai`
- **Private Key Path (على الخادم):** `/root/.ssh/github_actions/`

---

## 5. قاعدة البيانات

- **النوع:** TiDB Cloud (MySQL 8.0 Compatible)
- **ORM:** Drizzle ORM
- **الاتصال:** SSL/TLS مشفّر
- **SLA:** 99.99% Uptime
- **عدد الجداول:** 64 جدول
- **البيانات الحرجة:** users (12)، credit_wallets (14)، credit_transactions (99)، payments (2)

---

## 6. CI/CD Pipeline

```
Manus يطور → GitHub (push) → GitHub Actions → SSH → الخادم (pull + build + pm2 restart)
```
- أي تعديل من Manus يُنشر تلقائياً للخادم خلال ~60 ثانية
- Manus يبقى أداة تطوير فقط — الخادم الحقيقي هو المرجع

---

## 7. خارطة طريق الاستقلالية التقنية (4 مراحل)

### المرحلة 1 — الأساس (الأسبوع 1-2) ✅ مكتملة
- شراء خادم Hetzner CX32 ✅
- تثبيت البيئة الكاملة ✅
- إعداد GitHub Actions ✅
- SSL لجميع النطاقات ✅

### المرحلة 2 — نقل الكود (الأسبوع 2-3) ✅ مكتملة
- الكود يعمل على الخادمين معاً ✅
- GitHub هو جسر التسليم التلقائي ✅

### المرحلة 3 — نقل البيانات (الأسبوع 3-5) ⏳ قيد التنفيذ
- تصدير كامل من Manus (users، credits، transactions، reports)
- استيراد للخادم الجديد
- مزامنة مستمرة لأسبوع كامل
- تحقق نهائي 100% قبل التحويل

### المرحلة 4 — الاستقلال الكامل (الأسبوع 6-8) ⏳ مستقبلاً
- تحديث DNS: www.mousa.ai → 204.168.191.251
- Stripe Webhook يُحدَّث للعنوان الجديد
- Manus يبقى أداة تطوير فقط — لا يملك أي شيء

---

## 8. حالة المهام الحالية

### ✅ مكتمل
- OAuth Bridge للمنصات الفرعية (useAuth إصلاح)
- GitHub repos لجميع المنصات الست
- Stripe Live Mode مُفعّل
- KHAYAL في القائمة والـ Pricing
- نظام الإحالة مكتمل (mousa.ai/r/{code})
- OG/SEO tags في index.html

### ⏳ مطلوب
- إصلاح AuthGate في المنصات الفرعية لاستخدام OAuth Bridge فعلياً (مشكلة الدخول)
- ربط إحصائيات الصفحة الرئيسية بقاعدة البيانات (عدد المستخدمين الحقيقي)
- إضافة i18n لـ MASKAN وCODE
- نقل البيانات للخادم المستقل (المرحلة 3)

---

## 9. إجراءات الطوارئ

```bash
# الموقع لا يعمل
pm2 restart mousa-ai
systemctl restart nginx

# استعادة من نسخة احتياطية
tar -xzf /root/backups/app_YYYYMMDD.tar.gz -C /var/www/
# أو من R2:
rclone copy r2:mousa-ai-backups/2026/03/ /root/restore/

# SSL مشكلة
certbot renew --force-renewal && systemctl reload nginx

# نشر يدوي
cd /var/www/mousa-ai && git pull origin main && pnpm install --frozen-lockfile && pnpm build && pm2 restart mousa-ai
```

---

## 10. أوامر المراقبة السريعة

```bash
pm2 monit                          # مراقبة العمليات
pm2 status                         # حالة التطبيق
tail -50 /var/log/mousa-monitor.log  # آخر 50 سطر من المراقبة
df -h | free -h                    # مساحة القرص والذاكرة
htop                               # موارد الخادم
```

---

> **ملاحظة مهمة:** هذا الملف يحتوي على بيانات وصول حساسة. يجب الحفاظ عليه سرياً وعدم مشاركته.
