<template>
  <div class="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
    <main class="min-h-0 flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
      <!-- نقشه -->
      <section class="relative flex-1 min-h-[340px] lg:min-h-0 border-b lg:border-b-0 border-[var(--border)]">
        <MapPanel :pins="pins" @mapReady="onMapReady" @openKroki="$emit('openKroki')" @editPin="onEditPin" />
      </section>

      <!-- پنل کناری واحد با تب‌ها -->
      <aside class="lg:w-[400px] xl:w-[440px] flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-r border-[var(--border)] bg-[var(--surface)]">
        <!-- تب‌ها -->
        <div class="px-4 pt-3 pb-2 border-b border-[var(--border)]">
          <div class="flex gap-1 bg-[var(--surface2)] rounded-lg p-1 border border-[var(--border)]">
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5"
              :class="activeTab === 'points'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
              @click="activeTab = 'points'"
            >
              <i class="fas fa-table-cells"></i>
              جدول نقاط
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5"
              :class="activeTab === 'drawings'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
              @click="activeTab = 'drawings'"
            >
              <i class="fas fa-list-check"></i>
              ترسیم‌ها
              <span class="text-[10px] text-[var(--text-muted)] bg-[var(--surface2)] border border-[var(--border)] rounded-full px-2 py-0.5">
                {{ flatPins.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- مساحت شکل ترسیم‌شده -->
        <div
          v-if="areaInfo.show"
          class="mx-3 mt-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2"
        >
          <span class="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <i class="fas fa-vector-square text-[var(--accent)]"></i>
            مساحت کل شکل
          </span>
          <span class="text-sm font-bold text-[var(--accent)]">{{ areaInfo.text }}</span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <!-- تب جدول نقاط -->
          <PointsTable
            v-show="activeTab === 'points'"
            :pins="pins"
            :active-pin-id="activePinId"
            :drawing="drawingRef"
            :map="mapRef"
            @select="activePinId = $event"
            @created="onShapeCreated"
          />

          <!-- تب ترسیم‌ها -->
          <div v-show="activeTab === 'drawings'" class="flex flex-col gap-3 p-3">
            <div v-if="!flatPins.length" class="text-center py-10 text-[var(--text-faint)] text-xs space-y-3">
              <i class="fas fa-draw-polygon text-3xl block opacity-40"></i>
              <p>
                هنوز ترسیمی روی نقشه وجود ندارد.<br />
                از ابزارهای سمت چپ نقشه استفاده کنید<br />
                یا فایل KML آپلود کنید یا از جدول نقاط استفاده کنید.
              </p>
              <button class="btn btn-ghost btn-xs" @click="showKmlHint = !showKmlHint">
                <i class="fas fa-question-circle ml-1"></i>
                راهنمای ترسیم
              </button>
            </div>

            <div v-if="showKmlHint || flatPins.length" class="space-y-1.5">
              <div
                v-for="p in flatPins"
                :key="p.id"
                class="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-[var(--surface2)] border transition"
                :class="[
                  isKrokiEligible(p) ? 'border-[var(--border)]' : 'border-[var(--border)]/50 opacity-60',
                  activePinId === p.id ? 'ring-2 ring-[var(--accent)]' : '',
                  (p.selected === false) ? 'cursor-default' : 'cursor-pointer',
                ]"
                @click="selectPin(p)"
              >
                <input
                  v-if="canToggle(p)"
                  v-model="p.selected"
                  type="checkbox"
                  class="accent-[var(--accent)]"
                  :title="p.selected === false ? 'فعال‌سازی و نمایش روی نقشه' : 'غیرفعال‌سازی و مخفی کردن از نقشه'"
                  @click.stop
                  @change="onToggle(p)"
                />
                <i class="w-4 text-center text-xs" :class="shapeIcon(p)"></i>
                <div class="flex-1 min-w-0">
                  <div v-if="editingNameId === p.id" class="flex items-center gap-1">
                    <input
                      ref="nameInputRef"
                      v-model="editingName"
                      type="text"
                      class="input !py-0.5 !px-1 !text-[11px] w-full"
                      @keydown.enter.prevent="saveName(p)"
                      @keydown.esc.prevent="cancelName"
                      @blur="saveName(p)"
                    />
                  </div>
                  <div v-else class="flex items-center gap-1 min-w-0">
                    <span class="text-xs font-medium truncate">{{ p.name || 'بدون نام' }}</span>
                    <button
                      class="text-gray-400 hover:text-[var(--accent)] text-[10px] px-0.5 shrink-0"
                      title="ویرایش نام"
                      @click.stop="startNameEdit(p)"
                    >
                      <i class="fas fa-pen"></i>
                    </button>
                  </div>
                  <div class="text-[10px] text-[var(--text-muted)]">
                    {{ typeLabel(p) }}
                    <template v-if="p.shape?.positions?.length">
                      — {{ p.shape.positions.length }} نقطه
                    </template>
                  </div>
                </div>
                <button
                  class="text-gray-500 hover:text-[var(--danger)] text-sm px-1 leading-none transition"
                  title="حذف ترسیم"
                  @click.stop="onRemove(p)"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>

            <!-- راهنما -->
            <div v-if="showKmlHint && flatPins.length" class="text-[11px] text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 leading-6">
              <div class="font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
                <i class="fas fa-lightbulb text-[var(--warning)]"></i>
                راهنمای ترسیم
              </div>
              <ul class="space-y-1">
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> از تولبار سمت چپ نقشه، ابزار ترسیم را انتخاب کنید.</li>
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> با کلیک روی نقشه نقاط را اضافه کنید و با Enter پایان دهید.</li>
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> برای آپلود فایل KML/KMZ از دکمه بالای نقشه استفاده کنید.</li>
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> از جدول نقاط نیز می‌توانید با Import CSV یا وارد کردن دستی مختصات، ترسیم بسازید.</li>
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> با کلیک روی هر ترسیم (اینجا یا در جدول نقاط)، نقاط آن برای ویرایش نمایش داده می‌شود — نقاط KML نیز قابل ویرایش‌اند.</li>
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> تیک ترسیم‌ها نمایش و شرکت آن‌ها در کروکی را کنترل می‌کند؛ با برداشتن تیک، ترسیم از نقشه محو و غیرفعال می‌شود.</li>
              </ul>
            </div>

            <div v-if="flatPins.length" class="text-[10px] text-[var(--text-faint)]">
              <i class="fas fa-info-circle ml-1"></i>
              تنها پلی‌گان و خط با حداقل ۲ نقطه در کروکی لحاظ می‌شوند.
            </div>
          </div>
        </div>

        <!-- پایین: نشانگر تعداد معتبر + دکمه‌ها -->
        <div class="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <div
            v-if="!eligibleCount"
            class="flex items-start gap-2 text-[11px] text-[var(--warning)] leading-5 mb-2"
          >
            <i class="fas fa-triangle-exclamation mt-0.5"></i>
            <span>برای ادامه باید حداقل یک پلی‌گان یا خط معتبر روی نقشه داشته باشید.</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost flex-1" @click="$emit('back')">
              <i class="fas fa-arrow-right ml-1"></i>
              بازگشت
            </button>
            <button
              class="btn btn-primary flex-1"
              :disabled="!eligibleCount"
              @click="submit"
            >
              <i class="fas fa-clipboard-check ml-1"></i>
              ثبت و ادامه
            </button>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import MapPanel from "../MapPanel.vue";
import PointsTable from "../PointsTable.vue";
import { eligiblePinsOf, isKrokiEligible } from "../../composables/useKrokiGenerator";

const props = defineProps({
  pins: { type: Object, required: true },
});

const emit = defineEmits(["mapReady", "openKroki", "removePin", "submit", "back"]);

const showKmlHint = ref(false);
const activePinId = ref(null);
const activeTab = ref("points");
const mapRef = ref(null);
const drawingRef = ref(null);

function onMapReady(payload) {
  mapRef.value = payload?.map || null;
  drawingRef.value = payload?.drawing || null;
  emit("mapReady", payload);
}

function findPin(id) {
  return flatPins.value.find((p) => p.id === id) || null;
}

function onEditPin(id) {
  activePinId.value = id;
}

watch(activePinId, (id) => {
  const d = drawingRef.value;
  const m = mapRef.value;
  if (!d) return;
  const pin = findPin(id);
  if (pin && pin.shape && (pin.shape.type === "polygon" || pin.shape.type === "polyline")) {
    d.editExistingPin(pin);
    zoomToPin(m, pin);
  }
});

// با شروع یک ترسیم تازه، انتخاب قبلی باطل می‌شود تا جدول نقاط قبلی دیده نشود
watch(
  () => drawingRef.value?.drawMode,
  (mode) => {
    if (!mode) return;
    const d = drawingRef.value;
    if (d && !d.editingPin?.()) activePinId.value = null;
  },
  { flush: "sync" },
);

// زوم روی ترسیم انتخاب‌شده از لیست «ترسیم‌ها» بر اساس محدوده نقاط آن
function zoomToPin(m, pin) {
  if (!m) return;
  const pos = pin?.shape?.positions;
  if (!Array.isArray(pos) || pos.length < 2) return;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const p of pos) {
    const lng = Number(p.lon ?? p.lng);
    const lat = Number(p.lat);
    if (!isFinite(lng) || !isFinite(lat)) return;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  try {
    m.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 80,
      maxZoom: 19,
      duration: 800,
    });
  } catch (e) {}
}

