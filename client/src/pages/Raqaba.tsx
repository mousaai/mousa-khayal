import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { Shield } from "lucide-react";

export default function Raqaba() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "raqaba",
        name: "رقابة",
        nameEn: "RAQABA",
        tagline: "المشرف الميداني الذكي",
        description: "ارفع صور موقع البناء واحصل على تقرير تفتيش فوري يرصد المخالفات ويقيّم التقدم الإنشائي.",
        creditCost: 30,
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.08)",
        icon: Shield,
        placeholders: [
          "أحتاج تقرير تفتيش لموقع بناء في مرحلة الهيكل الخرساني",
          "كيف أتحقق من جودة الخرسانة في الموقع؟",
          "ما المخالفات الشائعة في تنفيذ الأساسات؟",
          "أريد قائمة تفتيش لمرحلة التشطيبات",
        ],
        disclaimer: "التقارير للاسترشاد فقط ولا تُغني عن الإشراف الهندسي الميداني المتخصص.",
      }}
    />
  );
}
