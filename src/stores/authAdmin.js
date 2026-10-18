import { listOf, UsersApi, AdminApi } from "../api";
import { state, normalizeUser, mapTx, loadWallet, KROKI_PRICE, LS } from "./authCore";

/* ---------------- کاربران (ادمین) ---------------- */

export async function loadUsers() {
  try {
    const d = await UsersApi.list();
    state.users = (listOf(d) || []).map(normalizeUser);
    for (const u of state.users) {
      if (String(u.id) === String(state.user?.id)) {
        state.user = { ...state.user, ...u };
        localStorage.setItem(LS.user, JSON.stringify(state.user));
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کاربران" };
  }
}

export async function setRole(userId, role) {
  const want = ["admin", "user", "agent"].includes(role) ? role : "user";
  try {
    await UsersApi.update(userId, { role: want });
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) u.role = want;
    if (String(state.user?.id) === String(userId)) {
      state.user = { ...state.user, role: want };
      localStorage.setItem("kroki_user", JSON.stringify(state.user));
    }
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر نقش کاربر" };
  }
}

export async function setFreeKroki(userId, n) {
  const value = Math.max(0, Math.floor(Number(n) || 0));
  try {
    await UsersApi.update(userId, { free_kroki_count: value });
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) u.freeKroki = value;
    if (String(state.user?.id) === String(userId)) await loadWallet();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در تغییر کروکی رایگان" };
  }
}

export async function creditUser(userId, amount) {
  const amt = Number(amount);
  if (!amt || amt <= 0) return { success: false, error: "مبلغ معتبر نیست" };
  try {
    await UsersApi.credit(userId, amt);
    await loadUsers();
    if (String(state.user?.id) === String(userId)) await loadWallet();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در شارژ کیف پول" };
  }
}

export async function toggleActive(userId) {
  const u = state.users.find((x) => String(x.id) === String(userId));
  const active = u ? !u.active : false;
  try {
    await UsersApi.update(userId, { active });
    if (u) u.active = active;
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر وضعیت کاربر" };
  }
}

export async function editUser(userId, { name, password, phone, nationalId, city } = {}) {
  const body = {};
  if (String(name || "").trim()) body.full_name = String(name).trim();
  if (String(password || "").trim()) body.password = String(password).trim();
  if (phone !== undefined) body.phone = phone;
  if (nationalId !== undefined) body.national_id = nationalId;
  if (city !== undefined) body.city = city;
  if (!Object.keys(body).length) return { success: true };
  try {
    const d = await UsersApi.update(userId, body);
    const updated = normalizeUser(d?.user);
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) Object.assign(u, updated);
    if (String(state.user?.id) === String(userId)) {
      state.user = { ...state.user, ...updated };
      localStorage.setItem("kroki_user", JSON.stringify(state.user));
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کاربر" };
  }
}

export async function deleteUser(userId) {
  try {
    await UsersApi.remove(userId);
    state.users = state.users.filter((x) => String(x.id) !== String(userId));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کاربر" };
  }
}

/* ---------------- پنل ادمین ---------------- */

export async function loadStats() {
  try {
    const d = await AdminApi.stats();
    state.stats = d;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت آمار" };
  }
}

export async function loadAdminKrokis(status) {
  try {
    const d = await AdminApi.krokis(status);
    state.adminKrokis = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

export async function loadAdminTransactions() {
  try {
    const d = await AdminApi.transactions();
    state.adminTransactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

export async function loadRoles() {
  try {
    const d = await AdminApi.roles();
    state.roles = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت نقش‌ها" };
  }
}

/* ---------------- قیمت کروکی به تفکیک شهر ---------------- */

export async function loadCityPrices() {
  try {
    const d = await AdminApi.cityPrices();
    state.cityPrices = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت قیمت شهرها" };
  }
}

export async function setCityPrice(city, price) {
  try {
    await AdminApi.setCityPrice(String(city || "").trim(), Number(price) || 0);
    await loadCityPrices();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت قیمت شهر" };
  }
}

export function priceForCity(_city) {
  return KROKI_PRICE;
}

/* قیمت واقعی قابل پرداخت — فعلا ثابت است و بر اساس شهر نیست */
export async function effectivePrice(_city) {
  return KROKI_PRICE;
}
