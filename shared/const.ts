export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const ONE_HOUR_MS = 1000 * 60 * 60; // 1 hour — مدة التوكن قبل تفعيل الدفع
export const SESSION_TOKEN_TTL_MS = ONE_HOUR_MS; // Access Token: 1 ساعة فقط
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
