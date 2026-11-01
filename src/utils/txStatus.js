/*
 * Helpers for transaction and kroki status in the panels.
 * Shared between the user panel and the admin panel.
 * The signatures/colors of the transactions in these two panels are slightly different
 * (the user panel also displays charge_request) — so the admin/user variants are separate
 * so behavior changes nowhere. The class and label mappings are fully common.
 */

/* ───────── Admin panel variants (admin transactions table) ───────── */
export function txSign(tx) {
  if (tx.status === "rejected") return "";
  if (tx.type === "spend") return "−";
  return "+";
}
export function txTypeColor(tx) {
  if (tx.type === "spend") return "text-[var(--danger)]";
  if (tx.type === "free" || tx.type === "referral") return "text-[var(--info)]";
  return "text-[var(--success)]";
}

/* ───────── User panel variants (wallet transactions) ───────── */
export function userTxSign(tx) {
  if (tx.status === "rejected") return "—";
  if (tx.type === "charge_request") return "";
  if (tx.type === "spend") return "−";
  if (tx.type === "free" || tx.type === "referral") return "0";
  return "+";
}
export function userTxColor(tx) {
  if (tx.status === "rejected") return "text-[var(--danger)]";
  if (tx.type === "spend") return "text-[var(--danger)]";
  if (tx.type === "free" || tx.type === "referral") return "text-[var(--info)]";
  if (tx.type === "charge_request") return "text-[var(--warning)]";
  return "text-[var(--success)]";
}

/* ───────── Common status classes and labels ───────── */
export function txStatusClass(s) {
  if (s === "success" || s === "approved") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "pending") return "bg-[var(--warning-glow)] text-[var(--warning)]";
  if (s === "rejected") return "bg-[var(--danger-glow)] text-[var(--danger)]";
  return "bg-[var(--surface3)] text-[var(--text-muted)]";
}
export function txStatusLabel(s) {
  if (s === "success" || s === "approved") return "موفق";
  if (s === "pending") return "در انتظار";
  if (s === "rejected") return "رد شده";
  return s || "موفق";
}

export function krokiStatusClass(s) {
  if (s === "issued") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "paid") return "bg-[var(--info-glow)] text-[var(--info)]";
  return "bg-[var(--warning-glow)] text-[var(--warning)]";
}
export function krokiStatusLabel(s) {
  if (s === "issued") return "صادر شده";
  if (s === "paid") return "پرداخت شده";
  return "پیش‌نویس";
}
