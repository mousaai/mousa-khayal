/**
 * useMousaTokenHandoff.ts
 * Hook لاستقبال JWT handoff token من URL (?token=...) وتحقق منه
 * وفق الوثيقة الرسمية Mousa.ai v2.0
 *
 * السيناريو:
 *   1. المستخدم يضغط على خيال من لوحة Mousa.ai
 *   2. يُعاد توجيهه إلى: https://khayal.mousa.ai/?token=<JWT>
 *   3. هذا الـ hook يستقبل الـ token ويتحقق منه
 *   4. إذا نجح: يُخزن userId وcreditBalance في الـ state
 *   5. إذا TOKEN_EXPIRED: يعرض رسالة مع زر إعادة توجيه
 */
import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface MousaHandoffState {
  status: "idle" | "verifying" | "success" | "expired" | "invalid" | "error";
  userId?: number;
  name?: string;
  creditBalance?: number;
  redirectUrl?: string;
}

export function useMousaTokenHandoff() {
  const [state, setState] = useState<MousaHandoffState>({ status: "idle" });

  const verifyMutation = trpc.credits.verifyToken.useMutation({
    onSuccess: (data) => {
      if (data.success) {
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
      } else if (data.code === "TOKEN_EXPIRED") {
        setState({
          status: "expired",
          redirectUrl: data.redirectUrl ?? "https://www.mousa.ai/dashboard",
        });
        toast.error("انتهت صلاحية جلستك — يرجى تسجيل الدخول مجدداً من Mousa.ai", {
          action: {
            label: "تسجيل الدخول",
            onClick: () =>
              window.location.assign(data.redirectUrl ?? "https://www.mousa.ai/dashboard"),
          },
          duration: 10_000,
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
