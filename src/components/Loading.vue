<template>
  <div
    v-if="active"
    class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
  >
    <div class="w-72 px-5 py-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-xl">
      <div class="flex items-center gap-3 mb-1">
        <i class="fas fa-spinner fa-spin text-accent text-xl"></i>
        <div class="text-sm font-bold text-[var(--text)]">{{ title }}</div>
      </div>
      <div v-if="message" class="text-xs text-[var(--text-muted)] mt-2 leading-6">{{ message }}</div>
      <div v-if="progressLabel" class="text-[11px] text-[var(--text-faint)] mt-1 font-medium" dir="ltr">{{ progressLabel }}</div>
      <div v-if="progress !== null" class="h-1.5 w-full bg-[var(--surface2)] rounded-full mt-3 overflow-hidden">
        <div
          class="h-full bg-accent rounded-full transition-all duration-150"
          :style="{ width: clampedProgress + '%' }"
        ></div>
      </div>
      <button
        v-if="cancellable"
        class="btn btn-ghost btn-xs w-full mt-4"
        @click="$emit('cancel')"
      >
        <i class="fas fa-times ml-1"></i> لغو
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  active: { type: Boolean, default: false },
  title: { type: String, default: "در حال بارگذاری..." },
  message: { type: String, default: "" },
  progress: { type: Number, default: null }, // 0..100, null => نامشخص
  progressLabel: { type: String, default: "" },
  cancellable: { type: Boolean, default: false },
});

defineEmits(["cancel"]);

const clampedProgress = computed(() =>
  props.progress === null ? 0 : Math.min(100, Math.max(0, props.progress)),
);
</script>
