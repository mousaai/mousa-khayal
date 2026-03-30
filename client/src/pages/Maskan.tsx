import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { Building2 } from "lucide-react";

export default function Maskan() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "maskan",
        name: "مسكن",
        nameEn: "MASKAN",
        tagline: "محلل الاحتياجات السكنية",
        description: "حلّل احتياجات أسرتك السكنية وأوضاعها المالية واحصل على توصية مدروسة بأنسب خيار سكني.",
        creditCost: 15,
        color: "#22c55e",
        bg: "rgba(34,197,94,0.08)",
        icon: Building2,
        placeholders: [
          "أسرة مكونة من 4 أفراد، دخل شهري 15,000 ريال، هل أشتري أم أستأجر؟",
          "أريد مقارنة بين شراء شقة وبناء منزل في نفس الميزانية",
          "ما شروط التمويل العقاري المناسب لراتب 12,000 ريال؟",
          "كيف أقيّم حي سكني قبل الشراء؟",
        ],
        disclaimer: "التوصيات للاسترشاد فقط ولا تُغني عن استشارة مستشار مالي أو عقاري متخصص.",
      }}
    />
  );
}
