import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { BookOpen } from "lucide-react";

export default function Code() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "code",
        name: "كود",
        nameEn: "CODE",
        tagline: "مرجع الكودات الهندسية",
        description: "ابحث في أكثر من 700 بند من كودات البناء والسلامة والاشتراطات الفنية بسرعة ودقة استثنائية.",
        creditCost: 10,
        color: "#a855f7",
        bg: "rgba(168,85,247,0.08)",
        icon: BookOpen,
        placeholders: [
          "ما اشتراطات الحريق في المباني السكنية متعددة الطوابق؟",
          "ما الحد الأدنى لعرض السلالم وفق الكود السعودي؟",
          "ما متطلبات ذوي الاحتياجات الخاصة في المباني التجارية؟",
          "ما مواصفات خزانات المياه وفق الاشتراطات الرسمية؟",
        ],
        disclaimer: "المعلومات للاسترشاد فقط، يُرجى الرجوع للجهات الرسمية للتحقق من الاشتراطات المحدّثة.",
      }}
    />
  );
}
