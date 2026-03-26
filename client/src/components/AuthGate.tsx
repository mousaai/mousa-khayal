/**
 * AuthGate.tsx
 * مكوّن يحمي التطبيق بالكامل — يتحقق من مصادقة Mousa.ai قبل عرض أي محتوى
 * وفق دليل تكامل KHAYAL — khayal.mousa.ai
 *
 * الحالات:
 *   loading  → شاشة تحميل مع spinner
 *   error    → شاشة خطأ مع رابط الذهاب لـ mousa.ai
 *   !user    → إعادة توجيه تلقائية لـ mousa.ai
 *   user     → عرض children
 */
import React, { createContext, useContext } from "react";
import { useMousaAuth, type MousaUser } from "@/hooks/useMousaAuth";

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

// ─── AuthGate ─────────────────────────────────────────────────────────────────

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error, deductCredits, refreshBalance, logout } = useMousaAuth();

  // ── حالة التحميل ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#080E1A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Arabic', sans-serif",
          color: "#E8E0D0",
          gap: 16,
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "3px solid rgba(212,160,23,0.2)",
            borderTop: "3px solid #D4A017",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: "#D4A017", fontWeight: 700, fontSize: "1.2rem" }}>
          mousa.ai
        </div>
        <div style={{ color: "#8A9BB0", fontSize: "0.9rem" }}>
          جاري التحقق من هويتك...
        </div>
      </div>
    );
  }

  // ── حالة الخطأ أو غياب المستخدم ──────────────────────────────────────────
  if (error || !user) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "#080E1A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'IBM Plex Arabic', sans-serif",
          color: "#E8E0D0",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem" }}>🔐</div>
        <div style={{ color: "#D4A017", fontWeight: 700, fontSize: "1.2rem" }}>
          mousa.ai
        </div>
        <div style={{ color: "#E8E0D0" }}>
          {error || "يجب الدخول عبر mousa.ai"}
        </div>
        <div style={{ color: "#8A9BB0", fontSize: "0.85rem" }}>
          جاري إعادة التوجيه...
        </div>
        <a
          href="https://www.mousa.ai"
          style={{
            padding: "10px 24px",
            background: "rgba(212,160,23,0.15)",
            border: "1px solid rgba(212,160,23,0.4)",
            borderRadius: 8,
            color: "#D4A017",
            textDecoration: "none",
          }}
        >
          الذهاب لـ mousa.ai
        </a>
      </div>
    );
  }

  // ── المستخدم مصادق عليه — عرض التطبيق ───────────────────────────────────
  return (
    <AuthContext.Provider value={{ user, deductCredits, refreshBalance, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
