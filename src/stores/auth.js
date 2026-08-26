import { reactive, computed } from "vue";

/*
 * احراز هویت از طریق بک‌اند مشترک mapiq (همان API پروژه mapiq-fixed-main)
 *  - ورود/ثبت‌نام از سرور (POST /api/login و /api/register)
 *  - کاربران از همان بک‌اند خوانده می‌شوند
 *  - نقش مدیر (admin) از روی نقش‌های کاربرِ برگشتی از سرور تشخیص داده می‌شود
 *  - کیف پول، کروکی رایگان و قالب‌های شخصی (امکانات اختصاصی کروکی) همچنان به‌صورت محلی و
 *    به تفکیک شناسه کاربرِ بک‌اند ذخیره می‌شوند.
 */

const LS = {
  token: "kroki_token",
  user: "kroki_user",
  profiles: "kroki_profiles",
  requests: "kroki_req",
  tx: (uid) => "kroki_tx_" + uid,
  templates: (uid) => "kroki_tpl_" + uid,
};

export const KROKI_PRICE = 150000;
export const WALLET_CARD = "6037-9977-1234-5678";
export const CARD_OWNER = "بانک ملت — به نام سامانه کروکی";

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

function rolesOf(user) {
  if (!user) return [];
  const names = [];
  if (Array.isArray(user.roles)) {
    names.push(...user.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean));
  }
  if (Array.isArray(user.Roles)) {
    names.push(...user.Roles.map((r) => r?.name).filter(Boolean));
  }
  return [...new Set(names.map((s) => String(s)))];
}

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

const state = reactive({
  token: localStorage.getItem(LS.token) || null,
  user: read(LS.user, null),
  profiles: read(LS.profiles, []),
  requests: read(LS.requests, []),
  users: [],
});

function persistProfiles() {
  write(LS.profiles, state.profiles);
}
function persistRequests() {
  write(LS.requests, state.requests);
}

function localProfile(uid) {
  if (uid === null || uid === undefined) return undefined;
  return state.profiles.find((p) => String(p.id) === String(uid));
}

function ensureProfile(userData) {
  const uid = userData?.id;
  if (uid === null || uid === undefined) return null;
  let p = localProfile(uid);
  if (!p) {
    p = {
      id: uid,
      username: userData.username || userData.phone || "",
      name: userData.name || userData.full_name || "",
      phone: userData.phone || "",
      role: rolesOf(userData).includes("admin") ? "admin" : "user",
      wallet: 0,
      freeKroki: 0,
      active: true,
      createdAt: Date.now(),
    };
    state.profiles.push(p);
    persistProfiles();
  } else {
    p.role = rolesOf(userData).includes("admin") ? "admin" : "user";
    if (userData.name || userData.full_name) p.name = userData.name || userData.full_name;
    persistProfiles();
  }
  return p;
}

function applyAuth(token, userData) {
  state.token = token;
  localStorage.setItem(LS.token, token);
  const p = ensureProfile(userData);
  state.user = {
    id: userData.id,
    name: userData.name || userData.full_name || p?.name || "",
    username: userData.username || userData.phone || p?.username || "",
    phone: userData.phone || "",
    roles: userData.roles,
    Roles: userData.Roles,
    wallet: p?.wallet ?? 0,
    freeKroki: p?.freeKroki ?? 0,
    active: p?.active ?? true,
    role: rolesOf(userData).includes("admin") ? "admin" : "user",
  };
  localStorage.setItem(LS.user, JSON.stringify(state.user));
  state.users = [];
}

async function enrichUser(userData) {
  const uid = userData?.id;
  if (uid === null || uid === undefined) return userData;
  try {
    const res = await api("/users/" + uid);
    if (res && (res.roles || res.Roles || res.full_name || res.name || res.username || res.phone)) {
      return res;
    }
  } catch {}
  try {
    const me = await api("/auth/me");
    if (me && (me.roles || me.Roles || me.full_name || me.name || me.username || me.phone)) return me;
  } catch {}
  return userData;
}

