/*
 * اعتبارسنجی‌های مشترک فرانت (موبایل، کد ملی، رمز عبور).
 * توجه: این‌ها فقط UX و دفاع اول‌اند؛ بک‌اند باید همه را دوباره اعتبارسنجی کند.
 */

/** ارقام فارسی به انگلیسی */
export function faToEn(s) {
  return String(s ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** موبایل ایران: 11 رقم با 09 */
export function isValidIranianMobile(v) {
  return /^09\d{9}$/.test(faToEn(v).trim());
}

/** کد ملی ایران: 10 رقم + رقم کنترل */
export function isValidNationalCode(code) {
  const v = faToEn(code).trim();
  if (!/^\d{10}$/.test(v)) return false;
  if (/^(\d)\1{9}$/.test(v)) return false;
  const check = +v[9];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +v[i] * (10 - i);
  const r = sum % 11;
  return (r < 2 && check === r) || (r >= 2 && check === 11 - r);
}

/**
 * سیاست رمز عبور ثبت‌نام: حداقل ۸ کاراکتر + حروف کوچک و بزرگ انگلیسی.
 * خروجی: "" یعنی معتبر، وگرنه پیام خطای فارسی.
 */
export function validatePassword(pw) {
  const v = String(pw || "");
  if (v.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (!/[a-z]/.test(v)) return "رمز عبور باید شامل حروف کوچک انگلیسی (a-z) باشد";
  if (!/[A-Z]/.test(v)) return "رمز عبور باید شامل حروف بزرگ انگلیسی (A-Z) باشد";
  return "";
}
