import { reactive, computed } from "vue";
import {
  getTemplate,
  templateToApi,
  templateFromApi,
  isBackendTemplateId,
  setUserTemplatesProvider,
} from "../utils/templates";
import {
  listOf,
  setAuthToken,
  setUnauthorizedHandler,
  AuthApi,
  WalletApi,
  TemplatesApi,
  KrokisApi,
  ReferralsApi,
  UsersApi,
  AdminApi,
  AgencyApi,
  ExpertsApi,
} from "../api";
import { faToEn, validatePassword } from "../utils/validators";

/*
 * استور احراز هویت و داده کاربر.
 * درخواست‌های HTTP در src/api تفکیک شده‌اند (auth/wallet/templates/krokis/...)؛
 * اینجا فقط وضعیت، نگاشت داده‌ها و منطق فرانت نگه داشته می‌شود.
 * ورودی/خروجی همه متدها مثل قبل { success, ... } است تا کامپوننت‌ها دست نخورند.
 */

export const KROKI_PRICE = 150000;
export const KROKI_ORIGINAL_PRICE = 300000;
export const WALLET_CARD = "5047-0611-3665-6671";
export const CARD_OWNER = "جلیل باقرزاده";

const LS = {
  token: "kroki_token",
  user: "kroki_user",
};

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
  personalReferralCodes: [],
  myReferrals: [],
  stats: null,
  adminKrokis: [],
  adminTransactions: [],
  roles: [],
  loading: false,
  cityPrices: [],
  myAgent: null,
  subordinates: [],
  myReferralCode: "",
  agencyRequests: [],
  adminAgents: [],
  agentDetail: null,
  experts: [],
  expertRequests: [],
});

setUserTemplatesProvider(() => state.templates.map((t) => ({ ...t })));

function normalizeUser(u) {
  return {
    id: u?.id,
    username: u?.username || u?.phone || "",
    phone: u?.phone || "",
    nationalId: u?.national_id || "",
    name: u?.full_name || u?.name || u?.username || "",
    full_name: u?.full_name || "",
    city: u?.city || "",
    role: u?.role || u?.role_name || "user",
    wallet: Number(u?.wallet_balance ?? u?.wallet ?? 0),
    freeKroki: Number(u?.free_kroki_count ?? u?.freeKroki ?? 0),
    active: u?.active !== false,
    referralCode: u?.referral_code || u?.referralCode || u?.agent_code || "",
    personalFreeKroki: Number(u?.referral_free_kroki ?? u?.personalFreeKroki ?? u?.free_kroki_amount ?? 1),
    referredBy: u?.referred_by ?? u?.referredBy ?? null,
  };
}

function applyAuth(token, userData) {
  state.token = token;
  localStorage.setItem(LS.token, token);
  setAuthToken(token);
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
  state.personalReferralCodes = [];
  state.myReferrals = [];
  state.stats = null;
  state.adminKrokis = [];
  state.adminTransactions = [];
  state.roles = [];
  state.cityPrices = [];
  state.myAgent = null;
  state.subordinates = [];
  state.myReferralCode = "";
  state.agencyRequests = [];
  state.adminAgents = [];
  state.agentDetail = null;
  state.experts = [];
  state.expertRequests = [];
  setAuthToken(null);
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.user);
}

// توکن ذخیره‌شده را به کلاینت axios می‌دهیم؛ 401 هم به logout وصل است
setAuthToken(state.token);
setUnauthorizedHandler(() => logout());

/*
 * اگر درست بعد از login/register یک 401 لحظه‌ای (race) باعث logout سراسری شود،
 * نشست تازه‌ای که همین حالا از سرور گرفته‌ایم را برمی‌گردانیم تا کاربر
 * بی‌دلیل از حساب بیرون نیفتد و در صفحه احراز هویت گیر نکند.
 * فقط برای توکن تازه‌گرفته‌شده صدا زده می‌شود، نه برای توکن کهنه ابتدای برنامه.
 */
function restoreFreshSession(token, userData) {
  if (state.token && state.user?.id) return;
  applyAuth(token, userData);
}

