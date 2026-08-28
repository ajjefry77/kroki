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
          <button class="btn btn-ghost btn-sm" :disabled="!gen.state.ready" @click="print">
            <i class="fas fa-print ml-1"></i>
            چاپ
          </button>
        </div>
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
        <!-- تصاویر -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="card !rounded-2xl !p-3">
            <div class="flex items-center justify-between px-1 mb-2">
              <span class="text-xs font-semibold flex items-center gap-1.5">
                <i class="fas fa-satellite text-[var(--accent)]"></i>
                تصویر نقشه
              </span>
              <button class="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition" title="دانلود" @click="downloadMap">
                <i class="fas fa-download"></i>
              </button>
            </div>
            <img
              v-if="gen.state.mapImage"
              :src="gen.state.mapImage"
              class="w-full border border-[var(--border)] rounded-lg bg-[var(--surface2)]"
              alt="تصویر نقشه"
            />
            <div v-else class="h-64 flex items-center justify-center text-xs text-[var(--text-faint)]">
              تصویر نقشه در دسترس نیست
            </div>
          </div>

          <div class="card !rounded-2xl !p-3">
            <div class="flex items-center justify-between px-1 mb-2">
              <span class="text-xs font-semibold flex items-center gap-1.5">
                <i class="fas fa-drafting-compass text-[var(--accent)]"></i>
                {{ currentTemplate?.subtitle }}
              </span>
              <button class="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition" title="دانلود" @click="downloadSketch">
                <i class="fas fa-download"></i>
              </button>
            </div>
            <canvas
              ref="sketchCanvasRef"
              class="w-full h-auto border border-[var(--border)] rounded-lg bg-white"
              :width="canvasW"
              :height="canvasH"
            ></canvas>
          </div>
        </div>

        <!-- متن ضلع‌ها -->
        <div v-if="gen.state.edgeTexts.length" class="card !rounded-2xl">
          <div class="font-semibold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-font text-[var(--accent)]"></i>
            متن ضلع‌ها (نام کوچه، معبر، ملک مجاور)
          </div>
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

        <!-- جدول مختصات -->
        <div class="card !rounded-2xl">
          <div class="font-semibold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-table text-[var(--accent)]"></i>
            مختصات UTM — Zone: {{ gen.state.utmZone || '—' }}
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr>
                  <th>شماره نقطه</th>
                  <th>X</th>
                  <th>Y</th>
                  <th>Zone</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in gen.state.utmPoints" :key="i">
                  <td class="text-center">{{ i + 1 }}</td>
                  <td class="text-center" dir="ltr">{{ p.x.toFixed(2) }}</td>
                  <td class="text-center" dir="ltr">{{ p.y.toFixed(2) }}</td>
                  <td class="text-center">{{ p.zone ?? gen.state.utmZone }}</td>
                </tr>
                <tr v-if="gen.state.centerUtm" class="font-semibold">
                  <td class="text-center">مرکز</td>
                  <td class="text-center" dir="ltr">{{ gen.state.centerUtm.x.toFixed(2) }}</td>
                  <td class="text-center" dir="ltr">{{ gen.state.centerUtm.y.toFixed(2) }}</td>
                  <td class="text-center">{{ gen.state.centerUtm.zone ?? gen.state.utmZone }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-3 text-xs text-[var(--text-muted)]">
            <i class="fas fa-arrows-to-circle ml-1 text-[var(--accent)]"></i>
            مساحت کل: <span class="font-semibold text-[var(--text)]">{{ gen.state.areaM2.toFixed(2) }}</span> متر مربع
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
const canvasW = ref(700);
const canvasH = ref(700);

const currentTemplate = computed(() => getTemplate(props.templateId));

function rerender() {
  nextTick(() => {
    props.gen.renderSketch(sketchCanvasRef.value);
  });
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
  nextTick(() => {
    props.gen.renderSketch(sketchCanvasRef.value);
  });
}

onMounted(() => {
  sizeCanvas();
  renderSketchNow();
  logger.info("step", "مشاهده پیش‌نمایش کروکی", { template: props.templateId });
});

watch(
  () => props.templateId,
  () => {
    renderSketchNow();
  },
);

function downloadMap() {
  const url = props.gen.state.mapImage;
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = "kroki-map.png";
  a.click();
}

function downloadSketch() {
  props.gen.downloadCanvasImage(sketchCanvasRef.value, "kroki-sketch.png");
}

function print() {
  props.gen.openPrint(sketchCanvasRef.value);
}
</script>
