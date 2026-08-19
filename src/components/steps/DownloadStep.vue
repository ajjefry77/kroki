<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-[var(--bg)]">
    <div class="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <!-- سربرگ موفق -->
      <div class="card !rounded-3xl py-12 text-center mb-6">
        <div class="w-20 h-20 mx-auto rounded-full bg-[var(--success-glow)] border-2 border-[var(--success)] flex items-center justify-center mb-6 animate-pop">
          <i class="fas fa-circle-check text-3xl text-[var(--success)]"></i>
        </div>
        <h2 class="text-2xl md:text-3xl font-extrabold mb-3">کروکی شما آماده دانلود است</h2>
        <p class="text-sm text-[var(--text-muted)] mb-1">سفارش با موفقیت تکمیل شد.</p>
        <div class="flex items-center justify-center gap-3 text-xs text-[var(--text-muted)] mt-4">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface2)] border border-[var(--border)]">
            <i class="fas fa-hashtag text-[var(--accent)]"></i>
            کد سفارش: <span class="font-bold text-[var(--accent-soft)]" dir="ltr">{{ trackingCode }}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface2)] border border-[var(--border)]">
            <i class="fas fa-layers text-[var(--accent)]"></i>
            {{ currentTemplate.name }}
          </span>
        </div>
      </div>

      <!-- خلاصه سفارش -->
      <div class="card !rounded-2xl mb-6">
        <div class="font-bold text-sm mb-4 flex items-center gap-2">
          <i class="fas fa-receipt text-[var(--accent)]"></i>
          مشخصات سفارش
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-3 py-2.5">
            <span class="text-[var(--text-muted)]">عنوان</span>
            <span class="font-medium">{{ form.title }}</span>
          </div>
          <div class="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-3 py-2.5">
            <span class="text-[var(--text-muted)]">کارفرما</span>
            <span class="font-medium">{{ form.client }}</span>
          </div>
          <div class="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-3 py-2.5">
            <span class="text-[var(--text-muted)]">تاریخ برداشت</span>
            <span class="font-medium">{{ form.date }}</span>
          </div>
          <div class="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-3 py-2.5">
            <span class="text-[var(--text-muted)]">مساحت</span>
            <span class="font-medium">{{ gen.state.areaM2.toFixed(2) }} متر مربع</span>
          </div>
        </div>
      </div>

      <!-- دانلود -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button class="download-card" @click="downloadSketch">
          <div class="w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-3">
            <i class="fas fa-drafting-compass text-lg text-[var(--accent)]"></i>
          </div>
          <div class="font-bold text-sm mb-1">کروکی نهایی</div>
          <div class="text-[11px] text-[var(--text-muted)] mb-3">{{ currentTemplate.name }}</div>
          <span class="text-xs font-semibold text-[var(--accent-soft)] flex items-center gap-1">
            <i class="fas fa-download"></i>
            دانلود PNG
          </span>
        </button>

        <button class="download-card" @click="downloadMap">
          <div class="w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-3">
            <i class="fas fa-satellite text-lg text-[var(--accent)]"></i>
          </div>
          <div class="font-bold text-sm mb-1">تصویر نقشه</div>
          <div class="text-[11px] text-[var(--text-muted)] mb-3">خروجی ماهواره‌ای محدوده</div>
          <span class="text-xs font-semibold text-[var(--accent-soft)] flex items-center gap-1">
            <i class="fas fa-download"></i>
            دانلود PNG
          </span>
        </button>

        <button class="download-card" @click="downloadPdf">
          <div class="w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-3">
            <i class="fas fa-file-pdf text-lg text-[var(--accent)]"></i>
          </div>
          <div class="font-bold text-sm mb-1">نسخه چاپی</div>
          <div class="text-[11px] text-[var(--text-muted)] mb-3">مستند رسمی با جداول</div>
          <span class="text-xs font-semibold text-[var(--accent-soft)] flex items-center gap-1">
            <i class="fas fa-print"></i>
            PDF / چاپ
          </span>
        </button>
      </div>

      <!-- کانواس مخفی برای خروجی -->
      <canvas ref="hiddenCanvasRef" class="hidden"></canvas>

      <div class="card !rounded-2xl border-[var(--warning)]/40 bg-[var(--warning-glow)] mb-6">
        <div class="flex items-start gap-3 text-xs leading-6">
          <i class="fas fa-circle-info text-[var(--warning)] mt-1"></i>
          <div class="text-[var(--text-muted)]">
            نسخه PDF با انتخاب «ذخیره به‌عنوان PDF» در پنجره چاپ مرورگر قابل دریافت است.
            کروکی تولیدشده جنبه نمایشی دارد و برای مصارف حقوقی باید به تأیید کارشناس رسمی برسد.
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button class="btn btn-primary !px-10 !py-3.5 !text-base" @click="$emit('restart')">
          <i class="fas fa-plus ml-2"></i>
          سفارش جدید
        </button>
        <button class="btn btn-ghost !px-10 !py-3.5 !text-base" @click="$emit('home')">
          <i class="fas fa-home ml-2"></i>
          صفحه اصلی
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { getTemplate } from "../../utils/templates";
import { logger } from "../../utils/logger";

const props = defineProps({
  gen: { type: Object, required: true },
  form: { type: Object, required: true },
  templateId: { type: String, default: "technical" },
  trackingCode: { type: String, default: "—" },
});

const emit = defineEmits(["restart", "home"]);

const hiddenCanvasRef = ref(null);
const currentTemplate = getTemplate(props.templateId);

onMounted(() => {
  nextTick(() => {
    props.gen.renderSketch(hiddenCanvasRef.value);
  });
  logger.info("step", "صفحه دانلود — تکمیل سفارش", { code: props.trackingCode });
});

function downloadSketch() {
  props.gen.downloadCanvasImage(hiddenCanvasRef.value, "kroki-sketch.png");
  logger.info("download", "دانلود کروکی PNG");
}

function downloadMap() {
  const url = props.gen.state.mapImage;
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = "kroki-map.png";
  a.click();
  logger.info("download", "دانلود تصویر نقشه PNG");
}

function downloadPdf() {
  props.gen.openPrint(hiddenCanvasRef.value);
  logger.info("download", "دریافت نسخه PDF / چاپ");
}
</script>

<style scoped>
.download-card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px;
  text-align: center;
  transition: transform 0.25s var(--ease-out), border-color 0.25s, box-shadow 0.25s;
}
.download-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--accent-rgb) / 0.5);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
}

.animate-pop {
  animation: pop 0.45s var(--ease-spring);
}
@keyframes pop {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
