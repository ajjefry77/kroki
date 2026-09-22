<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-xs" @click="$emit('cancel')">
          <i class="fas fa-arrow-right ml-1"></i> انصراف
        </button>
        <h3 class="font-bold text-sm">{{ isNew ? "قالب شخصی جدید" : "ویرایش قالب شخصی" }}</h3>
      </div>
      <button class="btn btn-primary btn-sm" :disabled="!valid" @click="save">
        <i class="fas fa-save ml-1"></i> ذخیره قالب
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- پیش‌نمایش -->
      <div class="card !rounded-2xl h-fit">
        <div class="font-bold text-sm mb-3 flex items-center gap-2">
          <i class="fas fa-eye text-[var(--accent)]"></i> پیش‌نمایش زنده
        </div>
        <div class="bg-white p-3 rounded-xl border border-[var(--border)]" :style="{ background: t.handDrawn ? '#fffdf5' : '#ffffff' }">
          <svg viewBox="0 0 200 150" class="w-full h-auto">
            <rect :x="t.frame === 'official' ? 4 : 6" :y="t.frame === 'official' ? 4 : 6" :width="t.frame === 'official' ? 192 : 188" :height="t.frame === 'official' ? 142 : 138" fill="none" :stroke="t.headerColor" :stroke-width="t.frame === 'bonyad' ? 3 : t.frame === 'official' || t.frame === 'color' ? 2.5 : 1.5" />
            <rect v-if="t.frame === 'official' || t.frame === 'color'" x="9" y="9" width="182" height="132" fill="none" :stroke="t.headerColor" stroke-width="0.7" stroke-opacity="0.4" />
            <rect v-if="t.titleBlock === 'official'" x="0" y="0" width="200" height="16" :fill="t.headerColor" />
            <g v-if="t.grid" stroke="#1d3a6e" stroke-width="0.4" opacity="0.25">
              <line v-for="gx in [40, 80, 120, 160]" :key="'gx' + gx" :x1="gx" :y1="22" :x2="gx" :y2="112" />
              <line v-for="gy in [45, 65, 85]" :key="'gy' + gy" x1="10" :y1="gy" x2="190" :y2="gy" />
            </g>
            <polygon :points="polyPts" :fill="t.colorful ? 'rgba(194,65,12,0.18)' : 'rgba(122,31,31,0.07)'" :stroke="t.polygonColor" stroke-width="1.6" />
            <circle v-for="(p, i) in polyVerts" :key="'v' + i" :cx="p[0]" :cy="p[1]" r="2" :fill="t.polygonColor" />
            <text v-for="(p, i) in polyVerts" :key="'l' + i" :x="p[0]" :y="p[1] - 6" fill="#333" font-size="7" font-weight="700" font-family="Tahoma" text-anchor="middle">{{ vertexLabel(t.vertexLabels, i) }}</text>
            <g v-if="t.northArrow" stroke="#333" stroke-width="1">
              <line x1="185" y1="24" x2="185" y2="42" />
              <path d="M185 40 L182.5 46 L187.5 46 Z" fill="#333" stroke="none" />
            </g>
            <g v-if="t.scaleBar" stroke="#333" stroke-width="1.2">
              <line x1="14" y1="122" x2="54" y2="122" />
              <line x1="14" y1="120" x2="14" y2="124" />
              <line x1="54" y1="120" x2="54" y2="124" />
            </g>
            <rect v-if="t.titleBlock === 'official'" x="10" y="128" width="180" height="14" fill="none" :stroke="t.headerColor" stroke-width="0.7" />
            <rect v-if="t.titleBlock === 'official'" x="10" y="128" width="180" height="5" :fill="t.headerColor" />
          </svg>
        </div>
        <p class="text-[11px] text-[var(--text-faint)] mt-3 leading-5">
          این قالب فقط برای شما ذخیره می‌شود (در مرورگر فعلی) و هنگام ساخت کروکی در بخش «قالب‌های شخصی» در دسترس است.
        </p>
      </div>

      <!-- فرم -->
      <div class="space-y-4">
        <div class="card !rounded-2xl">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-pen text-[var(--accent)]"></i> مشخصات
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block mb-1 text-xs font-medium">نام قالب *</label>
              <input v-model="t.name" type="text" class="input" placeholder="مثلاً قالب اختصاصی دفتر من" />
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium">زیرعنوان</label>
              <input v-model="t.subtitle" type="text" class="input" placeholder="مثلاً کروکی ثبتی اختصاصی" />
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium">سربرگ</label>
              <input v-model="t.org" type="text" class="input" placeholder="نام نهاد / دفتر" />
            </div>
            <div class="sm:col-span-2">
              <label class="block mb-1 text-xs font-medium">توضیح کوتاه</label>
              <input v-model="t.description" type="text" class="input" placeholder="توضیحی کوتاه برای این قالب" />
            </div>
          </div>
        </div>

        <div class="card !rounded-2xl">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-palette text-[var(--accent)]"></i> رنگ‌ها
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div v-for="c in colorFields" :key="c.key" class="flex items-center gap-2">
              <input type="color" v-model="t[c.key]" class="w-9 h-9 rounded border border-[var(--border)] cursor-pointer shrink-0" />
              <div class="min-w-0">
                <label class="block text-[10px] text-[var(--text-muted)]">{{ c.label }}</label>
                <code class="text-[11px]" dir="ltr">{{ t[c.key] }}</code>
              </div>
            </div>
          </div>
        </div>

        <div class="card !rounded-2xl">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-sliders text-[var(--accent)]"></i> ساختار
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 text-xs font-medium">قاب</label>
              <select v-model="t.frame" class="input">
                <option v-for="f in frames" :key="f.id" :value="f.id">{{ f.label }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium">سرتیتر (Title Block)</label>
              <select v-model="t.titleBlock" class="input">
                <option value="official">رسمی</option>
                <option value="technical">فنی</option>
                <option value="hand">دستی</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium">نام‌گذاری رئوس</label>
              <select v-model="t.vertexLabels" class="input">
                <option value="numbers">شماره (۱، ۲، ۳)</option>
                <option value="letters">حروف (A، B، C)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-xs font-medium">جدول مختصات</label>
              <select v-model="t.coordinateTable" class="input">
                <option value="html">نمایش جدول</option>
                <option value="none">بدون جدول</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            <label v-for="f in toggles" :key="f.key" class="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" v-model="t[f.key]" />
              {{ f.label }}
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { vertexLabel } from "../utils/templates";
import { SKETCH_TEMPLATES } from "../utils/templates";

const props = defineProps({
  modelValue: { type: Object, default: null },
  isNew: { type: Boolean, default: false },
});
const emit = defineEmits(["save", "cancel", "update:modelValue"]);

const base = () => ({ ...SKETCH_TEMPLATES[0] });

function makeDefault() {
  const t = { ...base() };
  t.id = "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  t.name = "قالب شخصی جدید";
  t.subtitle = "کروکی اختصاصی";
  t.description = "قالب طراحی‌شده توسط کاربر";
  return t;
}

const t = ref(props.modelValue ? { ...props.modelValue } : makeDefault());

const frames = [
  { id: "technical", label: "فنی" },
  { id: "official", label: "رسمی دوکادر" },
  { id: "bonyad", label: "بنیاد مسکن" },
  { id: "color", label: "رنگی" },
  { id: "hand", label: "دستی" },
];
const colorFields = [
  { key: "headerColor", label: "سربرگ/قاب" },
  { key: "polygonColor", label: "خط ترسیم" },
  { key: "centerColor", label: "نقطه مرکز" },
  { key: "textColor", label: "متن" },
  { key: "paper", label: "رنگ کاغذ" },
];
const toggles = [
  { key: "grid", label: "شبکه مختصات" },
  { key: "scaleBar", label: "نوار مقیاس" },
  { key: "northArrow", label: "فلش شمال" },
  { key: "handDrawn", label: "سبک دستی" },
  { key: "colorful", label: "پرکردن رنگی" },
];

const polyPts = "70,55 110,40 135,70 100,92 60,80";
const polyVerts = [
  [70, 55],
  [110, 40],
  [135, 70],
  [100, 92],
  [60, 80],
];

const valid = computed(() => Boolean(String(t.value.name || "").trim()));

function save() {
  if (!valid.value) return;
  emit("update:modelValue", t.value);
  emit("save", { ...t.value });
}
</script>