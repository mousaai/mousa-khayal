import { useTranslation } from 'react-i18next';
/*
 * Terms.tsx — شروط الاستخدام
 * mousa.ai | آخر تحديث: مارس 2026
 */
import { Link } from "wouter";
import { ArrowRight, FileText, AlertTriangle, Shield, Scale } from "lucide-react";

const LAST_UPDATED = "مارس 2026";
const EFFECTIVE_DATE = "1 مارس 2026";

export default function Terms() {
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
              <FileText size={20} style={{ color: "#D4A017" }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>شروط الاستخدام</h1>
          </div>
          <p style={{ color: "#8A9BB0", fontSize: "0.9rem" }}>
            آخر تحديث: {LAST_UPDATED} &nbsp;·&nbsp; تاريخ السريان: {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ maxWidth: 860, padding: "3rem 1rem 5rem" }}>

        {/* Disclaimer Banner */}
        <div className="flex gap-3 p-4 rounded-xl mb-10" style={{ background: "rgba(226,114,74,0.08)", border: "1px solid rgba(226,114,74,0.25)" }}>
          <AlertTriangle size={20} style={{ color: "#E2724A", flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: "#E2724A", fontSize: "0.9rem", lineHeight: 1.7 }}>
            <strong>تنبيه مهم:</strong> تُقدِّم منصة mousa.ai أدوات ذكاء اصطناعي مساعِدة للأغراض المعلوماتية والتصميمية فحسب. جميع المخرجات تقديرية وغير ملزِمة قانونياً أو هندسياً. يتحمل المستخدم وحده المسؤولية الكاملة عن أي قرار يتخذه بناءً على هذه المخرجات.
          </p>
        </div>

        <div style={{ lineHeight: 1.85, fontSize: "0.95rem", color: "#C8D4E0" }} className="space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              1. القبول بالشروط
            </h2>
            <p>
              باستخدامك لمنصة mousa.ai أو أي من خدماتها أو واجهاتها البرمجية، فإنك تُقرّ بأنك قرأت هذه الشروط وفهمتها وقبلتها كاملةً. إن كنت تستخدم المنصة نيابةً عن جهة اعتبارية، فأنت تُقرّ بأنك مفوَّض قانونياً للقبول بهذه الشروط باسمها.
            </p>
            <p className="mt-3">
              إذا كنت لا توافق على أي بند من هذه الشروط، يجب عليك التوقف فوراً عن استخدام المنصة.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              2. طبيعة الخدمة وحدودها
            </h2>
            <p>
              تُتيح منصة mousa.ai أدوات ذكاء اصطناعي متخصصة في مجالات التصميم المعماري والداخلي، والإشراف الميداني، والكفاءة الطاقوية، والتحليل السكني، وكودات البناء. هذه الأدوات <strong>مساعِدة ومعلوماتية بطبيعتها</strong>، وتهدف إلى دعم اتخاذ القرار لا استبداله.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li>لا تُعدّ مخرجات المنصة وثائق هندسية رسمية أو تقارير فنية معتمدة.</li>
              <li>لا تُغني عن الرجوع إلى مهندسين مرخصين أو جهات حكومية مختصة.</li>
              <li>قد تحتوي المخرجات على أخطاء أو تقديرات غير دقيقة نتيجة محدودية نماذج الذكاء الاصطناعي.</li>
              <li>لا تضمن المنصة توافق مخرجاتها مع الأنظمة واللوائح المحلية المعمول بها.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              3. إخلاء المسؤولية الكامل
            </h2>
            <div className="p-4 rounded-xl" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.15)" }}>
              <div className="flex gap-2 mb-3">
                <Scale size={18} style={{ color: "#D4A017", flexShrink: 0, marginTop: 2 }} />
                <strong style={{ color: "#D4A017" }}>مسؤولية المستخدم الكاملة</strong>
              </div>
              <p>
                يتحمل المستخدم وحده المسؤولية الكاملة والحصرية عن:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
                <li>التحقق من صحة جميع المخرجات والتوصيات الصادرة عن المنصة قبل تطبيقها.</li>
                <li>الحصول على الموافقات والتراخيص اللازمة من الجهات المختصة.</li>
                <li>أي قرارات هندسية أو معمارية أو مالية تُتخذ بناءً على مخرجات المنصة.</li>
                <li>أي أضرار مباشرة أو غير مباشرة تنشأ عن الاعتماد على هذه المخرجات.</li>
                <li>الامتثال لجميع الأنظمة والقوانين المحلية والدولية ذات الصلة.</li>
              </ul>
            </div>
            <p className="mt-4">
              تُقدَّم الخدمة <strong>"كما هي" (AS-IS)</strong> دون أي ضمانات صريحة أو ضمنية، بما فيها ضمانات الصلاحية لغرض معين أو الدقة أو الاكتمال. لا تتحمل منصة mousa.ai أي مسؤولية عن أي خسارة أو ضرر من أي نوع ناجم عن استخدام الخدمة أو عدم القدرة على استخدامها.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              4. حساب المستخدم والكريدت
            </h2>
            <p>
              يتلقى المستخدم عند التسجيل رصيداً ابتدائياً مجانياً (200 كريدت) لاستكشاف المنصة. الكريدت وسيلة داخلية للوصول إلى الخدمات ولا تمثل قيمة نقدية قابلة للاسترداد. تحتفظ المنصة بالحق في تعديل سياسة الكريدت في أي وقت مع إشعار مسبق.
            </p>
            <p className="mt-3">
              أنت مسؤول عن الحفاظ على سرية بيانات حسابك وعن جميع الأنشطة التي تجري تحت حسابك.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              5. الاستخدام المقبول
            </h2>
            <p>يُحظر على المستخدم:</p>
            <ul className="list-disc list-inside space-y-2 mt-3" style={{ color: "#A0B0C4" }}>
              <li>استخدام المنصة لأغراض غير مشروعة أو تنتهك حقوق الآخرين.</li>
              <li>محاولة اختراق أو تعطيل أنظمة المنصة أو بنيتها التحتية.</li>
              <li>إعادة بيع أو توزيع مخرجات المنصة تجارياً دون إذن كتابي مسبق.</li>
              <li>استخدام أدوات آلية لاستخراج البيانات (Scraping) بشكل مفرط.</li>
              <li>انتحال صفة أشخاص أو جهات أخرى.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              6. الملكية الفكرية
            </h2>
            <p>
              جميع عناصر المنصة — بما فيها الكود البرمجي والتصاميم والعلامات التجارية ونماذج الذكاء الاصطناعي — هي ملك حصري لمنصة mousa.ai أو مرخَّصة لها. تمنحك المنصة ترخيصاً محدوداً وغير حصري وغير قابل للتحويل لاستخدام الخدمة للأغراض المشروعة المنصوص عليها.
            </p>
            <p className="mt-3">
              تحتفظ المنصة بحق استخدام المدخلات والمخرجات بصورة مجمَّعة ومجهولة الهوية لتحسين نماذجها وخدماتها.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              7. المدفوعات والاسترداد
            </h2>
            <p>
              جميع المدفوعات نهائية وغير قابلة للاسترداد إلا في حالات الخطأ التقني الموثَّق من جانب المنصة. تُعالَج المدفوعات عبر بوابات دفع آمنة ومعتمدة. لا تخزّن المنصة بيانات بطاقات الدفع مباشرةً.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              8. التعديلات والإنهاء
            </h2>
            <p>
              تحتفظ المنصة بالحق في تعديل هذه الشروط في أي وقت. سيُشار إلى تاريخ التعديل في أعلى هذه الصفحة. استمرارك في استخدام المنصة بعد نشر التعديلات يُعدّ قبولاً ضمنياً بها.
            </p>
            <p className="mt-3">
              تحتفظ المنصة بالحق في تعليق أو إنهاء أي حساب يُخالف هذه الشروط دون إشعار مسبق.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              9. القانون المطبَّق
            </h2>
            <p>
              تخضع هذه الشروط وتُفسَّر وفق قوانين دولة الإمارات العربية المتحدة. تختص محاكم إمارة أبوظبي بالفصل في أي نزاع ينشأ عن هذه الشروط أو يتعلق بها.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              10. التواصل
            </h2>
            <p>
              لأي استفسار قانوني أو شكوى تتعلق بهذه الشروط، يُرجى التواصل مع الجهة المشغِّلة:
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
            <p style={{ marginTop: "0.75rem" }}>
            </p>
          </section>

        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap gap-4 mt-12 pt-8" style={{ borderTop: "1px solid rgba(212,160,23,0.1)" }}>
          <Link href="/privacy">
            <span className="text-sm cursor-pointer transition-colors" style={{ color: "#8A9BB0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4A017")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A9BB0")}>
              سياسة الخصوصية
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