async function loadWallet() {
  if (!state.user?.id) return;
  try {
    const d = await WalletApi.get();
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
    const d = await AuthApi.me();
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
const isAgent = computed(() => state.user?.role === "agent");

async function login(username, password) {
  const uname = faToEn(username).trim();
  if (!uname || !password) return { success: false, error: "نام کاربری و رمز عبور را وارد کنید" };
  try {
    const data = await AuthApi.login({ username: uname, password });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, user);
    await refreshMe();
    restoreFreshSession(token, user);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ورود به سامانه" };
  }
}

function cleanUsername(s) {
  return faToEn(s).trim();
}

async function register(payload) {
  const name = String(payload?.name || "").trim();
  const phone = faToEn(payload?.phone || payload?.username || "").trim();
  // نام کاربری فقط شماره تماس است
  const username = phone;
  const password = String(payload?.password || "");
  const agentCode = faToEn(payload?.agentCode || "").trim().toUpperCase();
  if (name.length < 3) return { success: false, error: "نام و نام خانوادگی را کامل وارد کنید" };
  if (!/^09\d{9}$/.test(phone)) return { success: false, error: "شماره موبایل معتبر (11 رقم با 09) وارد کنید" };
  const pwErr = validatePassword(password);
  if (pwErr) return { success: false, error: pwErr };
  try {
    const data = await AuthApi.register({
      username,
      phone,
      full_name: name,
      national_id: "",
      password,
      agent_code: agentCode || undefined,
    });
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, user);
    await refreshMe();
    restoreFreshSession(token, user);
    // اعمال کد معرف دقیقاً با همان مسیر پنل کاربری (POST /referrals/redeem) تا
    // کروکی رایگان تعلق بگیرد؛ خطای آن هرگز باعث شکست ثبت‌نام نمی‌شود
    let referral = null;
    if (agentCode) {
      try {
        const res = await redeemReferral(agentCode);
        referral = res.success
          ? { applied: true, freeKroki: res.freeKroki }
          : { applied: false, error: res.error };
      } catch (e) {
        referral = { applied: false, error: e?.message || "خطا در اعمال کد معرف" };
      }
      restoreFreshSession(token, user);
    }
    return { success: true, referral };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت نام" };
  }
}

function walletOf() {
  return state.user ? Number(state.user.wallet) || 0 : 0;
}
function freeOf() {
  return state.user ? Number(state.user.freeKroki) || 0 : 0;
}

/* ---------------- تراکنش‌ها ---------------- */

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
    const d = await WalletApi.transactions();
    state.transactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

function txList() {
  return state.transactions;
}

/* ---------------- شارژ کیف پول ---------------- */

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
    await WalletApi.createCharge({
      amount: amt,
      card_number: cards,
      payment_tracking_id: pid,
      note: String(note || "").trim(),
    });
    await loadMyCharges();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت درخواست شارژ" };
  }
}

async function loadMyCharges() {
  try {
    const d = await WalletApi.myCharges();
    state.requests = (listOf(d) || []).map(mapCharge);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های شارژ" };
  }
}

