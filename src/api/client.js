import axios from "axios";

/*
 * کلاینت واحد axios برای بک‌اند کروکی.
 * همه ماژول‌های src/api از تابع request همین فایل استفاده می‌کنند؛
 * هیچ fetch مستقیمی به بک‌اند در هیچ‌جای پروژه نباید باقی بماند.
 */

export const API_BASE =
  (import.meta.env.VITE_SERVER || "").replace(/\/+$/, "") + "/api";

export const API_TIMEOUT_MS = 25000;

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

let unauthorizedHandler = null;

/** استور احراز هویت، هندلر 401 (معمولاً logout) را اینجا ثبت می‌کند تا چرخه import ایجاد نشود */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === "function" ? fn : null;
}

/** هم‌گام‌سازی هدر Authorization با توکن جاری */
export function setAuthToken(token) {
  if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete apiClient.defaults.headers.common.Authorization;
}

function toError(err, withAuth) {
  if (err?.code === "ECONNABORTED" || /timeout of .* exceeded/i.test(err?.message || "")) {
    return new Error("سرور پاسخ نداد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید");
  }
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 401) {
    if (withAuth) {
      try {
        unauthorizedHandler?.();
      } catch {}
      return new Error("نشست شما منقضی شده است؛ دوباره وارد شوید");
    }
    return new Error(data?.error || data?.message || "نام کاربری یا رمز عبور اشتباه است");
  }
  if (err?.response) {
    return new Error(data?.error || data?.message || `خطا در ارتباط با سرور (${status})`);
  }
  return new Error("خطا در ارتباط با سرور؛ اتصال خود را بررسی کنید");
}

/**
 * درخواست به بک‌اند. خروجی: بدنه پاسخ (JSON پارس‌شده).
 * خطا: نمونه Error با پیام فارسی آماده نمایش.
 */
export async function request(method, path, { body, auth = true, timeout } = {}) {
  try {
    const res = await apiClient.request({ method, url: path, data: body, timeout });
    return res.data;
  } catch (err) {
    throw toError(err, auth);
  }
}

/** برخی اندپوینت‌ها آرایه یا { data: [...] } برمی‌گردانند */
export function listOf(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}
