import { request } from "./client";

/** کاربران (ادمین): GET /users ،PATCH /users/:id ،DELETE /users/:id ،POST /users/:id/credit */
export const UsersApi = {
  list: () => request("GET", "/users?limit=100"),
  update: (id, body) => request("PATCH", `/users/${id}`, { body }),
  remove: (id) => request("DELETE", `/users/${id}`),
  credit: (id, amount) => request("POST", `/users/${id}/credit`, { body: { amount } }),
  // تعریف کد معرف شخصی برای یک کاربر توسط ادمین (+ سهمیه کروکی رایگان آن کد)
  setReferralCode: (id, code, free_kroki_amount) =>
    request("POST", `/users/${id}/referral-code`, { body: { code, free_kroki_amount } }),
  // پاک کردن کد معرف شخصی یک کاربر توسط ادمین
  deleteReferralCode: (id) => request("DELETE", `/users/${id}/referral-code`),
};
