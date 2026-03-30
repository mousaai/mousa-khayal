/*
 * mousa.ai — FAQ Page
 * Design: Obsidian + Gold, IBM Plex Arabic, RTL-First
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, HelpCircle, Zap, CreditCard, Shield, Settings, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  icon: React.ElementType;
  title: string;
  color: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    icon: Zap,
    title: "نظام الكريدت",
    color: "#D4A017",
    items: [
      {
        q: "ما هو الكريدت وكيف يعمل؟",
        a: "الكريدت هو وحدة الاستخدام في mousa.ai. كل طلب تُرسله لأي منصة يستهلك عدداً من الكريدتات يتراوح بين 5 و60 كريدت حسب تعقيد الطلب. عند التسجيل تحصل على 200 كريدت مجاناً لتجربة المنصة.",
      },
      {
        q: "كم كريدت أحتاج لكل منصة؟",
        a: "فضاء (الديكور): 15–40 كريدت | رقابة (الإشراف): 20–50 كريدت | حرارة (الطاقة): 25–60 كريدت | مسكن (السكن): 10–30 كريدت | كود (الكودات): 5–15 كريدت. الطلبات البسيطة تستهلك أقل، والتقارير المفصّلة تستهلك أكثر.",
      },
      {
        q: "هل تنتهي صلاحية الكريدتات؟",
        a: "الكريدتات المشتراة لا تنتهي صلاحيتها أبداً — تبقى في حسابك حتى تستخدمها. أما كريدتات الاشتراك الشهري فتُضاف كل شهر ولا تتراكم (تُصفَّر عند التجديد).",
      },
      {
        q: "ماذا يحدث عند نفاد الكريدتات؟",
        a: "عند نفاد الكريدتات ستظهر رسالة تنبيه وسيتوقف إرسال الطلبات. يمكنك شراء حزمة كريدت إضافية أو الاشتراك في إحدى الباقات الشهرية من صفحة الأسعار.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "الاشتراكات والدفع",
    color: "#4A9B7F",
    items: [
      {
        q: "ما الفرق بين حزم الكريدت والاشتراك الشهري؟",
        a: "حزم الكريدت هي مدفوعات لمرة واحدة تمنحك رصيداً دائماً. الاشتراك الشهري يمنحك كريدتات متجددة كل شهر بسعر أقل للكريدت الواحد، وهو مناسب للاستخدام المنتظم.",
      },
      {
        q: "ما هي طرق الدفع المقبولة؟",
        a: "نقبل جميع بطاقات الائتمان والخصم الدولية (Visa, Mastercard, American Express) عبر Stripe. المدفوعات بالدولار الأمريكي (USD) لجميع المستخدمين حول العالم.",
      },
      {
        q: "كيف أُلغي اشتراكي الشهري؟",
        a: "من لوحة التحكم → تبويب \"اشتراكي\" → زر \"إدارة الاشتراك\". ستُحوَّل إلى بوابة Stripe حيث يمكنك إلغاء الاشتراك أو تغيير الباقة أو تحديث بيانات الدفع. يستمر الاشتراك حتى نهاية الدورة الحالية.",
      },
      {
        q: "هل يمكنني ترقية أو تخفيض باقتي؟",
        a: "نعم، من بوابة إدارة الاشتراك في Stripe يمكنك الترقية فوراً أو التخفيض في الدورة القادمة. عند الترقية يُحتسب الفرق بالتناسب.",
      },
      {
        q: "هل الدفع آمن؟",
        a: "نعم، جميع المدفوعات تتم عبر Stripe — أحد أكثر بوابات الدفع أماناً في العالم. نحن لا نخزن أي بيانات بطاقة ائتمانية على خوادمنا.",
      },
    ],
  },
  {
    icon: Shield,
    title: "الاسترداد والضمانات",
    color: "#5B8DD9",
    items: [
      {
        q: "ما هي سياسة الاسترداد؟",
        a: "نقدم استرداداً كاملاً خلال 7 أيام من الشراء للكريدتات غير المستخدمة. إذا استخدمت جزءاً من الكريدتات، يُسترد المبلغ المقابل للكريدتات المتبقية فقط. الاشتراكات الشهرية غير قابلة للاسترداد بعد بدء الدورة.",
      },
      {
        q: "كيف أطلب استرداد الأموال؟",
        a: "من لوحة التحكم → تبويب \"الاشتراك\" → نموذج \"طلب استرداد\". أدخل سبب الطلب وسيتم مراجعته خلال 1–3 أيام عمل. عند الموافقة يُعاد المبلغ تلقائياً لبطاقتك.",
      },
      {
        q: "كم يستغرق الاسترداد؟",
        a: "بعد الموافقة على طلبك، يظهر المبلغ في حسابك المصرفي خلال 5–10 أيام عمل حسب البنك.",
      },
    ],
  },
  {
    icon: Settings,
    title: "الحساب والإعدادات",
    color: "#9B7FE2",
    items: [
      {
        q: "كيف أُسجّل الدخول؟",
        a: "انقر على \"تسجيل الدخول\" في الشريط العلوي. نستخدم نظام OAuth الآمن — لا تحتاج لإنشاء كلمة مرور جديدة.",
      },
      {
        q: "هل يمكنني استخدام المنصة من الجوال؟",
        a: "نعم، mousa.ai مصممة للعمل على جميع الأجهزة — الحاسوب والجوال والتابلت. الواجهة متجاوبة بالكامل.",
      },
      {
        q: "هل بياناتي محفوظة؟",
        a: "نعم، جميع محادثاتك وجلساتك محفوظة في حسابك ويمكنك الرجوع إليها في أي وقت من لوحة التحكم. نحن لا نشارك بياناتك مع أطراف ثالثة.",
      },
      {
        q: "كيف أحذف حسابي؟",
        a: "تواصل معنا عبر صفحة التواصل أو البريد الإلكتروني mousa@almaskanengineering.com وسنحذف حسابك وجميع بياناتك خلال 30 يوماً.",
      },
    ],
  },
  {
    icon: HelpCircle,
    title: "المنصات والميزات",
    color: "#E2724A",
    items: [
      {
        q: "ما هي المنصات الست؟",
        a: "فضاء: مستشار الديكور الداخلي الذكي | رقابة: المشرف الميداني الذكي لمواقع البناء | حرارة: محلل الكفاءة الطاقوية | مسكن: محلل الاحتياجات السكنية | كود: مرجع كودات البناء والسلامة | خيال: مولد المرئيات بكل المجالات.",
      },
      {
        q: "هل يمكنني استخدام أكثر من منصة بنفس الحساب؟",
        a: "نعم، حسابك الواحد يمنحك وصولاً لجميع المنصات الست. الكريدتات مشتركة بين جميع المنصات.",
      },
      {
        q: "ما اللغات التي تدعمها المنصة؟",
        a: "المنصة تدعم العربية والإنجليزية والأردية والهندية والفرنسية. يمكنك تغيير اللغة من الزر في الشريط العلوي.",
      },
      {
        q: "هل يمكنني تصدير التقارير؟",
        a: "نعم، معظم التقارير المُولَّدة يمكن نسخها أو تصديرها. نعمل على إضافة تصدير PDF مباشر قريباً.",
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: isOpen ? "rgba(212,160,23,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOpen ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.06)"}`,
        marginBottom: "0.5rem",
      }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-right"
        onClick={onToggle}
      >
        <span
          className="font-semibold text-sm leading-relaxed"
          style={{ color: isOpen ? "#D4A017" : "#E8EDF2" }}
        >
          {item.q}
        </span>
        <ChevronDown
          size={16}
          className="flex-shrink-0 mr-3 transition-transform"
          style={{
            color: isOpen ? "#D4A017" : "#8A9BB0",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-5">
          <div
            className="pt-2"
            style={{
              borderTop: "1px solid rgba(212,160,23,0.08)",
              color: "#8A9BB0",
              fontSize: "0.875rem",
              lineHeight: 1.8,
            }}
          >
            {item.a}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<number>(0);

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const category = FAQ_CATEGORIES[activeCategory];
  const Icon = category.icon;

  return (
    <div className="min-h-screen" style={{ background: "#080E1A" }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 relative">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="container relative z-10 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-mono"
            style={{
              background: "rgba(212,160,23,0.08)",
              border: "1px solid rgba(212,160,23,0.2)",
              color: "#D4A017",
            }}
          >
            <HelpCircle size={12} />
            الأسئلة الشائعة
          </div>
          <h1
            className="font-bold mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              color: "#E8EDF2",
              lineHeight: 1.3,
            }}
          >
            كيف يمكننا{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #D4A017, #F0C040)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              مساعدتك؟
            </span>
          </h1>
          <p style={{ color: "#8A9BB0", fontSize: "1rem", lineHeight: 1.75, maxWidth: "520px", margin: "0 auto" }}>
            إجابات على أكثر الأسئلة شيوعاً حول mousa.ai — الكريدتات، الاشتراكات، الاسترداد، والمنصات.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Sidebar — Category Navigation */}
            <div className="lg:col-span-3">
              <div
                className="rounded-2xl p-4 sticky top-24"
                style={{ background: "rgba(13,27,42,0.6)", border: "1px solid rgba(212,160,23,0.08)" }}
              >
                <p className="text-xs font-mono mb-4" style={{ color: "#8A9BB0", letterSpacing: "0.08em" }}>
                  التصنيفات
                </p>
                <ul className="space-y-1">
                  {FAQ_CATEGORIES.map((cat, idx) => {
                    const CatIcon = cat.icon;
                    const isActive = activeCategory === idx;
                    return (
                      <li key={cat.title}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all"
                          style={{
                            background: isActive ? `rgba(${cat.color === "#D4A017" ? "212,160,23" : cat.color === "#4A9B7F" ? "74,155,127" : cat.color === "#5B8DD9" ? "91,141,217" : cat.color === "#9B7FE2" ? "155,127,226" : "226,114,74"},0.1)` : "transparent",
                            border: isActive ? `1px solid ${cat.color}30` : "1px solid transparent",
                          }}
                          onClick={() => {
                            setActiveCategory(idx);
                            setOpenItems({});
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${cat.color}18` }}
                          >
                            <CatIcon size={14} style={{ color: cat.color }} />
                          </div>
                          <span
                            className="text-sm font-medium"
                            style={{ color: isActive ? cat.color : "#B0C0D4" }}
                          >
                            {cat.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* FAQ Items */}
            <div className="lg:col-span-9">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${category.color}18` }}
                >
                  <Icon size={18} style={{ color: category.color }} />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "#E8EDF2" }}>
                    {category.title}
                  </h2>
                  <p className="text-xs" style={{ color: "#8A9BB0" }}>
                    {category.items.length} سؤال
                  </p>
                </div>
              </div>

              {/* Accordion */}
              <div>
                {category.items.map((item, idx) => {
                  const key = `${activeCategory}-${idx}`;
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={!!openItems[key]}
                      onToggle={() => toggleItem(key)}
                    />
                  );
                })}
              </div>

              {/* Still have questions? */}
              <div
                className="mt-10 rounded-2xl p-8 text-center"
                style={{
                  background: "rgba(212,160,23,0.04)",
                  border: "1px solid rgba(212,160,23,0.12)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(212,160,23,0.1)" }}
                >
                  <MessageCircle size={22} style={{ color: "#D4A017" }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#E8EDF2" }}>
                  لم تجد إجابتك؟
                </h3>
                <p className="mb-6" style={{ color: "#8A9BB0", fontSize: "0.875rem", lineHeight: 1.75 }}>
                  فريقنا جاهز للمساعدة. تواصل معنا وسنرد خلال 24 ساعة.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/contact">
                    <button className="btn-gold text-sm px-6 py-2.5">
                      تواصل معنا
                    </button>
                  </Link>
                  <a href="mailto:mousa@almaskanengineering.com">
                    <button
                      className="text-sm px-6 py-2.5 rounded-xl transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#B0C0D4",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    >
                      mousa@almaskanengineering.com
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
