import { request } from "./client";

/** نمایندگان (هرمی) و درخواست‌های نمایندگی */
export const AgencyApi = {
  me: () => request("GET", "/agent/me"),
  subordinates: () => request("GET", "/agent/subordinates"),
  request: (body) => request("POST", "/agency-requests", { body }),
  requests: () => request("GET", "/agency-requests"),
  decide: (id, approve) =>
    request("POST", `/agency-requests/${id}/${approve ? "approve" : "reject"}`),
  adminAgents: (city) =>
    request("GET", "/admin/agents" + (city ? `?city=${encodeURIComponent(city)}` : "")),
  agentTransactions: (agentId) =>
    request("GET", `/admin/agents/${agentId}/transactions`),
};
