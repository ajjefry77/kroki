import { listOf, WalletApi } from "../api";
import { state, mapTx, mapCharge, loadWallet } from "./authCore";
import { loadStats } from "./authAdmin";

/* ---------------- تراکنش‌ها ---------------- */

export async function loadTransactions() {
  try {
    const d = await WalletApi.transactions();
    state.transactions = (listOf(d) || []).map(mapTx);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت تراکنش‌ها" };
  }
}

export function txList() {
  return state.transactions;
}

/* ---------------- شارژ کیف پول ---------------- */

/*
 * شارژ آنلاین کیف پول از طریق درگاه BitPay.
 * خروجی موفق: { success: true, paymentUrl } و مرورگر به بانک هدایت می‌شود؛
 * بعد از پرداخت، بانک به صفحه نتیجه (#/payment-result) برمی‌گردد و
 * کیف پول به‌صورت خودکار شارژ شده است.
 */
export async function requestCharge({ amount, note } = {}) {
  const user = state.user;
  if (!user) return { success: false, error: "ابتدا وارد حساب شوید" };
  const amt = Math.floor(Number(amount));
  if (!amt || amt < 1000) return { success: false, error: "حداقل مبلغ شارژ ۱٬۰۰۰ تومان است" };
  if (amt > 1000000000) return { success: false, error: "مبلغ بیش از حد مجاز است" };
  try {
    const d = await WalletApi.createOnlineCharge({
      amount: amt,
      note: String(note || "").trim(),
    });
    const paymentUrl = d?.payment_url || "";
    if (!paymentUrl) return { success: false, error: "لینک پرداخت از سرور دریافت نشد" };
    await loadMyCharges().catch(() => {});
    // هدایت به درگاه بانک (همان تب تا بعد از پرداخت برگردد)
    window.location.href = paymentUrl;
    return { success: true, paymentUrl, charge: d?.charge };
  } catch (e) {
    return { success: false, error: e.message || "خطا در اتصال به درگاه پرداخت" };
  }
}

/** وضعیت یک درخواست شارژ (بعد از بازگشت از بانک) */
export async function fetchCharge(id) {
  try {
    const d = await WalletApi.getCharge(id);
    return { success: true, charge: d?.charge ? mapCharge(d.charge) : null, wallet: d?.wallet_balance };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت وضعیت پرداخت" };
  }
}

export async function loadMyCharges() {
  try {
    const d = await WalletApi.myCharges();
    state.requests = (listOf(d) || []).map(mapCharge);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های شارژ" };
  }
}

export async function loadAllCharges(status) {
  try {
    const d = await WalletApi.charges(status);
    state.requests = (listOf(d) || []).map(mapCharge);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "خطا در دریافت درخواست‌های شارژ" };
  }
}

export function pendingOf(userId) {
  return state.requests.filter((r) => String(r.userId) === String(userId) && r.status === "pending");
}
export function requestsOf(userId) {
  return state.requests.filter((r) => String(r.userId) === String(userId));
}

export async function approveRequest(id) {
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

export async function rejectRequest(id) {
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
