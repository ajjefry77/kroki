<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50"
        @click.self="close"
      >
        <div
          class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
          role="dialog"
          aria-labelledby="csv-import-title"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 id="csv-import-title" class="text-sm font-bold flex items-center gap-2">
              <i class="fas fa-table-columns text-[var(--accent)]"></i>
              انتخاب ستون‌ها
            </h2>
            <button type="button" class="text-[var(--text-muted)] hover:text-[var(--text)] p-1" @click="close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <p v-if="fileLabel" class="text-[11px] text-[var(--text-muted)] mb-3 truncate" dir="ltr">
            {{ fileLabel }}
          </p>

          <div class="flex gap-2 mb-4">
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition"
              :class="coordMode === 'latlon' ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]' : 'border-[var(--border)]'"
              @click="coordMode = 'latlon'"
            >
              Lat / Lon
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition"
              :class="coordMode === 'utm' ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]' : 'border-[var(--border)]'"
              @click="coordMode = 'utm'"
            >
              UTM (X, Y, Zone)
            </button>
          </div>

          <div v-if="coordMode === 'latlon'" class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block mb-1 text-[11px] font-medium">Latitude</label>
              <select v-model="mapping.lat" class="input !py-2 !text-xs w-full" dir="ltr">
                <option value="">—</option>
                <option v-for="col in columns" :key="'lat-' + col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">Longitude</label>
              <select v-model="mapping.lng" class="input !py-2 !text-xs w-full" dir="ltr">
                <option value="">—</option>
                <option v-for="col in columns" :key="'lng-' + col" :value="col">{{ col }}</option>
              </select>
            </div>
          </div>

          <div v-else class="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label class="block mb-1 text-[11px] font-medium">Easting (X)</label>
              <select v-model="mapping.utmX" class="input !py-2 !text-xs w-full" dir="ltr">
                <option value="">—</option>
                <option v-for="col in columns" :key="'x-' + col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">Northing (Y)</label>
              <select v-model="mapping.utmY" class="input !py-2 !text-xs w-full" dir="ltr">
                <option value="">—</option>
                <option v-for="col in columns" :key="'y-' + col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">Zone</label>
              <select v-model="mapping.utmZone" class="input !py-2 !text-xs w-full" dir="ltr">
                <option value="">—</option>
                <option v-for="col in columns" :key="'z-' + col" :value="col">{{ col }}</option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label class="block mb-1 text-[11px] font-medium">نام نقطه (اختیاری)</label>
            <select v-model="mapping.name" class="input !py-2 !text-xs w-full" dir="ltr">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="'name-' + col" :value="col">{{ col }}</option>
            </select>
          </div>

          <label class="flex items-center gap-2 text-[11px] cursor-pointer mb-2">
            <input v-model="validateGps" type="checkbox" class="accent-[var(--accent)]" />
            اعتبارسنجی نقاط (محدوده Lat/Lon و حذف ردیف‌های نامعتبر)
          </label>

          <div v-if="validateGps" class="border-t border-[var(--border)] pt-4 mt-3 space-y-3">
            <p class="text-[10px] text-[var(--text-muted)] leading-5">
              ستون‌های کیفیت GPS (اختیاری — در صورت انتخاب در properties نقطه ذخیره می‌شوند)
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="f in gpsFields" :key="f.key">
                <label class="block mb-1 text-[11px] font-medium">{{ f.label }}</label>
                <select v-model="mapping[f.key]" class="input !py-2 !text-xs w-full" dir="ltr">
                  <option value="">انتخاب نشود</option>
                  <option v-for="col in columns" :key="f.key + col" :value="col">{{ col }}</option>
                </select>
              </div>
            </div>
            <div v-if="validating" class="pt-2">
              <div class="h-2 w-full bg-[var(--surface3)] rounded-full overflow-hidden">
                <div class="h-full bg-[var(--accent)] transition-all duration-100" :style="{ width: `${progress}%` }" />
              </div>
              <p class="text-[10px] text-[var(--text-muted)] mt-1 text-center">در حال اعتبارسنجی...</p>
            </div>
          </div>

          <div
            v-if="preview.total"
            class="mt-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-[11px] flex flex-wrap gap-x-4 gap-y-1"
          >
            <span>ردیف‌ها: <strong>{{ preview.total }}</strong></span>
            <span class="text-[var(--success)]">معتبر: <strong>{{ preview.valid }}</strong></span>
            <span v-if="preview.invalid" class="text-[var(--danger)]">نامعتبر: <strong>{{ preview.invalid }}</strong></span>
          </div>

          <div class="border-t border-[var(--border)] mt-5 pt-4">
            <p class="text-[11px] font-semibold mb-2">نوع ترسیم روی نقشه</p>
            <div class="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                class="rounded-xl border-2 p-3 text-center transition"
                :class="shapeType === 'polygon' ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-[var(--border)]'"
                @click="shapeType = 'polygon'"
              >
                <i class="fas fa-draw-polygon text-lg block mb-1" :class="shapeType === 'polygon' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'"></i>
                <div class="text-xs font-bold">پلی‌گان</div>
              </button>
              <button
                type="button"
                class="rounded-xl border-2 p-3 text-center transition"
                :class="shapeType === 'polyline' ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-[var(--border)]'"
                @click="shapeType = 'polyline'"
              >
                <i class="fas fa-minus text-lg block mb-1" :class="shapeType === 'polyline' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'"></i>
                <div class="text-xs font-bold">خط</div>
              </button>
            </div>
            <label class="block mb-1 text-[11px] font-medium">نام ترسیم</label>
            <input v-model="shapeName" type="text" class="input !py-1.5 !text-xs mb-4" placeholder="مثلاً حد شمالی" />
          </div>

          <p v-if="errorMsg" class="text-[11px] text-[var(--danger)] mb-3">{{ errorMsg }}</p>

          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" @click="close">انصراف</button>
            <button type="button" class="btn btn-primary" :disabled="!canConfirm || validating" @click="confirm">
              <i class="fas fa-check ml-1"></i>
              تایید و ایجاد
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import {
  parseCsvToTable,
  autoDetectCsvMapping,
  mapCsvRowsToPoints,
} from "../utils/csvPoints";

