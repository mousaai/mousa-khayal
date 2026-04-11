/**
 * useMousaTokenHandoff.ts
 * Hook لاستقبال JWT handoff token من URL (?token=...) وتحقق منه
 * وفق الوثيقة الرسمية Mousa.ai v2.0
 *
 * نمط فضاء الكامل:
 *   1. المستخدم يضغط على خيال من لوحة Mousa.ai
 *   2. يُعاد توجيهه إلى: https://khayal.mousa.ai/?token=<JWT>
 *   3. هذا الـ hook يستقبل الـ token ويتحقق منه
 *   4. بعد التحقق الناجح: يستدعي auth.loginWithMousa لإنشاء session cookie حقيقي
 *   5. هذا يجعل ctx.user متاحاً في جميع الـ procedures المحمية
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

  // المرحلة الثانية: إنشاء session cookie بعد التحقق
  const loginWithMousaMutation = trpc.auth.loginWithMousa.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // تحديث auth state في الـ cache
        utils.auth.me.invalidate();
        setState(prev => ({
          ...prev,
          status: "success",
          userId: data.userId,
          name: data.name ?? undefined,
          creditBalance: data.creditBalance,
        }));
      } else {
        // فشل إنشاء الجلسة — نبقى في success جزئي (verifyToken نجح لكن session فشل)
        console.warn("[MousaHandoff] loginWithMousa failed:", data.error);
      }
    },
    onError: (err) => {
      console.error("[MousaHandoff] loginWithMousa error:", err);
      // لا نغير الـ state — المستخدم تحقق منه لكن الجلسة لم تُنشأ
    },
  });

  // المرحلة الأولى: التحقق من الـ token
  const verifyMutation = trpc.credits.verifyToken.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // تحديث state مؤقتاً
        setState({
          status: "verifying", // لا نزال في verifying حتى تنتهي loginWithMousa
          userId: data.userId,
          name: data.name,
          creditBalance: data.creditBalance,
        });

        // ━━ نمط فضاء: استدعاء loginWithMousa لإنشاء session cookie حقيقي ━━
        // نحتاج الـ raw token — نستخرجه من URL
        const params = new URLSearchParams(window.location.search);
        const rawToken = params.get("token");
        if (rawToken) {
          loginWithMousaMutation.mutate({ token: rawToken });
        } else {
          // الـ token أُزيل من URL بالفعل — نكتفي بـ verifyToken
          setState({
            status: "success",
            userId: data.userId,
            name: data.name,
            creditBalance: data.creditBalance,
          });
        }

        // إزالة token من URL بعد التحقق الناجح
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      } else if (data.code === "TOKEN_EXPIRED") {
        setState({
          status: "expired",
          redirectUrl: data.redirectUrl ?? "https://www.mousa.ai/dashboard",
        });
      } else {
        setState({ status: "invalid" });
      }
    },
    onError: () => {
      setState({ status: "error" });
    },
  });

  const handleToken = useCallback(
    (token: string) => {
      setState({ status: "verifying" });
      verifyMutation.mutate({ token });
    },
    [verifyMutation]
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
