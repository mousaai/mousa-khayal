export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * رابط تسجيل الدخول الوحيد — يوجّه المستخدم مباشرة إلى mousa.ai
 * بعد تسجيل الدخول، يُعاد توجيهه إلى: https://khayal.mousa.ai?token=<JWT>
 * الـ hook useMousaAuth يستقبل الـ token ويُنشئ جلسة محلية
 *
 * ملاحظة: Manus OAuth مُعطَّل — المصادقة تمر عبر mousa.ai SSO فقط
 */
export const getLoginUrl = (returnPath: string = "/") => {
  const origin = window.location.origin;
  const redirectUrl = `${origin}${returnPath}`;
  const url = new URL("https://www.mousa.ai/dashboard");
  url.searchParams.set("redirect", redirectUrl);
  url.searchParams.set("ref", "khayal");
  return url.toString();
};
