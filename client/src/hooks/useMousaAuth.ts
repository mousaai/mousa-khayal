/**
 * useMousaAuth.ts
 * Hook لمصادقة المستخدمين القادمين من mousa.ai
 *
 * السيناريوهات:
 *   1. زائر بدون token: user = null — المنصة مفتوحة (لا توجيه، لا حجب)
 *   2. زائر بـ ?token=: يتحقق من Mousa.ai ويحفظ الجلسة
 *   3. جلسة محفوظة: يستعيدها مباشرة
 *   4. فشل الاتصال بـ Mousa (network / timeout / server error / أي خطأ):
 *      → يمنح المستخدم 200 كريدت مجاني ويستمر بدون انقطاع
 *   5. انتهاء صلاحية الجلسة: يمسحها ويعود لوضع زائر
 */
import { useState, useEffect } from "react";

const MOUSA_API_URL = "https://www.mousa.ai";
const STORAGE_KEY = "mousa_user_session";
const TOKEN_KEY = "mousa_auth_token";
const THIS_PLATFORM = "khayal";
const PLATFORM_API_KEY = "khayal@mousa30";

/** كريدت مجاني يُمنح تلقائياً عند تعذّر الوصول لحساب Mousa */
const FREE_FALLBACK_CREDITS = 200;

export interface MousaUser {
  userId: number;
  openId: string;
  name: string;
  email: string;
  creditBalance: number;
  platform: string;
  /** true إذا كان الرصيد مجانياً بسبب تعذّر الاتصال بـ Mousa */
  isFallback?: boolean;
}

interface AuthState {
  user: MousaUser | null;
  loading: boolean;
  error: string | null;
  token: string | null;
}

export function useMousaAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    token: null,
  });

  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function initAuth() {
    try {
      // 1. تحقق من جلسة محفوظة أولاً
      const savedSession = loadSavedSession();
      if (savedSession) {
        setState({
          user: savedSession.user,
          loading: false,
          error: null,
          token: savedSession.token,
        });
        // تحديث الرصيد في الخلفية بدون تغيير loading
        refreshBalanceInBackground(savedSession.token, savedSession.user);
        return;
      }

      // 2. قراءة ?token= من URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (!token) {
        // زائر بدون token — المنصة مفتوحة له بدون مصادقة
        setState({ user: null, loading: false, error: null, token: null });
        return;
      }

      // 3. التحقق من الـ token مع Mousa
      try {
        const user = await verifyToken(token);
        saveSession(token, user);
        // إزالة token من URL بعد التحقق الناجح
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        setState({ user, loading: false, error: null, token });
      } catch (verifyErr) {
        const errorMsg = (verifyErr as Error).message;

        if (errorMsg.includes("TOKEN_EXPIRED") || errorMsg.includes("انتهت صلاحية")) {
          clearSession();
          setState({ user: null, loading: false, error: null, token: null });
          return;
        }

        // أي خطأ آخر (network / timeout / server error):
        // → نمنح المستخدم 200 كريدت مجاني ويستمر بدون انقطاع
        const fallbackUser = buildFallbackUser(token);
        setState({ user: fallbackUser, loading: false, error: null, token });
      }
    } catch {
      // خطأ عام غير متوقع → زائر عادي بدون حجب
      setState({ user: null, loading: false, error: null, token: null });
    }
  }

  /** بناء مستخدم مؤقت بـ 200 كريدت مجاني عند تعذّر التحقق */
  function buildFallbackUser(token: string): MousaUser {
    // محاولة استخراج اسم من الـ token (JWT payload) — اختياري
    let name = "مستخدم";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.name) name = payload.name;
    } catch {}

    return {
      userId: -1,
      openId: `fallback_${Date.now()}`,
      name,
      email: "",
      creditBalance: FREE_FALLBACK_CREDITS,
      platform: THIS_PLATFORM,
      isFallback: true,
    };
  }

  async function verifyToken(token: string): Promise<MousaUser> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 ثوانٍ timeout

    try {
      const response = await fetch(`${MOUSA_API_URL}/api/platform/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PLATFORM_API_KEY}`,
          "X-Platform-ID": THIS_PLATFORM,
        },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "TOKEN_EXPIRED") throw new Error("TOKEN_EXPIRED");
        throw new Error(data.error || "فشل التحقق من الهوية");
      }

      const data = await response.json();
      return {
        userId: data.userId,
        openId: data.openId,
        name: data.name,
        email: data.email,
        creditBalance: data.creditBalance,
        platform: data.platform,
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async function deductCredits(
    amount: number,
    description?: string
  ): Promise<{ newBalance: number }> {
    if (!state.user) throw new Error("المستخدم غير مسجّل الدخول");

    // مستخدم fallback: خصم محلي فقط من الـ 200 كريدت
    if (state.user.isFallback) {
      const newBalance = Math.max(0, state.user.creditBalance - amount);
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, creditBalance: newBalance } : null,
      }));
      return { newBalance };
    }

    // مستخدم حقيقي: خصم عبر Mousa API مع fallback محلي عند الفشل
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${MOUSA_API_URL}/api/platform/deduct-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PLATFORM_API_KEY}`,
          "X-Platform-ID": THIS_PLATFORM,
        },
        body: JSON.stringify({
          userId: state.user.userId,
          amount,
          description: description || "استخدام منصة خيال",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "فشل خصم الكريدت");
      }

      const data = await response.json();
      // تحديث الرصيد في state و localStorage
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, creditBalance: data.newBalance } : null,
      }));
      if (state.token && state.user) {
        saveSession(state.token, { ...state.user, creditBalance: data.newBalance });
      }
      return { newBalance: data.newBalance };
    } catch {
      // فشل الاتصال بـ Mousa أثناء الخصم → خصم محلي فقط (لا توقف)
      const newBalance = Math.max(0, state.user.creditBalance - amount);
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, creditBalance: newBalance } : null,
      }));
      return { newBalance };
    }
  }

  async function refreshBalance(): Promise<number> {
    if (!state.user || !state.token) return 0;
    if (state.user.isFallback) return state.user.creditBalance;

    try {
      const user = await verifyToken(state.token);
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, creditBalance: user.creditBalance } : null,
      }));
      if (state.token) {
        saveSession(state.token, { ...state.user, creditBalance: user.creditBalance });
      }
      return user.creditBalance;
    } catch {
      return state.user?.creditBalance ?? 0;
    }
  }

  async function refreshBalanceInBackground(token: string, currentUser: MousaUser) {
    if (currentUser.isFallback) return; // لا تحديث للـ fallback
    try {
      const user = await verifyToken(token);
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, creditBalance: user.creditBalance } : null,
      }));
      saveSession(token, { ...currentUser, creditBalance: user.creditBalance });
    } catch {}
  }

  function logout() {
    clearSession();
    setState({ user: null, loading: false, error: null, token: null });
  }

  return {
    ...state,
    deductCredits,
    refreshBalance,
    logout,
  };
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

function saveSession(token: string, user: MousaUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, savedAt: Date.now() })
    );
  } catch {}
}

function loadSavedSession(): { token: string; user: MousaUser } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const sessionStr = localStorage.getItem(STORAGE_KEY);
    if (!token || !sessionStr) return null;

    const session = JSON.parse(sessionStr);
    // صلاحية 23 ساعة (أقل من 24 لضمان التجديد قبل انتهاء الـ JWT)
    if (Date.now() - session.savedAt > 23 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }

    return { token, user: session.user };
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
