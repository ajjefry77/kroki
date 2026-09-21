import { request } from "./client";

/*
 * کارشناسان و درخواست‌های همکاری.
 * قرارداد پیشنهادی بک‌اند (اگر بک‌اند هنوز پیاده نشده، استور به حالت mock با localStorage می‌رود):
 *   GET  /experts               -> لیست کارشناسان تأییدشده (عمومی)
 *   POST /expert-requests       -> ثبت درخواست همکاری (multipart برای مدارک)
 *   GET  /expert-requests       -> لیست درخواست‌ها (ادمین)
 *   POST /expert-requests/:id/approve -> تأیید (ادمین) => ورود به لیست کارشناسان
 *   POST /expert-requests/:id/reject  -> رد (ادمین)
 *   DELETE /experts/:id         -> حذف کارشناس از لیست عمومی (ادمین)
 */
export const ExpertsApi = {
  list: () => request("GET", "/experts", { auth: false }),
  myRequests: () => request("GET", "/expert-requests/mine"),
  requests: () => request("GET", "/expert-requests"),
  decide: (id, approve) =>
    request("POST", `/expert-requests/${id}/${approve ? "approve" : "reject"}`),
  remove: (id) => request("DELETE", `/experts/${id}`),

  // ثبت درخواست؛ اگر فایل واقعی هست FormData می‌سازد، وگرنه JSON می‌فرستد
  submit: (payload = {}) => {
    const files = Array.isArray(payload.documents) ? payload.documents : [];
    const hasRealFiles = files.some((f) => typeof File !== "undefined" && f instanceof File);
    if (!hasRealFiles) {
      return request("POST", "/expert-requests", {
        body: {
          first_name: payload.firstName || "",
          last_name: payload.lastName || "",
          national_code: payload.nationalId || "",
          phone: payload.phone || "",
          titles: payload.titles || [],
          specialties: payload.specialties || [],
          documents: files.map((f) => ({ name: f?.name || "", size: f?.size || 0, type: f?.type || "" })),
        },
      });
    }
    // حالت multipart — مستقیم با fetch چون کلاینت JSON است
    const base = (import.meta.env.VITE_SERVER || "").replace(/\/+$/, "") + "/api";
    const token = localStorage.getItem("kroki_token");
    const fd = new FormData();
    fd.append("first_name", payload.firstName || "");
    fd.append("last_name", payload.lastName || "");
    fd.append("national_code", payload.nationalId || "");
    fd.append("phone", payload.phone || "");
    (payload.titles || []).forEach((t) => fd.append("titles[]", t));
    (payload.specialties || []).forEach((s) => fd.append("specialties[]", s));
    files.forEach((f) => fd.append("documents", f));
    return fetch(base + "/expert-requests", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${JSON.parse(token)}` } : {},
      body: fd,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "خطا در ثبت درخواست");
      return data;
    });
  },
};
