import { listOf, TemplatesApi } from "../api";
import {
  getTemplate,
  templateToApi,
  templateFromApi,
  isBackendTemplateId,
} from "../utils/templates";
import { state } from "./authCore";

/* ---------------- قالب‌ها ---------------- */

export async function loadTemplates() {
  try {
    const d = await TemplatesApi.list();
    state.templates = (listOf(d) || []).map((r) => ({ ...templateFromApi(r), _backend: true }));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت قالب‌ها" };
  }
}

export function userTemplates() {
  return state.templates;
}

export async function saveUserTemplate(t, _userId) {
  if (!t) return { success: false, error: "قالب نامعتبر است" };
  const body = templateToApi(t);
  const payload = { ...t, ...body };
  try {
    if (isBackendTemplateId(t.id)) {
      await TemplatesApi.update(t.id, body);
    } else {
      const created = await TemplatesApi.create(body);
      payload.id = created?.template?.id;
    }
    await loadTemplates();
    return { success: true, template: payload };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ذخیره قالب" };
  }
}

export async function deleteUserTemplate(id) {
  if (!isBackendTemplateId(id)) return { success: true };
  try {
    await TemplatesApi.remove(id);
    await loadTemplates();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف قالب" };
  }
}

export function builtinTemplateMapKey() {
  return "kroki_tpl_map_" + (state.user?.id ?? "guest");
}

export function readBuiltinTemplateMap() {
  try {
    return JSON.parse(localStorage.getItem(builtinTemplateMapKey()) || "{}") || {};
  } catch {
    return {};
  }
}

export function writeBuiltinTemplateMap(map) {
  try {
    localStorage.setItem(builtinTemplateMapKey(), JSON.stringify(map || {}));
  } catch {}
}

export async function resolveTemplateId(tplId) {
  const id = String(tplId ?? "");
  if (/^\d+$/.test(id)) return { id: Number(id) };
  const fp = getTemplate(id);
  if (!fp) return { id: null };
  const sourceKey = "builtin:" + id;
  const existing = state.templates.find((t) => t._source === sourceKey);
  if (existing && /^\d+$/.test(String(existing.id))) return { id: Number(existing.id) };
  // نگاشت ذخیره‌شده از نشست‌های قبلی تا برای هر پرداخت یک قالب تکراری ساخته نشود
  // و در صورت قطعی لحظه‌ای، بدون POST اضافه ادامه دهیم
  const cached = readBuiltinTemplateMap()[sourceKey];
  if (cached && /^\d+$/.test(String(cached))) return { id: Number(cached) };
  // یک بار تلاش مجدد در برابر قطعی‌های لحظه‌ای شبکه (مثل ERR_TIMED_OUT)
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const created = await TemplatesApi.create(
        templateToApi({ ...fp, name: (fp.name || "قالب") + " — سامانه" }),
      );
      if (!created?.template?.id) {
        lastErr = new Error("پاسخ سرور نامعتبر است");
        continue;
      }
      const mapped = { ...templateFromApi(created.template), _backend: true, _source: sourceKey };
      state.templates.unshift(mapped);
      const map = readBuiltinTemplateMap();
      map[sourceKey] = mapped.id;
      writeBuiltinTemplateMap(map);
      return { id: Number(mapped.id) };
    } catch (e) {
      lastErr = e;
      // خطای احراز هویت را دوباره تلاش نکن
      if (/نشست|وارد/.test(e?.message || "")) break;
    }
  }
  return { id: null, error: lastErr?.message || "خطا در ارتباط با سرور" };
}

export function sessionUserId() {
  return state.user?.id || null;
}
