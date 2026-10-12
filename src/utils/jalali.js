export function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm =
    days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function getTodayJalali() {
  const d = new Date();
  const { jy, jm, jd } = toJalali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  const pad = (n) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function getTodayJalaliCompact() {
  const d = new Date();
  const { jy, jm, jd } = toJalali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  const pad = (n) => String(n).padStart(2, "0");
  return `${jy}${pad(jm)}${pad(jd)}`;
}

export function makeExportFilename(prefix = "mapiq", index = 1) {
  const date = getTodayJalaliCompact();
  return `${prefix}_${index}_${date}`;
}
