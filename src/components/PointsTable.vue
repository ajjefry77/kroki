<template>
  <div class="flex flex-col">
    <div class="px-4 py-3 border-b border-[var(--border)]">
      <h2 class="text-sm font-semibold flex items-center gap-2">
        <i class="fas fa-table-cells text-[var(--accent)]"></i>
        جدول نقاط
      </h2>
      <p class="text-[10px] text-[var(--text-muted)] mt-1 leading-5">
        نقاط ترسیم انتخاب‌شده (دستی، فایل KML یا CSV) را اینجا مشاهده و ویرایش کنید.
      </p>
    </div>

    <div class="p-3 space-y-4">
      <!-- ترسیم در حال انجام -->
      <div v-if="draftRows.length && !isEditingExisting" class="card !rounded-xl !p-3 ring-1 ring-[var(--accent)]/50">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold flex items-center gap-1.5">
            <i class="fas fa-pen-nib text-[var(--accent)] animate-pulse"></i>
            {{ draftTitle }}
            <span class="text-[10px] font-normal text-[var(--text-muted)]">(در حال ترسیم)</span>
          </div>
          <span class="text-[10px] text-[var(--text-muted)]">{{ draftRows.length }} نقطه</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-[11px]">
            <thead>
              <tr class="text-[var(--text-muted)]">
                <th class="text-center w-6">#</th>
                <th class="text-center min-w-[80px]">X (UTM)</th>
                <th class="text-center min-w-[80px]">Y (UTM)</th>
                <th class="text-center min-w-[56px]">Zone</th>
                <th class="w-6"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pt, i) in draftRows" :key="i">
                <td class="text-center text-[var(--text-faint)]">{{ i + 1 }}</td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.x"
                    @change="updateDraftPoint(i, 'utmX', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.y"
                    @change="updateDraftPoint(i, 'utmY', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.zone"
                    @change="updateDraftPoint(i, 'utmZone', $event.target.value)"
                  />
                </td>
                <td class="text-center">
                  <button
                    class="text-gray-500 hover:text-[var(--danger)] px-1"
                    title="حذف نقطه"
                    :disabled="draftRows.length <= draftMinPoints"
                    @click="removeDraftPoint(i)"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button class="btn btn-ghost btn-xs w-full mt-2" @click="addDraftOnMap">
          <i class="fas ml-1" :class="isPlacing ? 'fa-ban' : 'fa-plus'"></i>
          {{ isPlacing ? "لغو افزودن نقطه" : "افزودن نقطه با کلیک روی نقشه" }}
        </button>
        <p v-if="isPlacing" class="text-[10px] text-[var(--accent)] mt-1.5 leading-4">
          <i class="fas fa-crosshairs ml-1"></i>
          روی نقشه کلیک کنید تا نقطه اضافه شود (راست‌کلیک یا Esc برای لغو)
        </p>
        <p v-else class="text-[9px] text-[var(--text-faint)] mt-1.5 leading-4">
          با ویرایش مختصات در جدول، نقطه‌ها بلافاصله روی نقشه به‌روزرسانی می‌شوند.
        </p>
      </div>

      <!-- ویرایش نقاط ترسیم فعال -->
      <div v-if="activePin && pointRows.length && !isDrawingFresh" class="card !rounded-xl !p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold truncate">
            <i class="fas fa-pen-to-square text-[var(--accent)] ml-1"></i>
            {{ activePin.name || 'ترسیم بدون نام' }}
          </div>
          <span class="text-[10px] text-[var(--text-muted)]">{{ pointRows.length }} نقطه</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-[11px]">
            <thead>
              <tr class="text-[var(--text-muted)]">
                <th class="text-center w-6">#</th>
                <th class="text-center min-w-[80px]">X (UTM)</th>
                <th class="text-center min-w-[80px]">Y (UTM)</th>
                <th class="text-center min-w-[56px]">Zone</th>
                <th class="w-6"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pt, i) in pointRows" :key="i">
                <td class="text-center text-[var(--text-faint)]">{{ i + 1 }}</td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.x"
                    @change="updatePoint(i, 'utmX', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.y"
                    @change="updatePoint(i, 'utmY', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="input w-full !py-1.5 !px-1.5 !text-[13px] text-center"
                    dir="ltr"
                    :value="pt.zone"
                    @change="updatePoint(i, 'utmZone', $event.target.value)"
                  />
                </td>
                <td class="text-center">
                  <button
                    class="text-gray-500 hover:text-[var(--danger)] px-1"
                    title="حذف نقطه"
                    :disabled="pointRows.length <= (activePin.shape.type === 'polygon' ? 3 : 2)"
                    @click="removePoint(i)"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button class="btn btn-ghost btn-xs w-full mt-2" @click="addActiveOnMap">
          <i class="fas ml-1" :class="isPlacing ? 'fa-ban' : 'fa-plus'"></i>
          {{ isPlacing ? "لغو افزودن نقطه" : "افزودن نقطه با کلیک روی نقشه" }}
        </button>
        <p v-if="isPlacing" class="text-[10px] text-[var(--accent)] mt-1.5 leading-4">
          <i class="fas fa-crosshairs ml-1"></i>
          روی نقشه کلیک کنید تا نقطه اضافه شود (راست‌کلیک یا Esc برای لغو)
        </p>
      </div>

      <div v-else-if="activePin && !isDrawingFresh" class="card !rounded-xl !p-3 text-[11px] text-[var(--text-muted)]">
        این ترسیم نقطه قابل ویرایش ندارد.
      </div>

      <!-- ساخت ترسیم جدید با نقاط دستی / CSV -->
      <div class="card !rounded-xl !p-3">
        <button type="button" class="w-full flex items-center justify-between" @click="builderOpen = !builderOpen">
          <div class="text-xs font-semibold flex items-center gap-2">
            <i class="fas fa-file-csv text-[var(--accent)]"></i>
            ترسیم جدید با نقاط (دستی / CSV)
          </div>
          <i class="fas text-[10px] text-[var(--text-muted)]" :class="builderOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>

        <div v-if="builderOpen" class="mt-3 space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block mb-1 text-[10px] font-medium">نام ترسیم</label>
              <input v-model="builderName" type="text" class="input !py-1.5 !text-[11px]" placeholder="مثلاً حد شمالی" />
            </div>
            <div>
              <label class="block mb-1 text-[10px] font-medium">نوع</label>
              <select v-model="builderType" class="input !py-1.5 !text-[11px]">
                <option value="polygon">پلی‌گان (بسته)</option>
                <option value="polyline">خط</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-[11px]">
              <thead>
                <tr class="text-[var(--text-muted)]">
                <th class="text-center w-6">#</th>
                <th class="text-center min-w-[80px]">X (UTM)</th>
                <th class="text-center min-w-[80px]">Y (UTM)</th>
                <th class="text-center min-w-[56px]">Zone</th>
                <th class="w-6"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(pt, i) in builderPoints" :key="i">
                  <td class="text-center text-[var(--text-faint)]">{{ i + 1 }}</td>
                  <td>
                    <input v-model="pt.utmX" type="number" step="any" dir="ltr" class="input w-full !py-1.5 !text-[13px] text-center" placeholder="569000" @input="syncBuilderUtm(i)" />
                  </td>
                  <td>
                    <input v-model="pt.utmY" type="number" step="any" dir="ltr" class="input w-full !py-1.5 !text-[13px] text-center" placeholder="3958000" @input="syncBuilderUtm(i)" />
                  </td>
                  <td>
                    <input v-model="pt.utmZone" type="number" dir="ltr" class="input w-full !py-1.5 !text-[13px] text-center" placeholder="39" @input="syncBuilderUtm(i)" />
                  </td>
                  <td class="text-center">
                    <button class="text-gray-500 hover:text-[var(--danger)] px-1" @click="builderPoints.splice(i, 1)">
                      <i class="fas fa-times"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-ghost btn-xs flex-1" @click="builderPoints.push({ lat: '', lon: '', utmX: '', utmY: '', utmZone: '' })">
              <i class="fas fa-plus ml-1"></i> افزودن ردیف
            </button>
            <button class="btn btn-ghost btn-xs flex-1" :disabled="csvLoading" @click="csvInput?.click()">
              <i class="fas ml-1" :class="csvLoading ? 'fa-circle-notch fa-spin' : 'fa-file-import'"></i>
              {{ csvLoading ? "در حال خواندن..." : "Import CSV" }}
            </button>
            <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" @change="onCsvChange" />
          </div>
          <p class="text-[9px] text-[var(--text-faint)] leading-4">
            پس از انتخاب فایل، پنل «انتخاب ستون‌ها» باز می‌شود؛ Lat/Lon یا UTM و در صورت نیاز فیلدهای GPS (HRMS، PDOP و …) را مشخص کنید.
          </p>

          <button class="btn btn-primary btn-xs w-full" :disabled="!canCreate" @click="createShape">
            <i class="fas fa-check ml-1"></i>
            ایجاد ترسیم روی نقشه
          </button>
        </div>
      </div>
    </div>

    <CsvImportModal ref="csvModalRef" @confirm="onCsvImportConfirm" @cancel="onCsvImportCancel" />

    <Teleport to="body">
      <div
        v-if="csvLoading"
        class="fixed inset-0 z-[1990] flex items-center justify-center bg-black/40 pointer-events-none"
      >
        <div class="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-5 py-4 shadow-2xl flex items-center gap-3 text-sm font-medium">
          <i class="fas fa-circle-notch fa-spin text-[var(--accent)]"></i>
          در حال خواندن فایل CSV...
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { renderPinOnMap, updatePinGeometry } from "../utils/pinRenderer";
import { toUTM, fromUTM } from "../utils/useDrawingHelpers";
import { logger } from "../utils/logger";
import CsvImportModal from "./CsvImportModal.vue";

