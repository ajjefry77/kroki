import { reactive, computed } from "vue";
import {
  getTemplate,
  templateToApi,
  templateFromApi,
  isBackendTemplateId,
  setUserTemplatesProvider,
} from "../utils/templates";

/*
 * احراز هویت از طریق بک‌اند کروکی (همین ریپو)
 *  - POST /auth/register, POST /auth/login, GET /auth/me, PATCH /auth/me
 *  - کیف پول: GET /wallet, GET /wallet/transactions
 *  - قالب‌ها: GET/POST /templates, GET/PATCH/DELETE /templates/:id
 *  - کروکی‌ها: GET/POST /krokis, GET /krokis/track/:code, GET/PATCH/DELETE /krokis/:id,
 *    POST /krokis/:id/pay, POST /krokis/:id/issue
 *  - شارژ: POST /charges, GET /charges/my، GET /charges (ادمین)، POST /charges/:id/approve|reject
 *  - معرفی: POST /referrals/redeem, GET /referrals/my، GET/POST /referrals (ادمین)، PATCH/DELETE /referrals/:id
 *  - کاربران (ادمین): GET /users, GET/PATCH /users/:id, POST /users/:id/credit
 *  - ادمین: GET /admin/stats, GET /admin/krokis, GET /admin/transactions, GET /admin/roles
 */

const LS = {
  token: "kroki_token",
  user: "kroki_user",
};

export const KROKI_PRICE = 50000;
export const WALLET_CARD = "5047-0611-3665-6671";
export const CARD_OWNER = "جلیل باقرزاده";

const API_BASE = (import.meta.env.VITE_SERVER || "").replace(/\/+$/, "") + "/api";

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null || v === undefined ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

const state = reactive({
  token: localStorage.getItem(LS.token) || null,
  user: read(LS.user, null),
  users: [],
  templates: [],
  requests: [],
  transactions: [],
  myKrokis: [],
  referrals: [],
  myReferrals: [],
  stats: null,
  adminKrokis: [],
  adminTransactions: [],
  roles: [],
  loading: false,
});

setUserTemplatesProvider(() => state.templates.map((t) => ({ ...t })));

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("خطا در ارتباط با سرور؛ اتصال خود را بررسی کنید");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401) {
    logout();
    throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید");
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `خطا در ارتباط با سرور (${res.status})`);
  }
  return data;
}

function listOf(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function faToEn(s) {
  return String(s || "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeUser(u) {
  return {
    id: u?.id,
    username: u?.username || u?.phone || "",
    phone: u?.phone || "",
    name: u?.full_name || u?.name || u?.username || "",
    full_name: u?.full_name || "",
    role: u?.role || u?.role_name || "user",
    wallet: Number(u?.wallet_balance ?? u?.wallet ?? 0),
    freeKroki: Number(u?.free_kroki_count ?? u?.freeKroki ?? 0),
    active: u?.active !== false,
  };
}

async function loadWallet() {
  if (!state.user?.id) return;
  try {
    const d = await api("/wallet");
    const w = Number(d?.wallet_balance ?? 0);
    const f = Number(d?.free_kroki_count ?? 0);
    if (state.user) {
      state.user.wallet = w;
      state.user.freeKroki = f;
      localStorage.setItem(LS.user, JSON.stringify(state.user));
    }
  } catch {}
}

async function refreshMe() {
  if (!state.token) return;
  try {
    const d = await api("/auth/me");
    const u = normalizeUser(d?.user || d);
    if (u.id) {
      state.user = { ...(state.user || {}), ...u };
      localStorage.setItem(LS.user, JSON.stringify(state.user));
    }
  } catch {}
  await loadWallet();
}

function loadSession() {
  const u = read(LS.user, null);
  if (!u || u.id === null || u.id === undefined) {
    if (localStorage.getItem(LS.token)) localStorage.removeItem(LS.token);
    return;
  }
  state.user = { ...u, freeKroki: Number(u.freeKroki || 0), wallet: Number(u.wallet || 0) };
}
loadSession();

const isAuthenticated = computed(() => !!state.token && !!state.user?.id);
const isAdmin = computed(() => state.user?.role === "admin");

async function login(username, password) {
  const uname = faToEn(username).trim();
  if (!uname || !password) return { success: false, error: "نام کاربری و رمز عبور را وارد کنید" };
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { username: uname, password },
      auth: false,
    });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, user);
    await refreshMe();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ورود به سامانه" };
  }
}

function cleanUsername(s) {
  return faToEn(s)
    .trim();
}