function loadSession() {
  const u = read(LS.user, null);
  if (!u || u.id === null || u.id === undefined) {
    if (localStorage.getItem(LS.token)) localStorage.removeItem(LS.token);
    return;
  }
  const p = localProfile(u.id);
  if (p && p.active === false) {
    localStorage.removeItem(LS.token);
    localStorage.removeItem(LS.user);
    return;
  }
  state.user = { ...u, ...(p ? { wallet: p.wallet, freeKroki: p.freeKroki, active: p.active, role: p.role } : {}) };
}
loadSession();

const isAuthenticated = computed(() => !!state.token && !!state.user?.id);
const isAdmin = computed(() => rolesOf(state.user).includes("admin"));

async function login(username, password) {
  const uname = String(username || "").trim();
  if (!uname || !password) {
    return { success: false, error: "نام کاربری و رمز عبور را وارد کنید" };
  }
  try {
    const data = await api("/login", { method: "POST", body: { username: uname, password }, auth: false });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    const p = localProfile(user.id);
    if (p && p.active === false) return { success: false, error: "حساب شما غیرفعال شده است" };
    applyAuth(token, await enrichUser(user));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ورود به سامانه" };
  }
}

async function register(payload) {
  const name = String(payload?.name || "").trim();
  const username = String(payload?.username || "").trim();
  const phone = String(payload?.phone || "").trim();
  const password = String(payload?.password || "");
  if (name.length < 3) return { success: false, error: "نام و نام خانوادگی را کامل وارد کنید" };
  if (password.length < 6) return { success: false, error: "رمز عبور حداقل ۶ کاراکتر باشد" };
  try {
    const data = await api("/register", {
      method: "POST",
      body: { name, username: username || phone, phone, password },
      auth: false,
    });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, await enrichUser(user));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت نام" };
  }
}

function logout() {
  state.token = null;
  state.user = null;
  state.users = [];
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.user);
}

function syncUser() {
  if (!state.user?.id) return;
  const p = localProfile(state.user.id);
  if (p) {
    state.user = { ...state.user, wallet: p.wallet, freeKroki: p.freeKroki, active: p.active, role: p.role };
    localStorage.setItem(LS.user, JSON.stringify(state.user));
  } else {
    logout();
  }
}

function touchUser(userId) {
  const p = localProfile(userId);
  const u = state.users.find((x) => String(x.id) === String(userId));
  if (u && p) {
    u.wallet = p.wallet;
    u.freeKroki = p.freeKroki;
    u.active = p.active;
  }
}

/* ---------------- لیست کاربران بک‌اند (پنل مدیریت) ---------------- */

async function loadUsers() {
  try {
    const data = await api("/users");
    const raw = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    state.users = raw
      .map((u) => {
        const uid = u.id;
        const p = ensureProfile(u);
        const roles = rolesOf(u);
        return {
          ...u,
          id: uid,
          name: u.full_name || u.name || p?.name || "",
          username: u.username || u.phone || p?.username || "",
          phone: u.phone || "",
          role: roles.includes("admin") ? "admin" : "user",
          wallet: p?.wallet ?? 0,
          freeKroki: p?.freeKroki ?? 0,
          active: p?.active ?? true,
        };
      })
      .filter((u) => u.id !== null && u.id !== undefined);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کاربران" };
  }
}

async function setRole(userId, role) {
  const want = role === "admin" ? "admin" : "user";
  const target = state.users.find((u) => String(u.id) === String(userId));
  if (!target) return { success: false, error: "کاربر یافت نشد" };
  try {
    let roleId = want;
    try {
      const r = await api("/roles");
      const roles = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
      const match = roles.find((x) => String(x?.name).toLowerCase() === want);
      if (match?.id !== undefined && match?.id !== null) roleId = match.id;
    } catch {}
    await api("/users/" + userId, { method: "PUT", body: { role_id: roleId } });
    target.role = want;
    const p = localProfile(userId);
    if (p) {
      p.role = want;
      persistProfiles();
      syncUser();
    }
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر نقش کاربر" };
  }
}

