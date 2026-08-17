<template>
  <Transition name="modal">
    <div v-if="dialog" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4">
      <div
        class="kroki-panel rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[95vh] text-xs"
        dir="rtl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b flex-shrink-0">
          <h2 class="text-base font-semibold flex items-center gap-2">
            <i class="fas fa-print text-gray-600"></i>
            کروکی وضعیت موجود
          </h2>
          <button @click="close" class="text-gray-500 hover:text-gray-700 text-lg leading-none" title="بستن">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto px-5 py-4 flex-1 min-h-0">
          <!-- اطلاعات فرم -->
          <div class="kroki-box grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3">
            <div>
              <label class="block mb-1 font-medium">عنوان نقشه</label>
              <input v-model="props.form.title" type="text" class="input" placeholder="پلان وضعیت موجود" />
            </div>
            <div>
              <label class="block mb-1 font-medium">کارفرما</label>
              <input v-model="props.form.client" type="text" class="input" />
            </div>
            <div>
              <label class="block mb-1 font-medium">نشانی ملک</label>
              <input v-model="props.form.address" type="text" class="input" />
            </div>
            <div>
              <label class="block mb-1 font-medium">تاریخ برداشت</label>
              <input
                v-model="props.form.date"
                type="text"
                class="input text-center"
                placeholder="1403/01/01"
                dir="ltr"
                @input="props.form.date = props.form.date.replace(/[^\d/]/g, '')"
              />
            </div>
          </div>

          <div v-if="errorMsg" class="mb-3 text-red-600">{{ errorMsg }}</div>

          <div v-if="generating && !ready" class="flex items-center justify-center gap-2 py-10 text-gray-500">
            <i class="fas fa-sync-alt fa-spin"></i>
            <span>در حال تولید کروکی…</span>
          </div>

          <!-- پیش‌نمایش -->
          <div v-if="ready" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="kroki-box p-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium">تصویر نقشه</span>
                  <button @click="downloadImage(mapImage, 'map.png')" class="text-gray-500 hover:text-gray-700" title="دانلود">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
                <img :src="mapImage" class="w-full border rounded" alt="تصویر نقشه" />
              </div>
              <div class="kroki-box p-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium">کروکی وضعیت موجود</span>
                  <button @click="downloadCanvas" class="text-gray-500 hover:text-gray-700" title="دانلود">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
                <canvas
                  ref="sketchCanvasRef"
                  width="700"
                  height="700"
                  class="border rounded bg-white max-w-full max-h-[60vh] mx-auto block"
                  style="width: auto; height: auto"
                ></canvas>
              </div>
            </div>

            <!-- متن ضلع‌ها (دستی) -->
            <div v-if="edgeTexts.length" class="kroki-box p-3 mb-4">
              <div class="font-medium mb-2">متن ضلع‌ها</div>
              <div v-for="(shapeTexts, m) in edgeTexts" :key="m" class="mb-3 last:mb-0">
                <div class="text-[11px] text-gray-500 mb-1">
                  {{ selectedPins[m]?.name || 'ترسیم ' + (m + 1) }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <input
                    v-for="(t, i) in shapeTexts"
                    :key="i"
                    v-model="edgeTexts[m][i]"
                    type="text"
                    class="input flex-1 min-w-[8rem]"
                    :placeholder="'ضلع ' + (i + 1)"
                    @input="drawSketch()"
                  />
                </div>
              </div>
            </div>

            <!-- جدول مختصات UTM -->
            <div class="kroki-box p-3">
              <div class="font-medium mb-2">مختصات UTM — Zone: {{ utmZone || '—' }}</div>
              <table class="w-full text-[11px] border-collapse">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="border px-2 py-1">شماره نقطه</th>
                    <th class="border px-2 py-1">X</th>
                    <th class="border px-2 py-1">Y</th>
                    <th class="border px-2 py-1">Zone</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in utmPoints" :key="i">
                    <td class="border px-2 py-1 text-center">{{ i + 1 }}</td>
                    <td class="border px-2 py-1 text-center">{{ p.x.toFixed(2) }}</td>
                    <td class="border px-2 py-1 text-center">{{ p.y.toFixed(2) }}</td>
                    <td class="border px-2 py-1 text-center">{{ p.zone ?? utmZone }}</td>
                  </tr>
                  <tr v-if="centerUtm" class="font-semibold">
                    <td class="border px-2 py-1 text-center">مرکز</td>
                    <td class="border px-2 py-1 text-center">{{ centerUtm.x.toFixed(2) }}</td>
                    <td class="border px-2 py-1 text-center">{{ centerUtm.y.toFixed(2) }}</td>
                    <td class="border px-2 py-1 text-center">{{ centerUtm.zone ?? utmZone }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-2 text-gray-600">مساحت کل: {{ areaM2.toFixed(2) }} متر مربع</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-5 py-3 border-t flex-shrink-0">
          <button @click="close" class="btn btn-ghost btn-sm">بستن</button>
          <button
            v-if="ready"
            @click="doPrint"
            class="btn btn-primary btn-sm"
            title="چاپ یا ذخیره به صورت PDF"
          >
            <i class="fas fa-print ml-1"></i>
            چاپ / PDF
          </button>
          <button
            v-else-if="errorMsg && !generating"
            @click="generate"
            class="btn btn-primary btn-sm"
          >
            <i class="fas fa-sync-alt ml-1"></i>
            تلاش مجدد
          </button>
          <button v-else class="btn btn-primary btn-sm disabled:opacity-50" disabled>
            <i class="fas fa-sync-alt ml-1 fa-spin"></i>
            در حال تولید…
          </button>
        </div>
        </div>
      </div>
    </Transition>
  </template>

<script setup>
import { ref, reactive, computed, nextTick, watch } from "vue";
import mapboxgl from "mapbox-gl";
import proj4 from "proj4";

const props = defineProps({
  map: { type: Object, default: null },
  pins: { type: Object, required: true },
  form: { type: Object, required: true },
});

const emit = defineEmits(["close"]);

const dialog = ref(false);
const generating = ref(false);
const ready = ref(false);
const errorMsg = ref("");

const selectedPinIds = ref([]);
const mapImage = ref("");
const utmPoints = ref([]);
const areaM2 = ref(0);
const utmZone = ref(null);
const centerUtm = ref(null);
const selectedShapesMeta = ref([]);

const shapeCentroids = ref([]);
const edgeTexts = ref([]);

const sketchCanvasRef = ref(null);

/* -------------------- تبدیل تاریخ میلادی به شمسی -------------------- */
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

function getTodayJalali() {
  const d = new Date();
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

const MAP_IR_KEY = import.meta.env.VITE_MAP_IR_KEY || "";

async function reverseLookup(lat, lon) {
  const url = `https://map.ir/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-api-key": MAP_IR_KEY,
    },
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

/* -------------------- لیست پلی‌گان‌ها / خط‌های قابل استفاده -------------------- */
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

const eligiblePins = computed(() =>
  flattenPins(props.pins).filter(
    (p) =>
      p.type === "draw" &&
      p.selected !== false &&
      p.shape &&
      ["polygon", "polyline"].includes(p.shape.type) &&
      Array.isArray(p.shape.positions) &&
      p.shape.positions.length >= 2,
  ),
);

const selectedPins = computed(() =>
  eligiblePins.value.filter((p) => selectedPinIds.value.includes(p.id)),
);

watch(selectedPinIds, () => {
  ready.value = false;
  mapImage.value = "";
});

/** فعال‌سازی لایه ترسیم روی نقشه اگر مخفی باشد */
function ensurePinVisible(pin) {
  if (!pin) return;
  if (pin.shape) pin.shape.show = true;
  const map = props.map;
  if (!map || typeof map.getStyle !== "function") return;
  const layers = map.getStyle().layers || [];
  for (const layer of layers) {
    if (layer.id.includes(pin.id)) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "visible");
      } catch (e) {}
    }
  }
}

/* -------------------- باز / بسته کردن دیالوگ -------------------- */
function open(pin) {
  errorMsg.value = "";
  ready.value = false;
  mapImage.value = "";
  utmPoints.value = [];
  areaM2.value = 0;
  utmZone.value = null;
  centerUtm.value = null;
  selectedShapesMeta.value = [];
  shapeCentroids.value = [];
  edgeTexts.value = [];
  dialog.value = true;

  selectedPinIds.value = eligiblePins.value.map((p) => p.id);

  generate();
}

function close() {
  dialog.value = false;
  emit("close");
}

/* -------------------- تبدیل به UTM -------------------- */
function toUTM(positions) {
  if (!positions.length) return [];
  const lonAvg = positions.reduce((s, p) => s + (p.lon ?? p.lng), 0) / positions.length;
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

/** مرکز هندسی دقیق (گرانی‌گاه) یک چندضلعی/خط در زون UTM مشخص */
function computeShapeCentroid(pos, zone) {
  if (!pos || pos.length < 3) return null;
  const meanLat = pos.reduce((s, p) => s + Number(p.lat), 0) / pos.length;
  const projStr = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${meanLat < 0 ? "+south" : ""}`;
  const projected = pos.map((p) => {
    const lon = Number(p.lon ?? p.lng);
    const [x, y] = proj4("EPSG:4326", projStr, [lon, Number(p.lat)]);
    return { x, y };
  });

  // Translate the local coordinates before the shoelace calculation to avoid
  // floating-point cancellation from UTM eastings/northings around 10^5-10^6.
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

/* -------------------- گرفتن تصویر از نقشه -------------------- */
async function captureMapImage(positions) {
  const bounds = new mapboxgl.LngLatBounds();
  positions.forEach((p) => bounds.extend([p.lon, p.lat]));

  const allLayers = props.map.getStyle().layers || [];

  const layerStates = new Map();
  for (const layer of allLayers) {
    try {
      const visibility = props.map.getLayoutProperty(layer.id, "visibility");
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
  for (const pin of flattenPins(props.pins)) {
    if (pin.shape && pin.shape.show !== false) {
      activePinIds.add(pin.id);
    }
  }

  for (const layer of allLayers) {
    if (!baseLayerIds.has(layer.id)) {
      try {
        props.map.setLayoutProperty(layer.id, "visibility", "none");
      } catch (e) {}
    }
  }

  for (const layer of allLayers) {
    if (!baseLayerIds.has(layer.id)) {
      for (const pinId of activePinIds) {
        if (layer.id.includes(pinId)) {
          try {
            props.map.setLayoutProperty(layer.id, "visibility", "visible");
          } catch (e) {}
          break;
        }
      }
    }
  }

  // تنظیم اندازه کانتینر نقشه متناسب با نسبت ابعاد ترسیم (هم‌اندازه کروکی)
  const container = props.map.getContainer();
  const origWidth = container.style.width;
  const origHeight = container.style.height;
  const aspectUtm = toUTM(positions);
  const aspectXs = aspectUtm.map((p) => p.x);
  const aspectYs = aspectUtm.map((p) => p.y);
  const aspectSpanX = Math.max(Math.max(...aspectXs) - Math.min(...aspectXs), 1);
  const aspectSpanY = Math.max(Math.max(...aspectYs) - Math.min(...aspectYs), 1);
  const { w: cw, h: ch } = computeCanvasSize(aspectSpanX, aspectSpanY);
  container.style.width = cw + "px";
  container.style.height = ch + "px";
  props.map.resize();

  await new Promise((resolve) => {
    props.map.fitBounds(bounds, { padding: 120, maxZoom: 20, duration: 0 });
    props.map.once("idle", resolve);
    setTimeout(resolve, 1500);
  });

  props.map.triggerRepaint();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 200));

  const dataUrl = props.map.getCanvas().toDataURL("image/png");

  // بازیابی اندازه اولیه کانتینر نقشه
  container.style.width = origWidth;
  container.style.height = origHeight;
  props.map.resize();

  for (const [layerId, visibility] of layerStates) {
    try {
      props.map.setLayoutProperty(layerId, "visibility", visibility);
    } catch (e) {}
  }

  return dataUrl;
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

/* -------------------- رسم کروکی روی کانواس سفید -------------------- */
function niceScaleLength(span) {
  const target = span / 5;
  if (!isFinite(target) || target <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best,
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

function drawSketch() {
  const canvas = sketchCanvasRef.value;
  if (!canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pts = utmPoints.value;
  if (!pts.length) return;

  const pad = Math.min(32, Math.floor(Math.min(W, H) * 0.06));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.001);
  const spanY = Math.max(maxY - minY, 0.001);

  const drawTop = pad + 40;
  const drawBottom = H - pad - 34;
  const drawH = drawBottom - drawTop;
  const effScale = Math.min((W - 2 * pad) / spanX, drawH / spanY);

  const toCanvas = (p) => ({
    x: pad + (p.x - minX) * effScale,
    y: drawBottom - (p.y - minY) * effScale,
  });

  const cpts = pts.map(toCanvas);
  const cx = cpts.reduce((s, p) => s + p.x, 0) / cpts.length;
  const cy = cpts.reduce((s, p) => s + p.y, 0) / cpts.length;

  const metas = selectedShapesMeta.value.length
    ? selectedShapesMeta.value
    : [{ type: "polygon", isClosed: true, startIdx: 0, count: pts.length }];

  let globalIdx = 0;
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
      ctx.fillStyle = "rgba(122, 31, 31, 0.05)";
      ctx.fill();
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#7a1f1f";
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
      ctx.fillStyle = "#222";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(lenTxt, 0, 0);
      ctx.restore();

      const street = edgeTexts.value[m]?.[i] || "";
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
        ctx.fillStyle = "#444";
        ctx.fillText(street, sx, streetY);
      }
    }

    slice.forEach((p) => {
      globalIdx += 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#7a1f1f";
      ctx.fill();

      const toCx = p.x - cx,
        toCy = p.y - cy;
      const dlen = Math.sqrt(toCx * toCx + toCy * toCy) || 1;
      const lx = p.x + (toCx / dlen) * 24;
      const ly = p.y + (toCy / dlen) * 24;

      ctx.font = "700 17px Vazirmatn, Tahoma, sans-serif";
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(globalIdx), lx, ly);
    });
  }

  // نقاط مرکز هر ترسیم + نشانی
  // مهم: برای جای‌گذاری روی خود تصویر، مرکز را مستقیماً از مختصات پیکسلی
  // همان شکلی که رسم شده محاسبه می‌کنیم. این کار هرگونه اختلاف بین UTM،
  // تبدیل تصویر و مرکز ذخیره‌شده را حذف می‌کند.
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
    return {
      x: cx / (3 * twiceArea),
      y: cy / (3 * twiceArea),
    };
  }

  for (let m = 0; m < metas.length; m++) {
    const meta = metas[m];
    const slice = cpts.slice(meta.startIdx, meta.startIdx + meta.count);
    if (!slice.length) continue;

    let cp = null;
    if (meta.isClosed) {
      // این همان مرکز ثقل واقعی خود پلیگان در دستگاه مختصات تصویر است؛
      // بنابراین نشانگر مرکز دقیقاً داخل همان شکل قرار می‌گیرد.
      cp = canvasPolygonCentroid(slice);
    }

    if (!cp) {
      // فقط برای هندسه‌های بدون مرکز مساحت‌محور، میانگین نقاط به‌عنوان
      // fallback استفاده می‌شود.
      cp = {
        x: slice.reduce((sum, p) => sum + p.x, 0) / slice.length,
        y: slice.reduce((sum, p) => sum + p.y, 0) / slice.length,
      };
    }

    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    const addr = shapeCentroids.value[m]?.address || "";
    if (addr) {
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
      ctx.fillStyle = "#1d4ed8";
      lines.forEach((line, i) => {
        ctx.fillText(line, bx, by + i * lineH);
      });
    }
  }

  const nax = W - 50,
    nay = 50;
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

  const barM = niceScaleLength(spanX);
  const barPx = barM * effScale;
  const bx0 = pad,
    by0 = H - 30;
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

/* -------------------- تولید (map screenshot + کروکی) -------------------- */
async function generate() {
  errorMsg.value = "";
  ready.value = false;

  const pins = selectedPins.value;
  if (!pins.length) {
    errorMsg.value = "حداقل یک ترسیم (پلی‌گان یا خط) را انتخاب کنید.";
    return;
  }

  const allPositions = [];
  const metas = [];
  let areaSum = 0;
  for (const pin of pins) {
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
    const isClosed = pin.shape.type === "polygon";
    metas.push({
      type: pin.shape.type,
      isClosed,
      startIdx,
      count: positions.length,
    });
  }

  if (allPositions.length < 2) {
    errorMsg.value = "حداقل ۲ نقطه لازم است.";
    return;
  }

  generating.value = true;
  try {
    for (const pin of pins) {
      ensurePinVisible(pin);
    }

    const utm = toUTM(allPositions);
    utmPoints.value = utm;
    utmZone.value = utm[0]?.zone ?? null;
    selectedShapesMeta.value = metas;

    // تنظیم ابعاد کانواس متناسب با شکل
    const canvas = sketchCanvasRef.value;
    if (canvas) {
      const xs = utm.map((p) => p.x);
      const ys = utm.map((p) => p.y);
      const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1);
      const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1);
      const { w: cw, h: ch } = computeCanvasSize(spanX, spanY);
      canvas.width = cw;
      canvas.height = ch;
    }

    let totalArea = 0;
    for (const meta of metas) {
      if (!meta.isClosed) continue;
      const slice = utm.slice(meta.startIdx, meta.startIdx + meta.count);
      totalArea += computeArea(slice);
    }
    areaM2.value = totalArea;

    const minX = Math.min(...utm.map((p) => p.x));
    const maxX = Math.max(...utm.map((p) => p.x));
    const minY = Math.min(...utm.map((p) => p.y));
    const maxY = Math.max(...utm.map((p) => p.y));

    // مرکز هندسی (مرکز ثقل Flächen) برای تمام پلیگانها
    let areaSum = 0;
    let cxSum = 0;
    let cySum = 0;
    for (const meta of metas) {
      if (!meta.isClosed) continue;
      const slice = utm.slice(meta.startIdx, meta.startIdx + meta.count);
      if (slice.length < 3) continue;
      let a = 0;
      let cx = 0;
      let cy = 0;
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
    centerUtm.value = {
      x: centerX,
      y: centerY,
      zone: utmZone.value,
    };

    mapImage.value = await captureMapImage(allPositions);

    // آدرس‌یابی معکوس فقط برای مراکز ترسیم‌ها
    try {
      const zone = utmZone.value;

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
      shapeCentroids.value = centroidResults;
    } catch (e) {
      console.warn("خطا در آدرس‌یابی:", e);
      shapeCentroids.value = metas.map((meta) => {
        const slice = allPositions.slice(meta.startIdx, meta.startIdx + meta.count);
        const c = computeShapeCentroid(slice, utmZone.value);
        return c
          ? { lat: c.lat, lon: c.lon, utm: { x: c.x, y: c.y, zone: utmZone.value }, address: "", road: "" }
          : { lat: 0, lon: 0, utm: null, address: "", road: "" };
      });
    }

    edgeTexts.value = metas.map((meta) => {
      const count = meta.isClosed ? meta.count : Math.max(meta.count - 1, 0);
      return Array(count).fill("");
    });

    ready.value = true;
    await nextTick();
    drawSketch();
  } catch (err) {
    console.error("خطا در تولید کروکی:", err);
    errorMsg.value = "خطا در تولید کروکی. کنسول را برای جزئیات بررسی کنید.";
  } finally {
    generating.value = false;
  }
}

/* -------------------- دانلود تصاویر -------------------- */
function downloadImage(dataUrl, filename) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function downloadCanvas() {
  const canvas = sketchCanvasRef.value;
  if (!canvas) return;
  downloadImage(canvas.toDataURL("image/png"), "kroki.png");
}

/* -------------------- چاپ / PDF -------------------- */
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

const printCss = `
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

function buildPrintHtml() {
  const sketchImg = sketchCanvasRef.value?.toDataURL("image/png") || "";

  const rows = utmPoints.value
    .map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td><td>${
          p.zone ?? utmZone.value ?? ""
        }</td></tr>`,
    )
    .join("");

  const centerRow = centerUtm.value
    ? `<tr style="background:#eff6ff;font-weight:600"><td>مرکز</td><td>${centerUtm.value.x.toFixed(
        2,
      )}</td><td>${centerUtm.value.y.toFixed(2)}</td><td>${
        centerUtm.value.zone ?? utmZone.value ?? ""
      }</td></tr>`
    : "";

  return `
    <div class="sheet">
      <div class="head">
        <div class="head-title">${escapeHtml(props.form.title) || "کروکی وضعیت موجود"}</div>
        <div class="head-sub">تاریخ برداشت: ${escapeHtml(props.form.date)}</div>
      </div>

      <table class="info-table">
        <tr>
          <td>کارفرما</td><td>${escapeHtml(props.form.client)}</td>
          <td>نشانی ملک</td><td>${escapeHtml(props.form.address)}</td>
        </tr>
        <tr>
          <td>سیستم مختصات</td><td>WGS 1984 / UTM — Zone: ${utmZone.value ?? "—"}</td>
          <td>مساحت کل</td><td>${areaM2.value.toFixed(2)} متر مربع</td>
        </tr>
      </table>

      <div class="images">
        <figure>
          <img src="${mapImage.value}" />
          <figcaption>تصویر نقشه</figcaption>
        </figure>
        <figure>
          <img src="${sketchImg}" />
          <figcaption>کروکی وضعیت موجود</figcaption>
        </figure>
      </div>

      <table class="utm-table">
        <thead>
          <tr><th colspan="4">مختصات UTM — Zone: ${utmZone.value ?? "—"}</th></tr>
          <tr><th>شماره نقطه</th><th>X</th><th>Y</th><th>Zone</th></tr>
        </thead>
        <tbody>${rows}${centerRow}</tbody>
      </table>

      ${
        shapeCentroids.value.length
          ? `
      <div style="margin-top:16px">
        <div style="font-weight:600;margin-bottom:8px">نشانی مراکز ترسیم‌ها</div>
        <table class="utm-table">
          <thead>
            <tr><th>شماره ترسیم</th><th>نشانی مرکز</th></tr>
          </thead>
          <tbody>
            ${shapeCentroids.value
              .map(
                (c, i) =>
                  `<tr><td>${i + 1}</td><td>${escapeHtml(c.address) || "—"}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
          : ""
      }

      ${
        edgeTexts.value.some((arr) => arr.length)
          ? `
      <div style="margin-top:16px">
        <div style="font-weight:600;margin-bottom:8px">متن ضلع‌ها</div>
        <table class="utm-table">
          <thead>
            <tr><th>ترسیم</th><th>ضلع</th><th>متن</th></tr>
          </thead>
          <tbody>
            ${edgeTexts.value
              .map((texts, s) =>
                texts
                  .map(
                    (t, e) =>
                      `<tr><td>${s + 1}</td><td>${e + 1}</td><td>${escapeHtml(t) || "—"}</td></tr>`,
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
  `;
}

function doPrint() {
  if (!ready.value) return;

  const html = buildPrintHtml();

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
  <style>${printCss}</style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("خطا در چاپ:", e);
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 450);
}

defineExpose({ open });
</script>

<style scoped>
.kroki-panel {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-xl);
  color: var(--text);
  font-family: var(--font);
}
.kroki-box {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.kroki-box .input,
.kroki-panel .input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
}
.kroki-box .input:focus,
.kroki-panel .input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.kroki-panel table th,
.kroki-panel table td {
  border-color: rgb(var(--accent-rgb) / 0.35);
  background: var(--surface);
  color: var(--text);
}
.kroki-panel table thead th {
  background: var(--surface2);
}
.kroki-panel .border-b {
  border-bottom-color: rgb(var(--accent-rgb) / 0.35);
}
.kroki-panel .border-t {
  border-top-color: rgb(var(--accent-rgb) / 0.35);
}
.kroki-panel canvas {
  background: #fff;
}
</style>
