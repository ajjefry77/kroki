import { request } from "./client";

/** کدهای معرف و معرفی‌ها */
export const ReferralsApi = {
  redeem: (code) => request("POST", "/referrals/redeem", { body: { code } }),
  my: () => request("GET", "/referrals/my"),
  list: () => request("GET", "/referrals"),
  create: (body) => request("POST", "/referrals", { body }),
  update: (id, patch) => request("PATCH", `/referrals/${id}`, { body: patch }),
  remove: (id) => request("DELETE", `/referrals/${id}`),
};
