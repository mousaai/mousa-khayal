/**
 * useMousaWidget — يحقن MOUSA_CONTEXT ديناميكياً بعد تحميل بيانات المستخدم
 * يُستدعى من App.tsx ليكون فعّالاً في جميع الصفحات
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Map route paths to Arabic page names for MOUSA_CONTEXT
const PAGE_NAMES: Record<string, string> = {
  "/": "الصفحة الرئيسية",
  "/dashboard": "لوحة التحكم",
  "/fada": "منصة فضاء",
  "/raqaba": "منصة رقابة",
  "/harara": "منصة حرارة",
  "/maskan": "منصة مسكن",
  "/code": "منصة كود",
  "/pricing": "الأسعار",
  "/register": "التسجيل",
  "/login": "تسجيل الدخول",
  "/profile": "الملف الشخصي",
  "/credits": "الكريدت",
  "/admin": "لوحة الإدارة",
};

declare global {
  interface Window {
    MOUSA_CONTEXT?: {
      userName: string;
      credits: number;
      plan: string;
      currentPage: string;
      currentPlatform?: string;
      isAuthenticated?: boolean;
    };
    MOUSA_WIDGET?: {
      updateContext?: (ctx: Window["MOUSA_CONTEXT"]) => void;
    };
    MousaWidget?: {
      open: () => void;
      close: () => void;
      speak: (text: string) => Promise<void>;
      sendMessage: (msg: string) => Promise<void>;
      executeCommand: (cmd: object) => Promise<void>;
      startTour: () => void;
      fillField: (selector: string, value: string) => void;
    };
  }
}

export function useMousaWidget() {
  const [location] = useLocation();

  // Fetch user data
  const { data: user } = trpc.auth.me.useQuery();

  // Fetch credit balance (only if logged in)
  const { data: wallet } = trpc.credits.getBalance.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000, // refresh every 30s
  });

  // Fetch subscription (only if logged in)
  const { data: subscription } = trpc.subscriptions.getMy.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    const currentPage = PAGE_NAMES[location] ?? location;

    // Build plan name in Arabic
    let planName = "مجاني";
    if (subscription?.planId) {
      const planMap: Record<string, string> = {
        starter: "احترافي",
        pro: "متقدم",
        office: "مؤسسي",
        "starter-monthly": "احترافي",
        "pro-monthly": "متقدم",
        "office-monthly": "مؤسسي",
      };
      planName = planMap[subscription.planId] ?? subscription.planId;
    }

    // Detect current platform from path
    const platformMap: Record<string, string> = {
      "/fada": "فضاء",
      "/raqaba": "رقابة",
      "/harara": "حرارة",
      "/maskan": "مسكن",
      "/code": "كود",
    };
    const currentPlatform = platformMap[location];

    const context = {
      userName: user?.name ?? "",
      credits: wallet?.balance ?? 0,
      plan: planName,
      currentPage,
      currentPlatform,
      isAuthenticated: !!user,
    };

    // Inject into window for the widget to read
    window.MOUSA_CONTEXT = context;

    // If widget is already loaded and supports live updates, notify it
    if (window.MOUSA_WIDGET?.updateContext) {
      window.MOUSA_WIDGET.updateContext(context);
    }
  }, [user, wallet, subscription, location]);
}