async function editUser(userId, { name, password } = {}) {
  const body = {};
  if (String(name || "").trim()) body.full_name = String(name).trim();
  if (String(password || "").trim()) body.password = String(password).trim();
  if (!Object.keys(body).length) return { success: true };
  try {
    await api("/users/" + userId, { method: "PUT", body });
    await loadUsers();
    if (String(state.user?.id) === String(userId)) {
      if (body.full_name) {
        state.user.name = body.full_name;
        const p = localProfile(userId);
        if (p) {
          p.name = body.full_name;
          persistProfiles();
        }
        localStorage.setItem(LS.user, JSON.stringify(state.user));
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کاربر" };
  }
}

async function removeUser(userId) {
  try {
    await api("/users/" + userId, { method: "DELETE" });
    state.users = state.users.filter((u) => String(u.id) !== String(userId));
    localStorage.removeItem(LS.tx(userId));
    localStorage.removeItem(LS.templates(userId));
    state.profiles = state.profiles.filter((p) => String(p.id) !== String(userId));
    persistProfiles();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کاربر" };
  }
}

/* ---------------- کیف پول / تراکنش‌ها ---------------- */

function walletOf() {
  return state.user ? Number(state.user.wallet) || 0 : 0;
}
function freeOf() {
  return state.user ? Number(state.user.freeKroki) || 0 : 0;
}

function addTx(userId, entry) {
  const list = read(LS.tx(userId), []);
  list.unshift({
    id: "tx_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...entry,
    at: entry.at || new Date().toISOString(),
  });
  write(LS.tx(userId), list.slice(0, 200));
}

function txList(userId) {
  return read(LS.tx(userId || state.user?.id), []);
}

function requestCharge({ amount, card, paymentId, note } = {}) {
  const user = state.user;
  if (!user) return { success: false, error: "ابتدا وارد حساب شوید" };
  const amt = Number(amount);
  if (!amt || amt < 10000) return { success: false, error: "حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است" };
  if (!paymentId || String(paymentId).trim().length < 8) {
    return { success: false, error: "شناسه پرداخت را وارد کنید" };
  }
  const req = {
    id: "req_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    userId: user.id,
    username: user.username,
    name: user.name,
    amount: amt,
    card: String(card || "").trim(),
    paymentId: String(paymentId).trim(),
    note: String(note || "").trim(),
    status: "pending",
    at: new Date().toISOString(),
  };
  state.requests.unshift(req);
  persistRequests();
  addTx(user.id, {
    amount: amt,
    type: "charge_request",
    typeLabel: "درخواست شارژ",
    status: "pending",
    ref: req.id,
  });
  return { success: true, id: req.id };
}

function pendingOf(userId) {
  return state.requests.filter((r) => r.userId === userId && r.status === "pending");
}
function requestsOf(userId) {
  return state.requests.filter((r) => r.userId === userId);
}

function approveRequest(id) {
  const req = state.requests.find((r) => r.id === id);
  if (!req || req.status !== "pending") return { success: false, error: "درخواست یافت نشد" };
  req.status = "approved";
  req.decidedAt = new Date().toISOString();
  const p = localProfile(req.userId);
  if (p) {
    p.wallet = (Number(p.wallet) || 0) + req.amount;
    persistProfiles();
    touchUser(req.userId);
    syncUser();
  }
  persistRequests();
  addTx(req.userId, {
    amount: req.amount,
    type: "charge",
    typeLabel: "شارژ کیف پول (تأیید ادمین)",
    status: "success",
    ref: id,
  });
  return { success: true };
}

function rejectRequest(id) {
  const req = state.requests.find((r) => r.id === id);
  if (!req || req.status !== "pending") return { success: false, error: "درخواست یافت نشد" };
  req.status = "rejected";
  req.decidedAt = new Date().toISOString();
  persistRequests();
  addTx(req.userId, {
    amount: req.amount,
    type: "charge",
    typeLabel: "درخواست شارژ",
    status: "rejected",
    ref: id,
  });
  return { success: true };
}

/* ---------------- پرداخت کروکی ---------------- */

function payForKroki() {
  const user = state.user;
  if (!user) return { success: false, error: "ابتدا وارد حساب شوید" };

  // ادمین بدون محدودیت و پرداخت
  if (rolesOf(user).includes("admin")) {
    addTx(user.id, {
      amount: 0,
      type: "free",
      typeLabel: "کروکی رایگان (ادمین)",
      status: "success",
      remainingFree: user.freeKroki,
    });
    return { success: true, mode: "admin", remaining: user.freeKroki };
  }

  if (Number(user.freeKroki) || 0) {
    user.freeKroki = Number(user.freeKroki) - 1;
    const p = localProfile(user.id);
    if (p) {
      p.freeKroki = user.freeKroki;
      persistProfiles();
    }
    syncUser();
    addTx(user.id, {
      amount: 0,
      type: "free",
      typeLabel: "استفاده از کروکی رایگان",
      status: "success",
      remainingFree: user.freeKroki,
    });
    return { success: true, mode: "free", remaining: user.freeKroki };
  }
  const bal = Number(user.wallet) || 0;
  if (bal >= KROKI_PRICE) {
    user.wallet = bal - KROKI_PRICE;
    const p = localProfile(user.id);
    if (p) {
      p.wallet = user.wallet;
      persistProfiles();
    }
    syncUser();
    addTx(user.id, {
      amount: -KROKI_PRICE,
      type: "spend",
      typeLabel: "پرداخت کروکی از کیف پول",
      status: "success",
      balance: user.wallet,
    });
    return { success: true, mode: "wallet", balance: user.wallet };
  }
  return {
    success: false,
    error: "موجودی کیف پول کافی نیست",
    need: KROKI_PRICE - bal,
  };
}

/* ---------------- مدیریت کاربران (ادمین) — فیلدهای محلی ---------------- */

function setFreeKroki(userId, n) {
  const p = localProfile(userId);
  if (!p) return false;
  p.freeKroki = Math.max(0, Math.floor(Number(n) || 0));
  persistProfiles();
  touchUser(userId);
  syncUser();
  return true;
}
function setWallet(userId, n) {
  const p = localProfile(userId);
  if (!p) return false;
  p.wallet = Math.max(0, Number(n) || 0);
  persistProfiles();
  touchUser(userId);
  syncUser();
  return true;
}
function toggleActive(userId) {
  const p = localProfile(userId);
  if (!p) return false;
  p.active = !p.active;
  persistProfiles();
  touchUser(userId);
  syncUser();
  return true;
}

/* ---------------- قالب‌های شخصی ---------------- */

function sessionUserId() {
  return state.user?.id || read(LS.user, null)?.id || null;
}
function userTemplates(userId) {
  return read(LS.templates(userId || sessionUserId()), []);
}
function saveUserTemplate(tpl, userId) {
  const uid = userId || sessionUserId();
  if (!uid || !tpl?.id) return false;
  const list = read(LS.templates(uid), []);
  const i = list.findIndex((t) => t.id === tpl.id);
  if (i >= 0) list[i] = tpl;
  else list.push(tpl);
  write(LS.templates(uid), list);
  return true;
}
function deleteUserTemplate(id, userId) {
  const uid = userId || sessionUserId();
  if (!uid) return false;
  write(
    LS.templates(uid),
    read(LS.templates(uid), []).filter((t) => t.id !== id),
  );
  return true;
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
  walletOf,
  freeOf,
  addTx,
  txList,
  requestCharge,
  pendingOf,
  requestsOf,
  approveRequest,
  rejectRequest,
  payForKroki,
  setFreeKroki,
  setWallet,
  setRole,
  toggleActive,
  removeUser,
  editUser,
  loadUsers,
  syncUser,
  userTemplates,
  saveUserTemplate,
  deleteUserTemplate,
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
