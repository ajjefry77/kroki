import axios from "axios";
import proj4 from "proj4";

// آدرس‌یابی معکوس برای پیشنهاد خودکار نشانی ملک:
// اول map.ir (داده محلی دقیق‌تر)، اگر جواب نداد mapbox (جایگزین مطمئن)
const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY || "";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

async function reverseLookupMapIr(lat, lon) {
  const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const res = await axios.get(url, {
    headers: { Accept: "application/json", "x-api-key": MAP_IR_KEY },
    timeout: 15000,
  });
  const data = res.data;
  const a = data.address || data || {};
  return {
    display:
      data.address_compact ||
      data.address ||
      data.postal_address ||
      data.last ||
      [a.province, a.city, a.neighbourhood, a.primary]
        .filter(Boolean)
        .join("، ") ||
      data.display_name ||
      " ",
    road: a.primary || a.road || data.primary || data.road || a.last || " ",
  };
}

async function reverseLookupMapbox(lat, lon) {
  const url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    encodeURIComponent(lon + "," + lat) +
    ".json";
  const res = await axios.get(url, {
    params: { access_token: MAPBOX_TOKEN, language: "fa", limit: 1 },
    timeout: 15000,
  });
  const f = res.data?.features?.[0];
  if (!f) throw new Error("نتیجه‌ای یافت نشد");
  const ctx = {};
  for (const c of f.context || []) ctx[String(c.id).split(".")[0]] = c.text;
  return {
    display: f.place_name || "",
    road:
      f.place_type?.[0] === "address" ? f.text || "" : ctx.address || "",
  };
}

export async function reverseLookup(lat, lon) {
  if (MAP_IR_KEY) {
    try {
      const r = await reverseLookupMapIr(lat, lon);
      if (r.display && String(r.display).trim()) return r;
    } catch {}
  }
  return reverseLookupMapbox(lat, lon);
}

/*
 * پیشنهاد تک‌خطی نشانی از روی میانگین موقعیت‌ها.
 * در ثبت ترسیم (موازی با برداشت تصویر) و ورود به اطلاعات استفاده می‌شود
 * تا فیلد نشانی از قبل پر باشد و نیازی به رفت‌وبرگشت نباشد.
 */
export async function suggestAddressForPositions(allPositions) {
  try {
    const pts = (allPositions || []).filter(
      (p) => isFinite(Number(p.lat)) && isFinite(Number(p.lon ?? p.lng)),
    );
    if (!pts.length) return "";
    const lat = pts.reduce((s, p) => s + Number(p.lat), 0) / pts.length;
    const lon = pts.reduce((s, p) => s + Number(p.lon ?? p.lng), 0) / pts.length;
    const r = await reverseLookup(lat, lon).catch(() => null);
    return String(r?.display || "").trim();
  } catch {
    return "";
  }
}

export function flattenPins(list) {
  const out = [];
  for (const p of list || []) {
    if (p.type === "group" && Array.isArray(p.children)) {
      out.push(...flattenPins(p.children));
    } else {
      out.push(p);
    }
  }
  return out;
}

export let logoImageCache = { src: "", img: null };
export function loadLogoImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      logoImageCache = { src: "", img: null };
      resolve(null);
      return;
    }
    if (logoImageCache.src === src && logoImageCache.img) {
      resolve(logoImageCache.img);
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoImageCache = { src, img };
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function isKrokiEligible(p) {
  return (
    p.type === "draw" &&
    p.selected !== false &&
    !!p.shape &&
    ["polygon", "polyline"].includes(p.shape.type) &&
    Array.isArray(p.shape.positions) &&
    p.shape.positions.length >= 2
  );
}

export function eligiblePinsOf(pins) {
  return flattenPins(pins).filter(isKrokiEligible);
}

/*
 * برآورد مساحت چندضلعی‌ها (متر مربع) برای نمایش در مرحله اطلاعات.
 * همان منطق computeGeometry: تصویر UTM + فرمول shoelace، فقط روی
 * ترسیم‌های بسته (polygon)؛ چند ترسیم جمع می‌شود.
 */
export function estimateAreaM2(pins) {
  try {
    const polys = eligiblePinsOf(pins).filter(
      (p) =>
        p.shape?.type === "polygon" &&
        Array.isArray(p.shape.positions) &&
        p.shape.positions.length >= 3,
    );
    if (!polys.length) return 0;
    const all = [];
    for (const pin of polys) all.push(...pin.shape.positions);
    if (!all.length) return 0;
    const utm = toUTM(all);
    let idx = 0;
    let total = 0;
    for (const pin of polys) {
      const n = pin.shape.positions.length;
      const slice = utm.slice(idx, idx + n);
      idx += n;
      if (slice.length >= 3) total += computeArea(slice);
    }
    return total;
  } catch {
    return 0;
  }
}

export function toUTM(positions) {
  if (!positions.length) return [];
  const lonAvg =
    positions.reduce((s, p) => s + (p.lon ?? p.lng), 0) / positions.length;
  const zone = Math.floor((lonAvg + 180) / 6) + 1;
  const meanLat =
    positions.reduce((s, p) => s + Number(p.lat), 0) / positions.length;
  const projStr = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${meanLat < 0 ? " +south" : ""}`;
  return positions.map((p) => {
    const lon = p.lon ?? p.lng;
    const lat = Number(p.lat);
    const [x, y] = proj4("EPSG:4326", projStr, [lon, lat]);
    return { x, y, zone, lat, lon };
  });
}

export function computeArea(pts) {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

export function computeShapeCentroid(pos, zone) {
  if (!pos || pos.length < 3) return null;
  const meanLat = pos.reduce((s, p) => s + Number(p.lat), 0) / pos.length;
  const projStr = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${meanLat < 0 ? "+south" : ""}`;
  const projected = pos.map((p) => {
    const lon = Number(p.lon ?? p.lng);
    const [x, y] = proj4("EPSG:4326", projStr, [lon, Number(p.lat)]);
    return { x, y };
  });
  const origin = projected[0];
  const pts = projected.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
  let twiceArea = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    twiceArea += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-9) return null;
  const x = origin.x + cx / (3 * twiceArea);
  const y = origin.y + cy / (3 * twiceArea);
  const [lon, lat] = proj4(projStr, "EPSG:4326", [x, y]);
  return { x, y, lon, lat, zone };
}

