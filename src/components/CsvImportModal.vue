<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="dialog"
        class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
        @click.self="close"
      >
        <div
          class="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl text-xs"
          dir="ltr"
          role="dialog"
          aria-labelledby="csv-import-title"
        >
          <!-- Header (fixed) -->
          <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border)] flex-shrink-0" dir="rtl">
            <h2 id="csv-import-title" class="text-sm font-bold flex items-center gap-2">
              <i class="fas fa-table-columns text-[var(--accent)]"></i>
              وارد کردن فایل نقاط (CSV / TXT)
            </h2>
            <button type="button" class="text-[var(--text-muted)] hover:text-[var(--text)] p-1 text-base leading-none" @click="close">✕</button>
          </div>
          <p v-if="fileName" class="px-5 pt-2 text-[11px] text-[var(--text-muted)] truncate flex-shrink-0" dir="ltr">{{ fileName }}</p>

          <!-- Scrollable body -->
          <div class="overflow-y-auto px-5 py-3 flex-1 min-h-0">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block mb-1 font-medium">Coordinate System</label>
                <select v-model="settings.coordSystem" class="input !py-1.5 !text-xs w-full" dir="ltr">
                  <option value="WGS84">WGS 84 (EPSG::4326)</option>
                  <option value="UTM">UTM (تشخیص خودکار Zone)</option>
                </select>
              </div>
              <div>
                <label class="block mb-1 font-medium">Items</label>
                <select v-model="shapeType" class="input !py-1.5 !text-xs w-full" dir="ltr">
                  <option value="polygon">Polygon (پلی‌گان بسته)</option>
                  <option value="polyline">Polyline (خط)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-3 items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="settings.ignoreLabels" />
                Ignore labels
              </label>
              <div>
                <label class="block mb-1 font-medium">نام ترسیم:</label>
                <input type="text" v-model="shapeName" placeholder="مثلاً حد شمالی" class="input !py-1.5 !text-xs w-full" dir="rtl" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Delimiter -->
              <div class="border border-[var(--border)] rounded-xl p-3 bg-[var(--surface2)]">
                <div class="font-semibold mb-2">Delimiter</div>
                <label class="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" value="tab" v-model="settings.delimiter" /> Tab
                </label>
                <label class="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" value="semicolon" v-model="settings.delimiter" /> Semicolon
                </label>
                <label class="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" value="comma" v-model="settings.delimiter" /> Comma
                </label>
                <label class="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" value="space" v-model="settings.delimiter" /> Space
                </label>
                <label class="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="radio" value="other" v-model="settings.delimiter" /> Other:
                  <input
                    type="text" v-model="settings.otherDelimiter" maxlength="3"
                    :disabled="settings.delimiter !== 'other'"
                    class="input !py-0.5 !px-1 !text-xs !w-14 disabled:opacity-40" dir="ltr"
                  />
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="settings.combineConsecutive" />
                  Combine consecutive delimiters
                </label>
              </div>

              <!-- Columns -->
              <div class="border border-[var(--border)] rounded-xl p-3 bg-[var(--surface2)]">
                <div class="font-semibold mb-2">Columns</div>
                <div class="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1.5 items-center">
                  <span>Label:</span>
                  <input type="number" min="0" v-model.number="cols.label" :disabled="settings.ignoreLabels" class="input !py-1 !px-1 !text-xs !w-16 text-center disabled:opacity-40" dir="ltr" />

                  <span>{{ settings.coordSystem === 'UTM' ? 'Easting (X):' : 'Longitude:' }}</span>
                  <input type="number" min="0" v-model.number="cols.longitude" class="input !py-1 !px-1 !text-xs !w-16 text-center" dir="ltr" />

                  <span>{{ settings.coordSystem === 'UTM' ? 'Northing (Y):' : 'Latitude:' }}</span>
                  <input type="number" min="0" v-model.number="cols.latitude" class="input !py-1 !px-1 !text-xs !w-16 text-center" dir="ltr" />

                  <template v-if="settings.coordSystem === 'UTM'">
                    <span>Zone: <span class="text-[10px] text-[var(--text-faint)]">(0 = auto/39)</span></span>
                    <input type="number" min="0" max="60" v-model.number="cols.zone" class="input !py-1 !px-1 !text-xs !w-16 text-center" dir="ltr" />
                  </template>

                  <span>Altitude <span class="text-[10px] text-[var(--text-faint)]">(opt):</span></span>
                  <input type="number" min="0" v-model.number="cols.altitude" class="input !py-1 !px-1 !text-xs !w-16 text-center" dir="ltr" />
                </div>
              </div>
            </div>

            <!-- Start row -->
            <div class="flex items-center gap-2 mt-3">
              <span>Start import at row:</span>
              <input type="number" min="1" v-model.number="settings.startRow" class="input !py-1 !px-1 !text-xs !w-16 text-center" dir="ltr" />
              <span class="text-[10px] text-[var(--text-faint)]">(ردیف‌های قبل از آن نادیده گرفته می‌شوند)</span>
            </div>

            <!-- Field palette -->
            <div class="mt-3" dir="rtl">
              <div class="font-medium mb-1">فیلدها (بکشید و روی ستون مورد نظر در جدول رها کنید):</div>
              <div
                class="flex flex-wrap gap-2 p-2 border border-dashed border-[var(--border-strong)] rounded-xl bg-[var(--surface2)]"
                @dragover="onPaletteDragOver" @drop="onPaletteDrop"
              >
                <span
                  v-for="f in fieldDefs" :key="f.key"
                  draggable="true"
                  @dragstart="onChipDragStart($event, f.key)"
                  class="px-2 py-1 rounded-lg cursor-move text-white text-[11px] select-none"
                  :class="cols[f.key] ? 'bg-[var(--success)]' : 'bg-gray-400'"
                >
                  {{ f.title }}<span v-if="cols[f.key]"> (#{{ cols[f.key] }})</span>
                </span>
                <span v-if="!fieldDefs.length" class="text-[10px] text-[var(--text-faint)]">—</span>
              </div>
              <p class="text-[10px] text-[var(--text-faint)] mt-1 leading-4">رها کردن روی ناحیه بالا = لغو تخصیص آن فیلد. جابه‌جایی هدرها جای دو فیلد را عوض می‌کند.</p>
            </div>

            <!-- Preview -->
            <div class="mt-3">
              <div class="font-medium mb-1">First 20 lines preview:</div>
              <div class="border border-[var(--border)] rounded-xl overflow-auto bg-[var(--surface)]" style="max-height: 220px;">
                <table class="w-full text-[11px] border-collapse">
                  <thead class="sticky top-0">
                    <tr>
                      <th class="!bg-[var(--surface3)] text-center !w-8 !py-1 !px-1">#</th>
                      <th
                        v-for="c in maxCols" :key="c"
                        class="!py-1 !px-1 select-none text-center"
                        :class="headerClass(c)"
                        :draggable="!!fieldAtColumn(c)"
                        @dragstart="onHeaderDragStart($event, c)"
                        @dragover="onHeaderDragOver"
                        @drop="onHeaderDrop($event, c)"
                        :title="fieldAtColumn(c) ? 'درگ برای جابه‌جایی فیلد' : ''"
                      >
                        {{ headerLabel(c) || ('C' + c) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, rIdx) in previewRows" :key="rIdx"
                      :class="rIdx + 1 < settings.startRow ? 'opacity-40' : ''"
                    >
                      <td class="!py-1 !px-1 bg-[var(--surface3)] text-center">{{ rIdx + 1 }}</td>
                      <td v-for="c in maxCols" :key="c" class="!py-1 !px-1 whitespace-nowrap" dir="ltr" style="text-align:left">
                        {{ row[c - 1] ?? '' }}
                      </td>
                    </tr>
                    <tr v-if="!previewRows.length">
                      <td class="!px-2 !py-2 text-center text-[var(--text-faint)]" :colspan="maxCols + 1">
                        فایلی انتخاب نشده است
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="stats.total"
              class="mt-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-[11px] flex flex-wrap gap-x-4 gap-y-1"
            >
              <span>ردیف‌ها: <strong>{{ stats.total }}</strong></span>
              <span class="text-[var(--success)]">معتبر: <strong>{{ stats.valid }}</strong></span>
              <span v-if="stats.invalid" class="text-[var(--danger)]">نامعتبر: <strong>{{ stats.invalid }}</strong></span>
              <span class="text-[var(--text-faint)]">حداقل برای {{ shapeType === 'polygon' ? 'پلی‌گان: ۳' : 'خط: ۲' }} نقطه معتبر</span>
            </div>

            <div v-if="errorMsg" class="mt-2 text-[11px] text-[var(--danger)]">{{ errorMsg }}</div>
          </div>
          <!-- End scrollable body -->

          <!-- Footer (fixed) -->
          <div class="flex justify-end gap-2 px-5 py-3 border-t border-[var(--border)] flex-shrink-0" dir="rtl">
            <button type="button" class="btn btn-ghost" @click="close">انصراف</button>
            <button type="button" class="btn btn-primary" :disabled="!canConfirm" @click="confirm">
              <i class="fas fa-check ml-1"></i>
              تایید و ایجاد ({{ stats.valid }})
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { fromUTM } from "../utils/useDrawingHelpers";
import { logger } from "../utils/logger";

const emit = defineEmits(["confirm", "cancel"]);

const dialog = ref(false);
const errorMsg = ref("");
const fileName = ref("");
const rawText = ref("");

const settings = reactive({
  coordSystem: "WGS84",
  ignoreLabels: false,
  delimiter: "comma",
  otherDelimiter: "",
  combineConsecutive: false,
  startRow: 1,
});

const cols = reactive({
  label: 0,
  longitude: 0,
  latitude: 0,
  altitude: 0,
  zone: 0,
});

const shapeType = ref("polygon");
const shapeName = ref("");

/* -------------------- delimiter / parsing -------------------- */

const delimiterChar = computed(() => {
  switch (settings.delimiter) {
    case "tab": return "\t";
    case "semicolon": return ";";
    case "comma": return ",";
    case "space": return " ";
    case "other": return settings.otherDelimiter || ",";
    default: return ",";
  }
});

function splitLine(line) {
  let parts = String(line ?? "").split(delimiterChar.value);
  if (settings.combineConsecutive) {
    parts = parts.filter((p) => p !== "");
  }
  return parts.map((p) => p.trim().replace(/^"|"$/g, ""));
}

const allLines = computed(() => {
  if (!rawText.value) return [];
  return rawText.value.split(/\r\n|\r|\n/).filter((l) => l.length > 0);
});

const parsedLines = computed(() => allLines.value.map(splitLine));
const previewRows = computed(() => parsedLines.value.slice(0, 20));

const maxCols = computed(() => {
  let max = 4;
  previewRows.value.forEach((r) => { if (r.length > max) max = r.length; });
  return Math.min(max, 12);
});

/* -------------------- drag & drop field mapping -------------------- */

const fieldDefs = computed(() => {
  const east = settings.coordSystem === "UTM";
  const defs = [
    { key: "label", title: "Label" },
    { key: "longitude", title: east ? "Easting (X)" : "Longitude" },
    { key: "latitude", title: east ? "Northing (Y)" : "Latitude" },
  ];
  if (east) defs.push({ key: "zone", title: "Zone" });
  defs.push({ key: "altitude", title: "Altitude" });
  return defs;
});

function fieldAtColumn(colIndex) {
  if (!colIndex) return null;
  return fieldDefs.value.find((f) => cols[f.key] === colIndex) || null;
}

function headerLabel(colIndex) {
  return fieldAtColumn(colIndex)?.title || "";
}

function headerClass(colIndex) {
  return fieldAtColumn(colIndex)
    ? "!bg-[var(--success)] !text-white cursor-move"
    : "!bg-[var(--surface3)] !text-[var(--text-faint)]";
}

function assignFieldToColumn(fieldKey, colIndex) {
  if (!fieldDefs.value.find((f) => f.key === fieldKey)) return;
  const prevCol = cols[fieldKey];
  if (prevCol === colIndex) return;
  const occupying = fieldAtColumn(colIndex);
  if (occupying && occupying.key !== fieldKey) {
    cols[occupying.key] = prevCol || 0;
  }
  cols[fieldKey] = colIndex;
}

function onHeaderDragStart(e, colIndex) {
  const field = fieldAtColumn(colIndex);
  if (!field) { e.preventDefault(); return; }
  e.dataTransfer.setData("text/plain", field.key);
  e.dataTransfer.effectAllowed = "move";
}
function onHeaderDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function onHeaderDrop(e, colIndex) {
  e.preventDefault();
  const key = e.dataTransfer.getData("text/plain");
  if (!key) return;
  assignFieldToColumn(key, colIndex);
}
function onChipDragStart(e, key) {
  e.dataTransfer.setData("text/plain", key);
  e.dataTransfer.effectAllowed = "move";
}
function onPaletteDragOver(e) { e.preventDefault(); }
function onPaletteDrop(e) {
  e.preventDefault();
  const key = e.dataTransfer.getData("text/plain");
  if (!key) return;
  if (fieldDefs.value.find((f) => f.key === key)) cols[key] = 0;
}

/* -------------------- auto detect -------------------- */

function guessDelimiter(lines) {
  const candidates = ["\t", ";", ",", " "];
  let best = null;
  let bestScore = -1;
  for (const d of candidates) {
    const counts = lines.slice(0, 5).map((l) => String(l).split(d).length);
    const min = Math.min(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const score = min > 1 ? min * 10 + avg : -1;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (best === "\t") return "tab";
  if (best === ";") return "semicolon";
  if (best === " ") return "space";
  return "comma";
}

function autoDetect() {
  if (!parsedLines.value.length) return;
  const firstRow = parsedLines.value[0];
  const lower = firstRow.map((c) => (c || "").toLowerCase().trim());
  const findCol = (aliases) => {
    const idx = lower.findIndex((c) => aliases.includes(c));
    return idx >= 0 ? idx + 1 : null;
  };

  const labelCol = findCol(["name", "label", "#name", "نام", "point", "code", "id"]);
  const latCol = findCol(["lat", "latitude", "y", "northing", "north", "عرض"]);
  const lonCol = findCol(["lon", "lng", "long", "longitude", "x", "easting", "east", "طول"]);
  const altCol = findCol(["alt", "altitude", "ell.h(m)", "height", "h", "z"]);
  const zoneCol = findCol(["zone", "zon", "utm zone", "utm_zone", "منطقه"]);

  const hasHeader = Boolean(labelCol || latCol || lonCol || altCol || zoneCol);
  if (hasHeader) {
    if (labelCol) cols.label = labelCol;
    if (latCol) cols.latitude = latCol;
    if (lonCol) cols.longitude = lonCol;
    if (altCol) cols.altitude = altCol;
    if (zoneCol) cols.zone = zoneCol;
    else if (settings.coordSystem === "UTM") cols.zone = 0;
    settings.startRow = 2;
  } else {
    settings.startRow = 1;
    // بدون هدر: حدس موقعیت ستون‌ها بر اساس تعداد ستون
    const n = firstRow.length;
    if (n >= 2) {
      if (!cols.longitude) cols.longitude = n >= 3 ? 3 : 2;
      if (!cols.latitude) cols.latitude = 2;
      if (!cols.label) cols.label = n >= 3 ? 1 : 0;
    }
  }
}

/* -------------------- points building / validation -------------------- */

function parseRowToPoint(row) {
  const lonRaw = cols.longitude ? row[cols.longitude - 1] : undefined;
  const latRaw = cols.latitude ? row[cols.latitude - 1] : undefined;
  const labelRaw = settings.ignoreLabels ? "" : (cols.label ? row[cols.label - 1] : "");
  const altRaw = cols.altitude ? row[cols.altitude - 1] : "";

  let lat;
  let lon;
  if (settings.coordSystem === "UTM") {
    const easting = Number(String(lonRaw ?? "").replace(",", "."));
    const northing = Number(String(latRaw ?? "").replace(",", "."));
    let zone = cols.zone ? parseInt(row[cols.zone - 1], 10) : NaN;
    if (!Number.isFinite(zone) || zone < 1 || zone > 60) zone = 39; // پیش‌فرض ایران
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
    if (easting < 10000 || easting > 1000000 || northing < 0 || northing > 10000000) return null;
    try {
      const ll = fromUTM(easting, northing, zone, true);
      lat = ll.lat;
      lon = ll.lng;
    } catch {
      return null;
    }
  } else {
    lon = Number(String(lonRaw ?? "").replace(",", "."));
    lat = Number(String(latRaw ?? "").replace(",", "."));
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (settings.coordSystem !== "UTM" && (lat < -90 || lat > 90 || lon < -180 || lon > 180)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const alt = altRaw !== undefined && altRaw !== "" ? Number(altRaw) : 0;
  return {
    lat,
    lon,
    name: labelRaw ? String(labelRaw).trim() : "",
    alt: Number.isFinite(alt) ? alt : 0,
  };
}

const stats = computed(() => {
  const startIdx = Math.max(settings.startRow - 1, 0);
  let valid = 0;
  let invalid = 0;
  for (let i = startIdx; i < parsedLines.value.length; i++) {
    const pt = parseRowToPoint(parsedLines.value[i]);
    if (pt) valid++;
    else invalid++;
  }
  return { total: Math.max(parsedLines.value.length - startIdx, 0), valid, invalid };
});

const canConfirm = computed(() => {
  const min = shapeType.value === "polygon" ? 3 : 2;
  return stats.value.valid >= min;
});

function collectPoints() {
  const points = [];
  const invalidRows = [];
  const startIdx = Math.max(settings.startRow - 1, 0);
  for (let i = startIdx; i < parsedLines.value.length; i++) {
    const pt = parseRowToPoint(parsedLines.value[i]);
    if (pt) {
      points.push({ lat: pt.lat, lon: pt.lon, name: pt.name, alt: pt.alt, valid: true });
    } else {
      invalidRows.push({ rowIndex: i + 1 });
    }
  }
  return { points, invalidRows };
}

/* -------------------- open / close / confirm -------------------- */

function loadFromText(text, filename = "") {
  errorMsg.value = "";
  rawText.value = String(text || "");
  fileName.value = filename || "";
  if (!rawText.value.trim()) {
    errorMsg.value = "فایل خالی یا بدون داده است.";
    return false;
  }
  const lower = filename.toLowerCase();
  const sample = rawText.value.split(/\r\n|\r|\n/).filter(Boolean);
  const guessed = guessDelimiter(sample);
  settings.delimiter = lower.endsWith(".csv") ? "comma" : lower.endsWith(".txt") ? guessed : guessed;
  settings.combineConsecutive = settings.delimiter === "space";

  // ریست نگاشت
  cols.label = 0;
  cols.longitude = 0;
  cols.latitude = 0;
  cols.altitude = 0;
  cols.zone = 0;

  // باید delimiter ست شده باشد تا parsedLines درست شود، بعد autoDetect
  autoDetect();
  // اگر autoDetect چیزی پیدا نکرد، پیش‌فرض معقول
  if (!cols.longitude || !cols.latitude) {
    const n = (parsedLines.value[0] || []).length;
    if (n === 2) { cols.latitude = 1; cols.longitude = 2; }
    else if (n >= 3) { cols.label = 1; cols.latitude = 2; cols.longitude = 3; }
  }

  shapeName.value = filename.replace(/\.(csv|txt)$/i, "") || "";
  shapeType.value = stats.value.valid >= 3 ? "polygon" : "polyline";
  dialog.value = true;
  logger.info("draw", "باز شدن پنل Import CSV", { file: filename });
  return true;
}

function loadFile(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(false); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(loadFromText(String(reader.result || ""), file?.name || ""));
    reader.onerror = () => resolve(false);
    reader.readAsText(file, "utf-8");
  });
}

function close() {
  dialog.value = false;
  emit("cancel");
}

function confirm() {
  errorMsg.value = "";
  const min = shapeType.value === "polygon" ? 3 : 2;
  if (!cols.longitude || !cols.latitude) {
    errorMsg.value = "ستون‌های مختصات (Longitude/Latitude) را مشخص کنید.";
    return;
  }
  const { points, invalidRows } = collectPoints();
  if (points.length < min) {
    errorMsg.value = shapeType.value === "polygon"
      ? `برای پلی‌گان حداقل ۳ نقطه معتبر لازم است. (معتبر: ${points.length})`
      : `برای خط حداقل ۲ نقطه معتبر لازم است. (معتبر: ${points.length})`;
    return;
  }
  emit("confirm", {
    points,
    invalidRows,
    shapeType: shapeType.value,
    name: shapeName.value.trim(),
    filename: fileName.value,
  });
  dialog.value = false;
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
