import { listOf, KrokisApi } from "../api";
import { state, loadWallet } from "./authCore";
import { resolveTemplateId } from "./authTemplates";

/* ---------------- کروکی‌ها ---------------- */

export async function createKroki(payload, tplId) {
  let tid = payload?.template_id;
  if (tplId !== undefined) {
    const resolved = await resolveTemplateId(tplId);
    if (!resolved.id) {
      // خطای واقعی سرور/شبکه را نشان بده، نه «قالب یافت نشد» گمراه‌کننده
      return { success: false, error: resolved.error || "قالب کروکی یافت نشد" };
    }
    tid = resolved.id;
  }
  if (!tid) return { success: false, error: "قالب کروکی یافت نشد" };
  try {
    const body = { ...payload, template_id: tid };
    delete body.template_id_orig;
    const d = await KrokisApi.create(body);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت کروکی" };
  }
}

export async function updateKroki(id, payload) {
  try {
    const d = await KrokisApi.update(id, payload);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در به‌روزرسانی کروکی" };
  }
}

export async function myKrokis() {
  try {
    const d = await KrokisApi.list();
    state.myKrokis = listOf(d) || [];
    return { success: true, data: state.myKrokis };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

export async function getKroki(id) {
  try {
    const d = await KrokisApi.get(id);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی" };
  }
}

export async function trackKroki(code) {
  try {
    const d = await KrokisApi.track(code);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "کروکی یافت نشد" };
  }
}

export async function payKroki(id, mode) {
  try {
    const d = await KrokisApi.pay(id, mode);
    await loadWallet();
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در پرداخت" };
  }
}

export async function issueKroki(id, pdfUrl) {
  try {
    const d = await KrokisApi.issue(id, pdfUrl);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در صدور کروکی" };
  }
}

export async function deleteKroki(id) {
  try {
    await KrokisApi.remove(id);
    state.myKrokis = state.myKrokis.filter((k) => String(k.id) !== String(id));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کروکی" };
  }
}
