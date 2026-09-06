<template>
  <div class="relative w-full h-full">
    <div ref="mapContainerRef" class="w-full h-full"></div>

    <!-- هشدار عدم پشتیبانی WebGL -->
    <div v-if="initError" class="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg)]">
      <div class="card !rounded-2xl max-w-sm w-full mx-4 text-center">
        <div class="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--danger-glow)]">
          <i class="fas fa-triangle-exclamation text-2xl text-[var(--danger)]"></i>
        </div>
        <h3 class="font-bold text-sm mb-2">خطا در راه‌اندازی نقشه</h3>
        <p class="text-xs text-[var(--text-muted)] mb-5 leading-6">{{ initError }}</p>
        <button class="btn btn-primary w-full" @click="$emit('home')">
          <i class="fas fa-house ml-1"></i> بازگشت به صفحه اصلی
        </button>
      </div>
    </div>

    <!-- هشدار حالت ترسیم -->
    <div
      v-if="drawing?.drawMode && drawing.drawMode !== 'measure'"
      class="absolute top-3 right-1/2 translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-lg z-[600] flex items-center gap-2 pointer-events-none"
    >
      <i class="fas fa-pen animate-pulse"></i>
      <span class="text-sm font-medium whitespace-nowrap">
        {{ drawHint }}
      </span>
    </div>

    <!-- نوار بالا: آپلود KML -->
    <div class="absolute top-3 right-3 z-40 flex items-center gap-2">
      <input
        ref="kmlInput"
        type="file"
        class="hidden"
        accept=".kml,.kmz,.csv,text/csv"
        @change="onKmlChange"
      />
      <button
        @click="kmlInput?.click()"
        class="px-3 py-1.5 rounded-lg shadow-md text-sm font-medium bg-accent text-white hover:brightness-110 transition"
        title="آپلود فایل KML / KMZ / CSV"
      >
        <i class="fas fa-file-upload ml-1"></i>
        آپلود KML / CSV
      </button>
    </div>

    <!-- تولبار ابزار ترسیم -->
    <DrawToolbar
      ref="toolbarComponent"
      :map="map"
      :drawMode="drawing?.drawMode || ''"
      :searchActive="searchOpen"
      @toggleMeasure="drawing.toggleMeasure()"
      @setDrawMode="drawing.setDrawMode($event)"
      @openKroki="$emit('openKroki')"
      @toggleSearch="searchOpen = !searchOpen"
    />

    <!-- جستجوی آدرس / مختصات -->
    <MapSearchBox :map="mapProxy" :drawing="drawing" v-model:open="searchOpen" />

    <!-- فرم ذخیره ترسیم (پس از پایان ترسیم با Enter نمایش داده می‌شود) -->
    <Transition name="modal">
      <div
        v-if="drawing?.showForm"
        class="absolute top-16 right-3 z-40 w-72 rounded-lg shadow-xl border border-[var(--border-strong)] p-3 bg-[var(--surface)]"
        @click.stop
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold">{{ drawing.getDrawTypeName() }}</span>
          <button class="text-gray-500 hover:text-gray-300 text-lg leading-none" @click="drawing.cancelForm()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="text-[11px] text-[var(--text-muted)] space-y-1 mb-3 bg-[var(--surface2)] rounded p-2">
          <div class="flex justify-between">
            <span>تعداد نقاط</span><span class="font-semibold text-[var(--text)]">{{ drawing.livePointCount }}</span>
          </div>
          <div class="flex justify-between">
            <span>طول کل</span><span class="font-semibold text-[var(--text)]">{{ drawing.liveTotalLength }}</span>
          </div>
          <div v-if="drawing.drawMode === 'polygon' || drawing.shape?.type === 'polygon'" class="flex justify-between">
            <span>مساحت کل</span><span class="font-semibold text-[var(--accent)]">{{ drawing.liveArea }}</span>
          </div>
        </div>

        <label class="block mb-1 text-xs text-[var(--text-muted)]">نام ترسیم *</label>
        <input
          ref="nameInputRef"
          v-model="drawing.formData.name"
          type="text"
          class="input !py-1.5 text-xs mb-2"
          placeholder="مثلاً زمین ملک"
          :class="{ '!border-red-500': drawing.nameError }"
        />
        <label class="block mb-1 text-xs text-[var(--text-muted)]">توضیحات</label>
        <textarea
          v-model="drawing.formData.description"
          rows="2"
          class="input !py-1.5 text-xs mb-2 resize-none"
          placeholder="توضیح اختیاری"
        ></textarea>

        <div class="text-[10px] text-[var(--text-faint)] mb-2 leading-5">
          برای جابه‌جایی: نقاط (رأس) یا مرکز (کل شکل) را روی نقشه درگ کنید.
        </div>

        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost btn-xs" @click="drawing.cancelForm()">لغو</button>
          <button
            class="btn btn-primary btn-xs"
            :disabled="!drawing.formData.name.trim()"
            @click="drawing.handleSave()"
          >
            <i class="fas fa-save ml-1"></i>
            ذخیره
          </button>
        </div>
      </div>
    </Transition>

    <!-- نمایشگر مختصات مکان‌نما و زوم -->
    <div class="absolute bottom-3 left-3 z-40 px-3 py-1.5 rounded-md bg-black/55 text-white text-[11px] font-medium flex items-center gap-3 pointer-events-none select-none" dir="ltr">
      <span v-if="hud.lng !== null" class="tracking-tight">
        <i class="fas fa-location-crosshairs ml-1 text-[10px]"></i>{{ hud.lng.toFixed(6) }}, {{ hud.lat.toFixed(6) }}
      </span>
      <span v-else>—</span>
      <span class="w-px h-3 bg-white/30"></span>
      <span class="flex items-center gap-1">
        <i class="fas fa-magnifying-glass-plus text-[10px]"></i>
        زوم: {{ hud.zoom.toFixed(1) }}
      </span>
    </div>

    <Loading
      :active="loading"
      :title="loadingTitle"
      :message="loadingMessage"
      :progress="loadingProgress"
      :progress-label="loadingProgressLabel"
      :cancellable="loadingCancellable"
      @cancel="cancelKmlLoad"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, reactive, watch } from "vue";
