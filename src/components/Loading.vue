<template>
  <div
    v-if="active"
    class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
  >
    <div class="flex items-center gap-3 px-5 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] shadow-xl">
      <i class="fas fa-spinner fa-spin text-accent text-lg"></i>
      <span class="text-sm text-[var(--text)]">در حال بارگذاری...</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  active: { type: Boolean, default: false },
});
</script>