const props = defineProps({
  pins: { type: Object, required: true },
  activePinId: { type: [String, null], default: null },
  drawing: { type: Object, default: null },
  map: { type: Object, default: null },
});

const emit = defineEmits(["select", "created"]);

function flatten(list) {
  const out = [];
  for (const p of list || []) {
    if (p.type === "group" && Array.isArray(p.children)) out.push(...flatten(p.children));
    else out.push(p);
  }
  return out;
}

function utmFieldsOf(p) {
  const lat = parseFloat(p?.lat);
  const lon = parseFloat(p?.lon ?? p?.lng);
  if (isNaN(lat) || isNaN(lon)) return { x: "", y: "", zone: "" };
  const { x, y, zone } = toUTM(lon, lat);
  return { x: x.toFixed(2), y: y.toFixed(2), zone };
}

function applyUtmEdit(row, key, value) {
  if (!row || isNaN(parseFloat(value))) return null;
  const x = parseFloat(key === "utmX" ? value : row.x);
  const y = parseFloat(key === "utmY" ? value : row.y);
  const zone = parseInt(key === "utmZone" ? value : row.zone, 10);
  if (isNaN(x) || isNaN(y) || isNaN(zone) || zone < 1 || zone > 60) return null;
  const { lng, lat } = fromUTM(x, y, zone, true);
  return { lat, lon: lng };
}

