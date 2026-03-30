/**
 * platformDocs.ts
 * صفحة وثيقة تكامل المنصات الفرعية مع mousa.ai
 * متاحة على: GET /api/platform/docs
 */
import type { Express, Request, Response } from "express";

export function registerPlatformDocsRoute(app: Express): void {
  app.get("/api/platform/docs", (_req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>دليل تكامل المنصات الفرعية — mousa.ai</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Arabic:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'IBM Plex Arabic', 'Segoe UI', sans-serif;
      background: #080E1A;
      color: #e2e8f0;
      line-height: 1.7;
      padding: 2rem 1rem;
    }
    .container { max-width: 960px; margin: 0 auto; }
    header {
      text-align: center;
      padding: 3rem 0 2rem;
      border-bottom: 1px solid rgba(212,160,23,0.2);
      margin-bottom: 3rem;
    }
    .logo { font-size: 2.2rem; font-weight: 800; color: #d4a017; letter-spacing: -0.02em; }
    .subtitle { color: #94a3b8; margin-top: 0.5rem; font-size: 1.1rem; }
    .version-badge {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.3rem 1rem;
      background: rgba(212,160,23,0.1);
      border: 1px solid rgba(212,160,23,0.3);
      border-radius: 999px;
      font-size: 0.8rem;
      color: #d4a017;
      font-family: 'JetBrains Mono', monospace;
    }
    h2 {
      font-size: 1.4rem;
      color: #d4a017;
      margin: 2.5rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(212,160,23,0.15);
    }
    h3 { font-size: 1.05rem; color: #e2e8f0; margin: 1.5rem 0 0.5rem; font-weight: 600; }
    p { color: #94a3b8; margin-bottom: 1rem; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.7rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      margin-left: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-post { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .badge-get  { background: rgba(34,197,94,0.15);  color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .badge-new  { background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
    pre {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(212,160,23,0.12);
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      overflow-x: auto;
      font-size: 0.83rem;
      color: #e2e8f0;
      margin: 1rem 0 1.5rem;
      direction: ltr;
      text-align: left;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1.6;
    }
    code {
      color: #d4a017;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88em;
    }
    .step {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
    }
    .step-num {
      min-width: 2.2rem;
      height: 2.2rem;
      background: rgba(212,160,23,0.12);
      border: 1px solid rgba(212,160,23,0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #d4a017;
      font-size: 0.9rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .step-body { flex: 1; }
    .table-wrap { overflow-x: auto; margin: 1rem 0 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.06); }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th {
      background: rgba(212,160,23,0.08);
      color: #d4a017;
      padding: 0.75rem 1rem;
      text-align: right;
      font-weight: 600;
      border-bottom: 1px solid rgba(212,160,23,0.15);
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: #94a3b8;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    td code { color: #60a5fa; }
    .alert {
      background: rgba(239,68,68,0.07);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      color: #fca5a5;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    .tip {
      background: rgba(34,197,94,0.06);
      border: 1px solid rgba(34,197,94,0.18);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      color: #86efac;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    .info {
      background: rgba(59,130,246,0.06);
      border: 1px solid rgba(59,130,246,0.18);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      color: #93c5fd;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    footer {
      text-align: center;
      padding: 3rem 0 1rem;
      color: #475569;
      font-size: 0.85rem;
      border-top: 1px solid rgba(212,160,23,0.1);
      margin-top: 4rem;
    }
    .platforms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      margin: 1rem 0 1.5rem;
    }
    .platform-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(212,160,23,0.12);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }
    .platform-card .name { font-weight: 700; color: #e2e8f0; font-size: 1.05rem; }
    .platform-card .id  { font-size: 0.78rem; color: #d4a017; font-family: 'JetBrains Mono', monospace; margin-top: 0.2rem; }
    .platform-card .cost { font-size: 0.82rem; color: #94a3b8; margin-top: 0.4rem; }
    .platform-card .factors { font-size: 0.78rem; color: #64748b; margin-top: 0.4rem; direction: ltr; text-align: left; }
    .formula-box {
      background: rgba(168,85,247,0.06);
      border: 1px solid rgba(168,85,247,0.2);
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      margin: 1rem 0;
      direction: ltr;
      text-align: left;
    }
    .formula-box .formula {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: #c084fc;
      font-weight: 600;
    }
    .formula-box .note { font-size: 0.82rem; color: #94a3b8; margin-top: 0.5rem; }
    .nav {
      position: sticky;
      top: 1rem;
      background: rgba(8,14,26,0.95);
      border: 1px solid rgba(212,160,23,0.12);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
    }
    .nav-title { font-size: 0.78rem; color: #d4a017; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: 0.08em; }
    .nav a { display: block; color: #94a3b8; font-size: 0.85rem; text-decoration: none; padding: 0.2rem 0; }
    .nav a:hover { color: #d4a017; }
    .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width: 600px) { .toc-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<div class="container">

  <header>
    <div class="logo">mousa.ai</div>
    <div class="subtitle">دليل تكامل المنصات الفرعية — Platform Integration Guide</div>
    <div class="version-badge">API v2.0 — Dynamic Pricing</div>
  </header>

  <nav class="nav">
    <div class="nav-title">محتويات الدليل</div>
    <div class="toc-grid">
      <a href="#overview">نظرة عامة</a>
      <a href="#platforms">المنصات المدعومة</a>
      <a href="#dynamic-pricing">نظام التسعير الديناميكي ✨</a>
      <a href="#integration">خطوات التكامل</a>
      <a href="#usage-factors">usage_factors لكل منصة</a>
      <a href="#endpoints">جميع الـ Endpoints</a>
      <a href="#example">مثال متكامل</a>
      <a href="#errors">أكواد الأخطاء</a>
    </div>
  </nav>

  <h2 id="overview">نظرة عامة</h2>
  <p>
    يتيح هذا الدليل لمطوري المنصات الفرعية ربط منصاتهم بنظام المستخدمين والكريدت في mousa.ai.
    عند فتح المنصة الفرعية من داخل mousa.ai، يُمرَّر <code>?token=...</code> في الرابط.
    المنصة الفرعية تستخدم هذا التوكن للتحقق من هوية المستخدم وخصم الكريدت.
  </p>
  <div class="info">
    📌 <strong>جديد في v2.0:</strong> نظام التسعير الديناميكي — كل منصة ترسل <code>usage_factors</code> مع طلب الخصم،
    وموسى يحتسب التكلفة الدقيقة بناءً على الاستخدام الفعلي بدلاً من تكلفة ثابتة.
  </div>

  <h2 id="platforms">المنصات المدعومة</h2>
  <div class="platforms-grid">
    <div class="platform-card">
      <div class="name">فضاء</div>
      <div class="id">platform: "fada"</div>
      <div class="cost">التكلفة: 5–60 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, image_count, report_type_full, room_count</div>
    </div>
    <div class="platform-card">
      <div class="name">رقابة</div>
      <div class="id">platform: "raqaba"</div>
      <div class="cost">التكلفة: 5–80 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, image_count, report_type_full, violation_count</div>
    </div>
    <div class="platform-card">
      <div class="name">حرارة</div>
      <div class="id">platform: "harara"</div>
      <div class="cost">التكلفة: 5–80 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, floor_count, report_type_full, hvac_zones</div>
    </div>
    <div class="platform-card">
      <div class="name">مسكن</div>
      <div class="id">platform: "maskan"</div>
      <div class="cost">التكلفة: 5–50 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, property_options, report_type_full</div>
    </div>
    <div class="platform-card">
      <div class="name">كود</div>
      <div class="id">platform: "code"</div>
      <div class="cost">التكلفة: 3–30 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, code_sections, report_type_full</div>
    </div>
    <div class="platform-card">
      <div class="name">خيال</div>
      <div class="id">platform: "khayal"</div>
      <div class="cost">التكلفة: 5–70 كريدت (ديناميكي)</div>
      <div class="factors">factors: message_count, image_count, image_generation, report_type_full</div>
    </div>
  </div>

  <h2 id="dynamic-pricing">نظام التسعير الديناميكي ✨</h2>
  <p>بدلاً من تكلفة ثابتة لكل منصة، يحتسب موسى التكلفة الدقيقة بناءً على الاستخدام الفعلي:</p>

  <div class="formula-box">
    <div class="formula">cost = clamp( baseCost + Σ(factor_value × weight), minCost, maxCost )</div>
    <div class="note">
      • baseCost: التكلفة الأساسية للجلسة<br>
      • factor_value: القيمة الفعلية للعامل (عدد الرسائل، الصور، إلخ)<br>
      • weight: وزن العامل المحدد في لوحة الإدارة<br>
      • clamp: يضمن أن التكلفة لا تقل عن minCost ولا تتجاوز maxCost
    </div>
  </div>

  <h3>مثال: منصة فضاء</h3>
  <pre>// usage_factors المُرسَلة:
{
  "message_count": 5,      // 5 رسائل × وزن 1 = 5
  "image_count": 2,        // 2 صور × وزن 5 = 10
  "report_type_full": 1,   // تقرير كامل × وزن 10 = 10
  "room_count": 3          // 3 غرف × وزن 2 = 6
}

// الحساب:
// cost = clamp(5 + 5 + 10 + 10 + 6, 5, 60)
// cost = clamp(36, 5, 60) = 36 كريدت</pre>

  <div class="tip">
    ✅ إذا لم ترسل <code>usage_factors</code>، سيُستخدم <code>amount</code> المُرسَل مباشرةً كتكلفة ثابتة (للتوافق مع الإصدارات القديمة).
  </div>

  <h2 id="integration">خطوات التكامل</h2>

  <div class="step">
    <div class="step-num">1</div>
    <div class="step-body">
      <h3>استقبال التوكن من URL</h3>
      <p>عند فتح المنصة الفرعية، استخرج <code>token</code> من معاملات الرابط:</p>
      <pre>// JavaScript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
  // المستخدم غير مسجل — أعد توجيهه لـ mousa.ai
  window.location.href = 'https://www.mousa.ai';
}</pre>
    </div>
  </div>

  <div class="step">
    <div class="step-num">2</div>
    <div class="step-body">
      <h3>التحقق من التوكن والحصول على بيانات المستخدم</h3>
      <p>أرسل التوكن لـ API التحقق للحصول على هوية المستخدم ورصيده:</p>
      <pre>POST https://www.mousa.ai/api/platform/verify-token
Authorization: Bearer &lt;PLATFORM_API_KEY&gt;
X-Platform-ID: fada
Content-Type: application/json

{
  "token": "&lt;token_from_url&gt;"
}</pre>
      <p>الاستجابة الناجحة:</p>
      <pre>{
  "valid": true,
  "userId": 123,
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "creditBalance": 450,
  "platformCost": 20,
  "hasSufficientCredits": true
}</pre>
      <div class="alert">⚠️ إذا كان <code>hasSufficientCredits: false</code> — أوقف الطلب وأعلم المستخدم بنفاد الكريدت مع رابط الشحن: <code>https://www.mousa.ai/pricing</code></div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">3</div>
    <div class="step-body">
      <h3>خصم الكريدت بعد إتمام الطلب (مع usage_factors)</h3>
      <p>بعد إتمام طلب AI بنجاح، اخصم الكريدت مع إرسال تفاصيل الاستخدام:</p>
      <pre>POST https://www.mousa.ai/api/platform/deduct-credits
Authorization: Bearer &lt;PLATFORM_API_KEY&gt;
X-Platform-ID: fada
Content-Type: application/json

{
  "userId": 123,
  "description": "تحليل تصميم داخلي — فضاء",
  "usage_factors": {
    "message_count": 5,
    "image_count": 2,
    "report_type_full": 1,
    "room_count": 3
  }
}</pre>
      <p>الاستجابة الناجحة:</p>
      <pre>{
  "success": true,
  "newBalance": 414,
  "deducted": 36,
  "platform": "fada",
  "costBreakdown": {
    "message_count": 5,
    "image_count": 10,
    "report_type_full": 10,
    "room_count": 6
  },
  "costRule": "فضاء: 5 كريدت أساسي + ..."
}</pre>
    </div>
  </div>

  <div class="step">
    <div class="step-num">4</div>
    <div class="step-body">
      <h3>التحقق من الرصيد (اختياري)</h3>
      <p>يمكن التحقق من رصيد المستخدم في أي وقت:</p>
      <pre>GET https://www.mousa.ai/api/platform/check-balance?userId=123
Authorization: Bearer &lt;PLATFORM_API_KEY&gt;
X-Platform-ID: fada</pre>
      <p>الاستجابة:</p>
      <pre>{
  "balance": 414,
  "sufficient": true,
  "platformCost": 20,
  "upgradeUrl": "https://www.mousa.ai/pricing?ref=fada"
}</pre>
    </div>
  </div>

  <h2 id="usage-factors">usage_factors التفصيلية لكل منصة</h2>

  <h3>فضاء (fada) — المستشار الذكي للديكور الداخلي</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>5 رسائل = 5 كريدت</td></tr>
        <tr><td><code>image_count</code></td><td>عدد الصور المُرفقة للتحليل</td><td>5</td><td>2 صور = 10 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير كامل، 0 إذا كان ملخصاً</td><td>10</td><td>تقرير كامل = 10 كريدت</td></tr>
        <tr><td><code>room_count</code></td><td>عدد الغرف المُحللة</td><td>2</td><td>3 غرف = 6 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <h3>رقابة (raqaba) — المشرف الميداني الذكي</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>3 رسائل = 3 كريدت</td></tr>
        <tr><td><code>image_count</code></td><td>عدد صور الموقع المُرفقة</td><td>8</td><td>3 صور = 24 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير تفتيش كامل</td><td>15</td><td>تقرير كامل = 15 كريدت</td></tr>
        <tr><td><code>violation_count</code></td><td>عدد المخالفات المُكتشفة</td><td>2</td><td>4 مخالفات = 8 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <h3>حرارة (harara) — محلل الكفاءة الطاقوية</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>4 رسائل = 4 كريدت</td></tr>
        <tr><td><code>floor_count</code></td><td>عدد طوابق المبنى</td><td>3</td><td>3 طوابق = 9 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير طاقوي كامل</td><td>15</td><td>تقرير كامل = 15 كريدت</td></tr>
        <tr><td><code>hvac_zones</code></td><td>عدد مناطق التكييف</td><td>5</td><td>2 منطقة = 10 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <h3>مسكن (maskan) — محلل الاحتياجات السكنية</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>6 رسائل = 6 كريدت</td></tr>
        <tr><td><code>property_options</code></td><td>عدد الخيارات العقارية المُقيَّمة</td><td>3</td><td>3 خيارات = 9 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير توصية كامل</td><td>10</td><td>تقرير كامل = 10 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <h3>كود (code) — مرجع الكودات الهندسية</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>4 رسائل = 4 كريدت</td></tr>
        <tr><td><code>code_sections</code></td><td>عدد بنود الكود المُستشهد بها</td><td>2</td><td>5 بنود = 10 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير امتثال كامل</td><td>8</td><td>تقرير كامل = 8 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <h3>خيال (khayal) — مولّد الأفكار المعمارية</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>العامل</th><th>الوصف</th><th>الوزن الافتراضي</th><th>مثال</th></tr></thead>
      <tbody>
        <tr><td><code>message_count</code></td><td>عدد رسائل المحادثة</td><td>1</td><td>4 رسائل = 4 كريدت</td></tr>
        <tr><td><code>image_count</code></td><td>عدد الصور المُحللة</td><td>6</td><td>2 صور = 12 كريدت</td></tr>
        <tr><td><code>image_generation</code></td><td>عدد الصور المُولَّدة بالذكاء الاصطناعي</td><td>15</td><td>2 صور = 30 كريدت</td></tr>
        <tr><td><code>report_type_full</code></td><td>1 إذا طُلب تقرير تصميمي كامل</td><td>12</td><td>تقرير كامل = 12 كريدت</td></tr>
      </tbody>
    </table>
  </div>

  <div class="tip">
    ✅ الأوزان قابلة للتعديل من لوحة إدارة mousa.ai في أي وقت دون تغيير الكود.
    استخدم <code>GET /api/platform/info</code> للحصول على الأوزان الحالية برمجياً.
  </div>

  <h2>مفاتيح API للمنصات الفرعية</h2>
  <p>كل منصة فرعية تحتاج مفتاح API خاص بها يُرسَل في header كل طلب:</p>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>المنصة</th>
          <th>متغير البيئة</th>
          <th>Header المطلوب</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>فضاء (FADA)</td><td><code>PLATFORM_API_KEY_FADA</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
        <tr><td>رقابة (RAQABA)</td><td><code>PLATFORM_API_KEY_RAQABA</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
        <tr><td>حرارة (HARARA)</td><td><code>PLATFORM_API_KEY_HARARA</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
        <tr><td>مسكن (MASKAN)</td><td><code>PLATFORM_API_KEY_MASKAN</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
        <tr><td>كود (CODE)</td><td><code>PLATFORM_API_KEY_CODE</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
        <tr><td>خيال (KHAYAL)</td><td><code>PLATFORM_API_KEY_KHAYAL</code></td><td><code>Authorization: Bearer &lt;key&gt;</code></td></tr>
      </tbody>
    </table>
  </div>
  <div class="alert">⚠️ احصل على مفتاح API الخاص بمنصتك من مدير mousa.ai. المفاتيح سرية ولا تُشارك في الكود أو المستودعات.</div>

  <h2 id="endpoints">جميع الـ Endpoints</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Method</th><th>Endpoint</th><th>الوصف</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-post">POST</span></td>
          <td><code>/api/platform/verify-token</code></td>
          <td>التحقق من handoff token والحصول على بيانات المستخدم</td>
        </tr>
        <tr>
          <td><span class="badge badge-post">POST</span> <span class="badge badge-new">v2</span></td>
          <td><code>/api/platform/deduct-credits</code></td>
          <td>خصم كريدت ديناميكي بناءً على usage_factors</td>
        </tr>
        <tr>
          <td><span class="badge badge-get">GET</span></td>
          <td><code>/api/platform/check-balance</code></td>
          <td>التحقق من رصيد المستخدم الحالي</td>
        </tr>
        <tr>
          <td><span class="badge badge-get">GET</span></td>
          <td><code>/api/platform/info</code></td>
          <td>معلومات المنصات (الأسماء، التكاليف، الأوزان الحالية)</td>
        </tr>
        <tr>
          <td><span class="badge badge-get">GET</span></td>
          <td><code>/api/platform/docs</code></td>
          <td>هذه الصفحة — دليل التكامل</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2 id="example">مثال متكامل (JavaScript)</h2>
  <pre>// ─── 1. استخراج التوكن من URL ───────────────────────────────
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  window.location.href = 'https://www.mousa.ai';
  return;
}

// ─── 2. التحقق من التوكن ────────────────────────────────────
const verifyRes = await fetch('https://www.mousa.ai/api/platform/verify-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_PLATFORM_API_KEY',
    'X-Platform-ID': 'fada'
  },
  body: JSON.stringify({ token })
});
const user = await verifyRes.json();

if (!user.valid) {
  alert('جلسة منتهية — يرجى العودة لـ mousa.ai');
  window.location.href = 'https://www.mousa.ai';
  return;
}

if (!user.hasSufficientCredits) {
  alert('رصيد الكريدت غير كافٍ');
  window.open('https://www.mousa.ai/pricing', '_blank');
  return;
}

// ─── 3. تتبع الاستخدام أثناء الجلسة ────────────────────────
const usageFactors = {
  message_count: 0,
  image_count: 0,
  report_type_full: 0,
  room_count: 0
};

// عند كل رسالة:
usageFactors.message_count++;

// عند رفع صورة:
usageFactors.image_count++;

// عند طلب تقرير كامل:
usageFactors.report_type_full = 1;

// ─── 4. تنفيذ طلب AI ────────────────────────────────────────
const aiResult = await callYourAI(userInput);

// ─── 5. خصم الكريدت بعد النجاح (مع usage_factors) ──────────
const deductRes = await fetch('https://www.mousa.ai/api/platform/deduct-credits', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_PLATFORM_API_KEY',
    'X-Platform-ID': 'fada'
  },
  body: JSON.stringify({
    userId: user.userId,
    description: 'تحليل تصميم داخلي — فضاء',
    usage_factors: usageFactors
  })
});
const result = await deductRes.json();
console.log('تم الخصم:', result.deducted, 'كريدت | الرصيد الجديد:', result.newBalance);</pre>

  <h2 id="errors">أكواد الأخطاء</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>HTTP Status</th><th>رسالة الخطأ</th><th>السبب والحل</th></tr>
      </thead>
      <tbody>
        <tr><td>401</td><td>Unauthorized</td><td>مفتاح API مفقود أو غير صحيح — تحقق من Authorization header</td></tr>
        <tr><td>400</td><td>Invalid platform</td><td>قيمة X-Platform-ID غير صحيحة — استخدم القيم المدعومة</td></tr>
        <tr><td>400</td><td>Invalid or expired token</td><td>التوكن منتهي الصلاحية (5 دقائق) — أعد توجيه المستخدم لـ mousa.ai</td></tr>
        <tr><td>402</td><td>رصيد الكريدت غير كافٍ</td><td>رصيد المستخدم غير كافٍ — وجّهه لصفحة الشحن</td></tr>
        <tr><td>500</td><td>Internal server error</td><td>خطأ في الخادم — أعد المحاولة أو تواصل مع الدعم</td></tr>
      </tbody>
    </table>
  </div>

  <footer>
    mousa.ai Platform Integration Guide v2.0 — جميع الحقوق محفوظة © 2025
    <br/>
    للدعم التقني: <a href="mailto:dev@mousa.ai" style="color:#d4a017;">dev@mousa.ai</a>
  </footer>

</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