function onShapeCreated(pin) {
  activePinId.value = pin.id;
}

/* -------- ویرایش نام ترسیم -------- */
const editingNameId = ref(null);
const editingName = ref("");
const nameInputRef = ref(null);

function startNameEdit(p) {
  editingNameId.value = p.id;
  editingName.value = p.name || "";
  nextTick(() => nameInputRef.value?.select());
}
function saveName(p) {
  if (editingNameId.value !== p.id) return;
  const name = editingName.value.trim();
  if (name) p.name = name;
  editingNameId.value = null;
}
function cancelName() {
  editingNameId.value = null;
}

function onRemove(p) {
  if (activePinId.value === p.id) activePinId.value = null;
  emit("removePin", p);
}

// آیا این ترسیم چک‌باکس فعال/غیرفعال دارد؟ (پلی‌گان و خط قابل ویرایش)
function canToggle(p) {
  return (
    p.type === "draw" &&
    !!p.shape &&
    ["polygon", "polyline"].includes(p.shape.type) &&
    Array.isArray(p.shape.positions)
  );
}

function selectPin(p) {
  if (p.selected === false) return;
  activePinId.value = p.id;
}

function setPinVisibility(pin, visible) {
  const m = mapRef.value;
  if (!m || !pin?.shape) return;
  const ids = pin.shape._sourceIds || [];
  for (const sid of ids) {
    for (const suffix of ["-fill", "-line", "-point", "-points"]) {
      const lid = sid + suffix;
      try {
        if (m.getLayer(lid))
          m.setLayoutProperty(lid, "visibility", visible ? "visible" : "none");
      } catch (e) {}
    }
  }
}

