import { listOf, ReferralsApi, UsersApi, AgencyApi } from "../api";
import { faToEn } from "../utils/validators";
import { state, loadWallet, refreshMe } from "./authCore";

/* ---------------- معرفی ---------------- */

export async function redeemReferral(code) {
  const normalized = faToEn(code || "").trim().toUpperCase();
  if (!normalized) return { success: false, error: "کد معرف را وارد کنید" };
  try {
    const d = await ReferralsApi.redeem(normalized);
    await loadWallet();
    await loadMyReferrals();
    return { success: true, granted: d?.granted, already: d?.already === true, freeKroki: d?.free_kroki_count };
  } catch (e) {
    return { success: false, error: e.message || "خطا در اعمال کد معرف" };
  }
}

export async function loadMyReferrals() {
  try {
    const d = await ReferralsApi.my();
    state.myReferrals = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت معرفی‌ها" };
  }
}

export async function loadAllReferrals() {
  try {
    const d = await ReferralsApi.list();
    state.referrals = listOf(d) || [];
    try {
      const p = await ReferralsApi.personalAll();
      state.personalReferralCodes = listOf(p) || [];
    } catch {}
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کدهای معرف" };
  }
}

export async function loadPersonalReferralCodes() {
  try {
    const p = await ReferralsApi.personalAll();
    state.personalReferralCodes = listOf(p) || [];
    return { success: true };
  } catch (e) {
    // fallback: از روی لیست کاربران
    state.personalReferralCodes = (state.users || [])
      .filter((u) => u.referralCode)
      .map((u) => ({ id: u.id, username: u.username, full_name: u.name, phone: u.phone, code: u.referralCode, free_kroki_amount: Number(u.personalFreeKroki ?? 1) }));
    return { success: true };
  }
}

export async function createReferral({ code, free_kroki_amount, max_uses, expires_at } = {}) {
  try {
    // سقف خالی = نامحدود (چندبارمصرف)؛ فقط عدد معتبر ارسال می‌شود
    const rawMax = String(max_uses ?? "").trim();
    const body = {
      code: String(code || "").trim(),
      free_kroki_amount: Number(free_kroki_amount) || 1,
      max_uses: rawMax === "" ? null : Number(rawMax),
      expires_at: expires_at || "",
    };
    if (body.max_uses != null && (!Number.isFinite(body.max_uses) || body.max_uses < 1)) body.max_uses = null;
    await ReferralsApi.create(body);
    await loadAllReferrals();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ساخت کد معرف" };
  }
}

/* ---------------- کد معرف شخصی هر کاربر ----------------
 * هر کاربر یک کد معرف یکتا دارد؛ هر کس آن کد را (در ثبت‌نام یا پنل کاربری)
 * وارد کند، زیرمجموعه مالک کد می‌شود و کروکی رایگان می‌گیرد.
 */

export function extractCode(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return (
    payload.code ||
    payload.referral_code ||
    payload.referralCode ||
    payload.agent_code ||
    payload?.referral?.code ||
    ""
  );
}

export async function loadMyReferralCode() {
  // ۱) تلاش با اندپوینت اختصاصی کد شخصی
  try {
    const d = await ReferralsApi.myCode();
    const code = String(extractCode(d) || "").trim();
    if (code) {
      state.myReferralCode = code;
      return { success: true, code };
    }
  } catch {}
  // ۲) fallback: کد نمایندگی (برای سازگاری با بک‌اند فعلی)
  try {
    const d = await AgencyApi.me();
    const code = String(d?.code || d?.agent_code || "").trim();
    if (code) {
      state.myReferralCode = code;
      if (!state.myAgent) state.myAgent = d;
      return { success: true, code };
    }
  } catch {}
  // ۳) fallback آخر: کدی که همراه پروفایل کاربر آمده
  const fallback = String(state.user?.referralCode || "").trim();
  if (fallback) {
    state.myReferralCode = fallback;
    return { success: true, code: fallback };
  }
  return { success: true, code: "" };
}

