export const DASH_STYLES = [
  { id: "solid", label: "پیوسته", value: [1, 0] },
  { id: "dashed", label: "خط چین", value: [8, 4] },
  { id: "dotted", label: "نقطه‌چین", value: [1, 3] },
  { id: "dashdot", label: "نقطه-خط", value: [8, 3, 1, 3] },
];

export function getDashArray(style) {
  const found = DASH_STYLES.find((s) => s.id === style);
  return found ? found.value : [1, 0];
}

export function dashStyleLabel(style) {
  const found = DASH_STYLES.find((s) => s.id === style);
  return found ? found.label : "";
}

export const POINT_SYMBOLS = [
  { id: "circle", label: "دایره" },
  { id: "square", label: "مربع" },
  { id: "triangle", label: "مثلث" },
  { id: "diamond", label: "لوزی" },
  { id: "star", label: "ستاره" },
  { id: "pin", label: "نشان" },
];

export const ICON_PREFIX = "kroki-pt-";

export function pointIcon(symbol) {
  const found = POINT_SYMBOLS.find((s) => s.id === symbol);
  return ICON_PREFIX + (found ? found.id : "circle");
}

const ICON_SIZE = 64;

const POINT_ICON_PATHS = {
  circle:
    "M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2",
  square: "M3 3v18h18V3",
  triangle: "M1 21h22L12 2",
  diamond: "M6 2L2 8l10 14L22 8l-4-6z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z",
  pin: "M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7",
};

function drawPointIcon(kind, ctx, size) {
  const pathStr = POINT_ICON_PATHS[kind] || POINT_ICON_PATHS.circle;
  const path = new Path2D(pathStr);
  const pad = 4;
  const scale = (size - pad * 2) / 24;
  ctx.save();
  ctx.translate(pad, pad);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fill(path);
  ctx.restore();
}

export function ensurePointSymbolImages(map) {
  if (!map || typeof map.addImage !== "function") return;
  try {
    for (const sym of POINT_SYMBOLS) {
      const name = ICON_PREFIX + sym.id;
      if (map.hasImage(name)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const ctx = canvas.getContext("2d");
      drawPointIcon(sym.id, ctx, ICON_SIZE);
      map.addImage(name, ctx.getImageData(0, 0, canvas.width, canvas.height), {
        sdf: true,
      });
    }
  } catch (e) {
    console.warn("خطا در ساخت نماد نقطه:", e);
  }
}
