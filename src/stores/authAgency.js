import { listOf, AgencyApi } from "../api";
import { state } from "./authCore";

/* ---------------- نمایندگان (هرمی) ---------------- */

export async function loadMyAgent() {
  try {
    const d = await AgencyApi.me();
    state.myAgent = d || null;
    return { success: true };
  } catch (e) {
    state.myAgent = null;
    return { success: false, error: e.message || "خطا در دریافت اطلاعات نمایندگی" };
  }
}

export async function loadSubordinates() {
  try {
    const d = await AgencyApi.subordinates();
    state.subordinates = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت زیرمجموعه‌ها" };
  }
}

export async function requestAgency(data) {
  try {
    const body =
      typeof data === "string"
        ? { city: String(data || "").trim() }
        : {
            firstName: String(data.firstName || "").trim(),
            lastName: String(data.lastName || "").trim(),
            phone: String(data.phone || "").trim(),
            city: String(data.city || "").trim(),
            full_name: (String(data.firstName || "").trim() + " " + String(data.lastName || "").trim()).trim(),
          };
    await AgencyApi.request(body);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت درخواست نمایندگی" };
  }
}

export async function loadAgencyRequests() {
  try {
    const d = await AgencyApi.requests();
    state.agencyRequests = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های نمایندگی" };
  }
}

export async function decideAgencyRequest(id, approve) {
  try {
    await AgencyApi.decide(id, approve);
    await loadAgencyRequests();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت تصمیم" };
  }
}

export async function loadAdminAgents(city) {
  try {
    const d = await AgencyApi.adminAgents(city);
    state.adminAgents = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت نمایندگان" };
  }
}

export async function loadAgentDetail(agentId) {
  try {
    const d = await AgencyApi.agentTransactions(agentId);
    state.agentDetail = { agentId, items: listOf(d?.transactions || d) || [], total: Number(d?.total || 0) };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌های نماینده" };
  }
}
