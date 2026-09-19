import { request } from "./client";

/** کروکی‌ها: GET/POST /krokis ،pay ،issue و ... */
export const KrokisApi = {
  create: (body) => request("POST", "/krokis", { body }),
  update: (id, body) => request("PATCH", `/krokis/${id}`, { body }),
  list: () => request("GET", "/krokis"),
  get: (id) => request("GET", `/krokis/${id}`),
  track: (code) => request("GET", `/krokis/track/${encodeURIComponent(code)}`),
  pay: (id, mode) => request("POST", `/krokis/${id}/pay`, { body: { mode } }),
  issue: (id, pdfUrl) =>
    request("POST", `/krokis/${id}/issue`, { body: pdfUrl ? { pdf_url: pdfUrl } : {} }),
  remove: (id) => request("DELETE", `/krokis/${id}`),
};