async function register(payload) {
  const name = String(payload?.name || "").trim();
  const phone = faToEn(payload?.phone).trim();
  const username = cleanUsername(payload?.username) || phone;
  const password = String(payload?.password || "");
  if (name.length < 3) return { success: false, error: "نام و نام خانوادگی را کامل وارد کنید" };
  if (!/^09\d{9}$/.test(phone)) return { success: false, error: "شماره موبایل معتبر (11 رقم با 09) وارد کنید" };
  if (password.length < 6) return { success: false, error: "رمز عبور حداقل ۶ کاراکتر باشد" };
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: { username, phone, full_name: name, national_id: "", password },
      auth: false,
    });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, user);
    await refreshMe();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت نام" };
  }
}

function applyAuth(token, userData) {
  state.token = token;
  localStorage.setItem(LS.token, token);
  const u = normalizeUser(userData);
  state.user = u;
  localStorage.setItem(LS.user, JSON.stringify(state.user));
  state.users = [];
}

function logout() {
  state.token = null;
  state.user = null;
  state.users = [];
  state.templates = [];
  state.requests = [];
  state.transactions = [];
  state.myKrokis = [];
  state.referrals = [];
  state.myReferrals = [];
  state.stats = null;
  state.adminKrokis = [];
  state.adminTransactions = [];
  state.roles = [];
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.user);
}

function walletOf() {
  return state.user ? Number(state.user.wallet) || 0 : 0;
}
function freeOf() {
  return state.user ? Number(state.user.freeKroki) || 0 : 0;
}

/* ---------------- تراکنش‌ها (GET /wallet/transactions) ---------------- */

function mapTx(t) {
  return {
    id: t.id,
    userId: t.user_id,
    amount: Number(t.amount || 0),
    type: t.type,
    typeLabel: t.type_label || "",
    status: t.status || "success",
    ref: t.ref_id,
    balanceAfter: t.balance_after,
    at: t.created_at,
  };
}

