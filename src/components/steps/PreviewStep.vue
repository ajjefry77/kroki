<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-[var(--bg)]">
    <div class="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <!-- سربرگ -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-lg flex items-center gap-2">
            <i class="fas fa-eye text-[var(--accent)]"></i>
            پیش‌نمایش کروکی
          </h2>
          <p class="text-xs text-[var(--text-muted)] mt-1">بررسی نهایی پیش از پرداخت</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <i class="fas fa-layers text-[var(--accent)]"></i>
            {{ currentTemplate?.name }} — {{ currentTemplate?.subtitle }}
          </span>
        </div>
      </div>

      <!-- جهت خروجی PDF -->
      <div v-if="gen.state.ready" class="card !rounded-2xl !py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs font-semibold flex items-center gap-2">
            <i class="fas fa-file-pdf text-[var(--accent)]"></i>
            جهت خروجی PDF
          </div>
          <div class="flex items-center gap-1.5 bg-[var(--surface2)] p-1 rounded-lg border border-[var(--border)]">
            <button
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition"
              :class="gen.state.orientation === 'portrait' ? 'bg-[var(--accent)] text-[#241a05]' : 'text-[var(--text-muted)]'"
              @click="gen.setOrientation('portrait')"
            >
              <i class="fas fa-mobile-screen ml-1"></i> عمودی
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition"
              :class="gen.state.orientation === 'landscape' ? 'bg-[var(--accent)] text-[#241a05]' : 'text-[var(--text-muted)]'"
              @click="gen.setOrientation('landscape')"
            >
              <i class="fas fa-tablet-screen-button fa-rotate-90 ml-1"></i> افقی
            </button>
          </div>
        </div>
        <p class="text-[10px] text-[var(--text-faint)] mt-2 leading-5">
          در حالت عمودی، کروکی در یک سطر کامل قرار می‌گیرد و تصویر نقشه در یک قاب جداگانه زیر آن چاپ می‌شود.
          در حالت افقی، کروکی بزرگ در وسط صفحه و سایر اطلاعات در دو طرف آن چیده می‌شوند.
        </p>
      </div>

      <!-- نشانی ملک -->
      <div v-if="gen.state.ready" class="card !rounded-2xl !py-3">
        <label class="text-xs font-semibold flex items-center gap-2 mb-2">
          <i class="fas fa-location-dot text-[var(--accent)]"></i>
          نشانی ملک (قابل ویرایش — در پیش‌نویس و PDF درج می‌شود)
        </label>
        <input
          v-model="gen.last.form.address"
          type="text"
          class="input !text-xs"
          placeholder="نشانی کامل ملک را وارد یا ویرایش کنید"
          @input="rerender"
        />
      </div>

      <!-- حالت تولید -->
      <div v-if="gen.state.generating" class="card !rounded-2xl py-16 flex flex-col items-center gap-3 text-[var(--text-muted)]">
        <i class="fas fa-sync-alt fa-spin text-2xl text-[var(--accent)]"></i>
        <span class="text-sm">در حال تولید کروکی…</span>
      </div>

      <div v-else-if="gen.state.errorMsg" class="card !rounded-2xl py-10 text-center">
        <i class="fas fa-triangle-exclamation text-3xl text-[var(--danger)] mb-3"></i>
        <p class="text-sm text-[var(--danger)]">{{ gen.state.errorMsg }}</p>
        <button class="btn btn-secondary btn-sm mt-4" @click="$emit('back')">
          <i class="fas fa-arrow-right ml-1"></i>
          بازگشت
        </button>
      </div>

      <template v-else-if="gen.state.ready">
        <!-- خروجی اصلی — کمی تار -->
        <div class="card !rounded-2xl !p-3">
          <div class="flex items-center justify-between px-1 mb-2">
            <span class="text-xs font-semibold flex items-center gap-1.5">
              <i class="fas fa-file-lines text-[var(--accent)]"></i>
              پیش‌نمایش خروجی نهایی ({{ gen.state.orientation === 'landscape' ? 'افقی' : 'عمودی' }})
            </span>
            <span class="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
              <i class="fas fa-lock"></i>
              نسخه نهایی پس از پرداخت با کیفیت کامل
            </span>
          </div>
          <div class="relative select-none">
            <iframe
              v-if="previewDoc"
              :srcdoc="previewDoc"
              class="preview-sheet-frame preview-blur"
              :class="gen.state.orientation === 'landscape' ? 'is-landscape' : 'is-portrait preview-blur-more'"
              tabindex="-1"
              title="پیش‌نمایش خروجی نهایی"
            ></iframe>
            <div v-else class="preview-fallback">
              <canvas
                ref="fallbackCanvasRef"
                class="w-full h-auto border border-[var(--border)] rounded-lg bg-white preview-blur"
                :width="canvasW"
                :height="canvasH"
              ></canvas>
              <p class="text-[11px] text-[var(--text-faint)] text-center mt-2">در حال آماده‌سازی پیش‌نمایش…</p>
            </div>
            <div class="preview-watermark">
              <span>پیش‌نمایش</span>
            </div>
          </div>
          <p class="text-[10px] text-[var(--text-faint)] text-center mt-2 leading-5">
            خروجی اصلی با کمی تاری نمایش داده شده است
          </p>
        </div>

        <!-- کانواس مخفی برای تولید تصویر کروکی (خارج از دید ولی قابل رندر) -->
        <canvas ref="sketchCanvasRef" class="preview-offscreen" :width="canvasW" :height="canvasH"></canvas>

        <!-- شخصی‌سازی ظاهر کروکی -->
        <div class="card !rounded-2xl">
          <button type="button" class="w-full flex items-center justify-between" @click="customizeOpen = !customizeOpen">
            <div class="font-semibold text-sm flex items-center gap-2">
              <i class="fas fa-palette text-[var(--accent)]"></i>
              شخصی‌سازی ظاهر کروکی
            </div>
            <i class="fas text-xs text-[var(--text-muted)]" :class="customizeOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>

          <div v-if="customizeOpen" class="mt-4 space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div v-for="c in colorFields" :key="c.key" class="flex items-center gap-2">
                <input
                  type="color"
                  :value="styleVal(c.key, currentTemplate?.[c.key])"
                  class="w-8 h-8 rounded border border-[var(--border)] cursor-pointer shrink-0"
                  @input="setStyle(c.key, $event.target.value)"
                />
                <label class="text-[10px] text-[var(--text-muted)]">{{ c.label }}</label>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block mb-1 text-[11px] font-medium">ضخامت خطوط: {{ styleVal('lineWidth', 2.5) }}</label>
                <input type="range" min="1" max="6" step="0.5" :value="styleVal('lineWidth', 2.5)" class="w-full" @input="setStyle('lineWidth', +$event.target.value)" />
              </div>
              <div>
                <label class="block mb-1 text-[11px] font-medium">اندازه نقطه رئوس: {{ styleVal('vertexRadius', 4) }}</label>
                <input type="range" min="2" max="9" step="1" :value="styleVal('vertexRadius', 4)" class="w-full" @input="setStyle('vertexRadius', +$event.target.value)" />
              </div>
              <div>
                <label class="block mb-1 text-[11px] font-medium">اندازه فونت برچسب رئوس: {{ styleVal('labelFontSize', 20) }}</label>
                <input type="range" min="12" max="36" step="1" :value="styleVal('labelFontSize', 20)" class="w-full" @input="setStyle('labelFontSize', +$event.target.value)" />
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block mb-1 text-[11px] font-medium">نام‌گذاری رئوس</label>
                <select class="input !py-1.5 !text-xs" :value="styleVal('vertexLabels', currentTemplate?.vertexLabels)" @change="setStyle('vertexLabels', $event.target.value)">
                  <option value="numbers">شماره (۱،۲،۳)</option>
                  <option value="letters">حروف (A,B,C)</option>
                </select>
              </div>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('grid', currentTemplate?.grid)" @change="setStyle('grid', $event.target.checked)" />
                شبکه مختصات
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('scaleBar', currentTemplate?.scaleBar)" @change="setStyle('scaleBar', $event.target.checked)" />
                نوار مقیاس
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('northArrow', currentTemplate?.northArrow)" @change="setStyle('northArrow', $event.target.checked)" />
                فلش شمال
              </label>
            </div>

            <div class="flex justify-end">
              <button type="button" class="btn btn-ghost btn-xs" @click="resetStyles">
                <i class="fas fa-rotate-left ml-1"></i>
                بازگشت به تنظیمات قالب
              </button>
            </div>
          </div>
        </div>

        <!-- متن ضلع‌ها / اطلاعات مجاورت — فقط در قالب ثبتی قابل ورود است -->
        <div v-if="currentTemplate?.id === 'sabt' && gen.state.edgeTexts.length" class="card !rounded-2xl">
          <div class="font-semibold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-font text-[var(--accent)]"></i>
            متن ضلع‌ها / اطلاعات مجاورت (نام کوچه، معبر، ملک مجاور)
          </div>
          <p class="text-[10px] text-[var(--text-faint)] mb-3 -mt-2">
            این بخش مخصوص قالب «ثبتی» است و فقط در همین حالت قابل ورود می‌باشد.
          </p>
          <div v-for="(shapeTexts, m) in gen.state.edgeTexts" :key="m" class="mb-3 last:mb-0">
            <div class="text-[11px] text-[var(--text-muted)] mb-1.5">
              ترسیم {{ m + 1 }}
            </div>
            <div class="flex flex-wrap gap-2">
              <input
                v-for="(txt, i) in shapeTexts"
                :key="i"
                v-model="gen.state.edgeTexts[m][i]"
                type="text"
                class="input !py-1.5 !text-xs flex-1 min-w-[7rem]"
                :placeholder="'ضلع ' + (i + 1)"
                @input="rerender"
              />
            </div>
          </div>
        </div>

      </template>
    </div>

    <!-- نوار پیمایش -->
    <div class="sticky bottom-0 px-4 md:px-6 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-t border-[var(--border)]">
      <div class="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <button class="btn btn-ghost" @click="$emit('back')">
          <i class="fas fa-arrow-right ml-1"></i>
          ویرایش اطلاعات
        </button>
        <button class="btn btn-primary" :disabled="!gen.state.ready" @click="$emit('pay')">
          ادامه به پرداخت
          <i class="fas fa-arrow-left mr-1"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { getTemplate } from "../../utils/templates";
