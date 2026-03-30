import { useTranslation } from 'react-i18next';
import AIPlatformPage from "@/components/AIPlatformPage";
import { Sparkles } from "lucide-react";

export default function Khayal() {
  const { t } = useTranslation();
  return (
    <AIPlatformPage
      config={{
        id: "khayal",
        name: "خيال",
        nameEn: "KHAYAL",
        tagline: "مولّد الأفكار الإبداعية ثلاثية الأبعاد",
        description: "صف مشروعك الإبداعي أو الهندسي واحصل على مقترحات تصميمية ثلاثية الأبعاد مستوحاة من الهوية الإماراتية والمعمار المعاصر.",
        creditCost: 25,
        color: "#a855f7",
        bg: "rgba(168,85,247,0.08)",
        icon: Sparkles,
        placeholders: [
          "أريد تصميم واجهة مبنى سكني بلمسة إماراتية معاصرة",
          "فيلا خليجية بمسبح خارجي وحديقة — اقترح مفهوم ثلاثي الأبعاد",
          "مجمع تجاري صغير في دبي، أريد أفكاراً للواجهة والمدخل",
          "تصميم مكتب إبداعي مفتوح يجمع بين الأصالة والحداثة",
        ],
        disclaimer: "المقترحات للاسترشاد الإبداعي فقط ولا تُغني عن مهندس معماري مرخّص.",
      }}
    />
  );
}
