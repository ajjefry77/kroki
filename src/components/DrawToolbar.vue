<template>
  <div ref="toolbarEl" class="absolute top-3 left-3 z-40">
    <div
      @click.stop
      class="flex flex-col rounded-md shadow-lg p-2 gap-1.5 bg-white/10 backdrop-blur-md border border-white/20"
    >

      
      <!-- اندازه‌گیری -->
      <button
        @click="$emit('toggleMeasure')"
        title="اندازه‌گیری"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md transition"
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
          'w-8 h-8 rounded flex items-center justify-center shadow-md transition',
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
          'w-8 h-8 rounded flex items-center justify-center shadow-md transition',
          drawMode === 'polygon'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="پلی‌گان"
      >
        <i class="fas fa-draw-polygon"></i>
      </button>

      <!-- دایره -->
      <button
        @click="$emit('setDrawMode', 'circle')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md transition',
          drawMode === 'circle'
            ? 'text-white bg-accent'
            : 'text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)]',
        ]"
        title="دایره"
      >
        <i class="fa fa-circle"></i>
      </button>

      <div class="w-full border-t border-[var(--border)] my-1"></div>

      <!-- زوم -->
      <button
        @click="map?.zoomIn({ duration: 200 })"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)] transition font-bold"
        title="بزرگنمایی"
      >
        <i class="fas fa-plus text-sm"></i>
      </button>
      <button
        @click="map?.zoomOut({ duration: 200 })"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface3)] transition font-bold"
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
});

defineEmits(["toggleMeasure", "setDrawMode", "openKroki"]);

defineExpose({ toolbarEl });
</script>