async function loadAllCharges(status) {
  try {
    const d = await WalletApi.charges(status);
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
    await WalletApi.approveCharge(id);
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
    await WalletApi.rejectCharge(id);
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

/* ---------------- قالب‌ها ---------------- */

async function loadTemplates() {
  try {
    const d = await TemplatesApi.list();
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

async function deleteUserTemplate(id) {
  if (!isBackendTemplateId(id)) return { success: true };
  try {
    await TemplatesApi.remove(id);
    await loadTemplates();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف قالب" };
  }
}

function builtinTemplateMapKey() {
  return "kroki_tpl_map_" + (state.user?.id ?? "guest");
}

function readBuiltinTemplateMap() {
  try {
    return JSON.parse(localStorage.getItem(builtinTemplateMapKey()) || "{}") || {};
  } catch {
    return {};
  }
}

function writeBuiltinTemplateMap(map) {
  try {
    localStorage.setItem(builtinTemplateMapKey(), JSON.stringify(map || {}));
  } catch {}
}

async function resolveTemplateId(tplId) {
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

function sessionUserId() {
  return state.user?.id || null;
}

/* ---------------- کروکی‌ها ---------------- */

async function createKroki(payload, tplId) {
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

async function updateKroki(id, payload) {
  try {
    const d = await KrokisApi.update(id, payload);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در به‌روزرسانی کروکی" };
  }
}

async function myKrokis() {
  try {
    const d = await KrokisApi.list();
    state.myKrokis = listOf(d) || [];
    return { success: true, data: state.myKrokis };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

async function getKroki(id) {
  try {
    const d = await KrokisApi.get(id);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی" };
  }
}

async function trackKroki(code) {
  try {
    const d = await KrokisApi.track(code);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "کروکی یافت نشد" };
  }
}

async function payKroki(id, mode) {
  try {
    const d = await KrokisApi.pay(id, mode);
    await loadWallet();
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در پرداخت" };
  }
}

async function issueKroki(id, pdfUrl) {
  try {
    const d = await KrokisApi.issue(id, pdfUrl);
    return { success: true, kroki: d?.kroki };
  } catch (e) {
    return { success: false, error: e.message || "خطا در صدور کروکی" };
  }
}

async function deleteKroki(id) {
  try {
    await KrokisApi.remove(id);
    state.myKrokis = state.myKrokis.filter((k) => String(k.id) !== String(id));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کروکی" };
  }
}

/* ---------------- معرفی ---------------- */

async function redeemReferral(code) {
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

async function loadMyReferrals() {
  try {
    const d = await ReferralsApi.my();
    state.myReferrals = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت معرفی‌ها" };
  }
}

async function loadAllReferrals() {
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

async function loadPersonalReferralCodes() {
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

async function createReferral({ code, free_kroki_amount, max_uses, expires_at } = {}) {
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

function extractCode(payload) {
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

async function loadMyReferralCode() {
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

async function ensureMyReferralCode() {
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

async function saveMyReferralCode(code) {
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
async function adminSetUserReferralCode(userId, code, freeKrokiAmount) {
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
async function adminDeleteUserReferralCode(userId) {
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

async function updateReferral(id, patch) {
  try {
    const d = await ReferralsApi.update(id, patch);
    await loadAllReferrals();
    return { success: true, referral: d?.referral };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کد معرف" };
  }
}

async function deleteReferral(id) {
  try {
    await ReferralsApi.remove(id);
    await loadAllReferrals();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کد معرف" };
  }
}

/* ---------------- کاربران (ادمین) ---------------- */

async function loadUsers() {
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

async function setRole(userId, role) {
  const want = ["admin", "user", "agent"].includes(role) ? role : "user";
  try {
    await UsersApi.update(userId, { role: want });
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
    await UsersApi.update(userId, { free_kroki_count: value });
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
    await UsersApi.credit(userId, amt);
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
    await UsersApi.update(userId, { active });
    if (u) u.active = active;
    return { success: true };
  } catch (e) {
    await loadUsers();
    return { success: false, error: e.message || "خطا در تغییر وضعیت کاربر" };
  }
}

async function editUser(userId, { name, password, phone, nationalId, city } = {}) {
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
      localStorage.setItem(LS.user, JSON.stringify(state.user));
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ویرایش کاربر" };
  }
}

async function deleteUser(userId) {
  try {
    await UsersApi.remove(userId);
    state.users = state.users.filter((x) => String(x.id) !== String(userId));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در حذف کاربر" };
  }
}

/* ---------------- پنل ادمین ---------------- */

async function loadStats() {
  try {
    const d = await AdminApi.stats();
    state.stats = d;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت آمار" };
  }
}

async function loadAdminKrokis(status) {
  try {
    const d = await AdminApi.krokis(status);
    state.adminKrokis = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت کروکی‌ها" };
  }
}

async function loadAdminTransactions() {
  try {
    const d = await AdminApi.transactions();
    state.adminTransactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

async function loadRoles() {
  try {
    const d = await AdminApi.roles();
    state.roles = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت نقش‌ها" };
  }
}

/* ---------------- قیمت کروکی به تفکیک شهر ---------------- */

async function loadCityPrices() {
  try {
    const d = await AdminApi.cityPrices();
    state.cityPrices = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت قیمت شهرها" };
  }
}

async function setCityPrice(city, price) {
  try {
    await AdminApi.setCityPrice(String(city || "").trim(), Number(price) || 0);
    await loadCityPrices();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت قیمت شهر" };
  }
}

function priceForCity(_city) {
  return KROKI_PRICE;
}

/* قیمت واقعی قابل پرداخت — فعلا ثابت است و بر اساس شهر نیست */
async function effectivePrice(_city) {
  return KROKI_PRICE;
}

/* ---------------- نمایندگان (هرمی) ---------------- */

async function loadMyAgent() {
  try {
    const d = await AgencyApi.me();
    state.myAgent = d || null;
    return { success: true };
  } catch (e) {
    state.myAgent = null;
    return { success: false, error: e.message || "خطا در دریافت اطلاعات نمایندگی" };
  }
}

async function loadSubordinates() {
  try {
    const d = await AgencyApi.subordinates();
    state.subordinates = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت زیرمجموعه‌ها" };
  }
}

async function requestAgency(data) {
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

async function loadAgencyRequests() {
  try {
    const d = await AgencyApi.requests();
    state.agencyRequests = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های نمایندگی" };
  }
}

async function decideAgencyRequest(id, approve) {
  try {
    await AgencyApi.decide(id, approve);
    await loadAgencyRequests();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ثبت تصمیم" };
  }
}

async function loadAdminAgents(city) {
  try {
    const d = await AgencyApi.adminAgents(city);
    state.adminAgents = listOf(d) || [];
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت نمایندگان" };
  }
}

async function loadAgentDetail(agentId) {
  try {
    const d = await AgencyApi.agentTransactions(agentId);
    state.agentDetail = { agentId, items: listOf(d?.transactions || d) || [], total: Number(d?.total || 0) };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌های نماینده" };
  }
}

/* ---------------- کارشناسان (همکاری) ---------------- */

const EXPERT_LS = { experts: "kroki_experts", requests: "kroki_expert_requests" };

function readLsArray(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLsArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr || []));
  } catch {}
}

function mapExpert(r) {
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

function mapExpertRequest(r) {
  const m = mapExpert(r);
  return { ...m, status: r?.status || "pending" };
}

async function loadExperts() {
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

async function requestExpert({ firstName, lastName, nationalId, phone, titles, specialties, documents } = {}) {
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

async function loadExpertRequests() {
  try {
    const d = await ExpertsApi.requests();
    state.expertRequests = (listOf(d?.requests ?? d) || []).map(mapExpertRequest);
    return { success: true };
  } catch {
    state.expertRequests = readLsArray(EXPERT_LS.requests).map(mapExpertRequest);
    return { success: true, mock: true };
  }
}

async function decideExpertRequest(id, approve) {
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

async function removeExpert(id) {
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

/* ---------------- هم‌گام‌سازی اولیه ---------------- */

function syncUser() {
  void refreshMe();
}

export const auth = {
  state,
  KROKI_PRICE,
  KROKI_ORIGINAL_PRICE,
  WALLET_CARD,
  CARD_OWNER,
  isAuthenticated,
  isAdmin,
  isAgent,
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
  loadPersonalReferralCodes,
  createReferral,
  updateReferral,
  deleteReferral,
  loadMyReferralCode,
  ensureMyReferralCode,
  saveMyReferralCode,
  adminSetUserReferralCode,
  adminDeleteUserReferralCode,
  loadUsers,
  setRole,
  setFreeKroki,
  creditUser,
  toggleActive,
  editUser,
  deleteUser,
  loadStats,
  loadAdminKrokis,
  loadAdminTransactions,
  loadRoles,
  syncUser,
  sessionUserId,
  loadCityPrices,
  setCityPrice,
  priceForCity,
  effectivePrice,
  loadMyAgent,
  loadSubordinates,
  requestAgency,
  loadAgencyRequests,
  decideAgencyRequest,
  loadAdminAgents,
  loadAgentDetail,
  loadExperts,
  requestExpert,
  loadExpertRequests,
  decideExpertRequest,
  removeExpert,
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
