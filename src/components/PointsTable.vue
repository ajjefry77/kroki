<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="px-4 py-3 border-b border-[var(--border)]">
      <h2 class="text-sm font-semibold flex items-center gap-2">
        <i class="fas fa-table-cells text-[var(--accent)]"></i>
        جدول نقاط
      </h2>
      <p class="text-[10px] text-[var(--text-muted)] mt-1 leading-5">
        نقاط ترسیم انتخاب‌شده (دستی، فایل KML یا CSV) را اینجا مشاهده و ویرایش کنید.
      </p>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
      <!-- ترسیم در حال انجام -->
      <div v-if="draftRows.length" class="card !rounded-xl !p-3 ring-1 ring-[var(--accent)]/50">
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
                <th class="text-center">عرض (Lat)</th>
                <th class="text-center">طول (Lon)</th>
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
                    class="input !py-1 !text-[11px] text-center"
                    dir="ltr"
                    :value="pt.lat"
                    @change="updateDraftPoint(i, 'lat', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input !py-1 !text-[11px] text-center"
                    dir="ltr"
                    :value="pt.lon"
                    @change="updateDraftPoint(i, 'lon', $event.target.value)"
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

        <button class="btn btn-ghost btn-xs w-full mt-2" @click="addDraftPoint">
          <i class="fas fa-plus ml-1"></i>
          افزودن نقطه به این ترسیم
        </button>
        <p class="text-[9px] text-[var(--text-faint)] mt-1.5 leading-4">
          با ویرایش مختصات در جدول، نقطه‌ها بلافاصله روی نقشه به‌روزرسانی می‌شوند.
        </p>
      </div>

      <!-- ویرایش نقاط ترسیم فعال -->
      <div v-if="activePin && pointRows.length" class="card !rounded-xl !p-3">
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
                <th class="text-center">عرض (Lat)</th>
                <th class="text-center">طول (Lon)</th>
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
                    class="input !py-1 !text-[11px] text-center"
                    dir="ltr"
                    :value="pt.lat"
                    @change="updatePoint(i, 'lat', $event.target.value)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    class="input !py-1 !text-[11px] text-center"
                    dir="ltr"
                    :value="pt.lon"
                    @change="updatePoint(i, 'lon', $event.target.value)"
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

        <button class="btn btn-ghost btn-xs w-full mt-2" @click="addPointToActive">
          <i class="fas fa-plus ml-1"></i>
          افزودن نقطه به این ترسیم
        </button>
      </div>

      <div v-else-if="activePin" class="card !rounded-xl !p-3 text-[11px] text-[var(--text-muted)]">
        این ترسیم نقطه قابل ویرایش ندارد.
      </div>

      <div v-else class="card !rounded-xl !p-3 text-[11px] text-[var(--text-muted)] leading-6">
        <i class="fas fa-hand-pointer ml-1 text-[var(--accent)]"></i>
        روی یکی از ترسیم‌ها (در نقشه یا فهرست سمت راست) کلیک کنید تا نقاط آن برای ویرایش نمایش داده شود.
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
                  <th class="text-center">عرض (Lat)</th>
                  <th class="text-center">طول (Lon)</th>
                  <th class="w-6"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(pt, i) in builderPoints" :key="i">
                  <td class="text-center text-[var(--text-faint)]">{{ i + 1 }}</td>
                  <td>
                    <input v-model="pt.lat" type="number" step="any" dir="ltr" class="input !py-1 !text-[11px] text-center" placeholder="35.7" />
                  </td>
                  <td>
                    <input v-model="pt.lon" type="number" step="any" dir="ltr" class="input !py-1 !text-[11px] text-center" placeholder="51.4" />
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
            <button class="btn btn-ghost btn-xs flex-1" @click="builderPoints.push({ lat: '', lon: '' })">
              <i class="fas fa-plus ml-1"></i> افزودن ردیف
            </button>
            <button class="btn btn-ghost btn-xs flex-1" @click="csvInput?.click()">
              <i class="fas fa-file-import ml-1"></i> Import CSV
            </button>
            <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" @change="onCsvChange" />
          </div>
          <p class="text-[9px] text-[var(--text-faint)] leading-4">
            فرمت CSV: ستون‌های <code dir="ltr">lat,lon</code> یا <code dir="ltr">name,lat,lon</code> (سطر اول = عنوان ستون‌ها).
          </p>

          <button class="btn btn-primary btn-xs w-full" :disabled="!canCreate" @click="createShape">
            <i class="fas fa-check ml-1"></i>
            ایجاد ترسیم روی نقشه
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { renderPinOnMap, updatePinGeometry } from "../utils/pinRenderer";
import { logger } from "../utils/logger";

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