const activePin = computed(() => flatten(props.pins).find((p) => p.id === props.activePinId) || null);

// فقط یک جدول نقاط در هر لحظه نمایش داده می‌شود: هنگام ترسیم تازه، جدول «در حال
// ترسیم»؛ هنگام ویرایش یک ترسیم موجود، جدول نقاط همان ترسیم (با نام آن). در
// هر دو حالت جدول دیگر مخفی می‌ماند تا دو جدول هم‌زمان دیده نشوند.
const isEditingExisting = computed(() => {
  const d = props.drawing;
  return !!(d && d.editingPin?.());
});
const isDrawingFresh = computed(() => {
  const d = props.drawing;
  return !!(d && d.drawMode && !d.editingPin?.());
});

const pointRows = computed(() => {
  const s = activePin.value?.shape;
  if (!s) return [];
  if (s.type === "point") return [{ lat: s.lat, lon: s.lon, ...utmFieldsOf(s) }];
  if (Array.isArray(s.positions)) return s.positions.map((p) => ({ lat: p.lat, lon: p.lon, ...utmFieldsOf(p) }));
  return [];
});

function updatePoint(i, key, value) {
  const s = activePin.value?.shape;
  if (!s) return;
  const row = pointRows.value[i];
  if (!row) return;
  if (key === "utmX" || key === "utmY" || key === "utmZone") {
    const ll = applyUtmEdit(row, key, value);
    if (!ll) return;
    if (s.type === "point") {
      s.lat = ll.lat;
      s.lon = ll.lon;
    } else if (Array.isArray(s.positions) && s.positions[i]) {
      s.positions[i].lat = ll.lat;
      s.positions[i].lon = ll.lon;
    }
    updatePinGeometry(props.map, activePin.value);
    syncEditMap();
    logger.info("draw", "ویرایش دستی مختصات UTM", { pin: activePin.value.name, index: i, key, value });
    return;
  }
  const num = parseFloat(value);
  if (isNaN(num)) return;
  if (s.type === "point") {
    s[key] = num;
  } else if (Array.isArray(s.positions) && s.positions[i]) {
    s.positions[i][key] = num;
  }
  updatePinGeometry(props.map, activePin.value);
  syncEditMap();
  logger.info("draw", "ویرایش دستی مختصات نقطه", { pin: activePin.value.name, index: i, key, value: num });
}

