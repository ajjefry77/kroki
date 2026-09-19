import { request } from "./client";

/** پنل ادمین: آمار، کروکی‌ها، تراکنش‌ها، نقش‌ها و قیمت شهرها */
export const AdminApi = {
  stats: () => request("GET", "/admin/stats"),
  krokis: (status) => request("GET", "/admin/krokis" + (status ? `?status=${status}` : "")),
  transactions: () => request("GET", "/admin/transactions"),
  roles: () => request("GET", "/admin/roles"),
  cityPrices: () => request("GET", "/admin/city-prices"),
  setCityPrice: (city, price) =>
    request("POST", "/admin/city-prices", { body: { city, price } }),
};
