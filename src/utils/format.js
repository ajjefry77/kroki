// فرمت‌کننده‌های نمایشی (پول و تاریخ) — لایه‌ی view، بدون منطق state
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
