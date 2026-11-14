import { request } from "./client";

/** روزهای رایگان سامانه + هدیه ثبت‌نام */
export const FreeDaysApi = {
  // عمومی: آیا امروز سامانه رایگان است؟
  today: () => request("GET", "/free-days/today", { auth: false }),
  // ادمین: تنظیمات هدیه ثبت‌نام
  signupGift: () => request("GET", "/admin/signup-gift"),
  setSignupGift: (body) => request("POST", "/admin/signup-gift", { body }),
  // ادمین: تقویم روزهای رایگان
  list: () => request("GET", "/admin/free-days"),
  save: (body) => request("POST", "/admin/free-days", { body }),
  remove: (id) => request("DELETE", `/admin/free-days/${id}`),
};
