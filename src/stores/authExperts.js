import { listOf, ExpertsApi } from "../api";
import { state } from "./authCore";

/* ---------------- کارشناسان (همکاری) ---------------- */

export const EXPERT_LS = { experts: "kroki_experts", requests: "kroki_expert_requests" };

export function readLsArray(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function writeLsArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr || []));
  } catch {}
}

export function mapExpert(r) {
  const first = r?.first_name ?? "";
  const last = r?.last_name ?? "";
  const full = r?.full_name || [first, last].filter(Boolean).join(" ") || r?.name || "";
  return {
    id: r?.id,
    firstName: first,
    lastName: last,
    fullName: full,
    name: full,
    nationalId: r?.national_code ?? r?.nationalId ?? "",
    phone: r?.phone ?? "",
    titles: Array.isArray(r?.titles) ? r.titles : [],
    specialties: Array.isArray(r?.specialties) ? r.specialties : [],
    documents: Array.isArray(r?.documents) ? r.documents : [],
    status: r?.status || "approved",
    at: r?.created_at || r?.at || new Date().toISOString(),
    created_at: r?.created_at || r?.at || new Date().toISOString(),
    userId: r?.user_id ?? r?.userId ?? null,
  };
}

export function mapExpertRequest(r) {
  const m = mapExpert(r);
  return { ...m, status: r?.status || "pending" };
}

export async function loadExperts() {
  try {
    const d = await ExpertsApi.list();
    state.experts = (listOf(d?.experts ?? d) || []).map(mapExpert);
    return { success: true };
  } catch {
    // حالت mock (بک‌اند هنوز نیست): فقط تأییدشده‌های لوکال
    const local = readLsArray(EXPERT_LS.experts).map(mapExpert);
    state.experts = local;
    return { success: true, mock: true };
  }
}

export async function requestExpert({ firstName, lastName, nationalId, phone, titles, specialties, documents } = {}) {
  const body = {
    firstName: String(firstName || "").trim(),
    lastName: String(lastName || "").trim(),
    nationalId: String(nationalId || "").trim(),
    phone: String(phone || "").trim(),
    titles: Array.isArray(titles) ? titles : [],
    specialties: Array.isArray(specialties) ? specialties : [],
    documents: Array.isArray(documents) ? documents : [],
  };
  try {
    await ExpertsApi.submit(body);
    await loadExpertRequests().catch(() => {});
    return { success: true };
  } catch {
    // حالت mock: ذخیره درخواست در localStorage
    const reqs = readLsArray(EXPERT_LS.requests);
    reqs.unshift({
      id: "local-" + Date.now(),
      first_name: body.firstName,
      last_name: body.lastName,
      full_name: (body.firstName + " " + body.lastName).trim(),
      national_code: body.nationalId,
      phone: body.phone,
      titles: body.titles,
      specialties: body.specialties,
      documents: body.documents.map((f) => ({ name: f?.name || "", size: f?.size || 0, type: f?.type || "" })),
      status: "pending",
      user_id: state.user?.id ?? null,
      created_at: new Date().toISOString(),
    });
    writeLsArray(EXPERT_LS.requests, reqs);
    state.expertRequests = reqs.map(mapExpertRequest);
    return { success: true, mock: true };
  }
}

export async function loadExpertRequests() {
  try {
    const d = await ExpertsApi.requests();
    state.expertRequests = (listOf(d?.requests ?? d) || []).map(mapExpertRequest);
    return { success: true };
  } catch {
    state.expertRequests = readLsArray(EXPERT_LS.requests).map(mapExpertRequest);
    return { success: true, mock: true };
  }
}

export async function decideExpertRequest(id, approve) {
  try {
    await ExpertsApi.decide(id, approve);
    await loadExpertRequests();
    await loadExperts();
    return { success: true };
  } catch {
    // حالت mock
    const reqs = readLsArray(EXPERT_LS.requests);
    const idx = reqs.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return { success: false, error: "درخواست یافت نشد" };
    reqs[idx].status = approve ? "approved" : "rejected";
    reqs[idx].decided_at = new Date().toISOString();
    writeLsArray(EXPERT_LS.requests, reqs);
    if (approve) {
      const r = reqs[idx];
      const exps = readLsArray(EXPERT_LS.experts);
      if (!exps.some((e) => String(e.national_code) === String(r.national_code))) {
        exps.unshift({ ...r, status: "approved" });
        writeLsArray(EXPERT_LS.experts, exps);
      }
      state.experts = exps.map(mapExpert);
    }
    state.expertRequests = reqs.map(mapExpertRequest);
    return { success: true, mock: true };
  }
}

export async function removeExpert(id) {
  try {
    await ExpertsApi.remove(id);
    await loadExperts();
    return { success: true };
  } catch {
    const exps = readLsArray(EXPERT_LS.experts).filter((e) => String(e.id) !== String(id));
    writeLsArray(EXPERT_LS.experts, exps);
    state.experts = exps.map(mapExpert);
    return { success: true, mock: true };
  }
}
