<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)]">
    <LogPanel v-model="logOpen" />

    <AuthView v-if="page === 'auth'" @back="goHome" @success="onAuthSuccess" />

    <AdminPanel v-else-if="page === 'admin'" @home="goHome" />

    <UserPanel v-else-if="page === 'userpanel'" @home="goHome" />

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
        @admin="openAdmin"
        @logout="logout"
        @profile="openUserPanel"
      />

      <template v-else>
        <WizardHeader
          :steps="steps"
          :current="step"
          :reached-index="reachedIndex"
          :log-count="logStats.error"
          :user-name="auth.state.user?.name || ''"
          :is-admin="auth.isAdmin.value"
          @navigate="navigate"
          @toggleLog="logOpen = !logOpen"
          @admin="openAdmin"
          @logout="logout"
          @profile="openUserPanel"
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
              v-else-if="step === 'preview' && gen"
              key="preview"
              :gen="gen"
              :template-id="templateId"
              @back="go('info')"
              @pay="go('payment')"
            />

            <PaymentStep
              v-else-if="step === 'payment' && gen"
              key="payment"
              :gen="gen"
              :pins="pins"
              :form="krokiForm"
              :template-id="templateId"
              @back="go('preview')"
              @done="onPaymentDone"
            />

            <DownloadStep
              v-else-if="step === 'done' && gen"
              key="done"
              :gen="gen"
              :form="krokiForm"
              :template-id="templateId"
              :tracking-code="trackingCode"
              :form-index="1"
              @restart="restart"
              @home="go('landing')"
            />

            <div v-else-if="step === 'preview' || step === 'payment' || step === 'done'" key="gen-loading" class="flex-1 flex items-center justify-center">
              <Loading :active="true" title="در حال آماده‌سازی..." message="لطفاً چند لحظه صبر کنید" />
            </div>
          </Transition>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted, defineAsyncComponent, shallowRef } from "vue";
import { getTodayJalali } from "./utils/jalali";
import { logger } from "./utils/logger";
import { auth } from "./stores/auth";

import LandingPage from "./components/LandingPage.vue";
import Loading from "./components/Loading.vue";

const WizardHeader = defineAsyncComponent(() => import("./components/WizardHeader.vue"));
const LogPanel = defineAsyncComponent(() => import("./components/LogPanel.vue"));
const AuthView = defineAsyncComponent(() => import("./components/AuthView.vue"));
const AdminPanel = defineAsyncComponent(() => import("./components/AdminPanel.vue"));
const UserPanel = defineAsyncComponent(() => import("./components/UserPanel.vue"));
const DrawStep = defineAsyncComponent(() => import("./components/steps/DrawStep.vue"));
const InfoStep = defineAsyncComponent(() => import("./components/steps/InfoStep.vue"));
const PreviewStep = defineAsyncComponent(() => import("./components/steps/PreviewStep.vue"));
const PaymentStep = defineAsyncComponent(() => import("./components/steps/PaymentStep.vue"));
const DownloadStep = defineAsyncComponent(() => import("./components/steps/DownloadStep.vue"));

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

const gen = shallowRef(null);
let genPromise = null;
function ensureGen() {
  if (gen.value) return Promise.resolve(gen.value);
  if (!genPromise) {
    genPromise = import("./composables/useKrokiGenerator").then((m) => {
      gen.value = m.useKrokiGenerator();
      return gen.value;
    }).catch((e) => {
      genPromise = null;
      throw e;
    });
  }
  return genPromise;
}

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
  if (id !== "landing") ensureGen().catch(() => {});
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
  if (ret === "admin") {
    openAdmin();
    return;
  }
  if (ret === "userpanel") {
    openUserPanel();
    return;
  }
  if (auth.isAdmin.value) {
    openAdmin();
    return;
  }
  if (ret === "start") {
    page.value = "app";
    start();
  } else {
    goHome();
  }
}

function openAdmin() {
  if (!auth.isAuthenticated.value) {
    openAuth("admin");
    return;
  }
  if (!auth.isAdmin.value) return;
  page.value = "admin";
}

function openUserPanel() {
  if (!auth.isAuthenticated.value) {
    openAuth("userpanel");
    return;
  }
  page.value = "userpanel";
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
  ensureGen().catch(() => {});
  step.value = "draw";
}

watch(
  () => auth.isAuthenticated.value,
  (ok) => {
    if (ok || page.value === "auth") return;
    const insideKroki = page.value === "app" && step.value !== "landing";
    if (!insideKroki && page.value !== "admin" && page.value !== "userpanel") return;
    authReturn.value = page.value === "admin" ? "admin" : page.value === "userpanel" ? "userpanel" : "start";
    page.value = "auth";
  },
);

let lastHash = "";

function currentHash() {
  if (page.value === "admin") return "#/admin";
  if (page.value === "userpanel") return "#/userpanel";
  if (page.value === "auth") return "#/auth";
  if (step.value === "landing") return "#/";
  return "#/" + step.value;
}

function syncHash() {
  const h = currentHash();
  if (window.location.hash === h || lastHash === h) return;
  lastHash = h;
  window.history.pushState(null, "", h);
}

function enforceFromHash() {
  lastHash = window.location.hash || "";
  const h = lastHash.replace(/^#\/?/, "");
  if (h === "admin") {
    openAdmin();
  } else if (h === "userpanel") {
    openUserPanel();
  } else if (h === "auth") {
    if (auth.isAuthenticated.value) goHome();
    else page.value = "auth";
  } else if (h === "" || h === "/") {
    page.value = "app";
    step.value = "landing";
  } else if (krokiIds.includes(h)) {
    if (!auth.isAuthenticated.value) {
      step.value = "landing";
      page.value = "app";
      openAuth("start");
    } else {
      page.value = "app";
      step.value = h;
      reachedIndex.value = Math.max(reachedIndex.value, krokiIds.indexOf(h));
      ensureGen().catch(() => {});
    }
  }
  const norm = currentHash();
  if ((window.location.hash || "") !== norm) {
    lastHash = norm;
    window.history.replaceState(null, "", norm);
  }
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
  const g = await ensureGen();
  const geom = g.buildGeometry(pins);
  if (!geom) return;
  try {
    g.state.mapImage = await g.captureMapImage(map.value, pins, geom.allPositions);
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
  const g = await ensureGen();
  g.setTemplate(templateId.value);
  const ok = await g.computeGeometry(pins, krokiForm);
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