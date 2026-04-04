/**
 * AuthGate.tsx
 * مكوّن مختلط — زوار مفتوحون + مستخدمون مربوطون بـ Mousa.ai
 *
 * الزوار (بدون تسجيل): يرون المنصة بحرية لكن عند استخدام ميزة مدفوعة يُطلب منهم تسجيل الدخول
 * المستخدمون (مسجلون عبر Mousa): رصيدهم حقيقي من Mousa.ai ويُخصم منه بتسعيرة خيال
 */
import React, { createContext, useContext } from "react";
import { useMousaAuth, type MousaUser } from "@/hooks/useMousaAuth";

export type { MousaUser };

// مستخدم زائر افتراضي (بدون رصيد حقيقي)
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
  user: MousaUser;        // زائر أو مستخدم مسجّل
  isGuest: boolean;       // true إذا لم يسجّل الدخول
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

// ─── AuthGate ────────────────────────────────────────────────────────────────────────────────

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user: mousaUser, loading, deductCredits: mousaDeduct, refreshBalance: mousaRefresh, logout: mousaLogout } = useMousaAuth();

  // المستخدم الفعلي: إذا لم يسجّل نستخدم الزائر الافتراضي
  const user = mousaUser ?? GUEST_USER;
  const isGuest = !mousaUser;

  // خصم الكريدت: للمسجّلين فقط عبر Mousa API
  async function deductCredits(amount: number, description?: string): Promise<{ newBalance: number }> {
    if (isGuest) {
      throw new Error("يجب تسجيل الدخول عبر mousa.ai لاستخدام هذه الميزة");
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

  // تحميل أولي فقط (< 300ms عادةً)
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
    <AuthContext.Provider value={{ user, isGuest, deductCredits, refreshBalance, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
