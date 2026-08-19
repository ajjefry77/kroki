import { reactive, ref, nextTick } from "vue";
import mapboxgl from "mapbox-gl";
import proj4 from "proj4";
import { getTemplate, vertexLabel } from "../utils/templates";
import { logger } from "../utils/logger";

function toJalali(gy, gm, gd) {
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
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function getTodayJalali() {
  const d = new Date();
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY || "";

async function reverseLookup(lat, lon) {
  const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "x-api-key": MAP_IR_KEY },
  });
  if (!res.ok) throw new Error("خطا در سرویس آدرس (" + res.status + ")");
  const data = await res.json();
  const a = data.address || data || {};
  return {
    display:
      data.address_compact ||
      data.address ||
      data.postal_address ||
      data.last ||
      [a.province, a.city, a.neighbourhood, a.primary].filter(Boolean).join("، ") ||
      data.display_name ||
      "",
    road: a.primary || a.road || data.primary || data.road || a.last || "",
  };
}

function flattenPins(list) {
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

function toUTM(positions) {
  if (!positions.length) return [];
  const lonAvg =
    positions.reduce((s, p) => s + (p.lon ?? p.lng), 0) / positions.length;
  const zone = Math.floor((lonAvg + 180) / 6) + 1;
  const projStr = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  return positions.map((p) => {
    const lon = p.lon ?? p.lng;
    const [x, y] = proj4("EPSG:4326", projStr, [lon, p.lat]);
    return { x, y, zone };
  });
}

function computeArea(pts) {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

function computeShapeCentroid(pos, zone) {
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

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
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

function computeCanvasSize(spanX, spanY) {
  const ratio = spanX / spanY;
  const MAX = 1400,
    MIN = 400;
  let cw = MAX,
    ch = Math.round(MAX / ratio);
  if (spanX < spanY) {
    ch = MAX;
    cw = Math.round(MAX * ratio);
  }
  cw = Math.max(MIN, Math.min(cw, MAX));
  ch = Math.max(MIN, Math.min(ch, MAX));
  return { w: cw, h: ch };
}

function niceScaleLength(span) {
  const target = span / 5;
  if (!isFinite(target) || target <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best,
  );
}

function niceScaleDen(value) {
  if (!isFinite(value) || value <= 0) return null;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const cands = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  return cands.reduce((b, c) =>
    Math.abs(c - value) < Math.abs(b - value) ? c : b,
  );
}

function wrapCanvasText(ctx, text, maxWidth) {
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

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]),
  );
}