const activePin = computed(() => flatten(props.pins).find((p) => p.id === props.activePinId) || null);

const pointRows = computed(() => {
  const s = activePin.value?.shape;
  if (!s) return [];
  if (s.type === "point") return [{ lat: s.lat, lon: s.lon }];
  if (Array.isArray(s.positions)) return s.positions;
  return [];
});

function updatePoint(i, key, value) {
  const s = activePin.value?.shape;
  if (!s) return;
  const num = parseFloat(value);
  if (isNaN(num)) return;
  if (s.type === "point") {
    s[key] = num;
  } else if (Array.isArray(s.positions) && s.positions[i]) {
    s.positions[i][key] = num;
  }
  updatePinGeometry(props.map, activePin.value);
  logger.info("draw", "ویرایش دستی مختصات نقطه", { pin: activePin.value.name, index: i, key, value: num });
}

function removePoint(i) {
  const s = activePin.value?.shape;
  if (!s || !Array.isArray(s.positions)) return;
  const minPts = s.type === "polygon" ? 3 : 2;
  if (s.positions.length <= minPts) return;
  s.positions.splice(i, 1);
  updatePinGeometry(props.map, activePin.value);
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
}

/* -------- ساخت ترسیم جدید با نقاط دستی / CSV -------- */
const builderOpen = ref(false);
const builderName = ref("");
const builderType = ref("polygon");
const builderPoints = ref([{ lat: "", lon: "" }, { lat: "", lon: "" }, { lat: "", lon: "" }]);
const csvInput = ref(null);

const canCreate = computed(() => {
  const valid = builderPoints.value.filter((p) => p.lat !== "" && p.lon !== "" && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lon)));
  const minPts = builderType.value === "polygon" ? 3 : 2;
  return valid.length >= minPts;
});

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const idxLat = header.findIndex((h) => ["lat", "latitude", "عرض", "y"].includes(h));
  const idxLon = header.findIndex((h) => ["lon", "lng", "longitude", "طول", "x"].includes(h));
  const idxName = header.findIndex((h) => ["name", "نام"].includes(h));
  const hasHeader = idxLat !== -1 && idxLon !== -1;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const li = hasHeader ? idxLat : 1;
  const lo = hasHeader ? idxLon : 0;
  const out = [];
  for (const line of dataLines) {
    const cols = line.split(delim).map((c) => c.trim());
    const lat = parseFloat(cols[li]);
    const lon = parseFloat(cols[lo]);
    if (isNaN(lat) || isNaN(lon)) continue;
    out.push({ lat, lon, name: hasHeader && idxName !== -1 ? cols[idxName] : "" });
  }
  return out;
}

function onCsvChange(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      if (!rows.length) {
        alert("نقطه معتبری در فایل CSV پیدا نشد. ستون‌های lat و lon را بررسی کنید.");
        return;
      }
      builderPoints.value = rows.map((r) => ({ lat: r.lat, lon: r.lon }));
      if (!builderName.value && rows[0]?.name) builderName.value = rows[0].name;
      logger.info("draw", "بارگذاری نقاط از CSV", { count: rows.length });
    } catch (err) {
      alert("خطا در خواندن فایل CSV");
    }
  };
  reader.readAsText(file, "utf-8");
}

/* -------- ویرایش نقاط ترسیم در حال انجام -------- */
const draftRows = computed(() => {
  const d = props.drawing;
  if (!d) return [];
  return (d.livePoints || []).map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) }));
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
    .filter((p) => p.lat !== "" && p.lon !== "")
    .map((p) => ({ lat: parseFloat(p.lat), lon: parseFloat(p.lon), height: 0 }));

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
  builderPoints.value = [{ lat: "", lon: "" }, { lat: "", lon: "" }, { lat: "", lon: "" }];
  builderOpen.value = false;
  emit("created", pin);
  logger.info("draw", "ایجاد ترسیم با نقاط دستی/CSV", { name: pin.name, points: positions.length });
}
</script>
