<template>
  <div class="relative w-full h-full">
    <div ref="mapContainerRef" class="w-full h-full"></div>

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
        accept=".kml,.kmz"
        @change="onKmlChange"
      />
      <button
        @click="kmlInput?.click()"
        class="px-3 py-1.5 rounded-lg shadow-md text-sm font-medium bg-accent text-white hover:brightness-110 transition"
        title="آپلود فایل KML / KMZ"
      >
        <i class="fas fa-file-upload ml-1"></i>
        آپلود KML
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
    <MapSearchBox :map="mapProxy" v-model:open="searchOpen" />

    <!-- فرم ذخیره ترسیم -->
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

        <label class="block mb-1 text-xs text-[var(--text-muted)]">نام ترسیم *</label>
        <input
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

        <div class="text-[11px] text-[var(--text-muted)] space-y-1 mb-3 bg-[var(--surface2)] rounded p-2">
          <div class="flex justify-between">
            <span>تعداد نقاط</span><span class="font-semibold text-[var(--text)]">{{ drawing.livePointCount }}</span>
          </div>
          <div class="flex justify-between">
            <span>طول کل</span><span class="font-semibold text-[var(--text)]">{{ drawing.liveTotalLength }}</span>
          </div>
          <div v-if="drawing.drawMode === 'polygon'" class="flex justify-between">
            <span>مساحت</span><span class="font-semibold text-[var(--text)]">{{ drawing.liveArea }}</span>
          </div>
          <div v-if="drawing.drawMode === 'circle'" class="flex justify-between">
            <span>شعاع</span><span class="font-semibold text-[var(--text)]">{{ drawing.liveRadius }}</span>
          </div>
        </div>

        <div class="text-[10px] text-[var(--text-faint)] mb-2 leading-5">
          کلیک: افزودن نقطه | Delete: حذف آخرین | Enter: پایان و ذخیره
        </div>

        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost btn-xs" @click="drawing.cancelForm()">لغو</button>
          <button
            class="btn btn-primary btn-xs"
            :disabled="!drawing.formData.name.trim() || (!drawing.isSaveEnabled && !drawing.canFinishDrawing)"
            @click="drawing.handleSave()"
          >
            <i class="fas fa-save ml-1"></i>
            ذخیره
          </button>
        </div>
      </div>
    </Transition>

    <Loading :active="loading" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from "vue";
import mapboxgl from "mapbox-gl";
import DrawToolbar from "./DrawToolbar.vue";
import MapSearchBox from "./MapSearchBox.vue";
import Loading from "./Loading.vue";
import { useDrawing } from "../composables/useDrawing";
import { kmlToGeoJSON, parseKMLCoords, readKmlText } from "../utils/kml";
import { registerLayersForSource, bringDrawingsToFront } from "../utils/layerOrder";
import { renderPinOnMap } from "../utils/pinRenderer";

const props = defineProps({
  pins: { type: Object, required: true },
});

const emit = defineEmits(["mapReady", "openKroki", "addPins"]);

const mapContainerRef = ref(null);
const kmlInput = ref(null);
const loading = ref(false);

let map = null;
const mapProxy = ref(null);
const searchOpen = ref(false);
const drawing = ref(null);

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
  registerLayersForSource(map, sourceId);

  const bounds = new mapboxgl.LngLatBounds();
  const addCoords = (coords) => {
    if (typeof coords[0] === "number") {
      bounds.extend(coords);
    } else {
      coords.forEach(addCoords);
    }
  };
  geojson.features.forEach((f) => addCoords(f.geometry.coordinates));

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 50, duration: 2000 });
  }
}

async function onKmlChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  loading.value = true;
  try {
    const url = URL.createObjectURL(file);
    const response = await fetch(url);
    const blob = await response.blob();
    URL.revokeObjectURL(url);

    const text = await readKmlText(blob, file.name);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    const geojson = kmlToGeoJSON(doc);

    if (!geojson.features.length) {
      alert("هیچ هندسه‌ای در فایل KML پیدا نشد.");
      return;
    }

    let added = 0;
    for (const feature of geojson.features) {
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
          positions = ring.map((c) => ({ lon: c[0], lat: c[1], height: 0 }));
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
        addGeoJSONSourceAndLayers(
          sourceId,
          { type: "FeatureCollection", features: [feature] },
          pin,
        );
        props.pins.push(pin);
        added++;
      }
    }

    if (!added) {
      alert("هیچ خط یا پلی‌گانی در فایل KML پیدا نشد.");
      return;
    }
  } catch (error) {
    console.error("خطا در بارگذاری فایل KML:", error);
    alert("خطا در بارگذاری فایل KML");
  } finally {
    loading.value = false;
  }
}

function initMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

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
    pitch: 0,
    bearing: 0,
    maxPitch: 0,
    dragRotate: false,
    pitchWithRotate: true,
    touchPitch: false,
    attributionControl: false,
    preserveDrawingBuffer: true,
  });

  map.on("load", () => {
    mapProxy.value = map;
    drawing.value = reactive(useDrawing(map, props.pins));
    for (const p of props.pins || []) {
      if (p.shape && p.shape.type && p.type === "draw") {
        renderPinOnMap(map, p);
      }
    }
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
  if (map) {
    map.remove();
    map = null;
  }
});

defineExpose({ map: () => map, drawing: () => drawing.value });
</script>
