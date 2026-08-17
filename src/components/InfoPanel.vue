<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- هدر پنل -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
      <h2 class="text-sm font-semibold flex items-center gap-2">
        <i class="fas fa-clipboard-list text-accent"></i>
        اطلاعات کروکی
      </h2>
      <button
        class="btn btn-primary btn-sm"
        :disabled="!hasEligibleDrawings"
        @click="$emit('openKroki')"
        title="پیش‌نمایش و تولید کروکی"
      >
        <i class="fas fa-print ml-1"></i>
        تولید کروکی
      </button>
    </div>

    <!-- بدنه -->
    <div class="flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4 overflow-y-auto">
      <!-- اطلاعات کروکی -->
      <div class="kroki-box p-3 md:w-1/3 flex-shrink-0">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="block mb-1 font-medium text-xs">عنوان نقشه</label>
            <input v-model="form.title" type="text" class="input" placeholder="پلان وضعیت موجود" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-xs">کارفرما</label>
            <input v-model="form.client" type="text" class="input" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-xs">نشانی ملک</label>
            <input v-model="form.address" type="text" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="block mb-1 font-medium text-xs">تاریخ برداشت</label>
            <input
              v-model="form.date"
              type="text"
              class="input text-center"
              placeholder="1403/01/01"
              dir="ltr"
              @input="form.date = form.date.replace(/[^\d/]/g, '')"
            />
          </div>
        </div>
      </div>

      <!-- فهرست ترسیم‌ها -->
      <div class="kroki-box p-3 flex-1 min-w-0">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm">ترسیم‌های روی نقشه</span>
          <span class="text-[11px] text-[var(--text-muted)]">{{ flatPins.length }} مورد</span>
        </div>

        <div v-if="!flatPins.length" class="text-center py-8 text-[var(--text-faint)] text-xs">
          <i class="fas fa-draw-polygon text-2xl block mb-2 opacity-50"></i>
          هنوز ترسیمی روی نقشه وجود ندارد.
          <br />از ابزارهای سمت چپ نقشه استفاده کنید یا فایل KML آپلود کنید.
        </div>

        <div v-else class="space-y-1.5 max-h-[240px] overflow-y-auto">
          <div
            v-for="p in flatPins"
            :key="p.id"
            class="flex items-center gap-2 rounded px-2 py-1.5 bg-[var(--surface2)] border border-transparent"
            :class="{ 'border-accent/30': isKrokiEligible(p) && p.selected !== false }"
          >
            <input
              v-if="isKrokiEligible(p)"
              v-model="p.selected"
              type="checkbox"
              class="accent-[var(--accent)]"
              :title="p.selected === false ? 'شامل ساختن در کروکی' : 'حذف از کروکی'"
            />
            <i
              class="w-4 text-center text-xs"
              :class="shapeIcon(p)"
            ></i>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium truncate">{{ p.name || 'بدون نام' }}</div>
              <div class="text-[10px] text-[var(--text-muted)]">
                {{ typeLabel(p) }}
              </div>
            </div>
            <button
              class="text-gray-500 hover:text-red-500 text-sm px-1 leading-none"
              title="حذف ترسیم"
              @click="removePin(p)"
            >
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  pins: { type: Object, required: true },
  form: { type: Object, required: true },
});

const emit = defineEmits(["openKroki", "removePin"]);

function flatten(list) {
  const out = [];
  for (const p of list || []) {
    if (p.type === "group" && Array.isArray(p.children)) {
      out.push(...flatten(p.children));
    } else {
      out.push(p);
    }
  }
  return out;
}

const flatPins = computed(() => flatten(props.pins));

function isKrokiEligible(p) {
  return (
    p.type === "draw" &&
    !!p.shape &&
    ["polygon", "polyline"].includes(p.shape.type) &&
    Array.isArray(p.shape.positions) &&
    p.shape.positions.length >= 2
  );
}

const hasEligibleDrawings = computed(() =>
  flatPins.value.some((p) => isKrokiEligible(p) && p.selected !== false),
);

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

function removePin(p) {
  emit("removePin", p);
}
</script>

<style scoped>
.kroki-box {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
