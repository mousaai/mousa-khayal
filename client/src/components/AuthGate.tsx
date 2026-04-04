/**
 * AuthGate.tsx
 * مكوّن مفتوح — لا يتطلب مصادقة Mousa.ai
 * المنصة متاحة للجميع بدون قيود دخول
 */
import React, { createContext, useContext, useState, useCallback } from "react";

export interface MousaUser {
  userId: number;
  openId: string;
  name: string;
  email: string;
  creditBalance: number;
  platform: string;
}

// مستخدم افتراضي مفتوح
const OPEN_USER: MousaUser = {
  userId: 0,
  openId: "guest",
  name: "زائر",
  email: "",
  creditBalance: 999999,
  platform: "khayal",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: MousaUser;
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

// ─── AuthGate — مفتوح بالكامل ─────────────────────────────────────────────────

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(999999);

  const user: MousaUser = { ...OPEN_USER, creditBalance: balance };

  const deductCredits = useCallback(
    async (amount: number, _description?: string): Promise<{ newBalance: number }> => {
      const newBalance = Math.max(0, balance - amount);
      setBalance(newBalance);
      return { newBalance };
    },
    [balance]
  );

  const refreshBalance = useCallback(async (): Promise<number> => {
    return balance;
  }, [balance]);

  const logout = useCallback(() => {
    // لا شيء — المنصة مفتوحة
  }, []);

  return (
    <AuthContext.Provider value={{ user, deductCredits, refreshBalance, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
