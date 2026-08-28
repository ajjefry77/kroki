<template>
  <div class="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
    <main class="min-h-0 flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
      <!-- نقشه -->
      <section class="relative flex-1 min-h-[340px] lg:min-h-0 border-b lg:border-b-0 border-[var(--border)]">
        <MapPanel :pins="pins" @mapReady="onMapReady" @openKroki="$emit('openKroki')" />
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
                class="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-[var(--surface2)] border transition cursor-pointer"
                :class="[
                  isKrokiEligible(p) ? 'border-[var(--border)]' : 'border-[var(--border)]/50 opacity-70',
                  activePinId === p.id ? 'ring-2 ring-[var(--accent)]' : '',
                ]"
                @click="activePinId = p.id"
              >
                <input
                  v-if="isKrokiEligible(p)"
                  v-model="p.selected"
                  type="checkbox"
                  class="accent-[var(--accent)]"
                  :title="p.selected === false ? 'شامل ساختن در کروکی' : 'حذف از کروکی'"
                  @click.stop
                />
                <i class="w-4 text-center text-xs" :class="shapeIcon(p)"></i>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium truncate">{{ p.name || 'بدون نام' }}</div>
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
                <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> تیک ترسیم‌هایی که می‌خواهید در کروکی بیاید فعال باشد.</li>
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
import { ref, computed } from "vue";
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

function onShapeCreated(pin) {
  activePinId.value = pin.id;
}

function onRemove(p) {
  if (activePinId.value === p.id) activePinId.value = null;
  emit("removePin", p);
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
