import { request } from "./client";

/** کیف پول، تراکنش‌ها و شارژ آنلاین (درگاه BitPay) */
export const WalletApi = {
  get: () => request("GET", "/wallet"),
  transactions: () => request("GET", "/wallet/transactions"),
  /** ساخت پرداخت آنلاین و گرفتن لینک بانک: { charge, payment_url } */
  createOnlineCharge: (body) => request("POST", "/charges/create", { body }),
  /** وضعیت یک درخواست شارژ (برای polling بعد از بازگشت از بانک) */
  getCharge: (id) => request("GET", `/charges/${id}`),
  myCharges: () => request("GET", "/charges/my"),
  charges: (status) => request("GET", "/charges" + (status ? `?status=${status}` : "")),
  /** تایید/رد دستی ادمین (فقط موارد خاص پشتیبانی؛ مسیر اصلی خودکار است) */
  approveCharge: (id) => request("POST", `/charges/${id}/approve`, { body: {} }),
  rejectCharge: (id) => request("POST", `/charges/${id}/reject`, { body: {} }),
};
