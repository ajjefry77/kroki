<template>
  <header class="wizard-header h-16 flex items-center px-4 md:px-6 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 z-40">
    <div class="flex items-center gap-3 flex-shrink-0">
      <img src="/favicon.png" alt="لوگوی سامانه کروکی" class="w-9 h-9 rounded-lg object-contain shadow-md shadow-[var(--accent-glow-strong)]" />
      <div class="hidden sm:block">
        <div class="font-extrabold text-sm leading-tight">سامانه کروکی</div>
        <div class="text-[10px] text-[var(--text-muted)]">تولید کروکی نقشه</div>
      </div>
    </div>

    <!-- استپر -->
    <nav class="flex-1 flex items-center justify-center overflow-x-auto px-2 min-w-0">
      <div class="flex items-center min-w-0">
        <template v-for="(s, i) in steps" :key="s.id">
          <button
            class="flex items-center gap-2 group shrink-0"
            :class="canClick(i) ? 'cursor-pointer' : 'cursor-default'"
            @click="canClick(i) && $emit('navigate', s.id)"
            :title="canClick(i) ? 'رفتن به مرحله ' + s.label : ''"
          >
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300"
              :class="dotClass(i, s.id)"
            >
              <i v-if="s.id === current" class="fas fa-chevron-left text-[10px]"></i>
              <i v-else-if="isDone(i)" class="fas fa-check"></i>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span
              class="text-xs font-medium whitespace-nowrap hidden lg:block transition-colors"
              :class="
                s.id === current
                  ? 'text-[var(--text)]'
                  : isDone(i)
                    ? 'text-[var(--accent-soft)]'
                    : 'text-[var(--text-faint)]'
              "
            >
              {{ s.label }}
            </span>
          </button>
          <div
            v-if="i < steps.length - 1"
            class="h-0.5 rounded transition-all duration-300 shrink-0"
            :class="isDone(i) ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'"
            :style="{ width: i < steps.length - 1 ? 'min(38px, 4vw)' : '0' }"
          ></div>
        </template>
      </div>
    </nav>

    <!-- نشان اعتبار + گزارش -->
    <div class="hidden md:flex items-center gap-2 text-[11px] text-[var(--text-muted)] px-2 flex-shrink-0">
      <span class="flex items-center gap-1.5">
        <i class="fas fa-shield-halved text-[var(--success)]"></i>
        <span>پرداخت امن</span>
      </span>
      <button
        class="relative flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface2)] hover:bg-[var(--surface3)] hover:border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
        title="گزارش سیستم"
        @click="$emit('toggleLog')"
      >
        <i class="fas fa-bug text-[var(--accent)]"></i>
        <span>گزارش</span>
        <span
          v-if="logCount"
          class="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center"
        >{{ logCount }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  steps: { type: Array, required: true },
  current: { type: String, required: true },
  reachedIndex: { type: Number, default: 0 },
  logCount: { type: Number, default: 0 },
});

const emit = defineEmits(["navigate", "toggleLog"]);

const currentIndex = computed(() =>
  Math.max(0, props.steps.findIndex((s) => s.id === props.current)),
);

function canClick(i) {
  return i <= props.reachedIndex;
}

function isDone(i) {
  return i < currentIndex.value;
}

function dotClass(i, id) {
  if (id === props.current) return "step-active";
  if (isDone(i)) return "step-done";
  return "step-pending";
}
</script>

<style scoped>
.step-active {
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  border-color: transparent;
  color: #241a05;
  box-shadow: 0 0 0 4px var(--accent-glow), 0 3px 10px rgba(224, 123, 57, 0.18);
  transform: scale(1.05);
}
.step-done {
  background: var(--accent-glow);
  border-color: rgb(var(--accent-rgb) / 0.45);
  color: var(--accent);
}
.step-pending {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--text-faint);
}
</style>