async function loadTransactions() {
  try {
    const d = await api("/wallet/transactions");
    state.transactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

function txList() {
  return state.transactions;
}

/* ---------------- شارژ کیف پول (POST /charges و ...) ---------------- */

function mapCharge(r) {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username || "",
    name: r.full_name || r.username || "",
    phone: r.phone || "",
    amount: Number(r.amount || 0),
    card: r.card_number,
    paymentId: r.payment_tracking_id,
    note: r.note,
    status: r.status,
    at: r.created_at,
    decidedAt: r.decided_at,
  };
}

async function requestCharge({ amount, card, paymentId, note } = {}) {
  const user = state.user;
  if (!user) return { success: false, error: "ابتدا وارد حساب شوید" };
  const amt = Number(amount);
  const cards = String(card || "").replace(/\D/g, "");
  const pid = String(paymentId || "").trim();
  if (!amt || amt < 1000) return { success: false, error: "حداقل مبلغ شارژ ۱٬۰۰۰ تومان است" };
  if (!/^\d{16}$/.test(cards)) return { success: false, error: "شماره کارت باید ۱۶ رقم باشد" };
  if (pid.length < 2) return { success: false, error: "شناسه پرداخت را وارد کنید" };
  try {
    await api("/charges", {
      method: "POST",
      body: { amount: amt, card_number: cards, payment_tracking_id: pid, note: String(note || "").trim() },
    });
    await loadMyCharges();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت درخواست شارژ" };
  }
}

async function loadMyCharges() {
  try {
    const d = await api("/charges/my");
    state.requests = (listOf(d) || []).map(mapCharge);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های شارژ" };
  }
}

async function loadAllCharges(status) {
  try {
    const q = status ? `?status=${status}` : "";
    const d = await api("/charges" + q);
    state.requests = (listOf(d) || []).map(mapCharge);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های شارژ" };
  }
}

function pendingOf(userId) {
  return state.requests.filter((r) => String(r.userId) === String(userId) && r.status === "pending");
}
function requestsOf(userId) {
  return state.requests.filter((r) => String(r.userId) === String(userId));
}

async function approveRequest(id) {
  try {
    await api(`/charges/${id}/approve`, { method: "POST", body: {} });
    const me = state.requests.find((r) => r.id === id);
    if (me) {
      me.status = "approved";
      me.decidedAt = new Date().toISOString();
      if (String(me.userId) === String(state.user?.id)) await loadWallet();
    }
    await loadAllCharges();
    await loadStats();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در تأیید شارژ" };
  }
}

async function rejectRequest(id) {
  try {
    await api(`/charges/${id}/reject`, { method: "POST", body: {} });
    const me = state.requests.find((r) => r.id === id);
    if (me) {
      me.status = "rejected";
      me.decidedAt = new Date().toISOString();
    }
    await loadAllCharges();
    await loadStats();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در رد شارژ" };
  }
}

/* ---------------- قالب‌ها (GET/POST /templates و ...) ---------------- */

async function loadTemplates() {
  try {
    const d = await api("/templates");
    state.templates = (listOf(d) || []).map((r) => ({ ...templateFromApi(r), _backend: true }));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت قالب‌ها" };
  }
}

function userTemplates() {
  return state.templates;
}

async function saveUserTemplate(t, _userId) {
  if (!t) return { success: false, error: "قالب نامعتبر است" };
  const body = templateToApi(t);
  const payload = { ...t, ...body };
  try {
    if (isBackendTemplateId(t.id)) {
      await api(`/templates/${t.id}`, { method: "PATCH", body });
    } else {
      const created = await api("/templates", { method: "POST", body });
      payload.id = created?.template?.id;
    }
    await loadTemplates();
    return { success: true, template: payload };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ذخیره قالب" };
  }
}

async function deleteUserTemplate(id) {
  if (!isBackendTemplateId(id)) return { success: true };
  try {
    await api(`/templates/${id}`, { method: "DELETE" });
    await loadTemplates();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف قالب" };
  }
}

async function resolveTemplateId(tplId) {
  const id = String(tplId ?? "");
  if (/^\d+$/.test(id)) return Number(id);
  const fp = getTemplate(id);
  if (!fp) return null;
  const sourceKey = "builtin:" + id;
  const existing = state.templates.find((t) => t._source === sourceKey);
  if (existing && /^\d+$/.test(String(existing.id))) return Number(existing.id);
  try {
    const created = await api("/templates", {
      method: "POST",
      body: templateToApi({ ...fp, name: (fp.name || "قالب") + " — سامانه" }),
    });
    if (!created?.template?.id) return null;
    const mapped = { ...templateFromApi(created.template), _backend: true, _source: sourceKey };
    state.templates.unshift(mapped);
    return Number(mapped.id);
  } catch {
    return null;
  }
}

function sessionUserId() {
  return state.user?.id || null;
}

/* ---------------- کروکی‌ها (GET/POST /krokis و ...) ---------------- */

async function createKroki(payload, tplId) {
  const tid = tplId !== undefined ? await resolveTemplateId(tplId) : payload?.template_id;
  if (!tid) return { success: false, error: "قالب کروکی یافت نشد" };
  try {
    const body = { ...payload, template_id: tid };
    delete body.template_id_orig;
    const d = await api("/krokis", { method: "POST", body });
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت کروکی" };
  }
}

async function updateKroki(id, payload) {
  try {
    const d = await api(`/krokis/${id}`, { method: "PATCH", body: payload });
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در به‌روزرسانی کروکی" };
  }
}

async function myKrokis() {
  try {
    const d = await api("/krokis");
    state.myKrokis = listOf(d) || [];
    return { success: true, data: state.myKrokis };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

async function getKroki(id) {
  try {
    const d = await api(`/krokis/${id}`);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی" };
  }
}

async function trackKroki(code) {
  try {
    const d = await api(`/krokis/track/${encodeURIComponent(code)}`);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "کروکی یافت نشد" };
  }
}

async function payKroki(id, mode) {
  try {
    const d = await api(`/krokis/${id}/pay`, { method: "POST", body: { mode } });
    await loadWallet();
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در پرداخت" };
  }
}

async function issueKroki(id, pdfUrl) {
  try {
    const d = await api(`/krokis/${id}/issue`, {
      method: "POST",
      body: pdfUrl ? { pdf_url: pdfUrl } : {},
    });
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در صدور کروکی" };
  }
}

async function deleteKroki(id) {
  try {
    await api(`/krokis/${id}`, { method: "DELETE" });
    state.myKrokis = state.myKrokis.filter((k) => String(k.id) !== String(id));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کروکی" };
  }
}

/* ---------------- معرفی (POST /referrals/redeem و ...) ---------------- */

async function redeemReferral(code) {
  if (!String(code || "").trim()) return { success: false, error: "کد معرف را وارد کنید" };
  try {
    const d = await api("/referrals/redeem", { method: "POST", body: { code: String(code).trim() } });
    await loadWallet();
    await loadMyReferrals();
    return { success: true, granted: d?.granted, freeKroki: d?.free_kroki_count };
  } catch (e) {
    return { success: false, error: e.message || "خطا در اعمال کد معرف" };
  }
}

async function loadMyReferrals() {
  try {
    const d = await api("/referrals/my");
    state.myReferrals = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت معرفی‌ها" };
  }
}

async function loadAllReferrals() {
  try {
    const d = await api("/referrals");
    state.referrals = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کدهای معرف" };
  }
}

async function createReferral({ code, free_kroki_amount, max_uses, expires_at } = {}) {
  try {
    const body = {
      code: String(code || "").trim(),
      free_kroki_amount: Number(free_kroki_amount) || 1,
      max_uses: Number(max_uses) || 1,
      expires_at: expires_at || "",
    };
    await api("/referrals", { method: "POST", body });
    await loadAllReferrals();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ساخت کد معرف" };
  }
}

async function updateReferral(id, patch) {
  try {
    const d = await api(`/referrals/${id}`, { method: "PATCH", body: patch });
    await loadAllReferrals();
    return { success: true, referral: d?.referral };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کد معرف" };
  }
}

async function deleteReferral(id) {
  try {
    await api(`/referrals/${id}`, { method: "DELETE" });
    await loadAllReferrals();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کد معرف" };
  }
}

/* ---------------- کاربران (ادمین: GET /users و ...) ---------------- */

async function loadUsers() {
  try {
    const d = await api("/users");
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

async function setRole(userId, role) {
  const want = role === "admin" ? "admin" : "user";
  try {
    await api(`/users/${userId}`, { method: "PATCH", body: { role: want } });
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) u.role = want;
    if (String(state.user?.id) === String(userId)) {
      state.user = { ...state.user, role: want };
      localStorage.setItem(LS.user, JSON.stringify(state.user));
    }
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر نقش کاربر" };
  }
}

async function setFreeKroki(userId, n) {
  const value = Math.max(0, Math.floor(Number(n) || 0));
  try {
    await api(`/users/${userId}`, { method: "PATCH", body: { free_kroki_count: value } });
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) u.freeKroki = value;
    if (String(state.user?.id) === String(userId)) await loadWallet();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در تغییر کروکی رایگان" };
  }
}

async function creditUser(userId, amount) {
  const amt = Number(amount);
  if (!amt || amt <= 0) return { success: false, error: "مبلغ معتبر نیست" };
  try {
    await api(`/users/${userId}/credit`, { method: "POST", body: { amount: amt } });
    await loadUsers();
    if (String(state.user?.id) === String(userId)) await loadWallet();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در شارژ کیف پول" };
  }
}

async function toggleActive(userId) {
  const u = state.users.find((x) => String(x.id) === String(userId));
  const active = u ? !u.active : false;
  try {
    await api(`/users/${userId}`, { method: "PATCH", body: { active } });
    if (u) u.active = active;
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر وضعیت کاربر" };
  }
}

async function editUser(userId, { name, password } = {}) {
  const body = {};
  if (String(name || "").trim()) body.full_name = String(name).trim();
  if (String(password || "").trim()) body.password = String(password).trim();
  if (!Object.keys(body).length) return { success: true };
  try {
    const d = await api(`/users/${userId}`, { method: "PATCH", body });
    const updated = normalizeUser(d?.user);
    const u = state.users.find((x) => String(x.id) === String(userId));
    if (u) Object.assign(u, updated);
    if (String(state.user?.id) === String(userId)) {
      state.user = { ...state.user, ...updated };
      localStorage.setItem(LS.user, JSON.stringify(state.user));
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کاربر" };
  }
}

/* ---------------- پنل ادمین (GET /admin/stats و ...) ---------------- */

async function loadStats() {
  try {
    const d = await api("/admin/stats");
    state.stats = d;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت آمار" };
  }
}

async function loadAdminKrokis(status) {
  try {
    const q = status ? `?status=${status}` : "";
    const d = await api("/admin/krokis" + q);
    state.adminKrokis = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

async function loadAdminTransactions() {
  try {
    const d = await api("/admin/transactions");
    state.adminTransactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

async function loadRoles() {
  try {
    const d = await api("/admin/roles");
    state.roles = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت نقش‌ها" };
  }
}

/* ---------------- هم‌گام‌سازی اولیه ---------------- */

function syncUser() {
  void refreshMe();
}

export const auth = {
  state,
  KROKI_PRICE,
  WALLET_CARD,
  CARD_OWNER,
  isAuthenticated,
  isAdmin,
  login,
  register,
  logout,
  refreshMe,
  walletOf,
  freeOf,
  loadWallet,
  txList,
  loadTransactions,
  requestCharge,
  loadMyCharges,
  loadAllCharges,
  pendingOf,
  requestsOf,
  approveRequest,
  rejectRequest,
  loadTemplates,
  userTemplates,
  saveUserTemplate,
  deleteUserTemplate,
  createKroki,
  updateKroki,
  myKrokis,
  getKroki,
  trackKroki,
  payKroki,
  issueKroki,
  deleteKroki,
  redeemReferral,
  loadMyReferrals,
  loadAllReferrals,
  createReferral,
  updateReferral,
  deleteReferral,
  loadUsers,
  setRole,
  setFreeKroki,
  creditUser,
  toggleActive,
  editUser,
  loadStats,
  loadAdminKrokis,
  loadAdminTransactions,
  loadRoles,
  syncUser,
  sessionUserId,
};

export function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString("fa-IR");
}
export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}