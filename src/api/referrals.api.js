import { request } from "./client";

/** کدهای معرف و معرفی‌ها */
export const ReferralsApi = {
  redeem: (code) => request("POST", "/referrals/redeem", { body: { code } }),
  my: () => request("GET", "/referrals/my"),
  list: () => request("GET", "/referrals"),
  create: (body) => request("POST", "/referrals", { body }),
  update: (id, patch) => request("PATCH", `/referrals/${id}`, { body: patch }),
  remove: (id) => request("DELETE", `/referrals/${id}`),
  // کد معرف شخصی هر کاربر: هر کس این کد را وارد کند زیرمجموعه مالک کد می‌شود
  myCode: () => request("GET", "/referrals/my-code"),
  ensureMyCode: () => request("POST", "/referrals/my-code", { body: {} }),
  saveMyCode: (code) => request("PUT", "/referrals/my-code", { body: { code } }),
  // ادمین: لیست کدهای شخصی کاربران (کنار بقیه کدها در تب معرفی)
  personalAll: () => request("GET", "/referrals/personal/all"),
};