import mapboxgl from "mapbox-gl";
import DrawToolbar from "./DrawToolbar.vue";
import MapSearchBox from "./MapSearchBox.vue";
import Loading from "./Loading.vue";
import { useDrawing } from "../composables/useDrawing";
import { kmlToGeoJSON, readKmlText } from "../utils/kml";
import { registerDrawLayer, bringDrawingsToFront } from "../utils/layerOrder";
import { renderPinOnMap } from "../utils/pinRenderer";

const props = defineProps({
  pins: { type: Object, required: true },
});

const emit = defineEmits(["mapReady", "openKroki", "addPins", "editPin", "csvFile"]);

const mapContainerRef = ref(null);
const kmlInput = ref(null);
const loading = ref(false);
const loadingTitle = ref("در حال بارگذاری فایل KML...");
const loadingMessage = ref("");
const loadingProgress = ref(null);
const loadingProgressLabel = ref("");
const loadingCancellable = ref(false);
const initError = ref(null);
let kmlCancelRequested = false;
let csvOverlayOn = false;

let map = null;
const mapProxy = ref(null);
const searchOpen = ref(false);
const drawing = ref(null);
const nameInputRef = ref(null);

const hud = reactive({ lng: null, lat: null, zoom: 5 });

watch(
  () => drawing.value?.showForm,
  (vis) => {
    if (vis) {
      nextTick(() => nameInputRef.value?.focus());
    }
  },
);

const drawHint = computed(() => {
  const mode = drawing.value?.drawMode;
  if (mode === "polygon") return "در حال ترسیم پلی‌گان... (Enter: پایان | کلیک راست: حذف آخرین نقطه)";
  if (mode === "polyline") return "در حال ترسیم خط... (Enter: پایان | کلیک راست: حذف آخرین نقطه)";
  if (mode === "multi_point") return "در حال افزودن چند نقطه... (Enter: پایان)";
  if (mode === "circle") return "در حال ترسیم دایره... (کلیک اول مرکز، کلیک دوم شعاع)";
  return "";
});