function removePoint(i) {
  if (isEditingExisting.value && props.drawing?.removeDraftPoint) {
    props.drawing.removeDraftPoint(i);
    return;
  }
  const s = activePin.value?.shape;
  if (!s || !Array.isArray(s.positions)) return;
  const minPts = s.type === "polygon" ? 3 : 2;
  if (s.positions.length <= minPts) return;
  s.positions.splice(i, 1);
  updatePinGeometry(props.map, activePin.value);
  syncEditMap();
}

function addPointToActive() {
  const s = activePin.value?.shape;
  if (!s || !Array.isArray(s.positions) || !s.positions.length) return;
  const last = s.positions[s.positions.length - 1];
  const prev = s.positions.length > 1 ? s.positions[s.positions.length - 2] : last;
  const dLat = (last.lat - prev.lat) || 0.0002;
  const dLon = (last.lon - prev.lon) || 0.0002;
  s.positions.push({ lat: last.lat + dLat, lon: last.lon + dLon, height: 0 });
  updatePinGeometry(props.map, activePin.value);
  syncEditMap();
}

const isPlacing = computed(() => !!props.drawing?.placingPoint?.value);

function syncEditMap() {
  if (isEditingExisting.value) props.drawing?.renderDraftLayers?.();
}

function addDraftOnMap() {
  const d = props.drawing;
  if (isPlacing.value) {
    d?.disarmAddPoint?.();
    return;
  }
  if (d?.armAddPoint?.()) return;
  if (draftRows.value.length) addDraftPoint();
}

function addActiveOnMap() {
  const d = props.drawing;
  if (isPlacing.value) {
    d?.disarmAddPoint?.();
    return;
  }
  if (d?.armAddPoint?.()) return;
  addPointToActive();
}

onUnmounted(() => {
  props.drawing?.disarmAddPoint?.();
});

