<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)]">
    <LogPanel v-model="logOpen" />

    <Transition name="page" mode="out-in">
      <AuthView v-if="page === 'auth'" key="auth" @back="goHome" @success="onAuthSuccess" />

      <AdminPanel v-else-if="page === 'admin'" key="admin" @home="goHome" />

      <UserPanel v-else-if="page === 'userpanel'" key="userpanel" @home="goHome" />

      <AgencyRequestPage v-else-if="page === 'agency-request'" key="agency-request" @home="goHome" />

      <ExpertRequestPage v-else-if="page === 'expert-request'" key="expert-request" @home="goHome" @login="openAuth('expert-request')" />

      <ExpertListPage v-else-if="page === 'experts'" key="experts" @home="goHome" @request="openExpertRequest" />

      <LandingPage
        v-else-if="step === 'landing'"
        key="landing"
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
        @agencyRequest="openAgencyRequest"
        @experts="openExperts"
      />

      <div v-else key="wizard" class="flex-1 flex flex-col min-h-0">
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
      </div>
    </Transition>
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
const AgencyRequestPage = defineAsyncComponent(() => import("./components/AgencyRequestPage.vue"));
const ExpertRequestPage = defineAsyncComponent(() => import("./components/ExpertRequestPage.vue"));
const ExpertListPage = defineAsyncComponent(() => import("./components/ExpertListPage.vue"));
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
  city: "",
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
  // نشانی خودکار (پیشنهاد map.ir در پیش‌نمایش) را به فرم اصلی برمی‌گردانیم
  // تا در payload پرداخت/ثبت به سرور هم ارسال شود
  if (id === "payment" && !krokiForm.address) {
    const auto = gen.value?.last?.form?.address || "";
    if (auto) krokiForm.address = auto;
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
  if (ret === "admin") {
    openAdmin();
    return;
  }
  if (ret === "userpanel") {
    openUserPanel();
    return;
  }
  if (ret === "agency-request") {
    openAgencyRequest();
    return;
  }
  if (ret === "expert-request") {
    openExpertRequest();
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

function openAgencyRequest() {
  if (!auth.isAuthenticated.value) {
    openAuth("agency-request");
    return;
  }
  if (auth.isAdmin.value || auth.isAgent.value) return;
  page.value = "agency-request";
}

function openExpertRequest() {
  // دکمه «درخواست همکاری» باید همیشه فرم را باز کند (حتی برای مهمان).
  // کنترل ورود/نقش موقع ارسال در ExpertRequestPage انجام می‌شود تا دکمه هیچ‌وقت بی‌اثر به‌نظر نرسد.
  page.value = "expert-request";
}

function openExperts() {
  page.value = "experts";
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
  if (page.value === "agency-request") return "#/agency-request";
  if (page.value === "expert-request") return "#/expert-request";
  if (page.value === "experts") return "#/experts";
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
  } else if (h === "agency-request") {
    openAgencyRequest();
  } else if (h === "expert-request") {
    openExpertRequest();
  } else if (h === "experts") {
    openExperts();
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
  auth.syncUser();
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
  // نشانی خودکار را موازی با برداشت تصویر می‌گیریم تا موقع ورود به
  // قسمت اطلاعات، فیلد نشانی از قبل پر باشد
  const addrPromise = import("./composables/useKrokiGenerator")
    .then((m) => m.suggestAddressForPositions(geom.allPositions))
    .catch(() => "");
  try {
    g.state.mapImage = await g.captureMapImage(map.value, pins, geom.allPositions);
    logger.info("draw", "ثبت ترسیم‌ها و برداشت تصویر نقشه", {
      shapes: geom.metas.length,
      points: geom.allPositions.length,
    });
  } catch (e) {
    logger.error("draw", "خطا در برداشت تصویر نقشه", e.message);
  }
  try {
    const auto = await addrPromise;
    if (auto && !String(krokiForm.address || "").trim()) krokiForm.address = auto;
  } catch {}
  go("info");
}

async function onInfoSubmit() {
  const g = await ensureGen();
  g.setTemplate(templateId.value);
  const ok = await g.computeGeometry(pins, krokiForm);
  if (!ok) return;
  // نشانی خودکار map.ir را به فرم اصلی برمی‌گردانیم تا در فیلد اطلاعات
  // دیده شود و در ثبت/پرداخت به سرور ارسال شود
  if (!krokiForm.address && g.last?.form?.address) krokiForm.address = g.last.form.address;
  go("preview");
}

function onPaymentDone(result) {
  trackingCode.value = result?.trackingCode || "";
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

<style>
/* انیمیشن صفحات اصلی */
.page-enter-active {
  transition: all 0.35s var(--ease-out);
}
.page-leave-active {
  transition: all 0.25s ease-in;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
  filter: blur(4px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
  filter: blur(4px);
}

/* انیمیشن مراحل ویزارد */
.step-enter-active {
  transition: all 0.3s var(--ease-out);
}
.step-leave-active {
  transition: all 0.2s ease-in;
}
.step-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* انیمیشن مودال‌ها */
.modal-enter-active {
  transition: all 0.3s var(--ease-out);
}
.modal-leave-active {
  transition: all 0.2s ease-in;
}
.modal-enter-from {
  opacity: 0;
  transform: scale(0.92);
}
.modal-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

/* انیمیشن عمومی fade */
.fade-enter-active {
  transition: opacity 0.3s var(--ease-out);
}
.fade-leave-active {
  transition: opacity 0.2s ease-in;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* انیمیشن slide up */
.slide-up-enter-active {
  transition: all 0.35s var(--ease-out);
}
.slide-up-leave-active {
  transition: all 0.25s ease-in;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>