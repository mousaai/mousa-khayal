/**
 * AuthGate.tsx
 * مكوّن المصادقة مع mousa.ai — المنصة مفتوحة للجميع
 *
 * السيناريوهات:
 *   1. زائر بدون token: يستخدم المنصة بحرية (رصيد وهمي للتجربة)
 *   2. مستخدم mousa.ai (?token=...): يُتحقق من هويته ويُعرض رصيده الحقيقي
 *   3. جلسة محفوظة: تُستعاد تلقائياً مع تحديث الرصيد في الخلفية
 *   4. فشل الاتصال: يُمنح المستخدم 200 كريدت مجاني ويستمر بدون انقطاع
 */
import React, { createContext, useContext } from "react";
import { useMousaAuth, type MousaUser } from "@/hooks/useMousaAuth";

export type { MousaUser };

// مستخدم زائر عادي (بدون token من mousa.ai)
const GUEST_USER: MousaUser = {
  userId: 0,
  openId: "guest",
  name: "زائر",
  email: "",
  creditBalance: 0,
  platform: "khayal",
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: MousaUser;
  isGuest: boolean;       // true إذا لم يسجّل الدخول (لا token)
  isFallback: boolean;    // true إذا كان الرصيد مجانياً بسبب تعذّر الاتصال
  isFreeMode: boolean;    // دائماً false في هذا الوضع
  deductCredits: (amount: number, description?: string) => Promise<{ newBalance: number }>;
  refreshBalance: () => Promise<number>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthGate");
  return ctx;
}

// ─── AuthGate ────────────────────────────────────────────────────────────────

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    user: mousaUser,
    loading,
    deductCredits: mousaDeduct,
    refreshBalance: mousaRefresh,
    logout: mousaLogout,
  } = useMousaAuth();

  // شاشة تحميل أولية خفيفة (< 500ms) — فقط عند وجود token في URL
  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#080E1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Arabic', sans-serif",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid rgba(212,160,23,0.2)",
            borderTop: "3px solid #D4A017",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── تحديد حالة المستخدم ─────────────────────────────────────────────────
  const user = mousaUser ?? GUEST_USER;
  const isGuest = !mousaUser;
  const isFallback = mousaUser?.isFallback ?? false;

  async function deductCredits(amount: number, description?: string): Promise<{ newBalance: number }> {
    if (isGuest) {
      // الزوار: خصم وهمي — المنصة مفتوحة للتجربة
      return { newBalance: 0 };
    }
    return mousaDeduct(amount, description);
  }

  async function refreshBalance(): Promise<number> {
    if (isGuest) return 0;
    return mousaRefresh();
  }

  function logout() {
    mousaLogout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isFallback,
        isFreeMode: false,
        deductCredits,
        refreshBalance,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