export function niceScaleLength(span) {
  const target = span / 5;
  if (!isFinite(target) || target <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best,
  );
}

export function niceScaleDen(value) {
  if (!isFinite(value) || value <= 0) return null;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const cands = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  return cands.reduce((b, c) =>
    Math.abs(c - value) < Math.abs(b - value) ? c : b,
  );
}

export function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function escapeHtml(s = " ") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

// برچسب زون UTM همراه با N (نیم‌کره شمالی): 39 -> "39N"
export function zoneLabel(z) {
  if (z === null || z === undefined || z === "") return "—";
  const s = String(z).trim();
  if (!s || s === "—") return "—";
  return /N$/i.test(s) ? s.toUpperCase() : `${s}N`;
}

/*
 * فقط src امن برای <img> چاپ: دیتای تصویری مجاز، http(s) و blob داخلی.
 * بقیه (مثل javascript: یا data:text/html) حذف می‌شود.
 */
export function safeImgSrc(s) {
  if (typeof s !== "string" || !s) return "";
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(s)) return s;
  if (/^(https?:|blob:)/i.test(s)) return s;
  // لوگوی پیش‌فرض قالب‌ها (فایل داخل public مثل /bargh-logo.svg)
  if (/^\/[\w\-./]+\.(png|jpe?g|gif|webp|svg)$/i.test(s)) return s;
  return "";
}

/*
 * لوگوی موثر سربرگ: اول لوگوی آپلودشده کاربر، بعد لوگوی پیش‌فرض قالب
 * (مثلاً لوگوی شرکت برق برای قالب برق). خروجی برای چاپ امن‌سازی می‌شود.
 */
export function effectiveLogoSrc(form, t) {
  const custom = typeof form?.logo === "string" ? form.logo.trim() : "";
  if (custom) return safeImgSrc(custom);
  const def = typeof t?.defaultLogo === "string" ? t.defaultLogo.trim() : "";
  return safeImgSrc(def);
}

export function truncateText(ctx, text, maxWidth) {
  const s = String(text == null ? "" : text);
  if (!s) return "";
  if (ctx.measureText(s).width <= maxWidth) return s;
  let t = s;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export function canvasPolygonCentroid(points) {
  if (!points || points.length < 3) return null;
  let twiceArea = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-9) return null;
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

export function computeNWIndex(pts) {
  if (!pts.length) return 0;
  let best = 0;
  for (let i = 1; i < pts.length; i++) {
    if (
      pts[i].lat > pts[best].lat ||
      (pts[i].lat === pts[best].lat && pts[i].lon < pts[best].lon)
    ) {
      best = i;
    }
  }
  return best;
}

/*
 * اسنپ‌شات سبک از بوم نقشه: کوچک‌سازی به حداکثر ۸۰۰px و خروجی JPEG فشرده.
 * عکس ماهواره‌ای با PNG چند مگابایت می‌شود؛ با JPEG/~0.78 حدود ۱۰۰–۳۰۰KB
 * تا هم ذخیره در سرور مطمئن باشد و هم حافظه محلی پر نشود.
 */
export function snapshotCanvas(srcCanvas, maxSide = 800, quality = 0.78) {
  const w = srcCanvas?.width || 0;
  const h = srcCanvas?.height || 0;
  if (!w || !h) return "";
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d");
  // زمینه سفید چون JPEG آلفا ندارد
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(srcCanvas, 0, 0, cw, ch);
  return c.toDataURL("image/jpeg", quality);
}
