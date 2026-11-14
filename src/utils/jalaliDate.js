// تبدیل دقیق تاریخ شمسی (جلالی) ↔ میلادی برای تقویم پنل مدیریت.
// الگوریتم همان jalaali-js است؛ خروجی برای بازه‌های مختلف با Intl (تقویم persian) مقایسه شده است.
// ورودی/خروجی میلادی همیشه رشته‌ی ISO «YYYY-MM-DD» است تا با ستون DATE دیتابیس هم‌شکل باشد.

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;
const pad2 = (n) => String(n).padStart(2, "0");

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const JALALI_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function jalCal(jy, withoutLeap = false) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error("سال شمسی نامعتبر است");

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (withoutLeap) return { gy, march, leap: 0 };

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { gy, march, leap };
}

// شماره روز جولیَن از تاریخ میلادی
function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function isJalaliLeapYear(jy) {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/** (۱۴۰۵، ۸، ۲۳) → "2026-11-14" */
export function jalaliToISO(jy, jm, jd) {
  const g = d2g(j2d(jy, jm, jd));
  return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
}

/** "2026-11-14" → { jy, jm, jd } */
export function isoToJalali(iso) {
  const [gy, gm, gd] = String(iso || "").split("-").map(Number);
  if (!gy || !gm || !gd) return null;
  return d2j(g2d(gy, gm, gd));
}

/** شماره ستون اولین روز ماه؛ ۰ = شنبه */
export function jalaliMonthStartOffset(jy, jm) {
  const [gy, gm, gd] = jalaliToISO(jy, jm, 1).split("-").map(Number);
  const weekday = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // ۰ = یکشنبه
  return (weekday + 1) % 7;
}

export function todayJalaliParts(now = new Date()) {
  const iso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  return isoToJalali(iso);
}

/** برچسب خوانا: «۲۳ آبان ۱۴۰۵» با ارقام فارسی */
export function formatJalaliLabel(iso) {
  const j = isoToJalali(iso);
  if (!j) return "";
  const n = (v) => Number(v).toLocaleString("fa-IR", { useGrouping: false });
  return `${n(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${n(j.jy)}`;
}
