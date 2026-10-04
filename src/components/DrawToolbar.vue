<template>
  <div ref="toolbarEl" class="absolute top-12 sm:top-3 left-3 z-30">
    <div
      @click.stop
      class="flex flex-col rounded-xl shadow-lg p-1.5 sm:p-2 gap-1.5 bg-white/90 sm:bg-white/10 backdrop-blur-md border border-white/20"
    >
      
      <!-- اندازه‌گیری -->
      <button
        @click="$emit('toggleMeasure')"
        title="اندازه‌گیری"
        class="tool-btn"
        :class="
          drawMode === 'measure'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]'
        "
      >
        <i class="fas fa-ruler m-1"></i>
      </button>

      <!-- خط -->
      <button
        @click="$emit('setDrawMode', 'polyline')"
        :class="[
          'tool-btn',
          drawMode === 'polyline'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="خط"
      >
        <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="text-[var(--text)]">
          <line x1="25" y1="75" x2="75" y2="25" stroke-width="6" stroke="currentColor" />
          <circle cx="25" cy="75" r="6" fill="currentColor" />
          <circle cx="75" cy="25" r="6" fill="currentColor" />
        </svg>
      </button>

      <!-- پلی‌گان -->
      <button
        @click="$emit('setDrawMode', 'polygon')"
        :class="[
          'tool-btn',
          drawMode === 'polygon'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="پلی‌گان"
      >
        <i class="fas fa-draw-polygon"></i>
      </button>

      <!-- مستطیل -->
      <button
        @click="$emit('setDrawMode', 'rectangle')"
        :class="[
          'tool-btn',
          drawMode === 'rectangle'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="مستطیل"
      >
        <i class="far fa-square"></i>
      </button>

      <!-- پاک کن -->
      <button
        @click="$emit('setDrawMode', 'eraser')"
        :class="[
          'tool-btn',
          drawMode === 'eraser'
            ? 'text-white bg-[var(--danger)]'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--danger)] hover:text-white',
        ]"
        title="پاک کردن ترسیم"
      >
        <i class="fas fa-eraser"></i>
      </button>

      <div class="w-full border-t border-[var(--border)] my-1"></div>

      <!-- جستجو -->
      <button
        @click="$emit('toggleSearch')"
        :class="[
          'tool-btn',
          searchActive
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="جستجوی آدرس / مختصات"
      >
        <i class="fas fa-search text-sm"></i>
      </button>

      <!-- زوم -->
      <button
        @click="map?.zoomIn({ duration: 200 })"
        class="tool-btn text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)] font-bold"
        title="بزرگنمایی"
      >
        <i class="fas fa-plus text-sm"></i>
      </button>
      <button
        @click="map?.zoomOut({ duration: 200 })"
        class="tool-btn text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)] font-bold"
        title="کوچکنمایی"
      >
        <i class="fas fa-minus text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const toolbarEl = ref(null);

defineProps({
  map: { type: Object, default: null },
  drawMode: { type: String, default: "" },
  searchActive: { type: Boolean, default: false },
});

defineEmits(["toggleMeasure", "setDrawMode", "openKroki", "toggleSearch"]);

defineExpose({ toolbarEl });
</script>

<style scoped>
.tool-btn {
  width: 2.75rem;
  height: 2.75rem;
  min-width: 44px;
  min-height: 44px;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.18);
  transition: background .15s, transform .1s;
  touch-action: manipulation;
  font-size: 1rem;
}
.tool-btn:active { transform: scale(.94); }
@media (min-width: 640px) {
  .tool-btn {
    width: 2rem;
    height: 2rem;
    min-width: 0;
    min-height: 0;
    font-size: .875rem;
  }
}
</style>