function addGeoJSONSourceAndLayers(sourceId, geojson, pin) {
  map.addSource(sourceId, { type: "geojson", data: geojson });

  map.addLayer({
    id: sourceId + "-fill",
    type: "fill",
    source: sourceId,
    paint: { "fill-color": "#ff0000", "fill-opacity": 0.3 },
    filter: ["==", "$type", "Polygon"],
  });

  map.addLayer({
    id: sourceId + "-line",
    type: "line",
    source: sourceId,
    paint: { "line-color": "#ff0000", "line-width": 2 },
    filter: ["in", "$type", "LineString", "Polygon"],
  });

  map.addLayer({
    id: sourceId + "-point",
    type: "circle",
    source: sourceId,
    paint: { "circle-radius": 6, "circle-color": "#ff0000" },
    filter: ["==", "$type", "Point"],
  });

  pin.shape._sourceIds = [sourceId];
  registerDrawLayer(sourceId + "-fill");
  registerDrawLayer(sourceId + "-line");
  registerDrawLayer(sourceId + "-point");
}

function kmlExtendBounds(bounds, coords) {
  if (typeof coords[0] === "number") {
    bounds.extend(coords);
  } else {
    coords.forEach((c) => kmlExtendBounds(bounds, c));
  }
}

function cancelKmlLoad() {
  kmlCancelRequested = true;
  loadingCancellable.value = false;
  loadingMessage.value = "در حال لغو...";
}

function setCsvLoading(on) {
  if (on) {
    loadingTitle.value = "در حال خواندن فایل CSV...";
    loadingMessage.value = "لطفاً صبر کنید";
    loadingProgress.value = null;
    loadingProgressLabel.value = "";
    loadingCancellable.value = false;
    csvOverlayOn = true;
    loading.value = true;
    return;
  }
  if (!csvOverlayOn) return;
  csvOverlayOn = false;
  loading.value = false;
}

function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}

