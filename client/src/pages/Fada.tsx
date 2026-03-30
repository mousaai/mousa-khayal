import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { Home as HomeIcon } from "lucide-react";

export default function Fada() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "fada",
        name: "فضاء",
        nameEn: "FADA",
        tagline: "المستشار الذكي للديكور الداخلي",
        description: "صف مساحتك بلغتك الطبيعية واحصل على توصيات تصميمية احترافية مع تحليل الإضاءة والألوان والأثاث والمواد.",
        creditCost: 20,
        color: "#d4a017",
        bg: "rgba(212,160,23,0.08)",
        icon: HomeIcon,
        placeholders: [
          "غرفة معيشة 5×6 متر، أريد ديكور عصري بألوان هادئة",
          "مكتب منزلي صغير، كيف أستغل المساحة بشكل أمثل؟",
          "مطبخ مفتوح على الصالة، ما الألوان المناسبة؟",
          "غرفة نوم رئيسية، أريد أجواء دافئة وهادئة",
        ],
        disclaimer: "التوصيات للاسترشاد فقط ولا تُغني عن استشارة مصمم داخلي متخصص.",
      }}
    />
  );
}
