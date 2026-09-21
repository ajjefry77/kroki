/*
 * ثابت‌ها و کمک‌تابع‌های مشترک «کارشناسان».
 * عناوین مجاز ثابت‌اند؛ موقع ثبت درخواست حداقل یکی باید انتخاب شود.
 */

export const EXPERT_TITLES = ["نقشه‌بردار", "کارشناس دادگستری", "تفسیر", "صدور سند"];

export const EXPERT_TITLE_META = {
  "نقشه‌بردار": { icon: "fa-ruler-combined", color: "#2f6fd0", bg: "rgba(47,111,208,0.12)" },
  "کارشناس دادگستری": { icon: "fa-scale-balanced", color: "#FA6C04", bg: "rgba(250,108,4,0.12)" },
  "تفسیر": { icon: "fa-magnifying-glass-chart", color: "#1fa15c", bg: "rgba(31,161,92,0.12)" },
  "صدور سند": { icon: "fa-file-signature", color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
};

export function expertTitleMeta(title) {
  return EXPERT_TITLE_META[title] || { icon: "fa-user-tie", color: "#5a6984", bg: "rgba(90,105,132,0.12)" };
}

export function expertInitials(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ک";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).slice(0, 2);
}