async function onKmlChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  if (/\.csv$/i.test(file.name)) {
    setCsvLoading(true);
    emit("csvFile", file);
    return;
  }
  kmlCancelRequested = false;
  loadingTitle.value = "در حال بارگذاری فایل KML...";
  loadingMessage.value = "خواندن و استخراج داده‌های فایل...";
  loadingProgress.value = null;
  loadingProgressLabel.value = "";
  loadingCancellable.value = true;
  loading.value = true;
  const bounds = new mapboxgl.LngLatBounds();
  try {
    const text = await readKmlText(file, file.name);
    if (kmlCancelRequested) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    if (kmlCancelRequested) return;
    const geojson = kmlToGeoJSON(doc);
    if (kmlCancelRequested) return;

    if (!geojson.features.length) {
      alert("هیچ هندسه‌ای در فایل KML پیدا نشد.");
      return;
    }

    let added = 0;
    const total = geojson.features.length;
    for (let fi = 0; fi < total; fi++) {
      if (kmlCancelRequested) return;
      const feature = geojson.features[fi];
      const geom = feature.geometry;
      if (!geom) continue;

      const singles = [];
      if (geom.type === "Polygon") singles.push(geom);
      else if (geom.type === "LineString") singles.push(geom);
      else if (geom.type === "MultiPolygon")
        singles.push(
          ...geom.coordinates.map((c) => ({ type: "Polygon", coordinates: c })),
        );
      else if (geom.type === "MultiLineString")
        singles.push(
          ...geom.coordinates.map((c) => ({ type: "LineString", coordinates: c })),
        );

      for (const single of singles) {
        let shapeType, positions;
        if (single.type === "Polygon") {
          const ring = single.coordinates[0];
          if (!ring || ring.length < 3) continue;
          shapeType = "polygon";
          const pts = ring.map((c) => ({ lon: c[0], lat: c[1], height: 0 }));
          if (
            pts.length > 2 &&
            pts[0].lon === pts[pts.length - 1].lon &&
            pts[0].lat === pts[pts.length - 1].lat
          ) {
            pts.pop();
          }
          positions = pts;
        } else {
          if (!single.coordinates || single.coordinates.length < 2) continue;
          shapeType = "polyline";
          positions = single.coordinates.map((c) => ({
            lon: c[0],
            lat: c[1],
            height: 0,
          }));
        }

        const pin = {
          id: crypto.randomUUID(),
          name: feature.properties?.name || file.name,
          date: new Date(),
          save: -1,
          type: "draw",
          selected: true,
          shape: {
            type: shapeType,
            positions,
            color: "#ff0000",
            outlineColor: "#ff0000",
            opacity: 0.7,
            width: 3,
            show: true,
          },
        };

        const sourceId = "file-" + pin.id;
        const feats = [
          {
            ...feature,
            properties: { ...(feature.properties || {}), id: pin.id },
          },
        ];
        addGeoJSONSourceAndLayers(
          sourceId,
          { type: "FeatureCollection", features: feats },
          pin,
        );
        kmlExtendBounds(bounds, single.coordinates);
        props.pins.push(pin);
        added++;
      }

      // هر چند المان به مرورگر فرصت رندر و به‌روزرسانی پیشرفت را بده
      if ((fi & 127) === 0) {
        loadingMessage.value = `در حال افزودن به نقشه... (${added} هندسه)`;
        loadingProgress.value = Math.round((fi / total) * 100);
        loadingProgressLabel.value = `${fi}/${total}`;
        await yieldToUI();
      }
    }

    if (!added) {
      alert("هیچ خط یا پلی‌گانی در فایل KML پیدا نشد.");
      return;
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, duration: 2000 });
    }
  } catch (error) {
    console.error("خطا در بارگذاری فایل KML:", error);
    alert("خطا در بارگذاری فایل KML");
  } finally {
    loading.value = false;
    loadingCancellable.value = false;
  }
}

function findPinByPoint(point) {
  const features = map.queryRenderedFeatures(point);
  const id = features[0]?.properties?.id;
  if (!id) return null;
  const flat = [];
  const walk = (arr) => {
    for (const p of arr || []) {
      if (p.type === "group" && Array.isArray(p.children)) walk(p.children);
      else flat.push(p);
    }
  };
  walk(props.pins);
  return flat.find((p) => p.id === id && p.selected !== false) || null;
}

function onMapHover(e) {
  if (!drawing.value) return;
  if (
    drawing.value.drawMode === "measure" ||
    drawing.value.drawMode === "polygon" ||
    drawing.value.drawMode === "polyline" ||
    drawing.value.drawMode === "multi_point" ||
    drawing.value.drawMode === "circle" ||
    drawing.value.showForm ||
    drawing.value.shape
  ) {
    map.getCanvas().style.cursor = "crosshair";
    return;
  }
  map.getCanvas().style.cursor = findPinByPoint(e.point) ? "pointer" : "";
}

function onMapClick(e) {
  const btn = e.originalEvent?.button;
  if (btn !== undefined && btn !== 0) return;
  const d = drawing.value;
  if (!d) return;
  if (d.shape || d.showForm) return;
  const pin = findPinByPoint(e.point);
  if (pin && pin.shape && (pin.shape.type === "polygon" || pin.shape.type === "polyline")) {
    d.editExistingPin(pin);
    emit("editPin", pin.id);
  }
}

let midPan = null;
let touchPan = null;

