import { useTranslation } from 'react-i18next';
/*
 * Privacy.tsx — سياسة الخصوصية
 * mousa.ai | آخر تحديث: مارس 2026
 */
import { Link } from "wouter";
import { ArrowRight, Shield, Eye, Lock, Database, UserCheck } from "lucide-react";

const LAST_UPDATED = "مارس 2026";
const EFFECTIVE_DATE = "1 مارس 2026";

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <div dir="rtl" style={{ background: "#060E18", minHeight: "100vh", color: "#E8EDF2" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(to bottom, #0D1B2A, #060E18)", borderBottom: "1px solid rgba(212,160,23,0.12)", padding: "5rem 0 3rem" }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <Link href="/">
            <button className="flex items-center gap-2 mb-8 text-sm transition-colors" style={{ color: "#8A9BB0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
              <ArrowRight size={15} />
              العودة إلى الرئيسية
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,23,0.12)", border: "1px solid rgba(212,160,23,0.2)" }}>
              <Shield size={20} style={{ color: "#D4A017" }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>سياسة الخصوصية</h1>
          </div>
          <p style={{ color: "#8A9BB0", fontSize: "0.9rem" }}>
            آخر تحديث: {LAST_UPDATED} &nbsp;·&nbsp; تاريخ السريان: {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ maxWidth: 860, padding: "3rem 1rem 5rem" }}>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Eye size={18} />, title: "ما نجمعه", desc: "بيانات الحساب والاستخدام والمدخلات التقنية فقط" },
            { icon: <Lock size={18} />, title: "كيف نحميه", desc: "تشفير TLS وAES-256 وضوابط وصول صارمة" },
            { icon: <UserCheck size={18} />, title: "حقوقك", desc: "الاطلاع والتصحيح والحذف وسحب الموافقة" },
          ].map((card) => (
            <div key={card.title} className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.12)" }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: "#D4A017" }}>
                {card.icon}
                <span className="font-semibold text-sm">{card.title}</span>
              </div>
              <p style={{ color: "#8A9BB0", fontSize: "0.82rem", lineHeight: 1.6 }}>{card.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ lineHeight: 1.85, fontSize: "0.95rem", color: "#C8D4E0" }} className="space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              1. مقدمة والتزامنا
            </h2>
            <p>
              تلتزم منصة mousa.ai بحماية خصوصية مستخدميها وفق أعلى المعايير الدولية، بما يتوافق مع اللائحة الأوروبية العامة لحماية البيانات (GDPR) وقانون حماية البيانات الشخصية لدولة الإمارات العربية المتحدة. تُوضّح هذه السياسة طبيعة البيانات التي نجمعها، وكيفية استخدامها وحمايتها، وحقوقك كاملةً تجاهها.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              2. البيانات التي نجمعها
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2" style={{ color: "#D4A017" }}>أ. بيانات الحساب</h3>
                <ul className="list-disc list-inside space-y-1" style={{ color: "#A0B0C4" }}>
                  <li>الاسم وعنوان البريد الإلكتروني عند التسجيل عبر نظام SSO.</li>
                  <li>معلومات المهنة والتخصص (اختيارية) لتخصيص التجربة.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2" style={{ color: "#D4A017" }}>ب. بيانات الاستخدام</h3>
                <ul className="list-disc list-inside space-y-1" style={{ color: "#A0B0C4" }}>
                  <li>سجلات الجلسات وأنماط التفاعل مع المنصة.</li>
                  <li>الطلبات المُرسَلة إلى نماذج الذكاء الاصطناعي والمخرجات المُولَّدة.</li>
                  <li>بيانات الجهاز والمتصفح وعنوان IP.</li>
                  <li>تواريخ وأوقات الوصول.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2" style={{ color: "#D4A017" }}>ج. بيانات المدفوعات</h3>
                <ul className="list-disc list-inside space-y-1" style={{ color: "#A0B0C4" }}>
                  <li>سجلات المعاملات المالية (المبالغ والتواريخ والحالة).</li>
                  <li>لا نخزّن بيانات البطاقات الائتمانية مباشرةً — تُعالَج عبر بوابات دفع مشفَّرة معتمدة.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              3. كيف نستخدم بياناتك
            </h2>
            <p>نستخدم بياناتك للأغراض التالية حصراً:</p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li>تقديم الخدمات وتشغيل المنصة وتحسين أدائها.</li>
              <li>تخصيص تجربة المستخدم وتقديم توصيات ملائمة.</li>
              <li>معالجة المدفوعات وإدارة الاشتراكات.</li>
              <li>إرسال إشعارات تشغيلية ضرورية (تحديثات الخدمة، تنبيهات الأمان).</li>
              <li>تحسين نماذج الذكاء الاصطناعي باستخدام بيانات مجمَّعة ومجهولة الهوية.</li>
              <li>الامتثال للالتزامات القانونية والتنظيمية.</li>
            </ul>
            <p className="mt-4">
              <strong style={{ color: "#E8EDF2" }}>لا نبيع بياناتك</strong> لأطراف ثالثة ولا نشاركها لأغراض تسويقية دون موافقتك الصريحة.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              4. الأساس القانوني للمعالجة
            </h2>
            <p>نعالج بياناتك استناداً إلى:</p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li><strong style={{ color: "#E8EDF2" }}>تنفيذ العقد:</strong> لتقديم الخدمات التي اشتركت فيها.</li>
              <li><strong style={{ color: "#E8EDF2" }}>الموافقة:</strong> للتسويق الاختياري وتحسين النماذج.</li>
              <li><strong style={{ color: "#E8EDF2" }}>المصلحة المشروعة:</strong> لأمن المنصة ومنع الاحتيال.</li>
              <li><strong style={{ color: "#E8EDF2" }}>الالتزام القانوني:</strong> للامتثال للأنظمة المعمول بها.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              5. حماية البيانات وأمنها
            </h2>
            <div className="flex gap-3 p-4 rounded-xl" style={{ background: "rgba(74,155,127,0.07)", border: "1px solid rgba(74,155,127,0.2)" }}>
              <Database size={18} style={{ color: "#4A9B7F", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="font-semibold mb-2" style={{ color: "#4A9B7F" }}>إجراءات الحماية المطبَّقة</p>
                <ul className="list-disc list-inside space-y-1" style={{ color: "#A0B0C4", fontSize: "0.88rem" }}>
                  <li>تشفير البيانات أثناء النقل (TLS 1.3) وأثناء التخزين (AES-256).</li>
                  <li>ضوابط وصول مبنية على الأدوار (RBAC) مع مراجعات دورية.</li>
                  <li>مراقبة مستمرة للأنشطة المشبوهة.</li>
                  <li>نسخ احتياطية مشفَّرة في مراكز بيانات معتمدة.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              6. مشاركة البيانات مع أطراف ثالثة
            </h2>
            <p>قد نشارك بياناتك في الحالات التالية المحدودة:</p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li><strong style={{ color: "#E8EDF2" }}>مزودو الخدمة:</strong> شركاء تقنيون (استضافة، دفع، تحليلات) ملتزمون بعدم استخدام بياناتك لأغراض أخرى.</li>
              <li><strong style={{ color: "#E8EDF2" }}>الالتزامات القانونية:</strong> عند صدور أوامر قضائية أو طلبات حكومية ملزِمة.</li>
              <li><strong style={{ color: "#E8EDF2" }}>حماية الحقوق:</strong> للدفاع عن حقوق المنصة أو مستخدميها عند الضرورة.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              7. الاحتفاظ بالبيانات
            </h2>
            <p>
              نحتفظ ببياناتك طوال فترة نشاط حسابك وبعدها لمدة لا تتجاوز <strong>3 سنوات</strong> للأغراض القانونية والتدقيقية، ما لم يُطلب منا الاحتفاظ بها لفترة أطول بموجب القانون. يمكنك طلب حذف بياناتك في أي وقت وفق الإجراءات المنصوص عليها في البند التالي.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              8. حقوقك
            </h2>
            <p>يحق لك في أي وقت:</p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li><strong style={{ color: "#E8EDF2" }}>الاطلاع:</strong> الحصول على نسخة من بياناتك الشخصية.</li>
              <li><strong style={{ color: "#E8EDF2" }}>التصحيح:</strong> تعديل البيانات غير الدقيقة أو غير المكتملة.</li>
              <li><strong style={{ color: "#E8EDF2" }}>الحذف:</strong> طلب مسح بياناتك ("الحق في النسيان").</li>
              <li><strong style={{ color: "#E8EDF2" }}>تقييد المعالجة:</strong> الحد من استخدام بياناتك في حالات معينة.</li>
              <li><strong style={{ color: "#E8EDF2" }}>قابلية النقل:</strong> استلام بياناتك بصيغة قابلة للقراءة الآلية.</li>
              <li><strong style={{ color: "#E8EDF2" }}>سحب الموافقة:</strong> إلغاء موافقتك على المعالجة الاختيارية في أي وقت.</li>
            </ul>
            <p className="mt-4">
              لممارسة أي من هذه الحقوق، تواصل معنا عبر: <a href="mailto:mousa@almaskanengineering.com" style={{ color: "#D4A017" }}>mousa@almaskanengineering.com</a> وسنستجيب خلال 30 يوماً.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              9. ملفات تعريف الارتباط (Cookies)
            </h2>
            <p>
              نستخدم ملفات تعريف الارتباط الضرورية لتشغيل المنصة (جلسات المستخدم، الأمان) وملفات تحليلية مجهولة الهوية لتحسين الأداء. يمكنك إدارة تفضيلاتك عبر إعدادات متصفحك، مع العلم أن تعطيل الملفات الضرورية قد يؤثر على وظائف المنصة.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              10. التحديثات والتواصل
            </h2>
            <p>
              قد نُحدِّث هذه السياسة دورياً. سنُخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار بارز داخل المنصة قبل 30 يوماً من سريانها.
            </p>
            <div style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.15)", borderRadius: "0.75rem", padding: "1.25rem", marginTop: "0.75rem" }}>
              <p style={{ color: "#E8EDF2", fontWeight: 600, marginBottom: "0.5rem" }}>شركة المسكن للاستشارات الهندسية — فرع أبو ظبي 1</p>
              <p style={{ color: "#E8EDF2", fontWeight: 500, fontSize: "0.85rem", marginBottom: "0.75rem" }}>AL MASKAN ENGINEERING CONSULTANTS — BRANCH OF ABU DHABI 1</p>
              <div style={{ display: "grid", gap: "0.4rem", fontSize: "0.9rem" }}>
                <p style={{ fontSize: "0.82rem", opacity: 0.55 }}>رقم الترخيص التجاري: CN-1288934</p>
                <p>العنوان: جزيرة أبوظبي، النادي السياحي، بناية سعيد عبدالله ناصر الجنيبي</p>
                <p>البريد الإلكتروني: <a href="mailto:mousa@almaskanengineering.com" style={{ color: "#D4A017" }}>mousa@almaskanengineering.com</a></p>
                <p>هاتف: <a href="tel:+971504323033" style={{ color: "#D4A017" }}>+971 50 432 3033</a></p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 mt-12 pt-8" style={{ borderTop: "1px solid rgba(212,160,23,0.1)" }}>
          <Link href="/terms">
            <span className="text-sm cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
              شروط الاستخدام
            </span>
          </Link>
          <Link href="/">
            <span className="text-sm cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
              الصفحة الرئيسية
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