// قطع/وصل تیک چک‌باکس: نمایش/مخفی‌سازی روی نقشه و فعال/غیرفعال‌سازی ترسیم
function onToggle(p) {
  const visible = p.selected !== false;
  if (p.shape) p.shape.show = visible;
  if (!visible && activePinId.value === p.id) {
    drawingRef.value?.exitPinEdit?.();
    activePinId.value = null;
  }
  setPinVisibility(p, visible);
}

function flatten(list) {
  const out = [];
  for (const p of list || []) {
    if (p.type === "group" && Array.isArray(p.children)) out.push(...flatten(p.children));
    else out.push(p);
  }
  return out;
}

const flatPins = computed(() => flatten(props.pins));
const eligibleCount = computed(() => eligiblePinsOf(props.pins).length);

const areaInfo = computed(() => {
  const d = drawingRef.value;
  if (!d) return { show: false, text: "" };
  const mode = d.drawMode;
  const shapeType = d.shape?.type;
  const isPolygon = mode === "polygon" || shapeType === "polygon";
  const count = d.livePointCount || 0;
  const min = isPolygon ? 3 : 0;
  if (!isPolygon || count < min) return { show: false, text: "" };
  return { show: true, text: d.liveArea || "0 m²" };
});

function typeLabel(p) {
  if (p.type === "file") return "فایل KML";
  const t = p.shape?.type;
  const map = {
    polygon: "پلی‌گان",
    polyline: "خط",
    point: "نقطه",
    multi_point: "چند نقطه",
    circle: "دایره",
  };
  return map[t] || p.type || "ترسیم";
}

function shapeIcon(p) {
  const t = p.shape?.type;
  if (p.type === "file") return "fas fa-file text-accent";
  const map = {
    polygon: "fas fa-draw-polygon text-green-500",
    polyline: "fas fa-minus text-blue-500",
    point: "fas fa-map-pin text-red-500",
    multi_point: "fas fa-braille text-yellow-500",
    circle: "fas fa-circle text-purple-500",
  };
  return map[t] || "fas fa-shapes text-gray-400";
}

function submit() {
  if (!eligibleCount) return;
  emit("submit");
}
</script>
