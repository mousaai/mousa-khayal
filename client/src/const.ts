export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * رابط تسجيل الدخول الصحيح — يوجّه المستخدم عبر mousa.ai SSO
 *
 * تدفق SSO الكامل (مُكتشَف من كود mousa.ai):
 *   1. المستخدم يضغط "سجّل دخول" → يُوجَّه إلى:
 *      https://www.mousa.ai/api/auth/google?returnPath=/api/platform/post-login?platform=khayal&returnTo=https://khayal.mousa.ai
 *   2. يسجّل دخوله بـ Google/Apple في mousa.ai
 *   3. mousa.ai تُعيده إلى /api/platform/post-login?platform=khayal
 *   4. هذا الـ endpoint يُولّد token ويُعيد توجيهه إلى: https://khayal.mousa.ai?token=<JWT>
 *   5. useMousaAuth يستقبل الـ token ويُنشئ جلسة محلية
 */
export const getLoginUrl = (_returnPath: string = "/") => {
  const returnTo = encodeURIComponent("https://khayal.mousa.ai");
  const postLoginPath = encodeURIComponent(
    `/api/platform/post-login?platform=khayal&returnTo=${returnTo}`
  );
  const lang = (typeof localStorage !== "undefined" && localStorage.getItem("mousa_lang")) || "ar";
  // يُوجَّه المستخدم لتسجيل الدخول بـ Google — بعد النجاح يُعاد توجيهه لـ post-login الذي يُولّد token
  return `https://www.mousa.ai/api/auth/google?returnPath=${postLoginPath}&lang=${lang}`;
};

/**
 * رابط تسجيل الدخول بـ Apple (بديل)
 */
export const getAppleLoginUrl = () => {
  const returnTo = encodeURIComponent("https://khayal.mousa.ai");
  const postLoginPath = encodeURIComponent(
    `/api/platform/post-login?platform=khayal&returnTo=${returnTo}`
  );
  const lang = (typeof localStorage !== "undefined" && localStorage.getItem("mousa_lang")) || "ar";
  return `https://www.mousa.ai/api/auth/apple?returnPath=${postLoginPath}&lang=${lang}`;
};