const emit = defineEmits(["confirm", "cancel"]);

const open = ref(false);
const fileLabel = ref("");
const columns = ref([]);
const rawRows = ref([]);
const coordMode = ref("latlon");
const validateGps = ref(false);
const validating = ref(false);
const progress = ref(0);
const shapeType = ref("polygon");
const shapeName = ref("");
const errorMsg = ref("");

const mapping = reactive({
  lat: "",
  lng: "",
  name: "",
  utmX: "",
  utmY: "",
  utmZone: "",
  hrms: "",
  vrms: "",
  pdop: "",
  age: "",
  stat: "",
});

const gpsFields = [
  { key: "hrms", label: "HRMS" },
  { key: "vrms", label: "VRMS" },
  { key: "pdop", label: "PDOP" },
  { key: "age", label: "Age" },
  { key: "stat", label: "STAT" },
];

function resetMapping(cols) {
  const m = autoDetectCsvMapping(cols);
  Object.assign(mapping, m);
  if (m.utmX && m.utmY && m.utmZone && !(m.lat && m.lng)) coordMode.value = "utm";
  else coordMode.value = "latlon";
}

const mappingReady = computed(() => {
  if (coordMode.value === "utm") {
    return Boolean(mapping.utmX && mapping.utmY && mapping.utmZone);
  }
  return Boolean(mapping.lat && mapping.lng);
});

const preview = computed(() => {
  if (!mappingReady.value || !rawRows.value.length) {
    return { total: rawRows.value.length, valid: 0, invalid: 0, points: [] };
  }
  const { points, invalidRows } = mapCsvRowsToPoints(rawRows.value, buildOpts(false));
  const valid = points.filter((p) => p.valid !== false).length;
  return {
    total: rawRows.value.length,
    valid: points.length,
    invalid: invalidRows.length,
    points,
  };
});

const canConfirm = computed(() => {
  const min = shapeType.value === "polygon" ? 3 : 2;
  return mappingReady.value && preview.value.valid >= min;
});

watch(
  () => preview.value.valid,
  (n) => {
    shapeType.value = n >= 3 ? "polygon" : "polyline";
  },
);

function buildOpts(validate) {
  return {
    mode: coordMode.value,
    lat: mapping.lat,
    lng: mapping.lng,
    name: mapping.name,
    utmX: mapping.utmX,
    utmY: mapping.utmY,
    utmZone: mapping.utmZone,
    validateGps: validate && validateGps.value,
    hrms: mapping.hrms,
    vrms: mapping.vrms,
    pdop: mapping.pdop,
    age: mapping.age,
    stat: mapping.stat,
  };
}

function runProgress(duration = 1200) {
  return new Promise((resolve) => {
    progress.value = 0;
    const start = Date.now();
    const timer = setInterval(() => {
      progress.value = Math.min(Math.floor(((Date.now() - start) / duration) * 100), 100);
      if (progress.value >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, 16);
  });
}

function loadFromText(text, filename = "") {
  errorMsg.value = "";
  const table = parseCsvToTable(text);
  if (!table.rows.length) {
    errorMsg.value = "فایلی خالی یا بدون داده است.";
    return false;
  }
  columns.value = table.columns;
  rawRows.value = table.rows;
  fileLabel.value = filename;
  resetMapping(table.columns);
  shapeName.value = filename.replace(/\.csv$/i, "") || "";
  shapeType.value = table.rows.length >= 3 ? "polygon" : "polyline";
  validateGps.value = false;
  open.value = true;
  return true;
}

function loadFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(loadFromText(String(reader.result || ""), file?.name || ""));
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file, "utf-8");
  });
}

function close() {
  open.value = false;
  emit("cancel");
}

async function confirm() {
  errorMsg.value = "";
  const min = shapeType.value === "polygon" ? 3 : 2;
  if (!mappingReady.value) {
    errorMsg.value = "ستون‌های مختصات را انتخاب کنید.";
    return;
  }

  validating.value = validateGps.value;
  if (validateGps.value) await runProgress();

  const { points, invalidRows } = mapCsvRowsToPoints(rawRows.value, buildOpts(true));
  const usable = validateGps.value ? points.filter((p) => p.valid !== false) : points;

  if (usable.length < min) {
    errorMsg.value =
      shapeType.value === "polygon"
        ? "برای پلی‌گان حداقل ۳ نقطه معتبر لازم است."
        : "برای خط حداقل ۲ نقطه معتبر لازم است.";
    validating.value = false;
    return;
  }

  emit("confirm", {
    points: usable,
    invalidRows,
    shapeType: shapeType.value,
    name: shapeName.value.trim(),
    filename: fileLabel.value,
  });
  open.value = false;
  validating.value = false;
}

defineExpose({ loadFile, loadFromText, close });
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
