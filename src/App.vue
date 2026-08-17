<template>
  <div class="flex flex-col h-screen bg-[var(--bg)]">
    <!-- هدر -->
    <header class="h-12 flex items-center justify-between px-4 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0">
      <div class="flex items-center gap-2">
        <i class="fas fa-drafting-compass text-accent text-lg"></i>
        <h1 class="text-sm font-bold">تولید کروکی نقشه</h1>
      </div>
      <div class="flex items-center gap-2">
      </div>
    </header>

    <!-- بدنه: نقشه بالا + اطلاعات پایین -->
    <main class="flex-1 min-h-0 flex flex-col">
      <section class="relative h-[55%] min-h-[280px] border-b border-[var(--border)]">
        <MapPanel ref="mapPanelRef" :pins="pins" @mapReady="onMapReady" @openKroki="openKroki" />
      </section>

      <section class="flex-1 min-h-[220px] overflow-y-auto bg-[var(--bg)]">
        <InfoPanel :pins="pins" :form="krokiForm" @openKroki="openKroki" @removePin="removePin" />
      </section>
    </main>

    <KrokiDialog ref="krokiDialogRef" :map="map" :pins="pins" :form="krokiForm" />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import MapPanel from "./components/MapPanel.vue";
import InfoPanel from "./components/InfoPanel.vue";
import KrokiDialog from "./components/KrokiDialog.vue";

const pins = reactive([]);
const map = ref(null);
const mapPanelRef = ref(null);
const krokiDialogRef = ref(null);

function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  const pad = (n) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

const krokiForm = reactive({
  title: "پلان وضعیت موجود",
  client: "",
  address: "",
  date: toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
});

function onMapReady({ map: m }) {
  map.value = m;
}

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

const hasEligibleDrawings = computed(() =>
  flatten(pins).some(
    (p) =>
      p.type === "draw" &&
      p.shape &&
      ["polygon", "polyline"].includes(p.shape.type) &&
      Array.isArray(p.shape.positions) &&
      p.shape.positions.length >= 2,
  ),
);

function openKroki() {
  if (!map.value) return;
  krokiDialogRef.value?.open();
}

function removeLayersForSource(sourceId) {
  if (!map.value || !sourceId) return;
  const layers = map.value.getStyle().layers || [];
  layers
    .filter((l) => l.source === sourceId)
    .forEach((l) => {
      try {
        map.value.removeLayer(l.id);
      } catch (e) {}
    });
  try {
    map.value.removeSource(sourceId);
  } catch (e) {}
}

function removePin(pin) {
  const idx = pins.findIndex((x) => x.id === pin.id);
  if (idx !== -1) pins.splice(idx, 1);

  if (!map.value) return;
  if (pin.shape?._sourceIds?.length) {
    pin.shape._sourceIds.forEach((sid) => removeLayersForSource(sid));
  } else if (pin.shape) {
    removeLayersForSource("draw-pin-" + pin.id);
  }
}
</script>
