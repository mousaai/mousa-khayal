import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { Thermometer } from "lucide-react";

export default function Harara() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "harara",
        name: "حرارة",
        nameEn: "HARARA",
        tagline: "محلل الكفاءة الطاقوية",
        description: "أدخل بيانات المبنى والموقع واحصل على تقرير شامل للأحمال الحرارية وتوصيات تحسين الكفاءة.",
        creditCost: 35,
        color: "#f97316",
        bg: "rgba(249,115,22,0.08)",
        icon: Thermometer,
        placeholders: [
          "مبنى سكني 3 طوابق في الرياض، أحتاج حساب الأحمال الحرارية",
          "كيف أحسن عزل مبنى قديم لتقليل استهلاك الطاقة؟",
          "ما المواصفات المناسبة لنوافذ مزدوجة في المناخ الحار؟",
          "أريد تقييم كفاءة نظام التكييف الحالي في مبنى تجاري",
        ],
        disclaimer: "الحسابات تقريبية للاسترشاد ولا تُغني عن الدراسة الهندسية التفصيلية.",
      }}
    />
  );
}
