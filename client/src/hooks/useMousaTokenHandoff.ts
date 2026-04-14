/**
 * useMousaTokenHandoff.ts
 * Hook لاستقبال JWT handoff token من URL (?token=...) وتحقق منه
 * وفق دليل SSO mousa.ai v2.0
 *
 * تدفق SSO الكامل:
 *   1. المستخدم يضغط على بطاقة فضاء في mousa.ai
 *   2. يُعاد توجيهه إلى: https://fada.mousa.ai?token=<JWT>
 *   3. هذا الـ hook يُرسل token إلى POST /api/sso/verify
 *   4. السيرفر يتحقق + يجلب الرصيد الحقيقي + يحفظ المستخدم + يُنشئ JWT cookie
 *   5. الواجهة تُحدّث حالة المصادقة
 */
import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface MousaHandoffState {
  status: "idle" | "verifying" | "success" | "expired" | "invalid" | "error";
  userId?: number;
  name?: string;
  creditBalance?: number;
  redirectUrl?: string;
}

export function useMousaTokenHandoff() {
  const [state, setState] = useState<MousaHandoffState>({ status: "idle" });
  const utils = trpc.useUtils();

  /**
   * استدعاء POST /api/sso/verify
   * يتحقق من token ويُنشئ session cookie محلي في نفس الوقت
   */
  async function verifySSOToken(token: string): Promise<void> {
    setState({ status: "verifying" });

    try {
      const response = await fetch("/api/sso/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // مهم: لاستقبال cookie من السيرفر
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "TOKEN_EXPIRED") {
          setState({
            status: "expired",
            redirectUrl: "https://www.mousa.ai/dashboard",
          });
          return;
        }
        setState({ status: "invalid" });
        return;
      }

      if (data.success) {
        // تحديث auth state في الـ cache (ctx.user الآن متاح)
        utils.auth.me.invalidate();

        setState({
          status: "success",
          userId: data.userId,
          name: data.name,
          creditBalance: data.creditBalance,
        });

        // إزالة token من URL بعد التحقق الناجح
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      } else {
        setState({ status: "invalid" });
      }
    } catch (err) {
      console.error("[MousaHandoff] SSO verify error:", err);
      setState({ status: "error" });
    }
  }

  const handleToken = useCallback(
    (token: string) => {
      verifySSOToken(token);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    // استقبال token من URL عند تحميل الصفحة
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token && state.status === "idle") {
      handleToken(token);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const redirectToMousa = useCallback(() => {
    window.location.assign(state.redirectUrl ?? "https://www.mousa.ai/dashboard");
  }, [state.redirectUrl]);

  return {
    handoffState: state,
    isVerifying: state.status === "verifying",
    isExpired: state.status === "expired",
    isSuccess: state.status === "success",
    redirectToMousa,
  };
}
