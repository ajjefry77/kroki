import { reactive, computed } from "vue";
import { setUserTemplatesProvider } from "../utils/templates";
import {
  setAuthToken,
  setUnauthorizedHandler,
  AuthApi,
  WalletApi,
} from "../api";
import { faToEn, validatePassword } from "../utils/validators";
import { redeemReferral } from "./authReferrals";

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

export const LS = {
  token: "kroki_token",
  user: "kroki_user",
};

export function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null || v === undefined ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export const state = reactive({
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

export function normalizeUser(u) {
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

export function applyAuth(token, userData) {
  state.token = token;
  localStorage.setItem(LS.token, token);
  setAuthToken(token);
  const u = normalizeUser(userData);
  state.user = u;
  localStorage.setItem(LS.user, JSON.stringify(state.user));
  state.users = [];
}

export function logout() {
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
export function restoreFreshSession(token, userData) {
  if (state.token && state.user?.id) return;
  applyAuth(token, userData);
}

export async function loadWallet() {
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

export async function refreshMe() {
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

export function loadSession() {
  const u = read(LS.user, null);
  if (!u || u.id === null || u.id === undefined) {
    if (localStorage.getItem(LS.token)) localStorage.removeItem(LS.token);
    return;
  }
  state.user = { ...u, freeKroki: Number(u.freeKroki || 0), wallet: Number(u.wallet || 0) };
}
loadSession();

export const isAuthenticated = computed(() => !!state.token && !!state.user?.id);
export const isAdmin = computed(() => state.user?.role === "admin");
export const isAgent = computed(() => state.user?.role === "agent");

export async function login(username, password) {
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

/* ---------------- ورود با رمز یکبار مصرف (OTP) ---------------- */

export async function requestOtp(phone) {
  const mobile = faToEn(phone || "").trim();
  if (!/^09\d{9}$/.test(mobile)) return { success: false, error: "شماره موبایل معتبر (11 رقم با 09) وارد کنید" };
  try {
    const data = await AuthApi.requestOtp({ phone: mobile });
    return { success: true, ttl: data?.ttl || 120, devCode: data?.devCode };
  } catch (e) {
    return { success: false, error: e.message || "خطا در ارسال کد تایید" };
  }
}

export async function verifyOtpLogin(phone, code, fullName) {
  const mobile = faToEn(phone || "").trim();
  const otp = faToEn(code || "").trim();
  if (!/^09\d{9}$/.test(mobile)) return { success: false, error: "شماره موبایل معتبر وارد کنید" };
  if (!otp) return { success: false, error: "کد تایید را وارد کنید" };
  try {
    const body = { phone: mobile, code: otp };
    if (fullName && String(fullName).trim()) body.full_name = String(fullName).trim();
    const data = await AuthApi.verifyOtp(body);
    const { token, user } = data || {};
    if (!token || !user) return { success: false, error: "پاسخ سرور نامعتبر است" };
    applyAuth(token, user);
    await refreshMe();
    restoreFreshSession(token, user);
    return { success: true, isNew: data?.isNew === true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در تایید کد" };
  }
}

export async function register(payload) {
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

export function walletOf() {
  return state.user ? Number(state.user.wallet) || 0 : 0;
}
export function freeOf() {
  return state.user ? Number(state.user.freeKroki) || 0 : 0;
}

/* ---------------- تراکنش‌ها ---------------- */

export function mapTx(t) {
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

/* ---------------- شارژ کیف پول ---------------- */

export function mapCharge(r) {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username || "",
    name: r.full_name || r.username || "",
    phone: r.phone || "",
    amount: Number(r.amount || 0),
    // فیلدهای درگاه آنلاین (رکوردهای دستی قدیمی card/paymentId دارند)
    card: r.card_num || r.card_number || "",
    paymentId: r.payment_tracking_id || "",
    transId: r.trans_id || "",
    gatewayId: r.gateway_id || r.id_get || "",
    note: r.note,
    status: r.status,
    at: r.created_at,
    decidedAt: r.decided_at || r.verified_at,
  };
}

/* ---------------- هم‌گام‌سازی اولیه ---------------- */

export function syncUser() {
  void refreshMe();
}