export async function ensureMyReferralCode() {
  const existing = await loadMyReferralCode();
  if (existing?.code) return existing;
  try {
    const d = await ReferralsApi.ensureMyCode();
    const code = String(extractCode(d) || "").trim();
    if (code) {
      state.myReferralCode = code;
      return { success: true, code };
    }
  } catch (e) {
    return { success: false, error: e.message || "خطا در ساخت کد معرف شخصی" };
  }
  return { success: true, code: state.myReferralCode || "" };
}

export async function saveMyReferralCode(code) {
  const normalized = faToEn(code || "").trim().toUpperCase();
  if (!normalized) return { success: false, error: "کد معرف را وارد کنید" };
  try {
    const d = await ReferralsApi.saveMyCode(normalized);
    const saved = String(extractCode(d) || normalized).trim();
    state.myReferralCode = saved;
    await refreshMe().catch(() => {});
    return { success: true, code: saved };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ذخیره کد معرف شخصی" };
  }
}

/* ادمین: تعریف/تغییر کد معرف یک کاربر خاص (+ سهمیه کروکی رایگان آن کد) */
export async function adminSetUserReferralCode(userId, code, freeKrokiAmount) {
  const normalized = faToEn(code || "").trim().toUpperCase();
  if (!normalized) return { success: false, error: "کد معرف را وارد کنید" };
  const free = freeKrokiAmount === undefined || freeKrokiAmount === "" ? undefined : Math.floor(Number(freeKrokiAmount));
  if (free !== undefined && (!Number.isFinite(free) || free < 0 || free > 1000))
    return { success: false, error: "تعداد کروکی رایگان باید بین ۰ تا ۱۰۰۰ باشد" };
  // ۱) اندپوینت اختصاصی
  try {
    const d = await UsersApi.setReferralCode(userId, normalized, free);
    const saved = String(extractCode(d) || normalized).trim();
    const savedFree = Number(d?.free_kroki_amount ?? free);
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) {
      u.referralCode = saved;
      if (Number.isFinite(savedFree)) u.personalFreeKroki = savedFree;
    }
    await loadPersonalReferralCodes().catch(() => {});
    return { success: true, code: saved };
  } catch (firstErr) {
    // ۲) fallback: PATCH عمومی کاربر (اگر بک‌اند referral_code را بپذیرد)
    try {
      const body = { referral_code: normalized };
      if (free !== undefined) body.referral_free_kroki = free;
      await UsersApi.update(userId, body);
      const u = state.users.find((x) => String(x.id) === String(userId));
      if (u) {
        u.referralCode = normalized;
        if (free !== undefined) u.personalFreeKroki = free;
      }
      await loadPersonalReferralCodes().catch(() => {});
      return { success: true, code: normalized };
    } catch {
      return { success: false, error: firstErr.message || "خطا در ثبت کد معرف کاربر" };
    }
  }
}

/* ادمین: پاک کردن کد معرف شخصی یک کاربر */
export async function adminDeleteUserReferralCode(userId) {
  try {
    await UsersApi.deleteReferralCode(userId);
  } catch (firstErr) {
    // fallback برای بک‌اند قدیمی: PATCH با کد خالی
    try {
      await UsersApi.update(userId, { referral_code: "" });
    } catch {
      return { success: false, error: firstErr.message || "خطا در حذف کد معرف" };
    }
  }
  const u = state.users.find((x) => String(x.id) === String(userId));
  if (u) u.referralCode = "";
  state.personalReferralCodes = (state.personalReferralCodes || []).filter((p) => String(p.id) !== String(userId));
  return { success: true };
}

export async function updateReferral(id, patch) {
  try {
    const d = await ReferralsApi.update(id, patch);
    await loadAllReferrals();
    return { success: true, referral: d?.referral };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کد معرف" };
  }
}

export async function deleteReferral(id) {
  try {
    await ReferralsApi.remove(id);
    await loadAllReferrals();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کد معرف" };
  }
}