function onMidDown(e) {
  if (!map || e.button !== 1) return;
  e.preventDefault();
  midPan = { x: e.clientX, y: e.clientY };
}
function onMidMove(e) {
  if (!midPan || !map) return;
  const dx = e.clientX - midPan.x;
  const dy = e.clientY - midPan.y;
  midPan = { x: e.clientX, y: e.clientY };
  try {
    map.panBy([-dx, -dy], { animate: false });
  } catch (err) {}
}
function onMidUp() {
  midPan = null;
}
function onTouchPanStart(e) {
  if (e.touches.length !== 1) {
    touchPan = null;
    return;
  }
  const t = e.touches[0];
  touchPan = { x: t.clientX, y: t.clientY, id: t.identifier };
}
function onTouchPanMove(e) {
  if (!touchPan || !map || e.touches.length !== 1) return;
  const t = e.touches[0];
  if (t.identifier !== touchPan.id) return;
  e.preventDefault();
  const dx = t.clientX - touchPan.x;
  const dy = t.clientY - touchPan.y;
  touchPan = { x: t.clientX, y: t.clientY, id: t.identifier };
  try {
    map.panBy([-dx, -dy], { animate: false });
  } catch (err) {}
}
function onTouchPanEnd(e) {
  if (!e.touches.length) touchPan = null;
}

function setupCustomPan() {
  const canvas = map.getCanvas();
  canvas.addEventListener("mousedown", onMidDown);
  window.addEventListener("mousemove", onMidMove);
  window.addEventListener("mouseup", onMidUp);
  canvas.addEventListener("touchstart", onTouchPanStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchPanMove, { passive: false });
  canvas.addEventListener("touchend", onTouchPanEnd, { passive: true });
  canvas.addEventListener("touchcancel", onTouchPanEnd, { passive: true });
}

function teardownCustomPan() {
  try {
    const canvas = map?.getCanvas?.();
    if (canvas) {
      canvas.removeEventListener("mousedown", onMidDown);
      canvas.removeEventListener("touchstart", onTouchPanStart);
      canvas.removeEventListener("touchmove", onTouchPanMove);
      canvas.removeEventListener("touchend", onTouchPanEnd);
      canvas.removeEventListener("touchcancel", onTouchPanEnd);
    }
  } catch (e) {}
  window.removeEventListener("mousemove", onMidMove);
  window.removeEventListener("mouseup", onMidUp);
  midPan = null;
  touchPan = null;
}

function initMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  if (!mapboxgl.supported()) {
    initError.value = "مرورگر شما از WebGL پشتیبانی نمی‌کند. لطفاً از مرورگر دیگری استفاده کنید یا تنظیمات گرافیکی سیستم را بررسی کنید.";
    return;
  }

  try {
      map = new mapboxgl.Map({
      container: mapContainerRef.value,
      style: {
        version: 8,
        glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}"],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [51.5, 35.5],
      zoom: 5,
      minZoom: 3,
      maxZoom: 20,
      pitch: 0,
      bearing: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
      maxBounds: [[-180, -85], [180, 85]],
    });
  } catch (e) {
    console.error("خطا در ایجاد نقشه:", e);
    initError.value = "خطا در راه‌اندازی نقشه: " + (e.message || "اطلاعات بیشتر در کنسول مرورگر");
    return;
  }

  map.on("load", () => {
    mapProxy.value = map;
    try {
      if (map.dragPan) map.dragPan.disable();
    } catch (e) {}
    setupCustomPan();
    drawing.value = reactive(useDrawing(map, props.pins));
    for (const p of props.pins || []) {
      if (p.shape && p.shape.type && p.type === "draw") {
        renderPinOnMap(map, p);
      }
    }
    hud.zoom = map.getZoom();
    map.on("mousemove", (e) => {
      hud.lng = e.lngLat?.lng ?? null;
      hud.lat = e.lngLat?.lat ?? null;
    });
    map.on("zoom", () => {
      hud.zoom = map.getZoom();
    });
    map.on("click", onMapClick);
    map.on("mousemove", onMapHover);
    emit("mapReady", { map, drawing: drawing.value });
  });

  map.on("style.load", () => {
    bringDrawingsToFront(map);
  });
}

onMounted(async () => {
  await nextTick();
  initMap();
});

onUnmounted(() => {
  teardownCustomPan();
  if (map) {
    map.remove();
    map = null;
  }
});

defineExpose({ map: () => map, drawing: () => drawing.value, setCsvLoading });
</script>
