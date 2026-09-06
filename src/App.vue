<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)]">
    <LogPanel v-model="logOpen" />

    <AuthView v-if="page === 'auth'" @back="goHome" @success="onAuthSuccess" />

    <UserPanel v-else-if="page === 'panel'" @home="goHome" />

    <AdminPanel v-else-if="page === 'admin'" @home="goHome" />

    <template v-else>
      <LandingPage
        v-if="step === 'landing'"
        :authed="auth.isAuthenticated.value"
        :user-name="auth.state.user?.name"
        :is-admin="auth.isAdmin.value"
        :wallet="auth.walletOf()"
        :free="auth.freeOf()"
        @start="start"
        @toggleLog="logOpen = !logOpen"
        @login="openAuth('landing')"
        @panel="openPanel"
        @admin="openAdmin"
        @logout="logout"
      />

      <template v-else>
        <WizardHeader
          :steps="steps"
          :current="step"
          :reached-index="reachedIndex"
          :log-count="logStats.error"
          @navigate="navigate"
          @toggleLog="logOpen = !logOpen"
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
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from "vue";
import { useKrokiGenerator, getTodayJalali } from "./composables/useKrokiGenerator";
import { logger } from "./utils/logger";
import { auth } from "./stores/auth";

import LandingPage from "./components/LandingPage.vue";
import WizardHeader from "./components/WizardHeader.vue";
import LogPanel from "./components/LogPanel.vue";
import AuthView from "./components/AuthView.vue";
import UserPanel from "./components/UserPanel.vue";
import AdminPanel from "./components/AdminPanel.vue";
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

const page = ref("app");
const step = ref("landing");
const reachedIndex = ref(0);
const authReturn = ref("landing");

const pins = reactive([]);
const map = ref(null);
const templateId = ref("technical");
const trackingCode = ref("");
const logOpen = ref(false);
const logStats = computed(() => logger.getStats());

const gen = useKrokiGenerator();

const krokiForm = reactive({
  title: "پلان وضعیت موجود",
  client: "",
  clientPhone: "",
  clientNationalId: "",
  address: "",
  date: getTodayJalali(),
  surveyor: "",
  plaque: "",
  streetWidth: "",
  logo: "",
  description: "",
});

watch(step, (s) => {
  logger.info("step", "تغییر مرحله", { step: s });
});

const krokiIds = steps.map((s) => s.id);

function openAuth(returnTo) {
  authReturn.value = returnTo;
  page.value = "auth";
}

function go(id) {
  if (id !== "landing" && !auth.isAuthenticated.value) {
    openAuth("start");
    return;
  }
  const idx = steps.findIndex((s) => s.id === id);
  if (idx !== -1) {
    reachedIndex.value = Math.max(reachedIndex.value, idx);
  }
  step.value = id;
}

function navigate(id) {
  go(id);
}

function goHome() {
  page.value = "app";
  step.value = "landing";
}

function onAuthSuccess() {
  const ret = authReturn.value;
  if (ret === "start") {
    page.value = "app";
    start();
  } else if (ret === "panel") {
    page.value = "app";
    openPanel();
  } else if (ret === "admin") {
    page.value = "app";
    openAdmin();
  } else {
    goHome();
  }
}

function openPanel() {
  if (!auth.isAuthenticated.value) {
    openAuth("panel");
    return;
  }
  page.value = "panel";
}

function openAdmin() {
  if (!auth.isAuthenticated.value) {
    openAuth("admin");
    return;
  }
  page.value = auth.isAdmin.value ? "admin" : "panel";
}

function logout() {
  auth.logout();
  logger.info("auth", "خروج از حساب کاربری");
  restart();
}

function start() {
  if (!auth.isAuthenticated.value) {
    openAuth("start");
    return;
  }
  logger.info("step", "شروع فرآیند ساخت کروکی");
  page.value = "app";
  reachedIndex.value = 0;
  step.value = "draw";
}

watch(
  () => auth.isAuthenticated.value,
  (ok) => {
    if (ok || page.value === "auth") return;
    const insideKroki = page.value === "app" && step.value !== "landing";
    if (!insideKroki && page.value !== "panel" && page.value !== "admin") return;
    authReturn.value =
      page.value === "panel" ? "panel" : page.value === "admin" ? "admin" : "start";
    page.value = "auth";
  },
);

function syncHash() {
  const h =
    page.value === "panel"
      ? "#/panel"
      : page.value === "admin"
        ? "#/admin"
        : page.value === "auth"
          ? "#/auth"
          : step.value === "landing"
            ? "#/"
            : "#/" + step.value;
  if (window.location.hash !== h) window.history.replaceState(null, "", h);
}

function enforceFromHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (h === "panel") {
    openPanel();
  } else if (h === "admin") {
    openAdmin();
  } else if (h === "auth") {
    if (auth.isAuthenticated.value) goHome();
    else page.value = "auth";
  } else if (krokiIds.includes(h)) {
    if (!auth.isAuthenticated.value) {
      step.value = "landing";
      page.value = "app";
      openAuth("start");
    } else {
      page.value = "app";
      go("draw");
    }
  }
  syncHash();
}

onMounted(() => {
  enforceFromHash();
  window.addEventListener("hashchange", enforceFromHash);
});

onUnmounted(() => {
  window.removeEventListener("hashchange", enforceFromHash);
});

watch([page, step], syncHash);

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
  krokiForm.clientPhone = "";
  krokiForm.clientNationalId = "";
  krokiForm.address = "";
  krokiForm.surveyor = "";
  krokiForm.plaque = "";
  krokiForm.streetWidth = "";
  krokiForm.logo = "";
  krokiForm.description = "";
  krokiForm.date = getTodayJalali();
  reachedIndex.value = 0;
  step.value = "landing";
  logger.info("system", "شروع سفارش جدید — بازنشانی وضعیت");
}
</script>