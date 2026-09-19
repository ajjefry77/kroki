import { request } from "./client";

/** کیف پول، تراکنش‌ها و درخواست‌های شارژ */
export const WalletApi = {
  get: () => request("GET", "/wallet"),
  transactions: () => request("GET", "/wallet/transactions"),
  createCharge: (body) => request("POST", "/charges", { body }),
  myCharges: () => request("GET", "/charges/my"),
  charges: (status) => request("GET", "/charges" + (status ? `?status=${status}` : "")),
  approveCharge: (id) => request("POST", `/charges/${id}/approve`, { body: {} }),
  rejectCharge: (id) => request("POST", `/charges/${id}/reject`, { body: {} }),
};
