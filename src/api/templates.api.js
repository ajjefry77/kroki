import { request } from "./client";

/** قالب‌ها: GET/POST /templates و GET/PATCH/DELETE /templates/:id */
export const TemplatesApi = {
  list: () => request("GET", "/templates"),
  create: (body) => request("POST", "/templates", { body }),
  update: (id, body) => request("PATCH", `/templates/${id}`, { body }),
  remove: (id) => request("DELETE", `/templates/${id}`),
};