/* -------- ساخت ترسیم جدید با نقاط دستی / CSV -------- */
const builderOpen = ref(false);
const builderName = ref("");
const builderType = ref("polygon");
const builderPoints = ref([
  { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
  { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
  { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
]);
const csvInput = ref(null);

const csvModalRef = ref(null);

const canCreate = computed(() => {
  const valid = builderPoints.value.filter((p) => {
    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lon);
    const x = parseFloat(p.utmX);
    const y = parseFloat(p.utmY);
    const z = parseInt(p.utmZone, 10);
    return (!isNaN(lat) && !isNaN(lon)) || (!isNaN(x) && !isNaN(y) && !isNaN(z));
  });
  const minPts = builderType.value === "polygon" ? 3 : 2;
  return valid.length >= minPts;
});

function syncBuilderUtm(i) {
  const pt = builderPoints.value[i];
  if (!pt) return;
  const x = parseFloat(pt.utmX);
  const y = parseFloat(pt.utmY);
  const z = parseInt(pt.utmZone, 10);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return;
  const { lng, lat } = fromUTM(x, y, z, true);
  pt.lat = lat.toFixed(6);
  pt.lon = lng.toFixed(6);
}

function onCsvChange(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  importCsvFile(file);
}

const csvLoading = ref(false);

async function importCsvFile(file, onDone) {
  if (!file || csvLoading.value) {
    onDone?.();
    return false;
  }
  csvLoading.value = true;
  try {
    const ok = await csvModalRef.value?.loadFile(file);
    if (!ok) alert("نقطه معتبری در فایل CSV پیدا نشد یا فایل خالی است.");
    else logger.info("draw", "باز شدن پنل Import CSV", { file: file.name });
  } catch {
    alert("خطا در خواندن فایل CSV");
  } finally {
    csvLoading.value = false;
    onDone?.();
  }
  return true;
}

defineExpose({ importCsvFile });

function onCsvImportCancel() {
  csvLoading.value = false;
}

function onCsvImportConfirm({ points, shapeType, name, invalidRows }) {
  const positions = points.map((r) => ({
    lat: Number(r.lat),
    lon: Number(r.lon),
    height: 0,
    ...(r.gps && Object.values(r.gps).some(Boolean) ? { gps: r.gps } : {}),
  }));
  const defaultName = shapeType === "polygon" ? "پلی‌گان CSV" : "خط CSV";
  const pin = {
    id: crypto.randomUUID(),
    name: name || builderName.value.trim() || defaultName,
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
  props.pins.push(pin);
  if (props.map) renderPinOnMap(props.map, pin);
  emit("created", pin, { edit: false });
  if (invalidRows?.length) {
    logger.warn("draw", "ردیف‌های نامعتبر CSV نادیده گرفته شد", { count: invalidRows.length });
  }
  logger.info("draw", "ایجاد ترسیم از CSV", {
    name: pin.name,
    type: shapeType,
    points: positions.length,
  });
}

/* -------- ویرایش نقاط ترسیم در حال انجام -------- */
const draftRows = computed(() => {
  const d = props.drawing;
  if (!d) return [];
  return (d.livePoints || []).map((p) => ({
    lat: Number(p.lat),
    lon: Number(p.lon),
    ...utmFieldsOf(p),
  }));
});

const draftMinPoints = computed(() => {
  const d = props.drawing;
  if (!d) return 2;
  const t = d.shape?.type || d.drawMode;
  return t === "polygon" || t === "rectangle" ? 3 : t === "multi_point" ? 1 : 2;
});

const draftTitle = computed(() => {
  const d = props.drawing;
  if (!d) return "ترسیم";
  if (d.shape) {
    const map = {
      polygon: "پلی‌گان",
      polyline: "خط",
      point: "نقطه",
      multi_point: "چند نقطه",
      rectangle: "مستطیل",
    };
    return (d.shape.name || map[d.shape.type]) || "ترسیم";
  }
  const map = {
    polygon: "پلی‌گان",
    polyline: "خط",
    multi_point: "چند نقطه",
    rectangle: "مستطیل",
    measure: "اندازه‌گیری",
  };
  return map[d.drawMode] || "ترسیم";
});

function updateDraftPoint(i, key, value) {
  if (key === "utmX" || key === "utmY" || key === "utmZone") {
    const row = draftRows.value[i];
    if (!row) return;
    const ll = applyUtmEdit(row, key, value);
    if (!ll) return;
    props.drawing?.updateDraftPoint?.(i, "lat", String(ll.lat));
    props.drawing?.updateDraftPoint?.(i, "lon", String(ll.lon));
    logger.info("draw", "ویرایش مختصات UTM نقطه در حال ترسیم از جدول", { index: i, key, value });
    return;
  }
  props.drawing?.updateDraftPoint?.(i, key, value);
  logger.info("draw", "ویرایش نقطه در حال ترسیم از جدول", { index: i, key, value });
}

function removeDraftPoint(i) {
  props.drawing?.removeDraftPoint?.(i);
  logger.info("draw", "حذف نقطه در حال ترسیم از جدول", { index: i });
}

function addDraftPoint() {
  props.drawing?.addDraftPoint?.();
}

function createShape() {
  if (!canCreate.value) return;
  const positions = builderPoints.value
    .map((p) => {
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
      const x = parseFloat(p.utmX);
      const y = parseFloat(p.utmY);
      const z = parseInt(p.utmZone, 10);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        const { lng, lat: la } = fromUTM(x, y, z, true);
        return { lat: la, lon: lng };
      }
      return null;
    })
    .filter(Boolean)
    .map((p) => ({ lat: p.lat, lon: p.lon, height: 0 }));

  const pin = {
    id: crypto.randomUUID(),
    name: builderName.value || (builderType.value === "polygon" ? "پلی‌گان دستی" : "خط دستی"),
    date: new Date(),
    save: -1,
    type: "draw",
    selected: true,
    shape: {
      type: builderType.value,
      positions,
      color: "#ff0000",
      outlineColor: "#ff0000",
      opacity: 0.7,
      width: 3,
      show: true,
    },
  };

  props.pins.push(pin);
  if (props.map) renderPinOnMap(props.map, pin);

  builderName.value = "";
  builderPoints.value = [
    { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
    { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
    { lat: "", lon: "", utmX: "", utmY: "", utmZone: "" },
  ];
  builderOpen.value = false;
  emit("created", pin);
  logger.info("draw", "ایجاد ترسیم با نقاط دستی/CSV", { name: pin.name, points: positions.length });
}
</script>