function canvasPolygonCentroid(points) {
  if (!points || points.length < 3) return null;
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
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

function computeNWIndex(pts) {
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

export function useKrokiGenerator() {
  const state = reactive({
    generating: false,
    ready: false,
    errorMsg: "",
    mapImage: "",
    utmPoints: [],
    areaM2: 0,
    utmZone: null,
    centerUtm: null,
    shapeCentroids: [],
    edgeTexts: [],
    selectedShapesMeta: [],
    templateId: "technical",
  });

  const last = reactive({
    form: {},
    pins: [],
  });

  const template = () => getTemplate(state.templateId);

  function setTemplate(id) {
    if (!id) return;
    state.templateId = id;
    logger.info("template", "انتخاب قالب کروکی", { id });
  }

  function buildGeometry(pins) {
    const selected = eligiblePinsOf(pins);
    if (!selected.length) return null;

    const allPositions = [];
    const metas = [];
    for (const pin of selected) {
      const positions = (pin.shape.positions || []).filter(
        (p, i, arr) =>
          !(
            pin.shape.type === "polygon" &&
            i === arr.length - 1 &&
            arr.length > 1 &&
            p.lon === arr[0].lon &&
            p.lat === arr[0].lat
          ),
      );
      if (!positions || positions.length < 2) continue;
      const startIdx = allPositions.length;
      allPositions.push(...positions);
      metas.push({
        type: pin.shape.type,
        isClosed: pin.shape.type === "polygon",
        startIdx,
        count: positions.length,
      });
    }
    if (allPositions.length < 2) return null;
    return { selected, allPositions, metas };
  }

  async function captureMapImage(map, pins, allPositions) {
    if (!map || typeof map.getCanvas !== "function") return "";
    try {
      const bounds = new mapboxgl.LngLatBounds();
      allPositions.forEach((p) => bounds.extend([p.lon, p.lat]));

      const allLayers = map.getStyle().layers || [];
      const layerStates = new Map();
      for (const layer of allLayers) {
        try {
          const visibility = map.getLayoutProperty(layer.id, "visibility");
          layerStates.set(layer.id, visibility);
        } catch (e) {
          layerStates.set(layer.id, "visible");
        }
      }

      const baseLayerIds = new Set();
      for (const layer of allLayers) {
        if (
          layer.id.startsWith("basemap-") ||
          layer.id === "satellite" ||
          layer.id === "local-tile-layer" ||
          layer.id === "local-tile"
        ) {
          baseLayerIds.add(layer.id);
        }
      }

      const activePinIds = new Set();
      for (const pin of flattenPins(pins)) {
        if (pin.shape && pin.shape.show !== false) activePinIds.add(pin.id);
      }

      for (const layer of allLayers) {
        if (!baseLayerIds.has(layer.id)) {
          try {
            map.setLayoutProperty(layer.id, "visibility", "none");
          } catch (e) {}
        }
      }
      for (const layer of allLayers) {
        if (!baseLayerIds.has(layer.id)) {
          for (const pinId of activePinIds) {
            if (layer.id.includes(pinId)) {
              try {
                map.setLayoutProperty(layer.id, "visibility", "visible");
              } catch (e) {}
              break;
            }
          }
        }
      }

      const container = map.getContainer();
      const origWidth = container.style.width;
      const origHeight = container.style.height;
      const aspectUtm = toUTM(allPositions);
      const aspectXs = aspectUtm.map((p) => p.x);
      const aspectYs = aspectUtm.map((p) => p.y);
      const aspectSpanX = Math.max(Math.max(...aspectXs) - Math.min(...aspectXs), 1);
      const aspectSpanY = Math.max(Math.max(...aspectYs) - Math.min(...aspectYs), 1);
      const { w: cw, h: ch } = computeCanvasSize(aspectSpanX, aspectSpanY);
      container.style.width = cw + "px";
      container.style.height = ch + "px";
      map.resize();

      await new Promise((resolve) => {
        map.fitBounds(bounds, { padding: 120, maxZoom: 20, duration: 0 });
        map.once("idle", resolve);
        setTimeout(resolve, 1500);
      });

      map.triggerRepaint();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = map.getCanvas().toDataURL("image/png");

      container.style.width = origWidth;
      container.style.height = origHeight;
      map.resize();

      for (const [layerId, visibility] of layerStates) {
        try {
          map.setLayoutProperty(layerId, "visibility", visibility);
        } catch (e) {}
      }

      return dataUrl;
    } catch (e) {
      logger.warn("capture", "خطا در ثبت تصویر نقشه", e.message);
      return "";
    }
  }

  async function computeGeometry(pins, form) {
    errorReset();
    const geom = buildGeometry(pins);
    if (!geom) {
      state.errorMsg = "حداقل یک ترسیم (پلی‌گان یا خط) را انتخاب کنید.";
      logger.warn("generate", "تولید بدون ترسیم معتبر رد شد");
      return false;
    }
    last.form = { ...form };
    last.pins = pins;

    state.generating = true;
    try {
      const { allPositions, metas } = geom;
      const utm = toUTM(allPositions);
      state.utmPoints = utm;
      state.utmZone = utm[0]?.zone ?? null;
      state.selectedShapesMeta = metas;

      let totalArea = 0;
      for (const meta of metas) {
        if (!meta.isClosed) continue;
        totalArea += computeArea(utm.slice(meta.startIdx, meta.startIdx + meta.count));
      }
      state.areaM2 = totalArea;

      const minX = Math.min(...utm.map((p) => p.x));
      const maxX = Math.max(...utm.map((p) => p.x));
      const minY = Math.min(...utm.map((p) => p.y));
      const maxY = Math.max(...utm.map((p) => p.y));

      let areaSum = 0,
        cxSum = 0,
        cySum = 0;
      for (const meta of metas) {
        if (!meta.isClosed) continue;
        const slice = utm.slice(meta.startIdx, meta.startIdx + meta.count);
        if (slice.length < 3) continue;
        let a = 0,
          cx = 0,
          cy = 0;
        for (let i = 0; i < slice.length; i++) {
          const p = slice[i];
          const q = slice[(i + 1) % slice.length];
          const cross = p.x * q.y - q.x * p.y;
          a += cross;
          cx += (p.x + q.x) * cross;
          cy += (p.y + q.y) * cross;
        }
        a /= 2;
        if (Math.abs(a) < 1e-6) continue;
        const absA = Math.abs(a);
        areaSum += absA;
        cxSum += (cx / (6 * a)) * absA;
        cySum += (cy / (6 * a)) * absA;
      }
      let centerX, centerY;
      if (areaSum > 1e-6) {
        centerX = cxSum / areaSum;
        centerY = cySum / areaSum;
      } else {
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
      }
      state.centerUtm = { x: centerX, y: centerY, zone: state.utmZone };

      // آدرس‌یابی معکوس
      const zone = state.utmZone;
      const centroidResults = [];
      const centroidTasks = [];
      for (const meta of metas) {
        const slice = allPositions.slice(meta.startIdx, meta.startIdx + meta.count);
        const c = computeShapeCentroid(slice, zone);
        if (!c) continue;
        const rec = { lat: c.lat, lon: c.lon, utm: { x: c.x, y: c.y, zone } };
        const idx = centroidResults.length;
        centroidResults.push(rec);
        centroidTasks.push(
          reverseLookup(c.lat, c.lon)
            .then((r) => ({ idx, display: r.display || "", road: r.road || "" }))
            .catch(() => ({ idx, display: "", road: "" })),
        );
      }
      const results = await Promise.all(centroidTasks);
      for (const r of results) {
        if (centroidResults[r.idx]) {
          centroidResults[r.idx].address = r.display;
          centroidResults[r.idx].road = r.road;
        }
      }
      state.shapeCentroids = centroidResults;

      state.edgeTexts = metas.map((meta) => {
        const count = meta.isClosed ? meta.count : Math.max(meta.count - 1, 0);
        return Array(count).fill("");
      });

      state.ready = true;
      logger.info("generate", "محاسبات هندسی کروکی انجام شد", {
        points: allPositions.length,
        shapes: metas.length,
        area: totalArea.toFixed(2),
        zone: state.utmZone,
      });
      return true;
    } catch (err) {
      console.error("خطا در تولید کروکی:", err);
      state.errorMsg = "خطا در تولید کروکی. کنسول را برای جزئیات بررسی کنید.";
      logger.error("generate", "خطا در تولید کروکی", err.message);
      return false;
    } finally {
      state.generating = false;
    }
  }

  function errorReset() {
    state.errorMsg = "";
    state.ready = false;
  }

  function drawFrame(ctx, W, H, t) {
    ctx.save();
    const f = t.frame;
    if (f === "official") {
      ctx.strokeStyle = t.headerColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, W - 36, H - 36);
      ctx.fillStyle = t.headerColor;
      ctx.fillRect(10, 10, 42, 5);
      ctx.fillRect(W - 52, 10, 42, 5);
      ctx.fillRect(10, H - 15, 42, 5);
      ctx.fillRect(W - 52, H - 15, 42, 5);
    } else if (f === "bonyad") {
      ctx.strokeStyle = t.headerColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.fillStyle = t.headerColor;
      ctx.fillRect(12, 12, W - 24, 7);
    } else if (f === "color") {
      ctx.strokeStyle = t.polygonColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.strokeStyle = t.polygonColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(19, 19, W - 38, H - 38);
    } else if (f === "hand") {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 12, W - 24, H - 24);
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(20, 20, W - 40, H - 40);
    }
    ctx.restore();
  }

  function drawHeaderBand(ctx, W, t, form) {
    if (t.titleBlock !== "official") return;
    const h = 46;
    ctx.fillStyle = t.headerColor;
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(0, h - 2, W, 2);
    ctx.fillStyle = "#fff";
    ctx.font = "700 15px Vazirmatn, Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.org, W / 2, 16);
    ctx.font = "500 11px Vazirmatn, Tahoma, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(
      (form.title || "کروکی") + " — تاریخ برداشت: " + (form.date || "—"),
      W / 2,
      34,
    );
  }

  function drawTitleBlock(ctx, W, H, t, form, extra) {
    if (t.titleBlock === "technical") {
      ctx.fillStyle = "#666";
      ctx.font = "11px Vazirmatn, Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "کروکی وضعیت موجود — " + (form.title || "") + " — " + (form.date || ""),
        W / 2,
        H - 12,
      );
      return;
    }
    if (t.titleBlock === "hand") {
      ctx.fillStyle = "#555";
      ctx.font = "11px Vazirmatn, Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("کروکی توصیفی دستی — " + (form.title || ""), W / 2, H - 12);
      return;
    }
    if (t.titleBlock !== "official") return;
    const bh = 72;
    const bx = 22,
      by = H - bh - 16,
      bw = W - 44;
    ctx.strokeStyle = t.headerColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = t.headerColor;
    ctx.fillRect(bx, by, bw, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "600 11px Vazirmatn, Tahoma, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText(form.client || "کارفرما: —", bx + 8, by + 12);
    ctx.textAlign = "center";
    ctx.fillText("مقیاس: " + extra.scaleText, bx + bw / 2, by + 12);
    ctx.textAlign = "left";
    ctx.fillText(form.date || "تاریخ: —", bx + bw - 8, by + 12);
    ctx.fillStyle = "#333";
    ctx.font = "600 10px Vazirmatn, Tahoma, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      "سیستم مختصات: WGS84 / UTM — Zone " + (extra.zone || "—"),
      bx + 8,
      by + 40,
    );
    ctx.textAlign = "center";
    ctx.fillText("مساحت: " + extra.area, bx + bw / 2, by + 40);
    ctx.textAlign = "left";
    ctx.fillText("کارشناس: " + (form.surveyor || "__________"), bx + bw - 8, by + 40);
    ctx.fillStyle = "#555";
    ctx.textAlign = "right";
    ctx.fillText("نشانی: " + (form.address || "—"), bx + 8, by + 58);
  }

  function drawGrid(ctx, minX, minY, maxX, maxY, effScale, pad, drawTop, drawBottom, W) {
    const spanX = Math.max(maxX - minX, 0.001);
    const gx = niceScaleLength(spanX) / 4;
    ctx.save();
    ctx.strokeStyle = "rgba(30, 58, 110, 0.12)";
    ctx.lineWidth = 0.6;
    for (let x = Math.floor(minX / gx) * gx; x <= maxX; x += gx) {
      const px = pad + (x - minX) * effScale;
      ctx.beginPath();
      ctx.moveTo(px, drawTop);
      ctx.lineTo(px, drawBottom);
      ctx.stroke();
    }
    for (let y = Math.floor(minY / gx) * gx; y <= maxY; y += gx) {
      const py = drawBottom - (y - minY) * effScale;
      ctx.beginPath();
      ctx.moveTo(pad, py);
      ctx.lineTo(W - pad, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderSketch(canvas) {
    if (!canvas) return;
    const t = template();
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const pts = state.utmPoints;
    if (!pts.length) return;

    const headerH = t.titleBlock === "official" ? 46 : 0;
    const pad = Math.min(36, Math.floor(Math.min(W, H) * 0.07));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.001);
    const spanY = Math.max(maxY - minY, 0.001);

    const titleBlockH = t.titleBlock === "official" ? 72 + 16 : 24;
    const drawTop = headerH + pad + 30;
    const drawBottom = H - pad - titleBlockH - 14;
    const effScale = Math.min((W - 2 * pad) / spanX, (drawBottom - drawTop) / spanY);

    const toCanvas = (p) => ({
      x: pad + (p.x - minX) * effScale,
      y: drawBottom - (p.y - minY) * effScale,
    });

    const cpts = pts.map(toCanvas);
    const cx = cpts.reduce((s, p) => s + p.x, 0) / cpts.length;
    const cy = cpts.reduce((s, p) => s + p.y, 0) / cpts.length;

    const metas = state.selectedShapesMeta.length
      ? state.selectedShapesMeta
      : [{ type: "polygon", isClosed: true, startIdx: 0, count: pts.length }];

    const form = last.form || {};

    const metersPerCm =
      spanX / ((W - 2 * pad) / 96 * 2.54);
    const den = niceScaleDen(Math.round((metersPerCm) * 100) / 1);
    const scaleText = den ? "1:" + den.toLocaleString("fa-IR") : "—";

    // کادر
    drawFrame(ctx, W, H, t);
    // هدر
    drawHeaderBand(ctx, W, t, form);
    // شبکه
    if (t.grid) drawGrid(ctx, minX, minY, maxX, maxY, effScale, pad, drawTop, drawBottom, W);

    let globalIdx = 0;
    const nwIndex = computeNWIndex(cpts);

    for (let m = 0; m < metas.length; m++) {
      const meta = metas[m];
      const slice = cpts.slice(meta.startIdx, meta.startIdx + meta.count);
      const utmSlice = pts.slice(meta.startIdx, meta.startIdx + meta.count);
      if (slice.length < 2) continue;
      const isClosed = meta.isClosed;

      ctx.beginPath();
      slice.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (isClosed) ctx.closePath();
      if (isClosed) {
        ctx.fillStyle = t.colorful
          ? "rgba(194, 65, 12, 0.18)"
          : "rgba(122, 31, 31, 0.05)";
        ctx.fill();
      }
      ctx.lineWidth = t.handDrawn ? 2 : 2.5;
      ctx.strokeStyle = t.polygonColor;
      ctx.stroke();

      const edgeCount = isClosed ? slice.length : slice.length - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = slice[i];
        const b = slice[(i + 1) % slice.length];
        const aUtm = utmSlice[i];
        const bUtm = utmSlice[(i + 1) % utmSlice.length];
        const dx = bUtm.x - aUtm.x;
        const dy = bUtm.y - aUtm.y;
        const lenM = Math.sqrt(dx * dx + dy * dy);

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        let nx = -(b.y - a.y);
        let ny = b.x - a.x;
        const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= nlen;
        ny /= nlen;

        const toCx = mx - cx,
          toCy = my - cy;
        if (nx * toCx + ny * toCy < 0) {
          nx = -nx;
          ny = -ny;
        }

        const labelX = mx + nx * 20;
        const labelY = my + ny * 20;

        let angle = Math.atan2(b.y - a.y, b.x - a.x);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(angle);
        ctx.font = "600 15px Vazirmatn, Tahoma, sans-serif";
        const lenTxt = lenM.toFixed(2);
        const lenW = ctx.measureText(lenTxt).width;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(-lenW / 2 - 3, -10, lenW + 6, 20);
        ctx.fillStyle = t.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lenTxt, 0, 0);
        ctx.restore();

        const street = state.edgeTexts[m]?.[i] || "";
        if (street) {
          ctx.font = "500 12px Vazirmatn, Tahoma, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const streetX = mx + nx * 46;
          const streetY = my + ny * 46;
          const sw = ctx.measureText(street).width;
          const halfSw = Math.min(sw / 2, W / 2 - 8);
          const sx = Math.max(halfSw + 8, Math.min(streetX, W - halfSw - 8));
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(sx - sw / 2 - 4, streetY - 9, sw + 8, 18);
          ctx.fillStyle = t.textColor;
          ctx.fillText(street, sx, streetY);
        }
      }

      const startIdx = meta.startIdx;
      slice.forEach((p, i) => {
        globalIdx += 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = t.polygonColor;
        ctx.fill();

        const toCx = p.x - cx,
          toCy = p.y - cy;
        const dlen = Math.sqrt(toCx * toCx + toCy * toCy) || 1;
        const lx = p.x + (toCx / dlen) * 24;
        const ly = p.y + (toCy / dlen) * 24;

        ctx.font = "700 16px Vazirmatn, Tahoma, sans-serif";
        ctx.fillStyle = t.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = vertexLabel(t.vertexLabels, startIdx + i, nwIndex);
        ctx.fillText(String(label), lx, ly);
      });
    }

    // مرکز هر ترسیم + نشانی
    for (let m = 0; m < metas.length; m++) {
      const meta = metas[m];
      const slice = cpts.slice(meta.startIdx, meta.startIdx + meta.count);
      if (!slice.length) continue;

      let cp = null;
      if (meta.isClosed) {
        cp = canvasPolygonCentroid(slice);
      }
      if (!cp) {
        cp = {
          x: slice.reduce((sum, p) => sum + p.x, 0) / slice.length,
          y: slice.reduce((sum, p) => sum + p.y, 0) / slice.length,
        };
      }

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = t.centerColor;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      const addr = state.shapeCentroids[m]?.address || "";
      if (addr && !t.handDrawn) {
        ctx.font = "600 12px Vazirmatn, Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const maxW = 230;
        const lines = wrapCanvasText(ctx, addr, maxW);
        const lineH = 17;
        const padV = 3;
        const padH = 6;
        let boxW = 0;
        for (const line of lines) boxW = Math.max(boxW, ctx.measureText(line).width);
        boxW = Math.min(boxW + padH * 2, W - 12);
        const boxH = lines.length * lineH + padV * 2;
        const halfW = Math.min(boxW / 2, W / 2 - 6);
        const bx = Math.max(halfW + 6, Math.min(cp.x, W - halfW - 6));
        let by = cp.y + 12;
        if (by + boxH > H - 8) by = cp.y - boxH - 14;

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(bx - boxW / 2, by - padV, boxW, boxH);
        ctx.fillStyle = t.centerColor;
        lines.forEach((line, i) => {
          ctx.fillText(line, bx, by + i * lineH);
        });
      }
    }

    // شمال
    if (t.northArrow) {
      const nax = W - 50,
        nay = drawTop - 12;
      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.fillStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nax, nay + 22);
      ctx.lineTo(nax, nay - 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nax, nay - 20);
      ctx.lineTo(nax - 6, nay - 10);
      ctx.lineTo(nax + 6, nay - 10);
      ctx.closePath();
      ctx.fill();
      ctx.font = "700 13px Tahoma";
      ctx.textAlign = "center";
      ctx.fillText("N", nax, nay + 36);
      ctx.restore();
    }

    // مقیاس خطی
    if (t.scaleBar) {
      const barM = niceScaleLength(spanX);
      const barPx = barM * effScale;
      const bx0 = pad,
        by0 = drawBottom - 14;
      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx0 + barPx, by0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx0, by0 - 5);
      ctx.lineTo(bx0, by0 + 5);
      ctx.moveTo(bx0 + barPx, by0 - 5);
      ctx.lineTo(bx0 + barPx, by0 + 5);
      ctx.stroke();
      ctx.font = "12px Tahoma";
      ctx.textAlign = "center";
      ctx.fillStyle = "#333";
      ctx.fillText(barM + " m", bx0 + barPx / 2, by0 - 10);
      ctx.restore();
    }

    // کتیبه پایین
    drawTitleBlock(ctx, W, H, t, form, {
      scaleText,
      zone: state.utmZone || "—",
      area: state.areaM2.toFixed(2) + " متر مربع",
    });
  }

  function downloadImage(dataUrl, filename) {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  function downloadCanvasImage(canvas, filename) {
    if (!canvas) return;
    downloadImage(canvas.toDataURL("image/png"), filename);
  }

  function buildPrintHtml() {
    const t = template();
    const rows = state.utmPoints
      .map(
        (p, i) =>
          `<tr><td>${i + 1}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td><td>${
            p.zone ?? state.utmZone ?? ""
          }</td></tr>`,
      )
      .join("");

    const centerRow = state.centerUtm
      ? `<tr style="background:#eff6ff;font-weight:600"><td>مرکز</td><td>${state.centerUtm.x.toFixed(
          2,
        )}</td><td>${state.centerUtm.y.toFixed(2)}</td><td>${
          state.centerUtm.zone ?? state.utmZone ?? ""
        }</td></tr>`
      : "";

    const hasUtm = t.coordinateTable !== "none";

    return {
      html: `
    <div class="sheet">
      <div class="head" style="border-bottom-color:${t.headerColor}">
        <div class="head-title">${escapeHtml(last.form.title) || "کروکی وضعیت موجود"}</div>
        <div class="head-sub">قالب: ${escapeHtml(t.name)} — تاریخ برداشت: ${escapeHtml(last.form.date)}</div>
      </div>

      <table class="info-table">
        <tr>
          <td>کارفرما</td><td>${escapeHtml(last.form.client)}</td>
          <td>نشانی ملک</td><td>${escapeHtml(last.form.address)}</td>
        </tr>
        <tr>
          <td>سیستم مختصات</td><td>WGS 1984 / UTM — Zone: ${state.utmZone ?? "—"}</td>
          <td>مساحت کل</td><td>${state.areaM2.toFixed(2)} متر مربع</td>
        </tr>
        <tr>
          <td>سازمان / مرجع</td><td>${escapeHtml(t.org)}</td>
          <td>کارشناس</td><td>${escapeHtml(last.form.surveyor)}</td>
        </tr>
      </table>

      <div class="images">
        <figure>
          <img src="${state.mapImage}" />
          <figcaption>تصویر نقشه</figcaption>
        </figure>
        <figure>
          <img src="__SKETCH__" />
          <figcaption>${escapeHtml(t.subtitle)}</figcaption>
        </figure>
      </div>

      ${
        hasUtm
          ? `<table class="utm-table">
        <thead>
          <tr><th colspan="4">مختصات UTM — Zone: ${state.utmZone ?? "—"}</th></tr>
          <tr><th>شماره نقطه</th><th>X</th><th>Y</th><th>Zone</th></tr>
        </thead>
        <tbody>${rows}${centerRow}</tbody>
      </table>`
          : ""
      }

      ${
        state.shapeCentroids.length
          ? `
      <div style="margin-top:16px">
        <div style="font-weight:600;margin-bottom:8px">نشانی مراکز ترسیم‌ها</div>
        <table class="utm-table">
          <thead><tr><th>شماره ترسیم</th><th>نشانی مرکز</th></tr></thead>
          <tbody>
            ${state.shapeCentroids
              .map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c.address) || "—"}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>`
          : ""
      }

      ${
        state.edgeTexts.some((arr) => arr.length)
          ? `
      <div style="margin-top:16px">
        <div style="font-weight:600;margin-bottom:8px">متن ضلع‌ها</div>
        <table class="utm-table">
          <thead><tr><th>ترسیم</th><th>ضلع</th><th>متن</th></tr></thead>
          <tbody>
            ${state.edgeTexts
              .map((texts, s) =>
                texts
                  .map(
                    (txt, e) =>
                      `<tr><td>${s + 1}</td><td>${e + 1}</td><td>${escapeHtml(txt) || "—"}</td></tr>`,
                  )
                  .join(""),
              )
              .join("")}
          </tbody>
        </table>
      </div>`
          : ""
      }

      <div class="disclaimer">
        کلیه حدود بر اساس اظهارات و ارائه مالک برداشت شده است و نقشه‌بردار هیچ مسئولیتی در قبال تعدی به املاک مجاور و حریم‌های موجود ندارد.
      </div>
    </div>
  `,
      style: `headerColor:${t.headerColor}`,
    };
  }

  function openPrint(canvas) {
    const sketchImg = canvas?.toDataURL("image/png") || "";
    const { html } = buildPrintHtml();
    const finalHtml = html.replace("__SKETCH__", sketchImg);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8"/>
  <title>&nbsp;</title>
  <style>${printCss()}</style>
</head>
<body>${finalHtml}</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        logger.error("print", "خطا در چاپ", e.message);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 450);
  }

  function printCss() {
    return `
* { box-sizing: border-box; }
body { font-family: Tahoma, 'Vazirmatn', sans-serif; margin: 0; padding: 0; color: #222; }
.sheet { max-width: 900px; margin: 0 auto; padding: 24px; }
.head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
.head-title { font-size: 20px; font-weight: 700; }
.head-sub { font-size: 12px; color: #555; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
table.info-table td { border: 1px solid #bbb; padding: 6px 8px; }
table.info-table td:nth-child(1), table.info-table td:nth-child(3) { background: #f3f3f3; font-weight: 600; width: 15%; }
table.utm-table th, table.utm-table td { border: 1px solid #bbb; padding: 6px 8px; text-align: center; }
table.utm-table thead th { background: #f3f3f3; }
.images { display: flex; gap: 16px; margin-bottom: 16px; page-break-inside: avoid; }
figure { flex: 1; margin: 0; border: 1px solid #bbb; padding: 6px; text-align: center; }
figure img { width: 100%; height: auto; display: block; }
figcaption { font-size: 12px; color: #444; margin-top: 6px; font-weight: 600; }
.disclaimer { font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
@page { size: A4 portrait; margin: 10mm; }
@media print {
  .sheet { padding: 0; }
  html, body { margin: 0; }
  figure, table { page-break-inside: avoid; }
}
`;
  }

  return {
    state,
    template,
    setTemplate,
    computeGeometry,
    captureMapImage,
    renderSketch,
    downloadCanvasImage,
    openPrint,
    buildPrintHtml,
    getTodayJalali,
    computeCanvasSize,
    buildGeometry,
    eligiblePinsOf,
    isKrokiEligible,
  };
}

export { getTemplate };
