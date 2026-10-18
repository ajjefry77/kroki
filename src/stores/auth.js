/*
 * استور احراز هویت و داده کاربر.
 * درخواست‌های HTTP در src/api تفکیک شده‌اند (auth/wallet/templates/krokis/...)؛
 * اینجا فقط وضعیت، نگاشت داده‌ها و منطق فرانت نگه داشته می‌شود.
 * ورودی/خروجی همه متدها مثل قبل { success, ... } است تا کامپوننت‌ها دست نخورند.
 *
 * این فایل فقط نقطه ورودی است؛ پیاده‌سازی در ماژول‌های authCore، authWallet،
 * authTemplates، authKrokis، authReferrals، authAdmin، authAgency و authExperts.
 */

import {
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
  requestOtp,
  verifyOtpLogin,
  logout,
  refreshMe,
  walletOf,
  freeOf,
  loadWallet,
  syncUser,
} from "./authCore";
import {
  txList,
  loadTransactions,
  requestCharge,
  fetchCharge,
  loadMyCharges,
  loadAllCharges,
  pendingOf,
  requestsOf,
  approveRequest,
  rejectRequest,
} from "./authWallet";
import {
  loadTemplates,
  userTemplates,
  saveUserTemplate,
  deleteUserTemplate,
  sessionUserId,
} from "./authTemplates";
import {
  createKroki,
  updateKroki,
  myKrokis,
  getKroki,
  trackKroki,
  payKroki,
  issueKroki,
  deleteKroki,
} from "./authKrokis";
import {
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
} from "./authReferrals";
import {
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
  loadCityPrices,
  setCityPrice,
  priceForCity,
  effectivePrice,
} from "./authAdmin";
import {
  loadMyAgent,
  loadSubordinates,
  requestAgency,
  loadAgencyRequests,
  decideAgencyRequest,
  loadAdminAgents,
  loadAgentDetail,
} from "./authAgency";
import {
  loadExperts,
  requestExpert,
  loadExpertRequests,
  decideExpertRequest,
  removeExpert,
} from "./authExperts";

export { KROKI_PRICE, KROKI_ORIGINAL_PRICE, WALLET_CARD, CARD_OWNER };

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
  requestOtp,
  verifyOtpLogin,
  logout,
  refreshMe,
  walletOf,
  freeOf,
  loadWallet,
  txList,
  loadTransactions,
  requestCharge,
  fetchCharge,
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