import { logger } from "../../utils/logger";

const props = defineProps({
  gen: { type: Object, required: true },
  templateId: { type: String, default: "technical" },
});

const emit = defineEmits(["back", "pay"]);

const sketchCanvasRef = ref(null);
const fallbackCanvasRef = ref(null);
const canvasW = ref(700);
const canvasH = ref(700);
const customizeOpen = ref(false);
const previewDoc = ref("");

const currentTemplate = computed(() => getTemplate(props.templateId));

const colorFields = [
  { key: "headerColor", label: "سربرگ / قاب" },
  { key: "polygonColor", label: "خط ترسیم" },
  { key: "centerColor", label: "نقطه مرکز" },
  { key: "textColor", label: "متن" },
];

function styleVal(key, fallback) {
  const v = props.gen.state.styleOverrides[key];
  return v === undefined || v === null ? fallback : v;
}

function setStyle(key, value) {
  props.gen.setStyleOverride(key, value);
  rerender();
}

function resetStyles() {
  props.gen.resetStyleOverrides();
  rerender();
}

function rerender() {
  updatePreview();
}

function sizeCanvas() {
  const pts = props.gen.state.utmPoints;
  if (!pts.length) return;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1);
  const { w, h } = props.gen.computeCanvasSize(spanX, spanY);
  canvasW.value = w;
  canvasH.value = h;
}

