<template>
  <div class="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">
    <LogPanel />

    <LandingPage v-if="step === 'landing'" @start="start" />

    <template v-else>
      <WizardHeader
        :steps="steps"
        :current="step"
        :reached-index="reachedIndex"
        @navigate="navigate"
      />

      <div class="flex-1 min-h-0 flex flex-col">
        <Transition name="step" mode="out-in">
          <DrawStep
            v-if="step === 'draw'"
            key="draw"
            :pins="pins"
            @mapReady="onMapReady"
            @removePin="removePin"
            @submit="onDrawSubmit"
            @back="go('landing')"
          />

          <InfoStep
            v-else-if="step === 'info'"
            key="info"
            :pins="pins"
            :form="krokiForm"
            v-model="templateId"
            @submit="onInfoSubmit"
            @back="go('draw')"
          />

          <PreviewStep
            v-else-if="step === 'preview'"
            key="preview"
            :gen="gen"
            :template-id="templateId"
            @back="go('info')"
            @pay="go('payment')"
          />

          <PaymentStep
            v-else-if="step === 'payment'"
            key="payment"
            :gen="gen"
            :pins="pins"
            :form="krokiForm"
            :template-id="templateId"
            @back="go('preview')"
            @done="onPaymentDone"
          />

          <DownloadStep
            v-else-if="step === 'done'"
            key="done"
            :gen="gen"
            :form="krokiForm"
            :template-id="templateId"
            :tracking-code="trackingCode"
            @restart="restart"
            @home="go('landing')"
          />
        </Transition>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { useKrokiGenerator, getTodayJalali } from "./composables/useKrokiGenerator";
import { logger } from "./utils/logger";

import LandingPage from "./components/LandingPage.vue";
import WizardHeader from "./components/WizardHeader.vue";
import LogPanel from "./components/LogPanel.vue";
import DrawStep from "./components/steps/DrawStep.vue";
import InfoStep from "./components/steps/InfoStep.vue";
import PreviewStep from "./components/steps/PreviewStep.vue";
import PaymentStep from "./components/steps/PaymentStep.vue";
import DownloadStep from "./components/steps/DownloadStep.vue";

const steps = [
  { id: "draw", label: "ترسیم نقشه" },
  { id: "info", label: "اطلاعات و قالب" },
  { id: "preview", label: "پیش‌نمایش" },
  { id: "payment", label: "پرداخت" },
  { id: "done", label: "دانلود" },
];

const step = ref("landing");
const reachedIndex = ref(0);
const pins = reactive([]);
const map = ref(null);
const templateId = ref("technical");
const trackingCode = ref("");

const gen = useKrokiGenerator();

const krokiForm = reactive({
  title: "پلان وضعیت موجود",
  client: "",
  address: "",
  date: getTodayJalali(),
  surveyor: "",
  plaque: "",
  description: "",
});

watch(step, (s) => {
  logger.info("step", "تغییر مرحله", { step: s });
});

function go(id) {
  const idx = steps.findIndex((s) => s.id === id);
  if (idx !== -1) {
    reachedIndex.value = Math.max(reachedIndex.value, idx);
  }
  step.value = id;
}

function navigate(id) {
  go(id);
}

function start() {
  logger.info("step", "شروع فرآیند ساخت کروکی از صفحه اصلی");
  reachedIndex.value = 0;
  step.value = "draw";
}

function onMapReady({ map: m }) {
  map.value = m;
}

function removePin(pin) {
  const idx = pins.findIndex((x) => x.id === pin.id);
  if (idx !== -1) pins.splice(idx, 1);

  const m = map.value;
  if (!m) return;
  const removeSource = (sid) => {
    if (!sid) return;
    const layers = m.getStyle().layers || [];
    layers
      .filter((l) => l.source === sid)
      .forEach((l) => {
        try {
          m.removeLayer(l.id);
        } catch (e) {}
      });
    try {
      m.removeSource(sid);
    } catch (e) {}
  };
  if (pin.shape?._sourceIds?.length) {
    pin.shape._sourceIds.forEach((sid) => removeSource(sid));
  } else if (pin.shape) {
    removeSource("draw-pin-" + pin.id);
  }
  logger.info("draw", "حذف ترسیم", { name: pin.name, id: pin.id });
}

async function onDrawSubmit() {
  const geom = gen.buildGeometry(pins);
  if (!geom) return;
  try {
    gen.state.mapImage = await gen.captureMapImage(map.value, pins, geom.allPositions);
    logger.info("draw", "ثبت ترسیم‌ها و برداشت تصویر نقشه", {
      shapes: geom.metas.length,
      points: geom.allPositions.length,
    });
  } catch (e) {
    logger.error("draw", "خطا در برداشت تصویر نقشه", e.message);
  }
  go("info");
}

async function onInfoSubmit() {
  gen.setTemplate(templateId.value);
  const ok = await gen.computeGeometry(pins, krokiForm);
  if (ok) go("preview");
}

function onPaymentDone(code) {
  trackingCode.value = code || "KRK-" + Date.now().toString(36).toUpperCase().slice(-8);
  go("done");
}

function restart() {
  pins.splice(0, pins.length);
  templateId.value = "technical";
  trackingCode.value = "";
  krokiForm.title = "پلان وضعیت موجود";
  krokiForm.client = "";
  krokiForm.address = "";
  krokiForm.surveyor = "";
  krokiForm.plaque = "";
  krokiForm.description = "";
  krokiForm.date = getTodayJalali();
  reachedIndex.value = 0;
  step.value = "landing";
  logger.info("system", "شروع سفارش جدید — بازنشانی وضعیت");
}
</script>
