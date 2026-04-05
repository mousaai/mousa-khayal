/**
 * AuthGate.tsx
 * مكوّن مفتوح بالكامل — لا حجب، لا إعادة توجيه
 *
 * FREE_MODE = true : كل زائر يحصل على رصيد غير محدود مجاناً بدون أي قيود
 * FREE_MODE = false: مصادقة Mousa عادية (زائر / مسجّل / fallback 200 كريدت)
 *
 * لإعادة تفعيل نظام الكريدت: غيّر FREE_MODE إلى false
 */
import React, { createContext, useContext } from "react";
import { useMousaAuth, type MousaUser } from "@/hooks/useMousaAuth";

export type { MousaUser };

/** تغيير هذا لإعادة تفعيل نظام الكريدت */
const FREE_MODE = true;

// مستخدم مجاني (FREE_MODE) — رصيد غير محدود
const FREE_USER: MousaUser = {
  userId: 0,
  openId: "free",
  name: "زائر",
  email: "",
  creditBalance: 999999,
  platform: "khayal",
  isFallback: false,
};

// مستخدم زائر عادي (بدون رصيد)
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
  isFreeMode: boolean;    // true في وضع المجاني الكامل
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

  // ─── FREE_MODE: تجاوز كل منطق Mousa ─────────────────────────────────────
  if (FREE_MODE) {
    return (
      <AuthContext.Provider
        value={{
          user: FREE_USER,
          isGuest: false,
          isFallback: false,
          isFreeMode: true,
          // خصم وهمي — لا يُرسَل لأي API
          deductCredits: async (_amount) => ({ newBalance: 999999 }),
          refreshBalance: async () => 999999,
          logout: () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // ─── الوضع العادي (FREE_MODE = false) ────────────────────────────────────

  const user = mousaUser ?? GUEST_USER;
  const isGuest = !mousaUser;
  const isFallback = mousaUser?.isFallback ?? false;

  async function deductCredits(amount: number, description?: string): Promise<{ newBalance: number }> {
    if (isGuest) {
      throw new Error("يجب تسجيل الدخول لاستخدام هذه الميزة");
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

  // شاشة تحميل أولية خفيفة (< 500ms)
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

  return (
    <AuthContext.Provider value={{ user, isGuest, isFallback, isFreeMode: false, deductCredits, refreshBalance, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
