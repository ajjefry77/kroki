<template>
  <div class="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
    <main class="flex-1 min-h-0 flex flex-col lg:flex-row">
      <!-- نقشه -->
      <section class="relative flex-1 min-h-[340px] lg:min-h-0 border-b lg:border-b-0 lg:border-l border-[var(--border)]">
        <MapPanel :pins="pins" @mapReady="$emit('mapReady', $event)" @openKroki="$emit('openKroki')" />
      </section>

      <!-- لیست ترسیم‌ها -->
      <aside class="lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col border-t lg:border-t-0 border-[var(--border)] bg-[var(--surface)]">
        <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 class="text-sm font-semibold flex items-center gap-2">
            <i class="fas fa-list-check text-[var(--accent)]"></i>
            ترسیم‌های روی نقشه
          </h2>
          <span class="text-[11px] text-[var(--text-muted)] bg-[var(--surface2)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
            {{ eligibleCount }} مورد معتبر
          </span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-3">
          <div v-if="!flatPins.length" class="text-center py-10 text-[var(--text-faint)] text-xs space-y-3">
            <i class="fas fa-draw-polygon text-3xl block opacity-40"></i>
            <p>
              هنوز ترسیمی روی نقشه وجود ندارد.<br />
              از ابزارهای سمت چپ نقشه استفاده کنید<br />
              یا فایل KML آپلود کنید.
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
              :class="isKrokiEligible(p) ? 'border-[var(--border)]' : 'border-[var(--border)]/50 opacity-70'"
            >
              <input
                v-if="isKrokiEligible(p)"
                v-model="p.selected"
                type="checkbox"
                class="accent-[var(--accent)]"
                :title="p.selected === false ? 'شامل ساختن در کروکی' : 'حذف از کروکی'"
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
                @click="$emit('removePin', p)"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>

          <!-- راهنما -->
          <div v-if="showKmlHint && flatPins.length" class="mt-3 text-[11px] text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 leading-6">
            <div class="font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
              <i class="fas fa-lightbulb text-[var(--warning)]"></i>
              راهنمای ترسیم
            </div>
            <ul class="space-y-1">
              <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> از تولبار سمت چپ نقشه، ابزار ترسیم را انتخاب کنید.</li>
              <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> با کلیک روی نقشه نقاط را اضافه کنید و با Enter پایان دهید.</li>
              <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> برای آپلود فایل KML/KMZ از دکمه بالای نقشه استفاده کنید.</li>
              <li><i class="fas fa-circle text-[7px] ml-1.5 align-middle"></i> تیک ترسیم‌هایی که می‌خواهید در کروکی بیاید فعال باشد.</li>
            </ul>
          </div>

          <div v-if="flatPins.length" class="mt-3 text-[10px] text-[var(--text-faint)]">
            <i class="fas fa-info-circle ml-1"></i>
            تنها پلی‌گان و خط با حداقل ۲ نقطه در کروکی لحاظ می‌شوند.
          </div>
        </div>

        <!-- هشدار اعتبار -->
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
import { eligiblePinsOf, isKrokiEligible } from "../../composables/useKrokiGenerator";

const props = defineProps({
  pins: { type: Object, required: true },
});

const emit = defineEmits(["mapReady", "openKroki", "removePin", "submit", "back"]);

const showKmlHint = ref(false);

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
