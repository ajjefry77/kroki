import { listOf, FreeDaysApi } from "../api";
import { state } from "./authCore";

/* ---------------- روزهای رایگان سامانه (ادمین) ---------------- */

export function mapFreeDay(r) {
  return {
    id: r?.id,
    day: String(r?.day || "").slice(0, 10),
    occasion: r?.occasion || "",
    active: r?.is_active !== false,
  };
}

export async function loadFreeDays() {
  try {
    state.freeDays = (listOf(await FreeDaysApi.list()) || []).map(mapFreeDay);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت روزهای رایگان" };
  }
}

export async function saveFreeDay({ day, occasion, isActive } = {}) {
  try {
    const row = mapFreeDay(await FreeDaysApi.save({ day, occasion, is_active: isActive !== false }));
    const i = state.freeDays.findIndex((x) => x.day === row.day);
    if (i >= 0) state.freeDays.splice(i, 1, row);
    else state.freeDays.push(row);
    state.freeDays.sort((a, b) => (a.day < b.day ? -1 : 1));
    return { success: true, day: row };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت روز رایگان" };
  }
}

export async function removeFreeDay(id) {
  try {
    await FreeDaysApi.remove(id);
    state.freeDays = state.freeDays.filter((x) => String(x.id) !== String(id));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف روز رایگان" };
  }
}

/* ---------------- هدیه ثبت‌نام ---------------- */

export async function loadSignupGift() {
  try {
    const d = await FreeDaysApi.signupGift();
    state.signupGift = {
      type: d?.type === "krokis" ? "krokis" : "days",
      value: Number(d?.value ?? 0),
    };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تنظیمات هدیه ثبت‌نام" };
  }
}

export async function saveSignupGift(type, value) {
  try {
    const d = await FreeDaysApi.setSignupGift({ type, value: Number(value) });
    state.signupGift = {
      type: d?.type === "krokis" ? "krokis" : "days",
      value: Number(d?.value ?? 0),
    };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ذخیره تنظیمات هدیه ثبت‌نام" };
  }
}