function renderSketchNow() {
  updatePreview();
}

function updatePreview() {
  nextTick(() => {
    nextTick(() => {
      const canvas = sketchCanvasRef.value;
      if (!canvas) return;
      try {
        props.gen.renderSketch(canvas);
      } catch (e) {
        logger.error("preview", "خطا در رندر کروکی", e?.message);
        return;
      }
      // رندر فالبک هم تا اگر iframe آماده نشد صفحه خالی نماند
      try {
        if (fallbackCanvasRef.value) props.gen.renderSketch(fallbackCanvasRef.value);
      } catch (e) {}
      try {
        const sketchImg = canvas.toDataURL("image/jpeg", 0.85) || "";
        const { html } = props.gen.buildPrintHtml();
        const landscape = props.gen.state.orientation === "landscape";
        const css =
          typeof props.gen.printCss === "function"
            ? props.gen.printCss(landscape)
            : "";
        const finalHtml = html.replace("__SKETCH__", sketchImg);
        previewDoc.value = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><style>${css}html,body{margin:0;padding:0;background:#fff;}.sheet{width:100% !important;height:auto !important;min-height:100%;}</style></head><body>${finalHtml}</body></html>`;
      } catch (e) {
        logger.error("preview", "خطا در ساخت پیش‌نمایش", e?.message);
      }
    });
  });
}

onMounted(async () => {
  sizeCanvas();
  await nextTick();
  updatePreview();
  logger.info("step", "مشاهده پیش‌نمایش کروکی", { template: props.templateId });
});

watch(
  () => props.templateId,
  () => {
    updatePreview();
  },
);

watch(
  () => props.gen.state.orientation,
  () => {
    updatePreview();
  },
);

watch(
  () => props.gen.state.styleOverrides,
  () => {
    updatePreview();
  },
  { deep: true },
);

watch(
  () => props.gen.state.edgeTexts,
  () => {
    updatePreview();
  },
  { deep: true },
);

watch(
  () => props.gen.state.mapImage,
  () => {
    updatePreview();
  },
);
</script>

<style scoped>
.preview-offscreen {
  position: fixed;
  right: -10000px;
  bottom: 0;
  width: 10px;
  height: 10px;
  opacity: 0;
  pointer-events: none;
}
.preview-fallback {
  width: 100%;
}
.preview-sheet-frame {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  pointer-events: none;
  user-select: none;
}
.preview-sheet-frame.is-portrait {
  aspect-ratio: 210 / 297;
}
.preview-sheet-frame.is-landscape {
  aspect-ratio: 297 / 210;
}
.preview-blur {
  filter: blur(0.9px) saturate(0.92);
  opacity: 0.98;
}
.preview-blur-more {
  filter: blur(2px) saturate(0.9);
}
.preview-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.preview-watermark span {
  transform: rotate(-18deg);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 10px;
  white-space: nowrap;
}
</style>
