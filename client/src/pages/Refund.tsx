import { useTranslation } from 'react-i18next';
/*
 * Refund.tsx — سياسة الاسترداد والإلغاء
 * mousa.ai | آخر تحديث: مارس 2026
 * مطابقة لمتطلبات قانون التجارة الإلكترونية الإماراتي ونظام حماية المستهلك السعودي
 */
import { Link } from "wouter";
import { ArrowRight, RefreshCw, CreditCard, AlertCircle, CheckCircle2, Clock, Mail } from "lucide-react";

const LAST_UPDATED = "مارس 2026";
const EFFECTIVE_DATE = "1 مارس 2026";
const SUPPORT_EMAIL = "mousa@almaskanengineering.com";

export default function Refund() {
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
              <RefreshCw size={20} style={{ color: "#D4A017" }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>سياسة الاسترداد والإلغاء</h1>
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
            { icon: <Clock size={18} />, title: "مدة الاسترداد", desc: "7 أيام من تاريخ الشراء للكريدت غير المستخدم" },
            { icon: <CreditCard size={18} />, title: "طريقة الاسترداد", desc: "إلى نفس وسيلة الدفع الأصلية خلال 5-10 أيام عمل" },
            { icon: <Mail size={18} />, title: "التواصل", desc: "mousa@almaskanengineering.com — رد خلال 24 ساعة" },
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

          {/* 1 — نطاق السياسة */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              1. نطاق هذه السياسة
            </h2>
            <p>
              تنطبق هذه السياسة على جميع المشتريات المُنجزة عبر منصة <strong style={{ color: "#D4A017" }}>mousa.ai</strong>، بما تشمل:
              حزم الكريدت (المدفوعات الفردية)، والاشتراكات الشهرية المتكررة. تُطبَّق هذه السياسة وفقاً لأحكام
              قانون حماية المستهلك الإماراتي رقم 15 لسنة 2020 ولائحته التنفيذية، ونظام حماية المستهلك السعودي
              الصادر بالمرسوم الملكي رقم م/31.
            </p>
          </section>

          {/* 2 — حزم الكريدت */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              2. استرداد حزم الكريدت (المدفوعات الفردية)
            </h2>

            <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
                <span className="font-semibold text-sm" style={{ color: "#4ade80" }}>الحالات التي يُقبل فيها الاسترداد</span>
              </div>
              <ul className="space-y-1" style={{ color: "#C8D4E0", fontSize: "0.875rem" }}>
                <li>• طلب الاسترداد خلال <strong>7 أيام</strong> من تاريخ الشراء.</li>
                <li>• لم يُستخدم أكثر من <strong>10%</strong> من الكريدت المشتراة.</li>
                <li>• وجود خلل تقني موثَّق منعك من استخدام الخدمة.</li>
                <li>• تكرار الخصم من حسابك عن طريق الخطأ.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} style={{ color: "#f87171" }} />
                <span className="font-semibold text-sm" style={{ color: "#f87171" }}>الحالات التي لا يُقبل فيها الاسترداد</span>
              </div>
              <ul className="space-y-1" style={{ color: "#C8D4E0", fontSize: "0.875rem" }}>
                <li>• مرور أكثر من 7 أيام على تاريخ الشراء.</li>
                <li>• استخدام أكثر من 10% من الكريدت المشتراة.</li>
                <li>• عدم الرضا عن مخرجات الذكاء الاصطناعي (طبيعة الخدمة).</li>
                <li>• الكريدت المكتسب كمكافأة ترحيب أو عروض ترويجية.</li>
              </ul>
            </div>
          </section>

          {/* 3 — الاشتراكات */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              3. إلغاء الاشتراكات الشهرية
            </h2>
            <p className="mb-4">
              يمكنك إلغاء اشتراكك في أي وقت من خلال لوحة التحكم ← تبويب "اشتراكي" ← "إدارة الاشتراك". عند الإلغاء:
            </p>
            <ul className="space-y-2" style={{ paddingRight: "1rem" }}>
              <li style={{ borderRight: "2px solid rgba(212,160,23,0.3)", paddingRight: "1rem" }}>
                <strong style={{ color: "#D4A017" }}>الإلغاء قبل تجديد الدورة:</strong> يستمر الاشتراك حتى نهاية الفترة المدفوعة ولا يتجدد تلقائياً.
              </li>
              <li style={{ borderRight: "2px solid rgba(212,160,23,0.3)", paddingRight: "1rem" }}>
                <strong style={{ color: "#D4A017" }}>الإلغاء خلال 48 ساعة من التجديد:</strong> يحق لك طلب استرداد رسوم الدورة الجديدة كاملةً إذا لم تستخدم أي كريدت منها.
              </li>
              <li style={{ borderRight: "2px solid rgba(212,160,23,0.3)", paddingRight: "1rem" }}>
                <strong style={{ color: "#D4A017" }}>بعد 48 ساعة من التجديد:</strong> لا يُسترد رسم الاشتراك الشهري الجاري.
              </li>
            </ul>
          </section>

          {/* 4 — إجراءات الطلب */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              4. كيفية تقديم طلب الاسترداد
            </h2>
            <p className="mb-4">لتقديم طلب استرداد، أرسل بريداً إلكترونياً إلى <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#D4A017" }}>{SUPPORT_EMAIL}</a> متضمناً:</p>
            <ol className="space-y-2" style={{ paddingRight: "1.5rem", listStyleType: "decimal" }}>
              <li>اسمك الكامل وعنوان البريد الإلكتروني المرتبط بالحساب.</li>
              <li>تاريخ الشراء ومبلغ العملية.</li>
              <li>سبب طلب الاسترداد بشكل مختصر.</li>
              <li>لقطة شاشة أو رقم المعاملة إن أمكن.</li>
            </ol>
            <p className="mt-4">
              سيرد فريقنا خلال <strong>24 ساعة عمل</strong>. في حال الموافقة، يُعاد المبلغ إلى وسيلة الدفع الأصلية خلال
              <strong> 5–10 أيام عمل</strong> وفقاً لسياسة البنك أو مزود الدفع.
            </p>
          </section>

          {/* 5 — Chargeback */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              5. النزاعات والـ Chargeback
            </h2>
            <p>
              نشجعك على التواصل معنا مباشرةً قبل اللجوء إلى بنكك أو مزود بطاقتك الائتمانية لفتح نزاع (Chargeback).
              معظم المشكلات تُحل خلال 24 ساعة. في حال تقديم Chargeback دون التواصل معنا مسبقاً، نحتفظ بحق
              تعليق الحساب ريثما يُحسم النزاع.
            </p>
          </section>

          {/* 6 — التعديلات */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              6. تعديل هذه السياسة
            </h2>
            <p>
              نحتفظ بحق تعديل هذه السياسة في أي وقت. سيُبلَّغ المستخدمون المسجَّلون بأي تغييرات جوهرية عبر
              البريد الإلكتروني قبل <strong>14 يوماً</strong> من سريانها. الاستمرار في استخدام الخدمة بعد التعديل
              يُعدّ قبولاً ضمنياً للسياسة الجديدة.
            </p>
          </section>

          {/* 7 — الاختصاص */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#E8EDF2", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              7. الاختصاص القضائي
            </h2>
            <p>
              تخضع هذه السياسة لقوانين دولة الإمارات العربية المتحدة. تختص محاكم إمارة أبوظبي بالفصل في أي نزاع
              ينشأ عن تطبيقها أو تفسيرها.
            </p>
          </section>

          {/* Contact Box */}
          <div className="p-6 rounded-2xl" style={{ background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.15)" }}>
            <h3 className="font-bold mb-3" style={{ color: "#D4A017", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              تواصل معنا
            </h3>
            <p style={{ color: "#C8D4E0", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              لأي استفسار حول هذه السياسة أو لتقديم طلب استرداد:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2" style={{ color: "#8A9BB0", fontSize: "0.875rem" }}>
                <Mail size={14} style={{ color: "#D4A017" }} />
                <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#D4A017" }}>{SUPPORT_EMAIL}</a>
              </div>
              <div className="flex items-center gap-2" style={{ color: "#8A9BB0", fontSize: "0.875rem" }}>
                <Clock size={14} style={{ color: "#D4A017" }} />
                <span>أوقات الرد: الأحد – الخميس، 9:00 ص – 6:00 م (بتوقيت الإمارات)</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
