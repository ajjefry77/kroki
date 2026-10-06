<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)]">
    <LogPanel v-model="logOpen" />

    <Transition name="page" mode="out-in">
      <AuthView v-if="page === 'auth'" key="auth" @back="goHome" @success="onAuthSuccess" />

      <AdminPanel v-else-if="page === 'admin'" key="admin" @home="goHome" />

      <UserPanel v-else-if="page === 'userpanel'" key="userpanel" @home="goHome" @editDraft="openDraftForEdit" />

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
              :editing-kroki-id="editingKrokiId"
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

            <div v-else-if="step === 'done'" key="done-restored" class="flex-1 flex items-center justify-center px-4 py-10">
              <div class="card !rounded-3xl py-12 text-center max-w-lg w-full">
                <div class="w-20 h-20 mx-auto rounded-full bg-[var(--success-glow)] border-2 border-[var(--success)] flex items-center justify-center mb-6">
                  <i class="fas fa-circle-check text-3xl text-[var(--success)]"></i>
                </div>
                <h2 class="text-xl font-extrabold mb-2">سفارش شما ثبت و پرداخت شد</h2>
                <p v-if="trackingCode" class="text-sm text-[var(--text-muted)] mb-2">
                  کد پیگیری: <span class="font-bold text-[var(--accent-soft)]" dir="ltr">{{ trackingCode }}</span>
                </p>
                <p class="text-xs text-[var(--text-muted)] leading-6 mb-8">
                  اطلاعات ترسیم پس از پرداخت از این دستگاه پاک شد.<br />
                  برای دانلود مجدد کروکی به «کروکی‌های من» بروید.
                </p>
                <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button class="btn btn-primary !px-8 !py-3" @click="openUserPanel">
                    <i class="fas fa-drafting-compass ml-2"></i>
                    کروکی‌های من
                  </button>
                  <button class="btn btn-ghost !px-8 !py-3" @click="restart">
                    <i class="fas fa-plus ml-2"></i>
                    سفارش جدید
                  </button>
                </div>
              </div>
            </div>

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
import {
  loadPins,
  savePins,
  loadWizard,
  saveWizard,
  clearAllSession,
  clearDraft,
  loadGen,
  saveGenSnapshot,
  clearGen,
} from "./utils/sessionPersist";

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
// ویزارد ذخیره‌شده (فرم/قالب/مرحله) را بازیابی کن تا رفرش اطلاعات را پاک نکند
const savedWizard = (() => {
  try {
    return loadWizard();
  } catch (e) {
    return null;
  }
})();
// پیش‌نمایش و پرداخت با snapshot قابلیت بازیابی دارند؛
// مرحله done هم با کد پیگیری نگه داشته می‌شود (ترسیم‌ها بعد پرداخت پاک‌اند
// و دانلود مجدد از «کروکی‌های من» انجام می‌شود)
const _savedStep = savedWizard?.step;
const _initialStep = (() => {
  if (_savedStep === "draw" || _savedStep === "info") return _savedStep;
  if (_savedStep === "preview" || _savedStep === "payment") return _savedStep;
  if (_savedStep === "done") return "done";
  return "landing";
})();
const step = ref(_initialStep);
const reachedIndex = ref(
  _initialStep === "landing" ? 0 : Number(savedWizard?.reachedIndex) || 0,
);
const authReturn = ref("landing");

const pins = reactive([]);
try {
  const savedPins = loadPins();
  if (Array.isArray(savedPins) && savedPins.length) {
    savedPins.forEach((p) => {
      // تاریخ‌ها به صورت رشته ذخیره شده‌اند؛ همان‌طور نگه می‌داریم
      pins.push(p);
    });
  }
} catch (e) {}
const map = ref(null);
const templateId = ref(savedWizard?.templateId || "technical");
const trackingCode = ref(savedWizard?.trackingCode || "");
// وقتی یک پیش‌نویسِ ذخیره‌شده در سرور را برای ادامه/ویرایش باز می‌کنیم
const editingKrokiId = ref(null);
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

// ---------- ماندگاری پیش‌نمایش (gen) ----------
let genPersistTimer = null;
function persistGen() {
  if (persistSuspended) return;
  try {
    const g = gen.value;
    if (!g || !g.state?.ready) return;
    saveGenSnapshot({
      state: {
        utmPoints: g.state.utmPoints,
        areaM2: g.state.areaM2,
        utmZone: g.state.utmZone,
        centerUtm: g.state.centerUtm,
        shapeCentroids: g.state.shapeCentroids,
        edgeTexts: g.state.edgeTexts,
        selectedShapesMeta: g.state.selectedShapesMeta,
        templateId: g.state.templateId,
        orientation: g.state.orientation,
        styleOverrides: { ...(g.state.styleOverrides || {}) },
        mapImage: g.state.mapImage || "",
        ready: true,
      },
      form: g.last?.form ? { ...g.last.form } : { ...krokiForm },
      templateId: templateId.value,
    });
  } catch (e) {}
}
function schedulePersistGen() {
  if (genPersistTimer) clearTimeout(genPersistTimer);
  genPersistTimer = setTimeout(persistGen, 400);
}

let genRestoring = false;
// پیش‌نمایش را بعد رفرش برمی‌گرداند: اول از snapshot (فوری، بدون شبکه)،
// اگر نبود با محاسبه مجدد محلی از روی pins+form
async function restoreGenIfNeeded() {
  if (genRestoring) return false;
  const g = gen.value;
  if (!g) return false;
  if (g.state?.ready) return true;
  genRestoring = true;
  try {
    // ۱) تلاش با snapshot ذخیره‌شده
    let snap = null;
    try {
      snap = loadGen();
    } catch (e) {
      snap = null;
    }
    if (snap?.state) {
      try {
        g.setTemplate(snap.templateId || templateId.value);
      } catch (e) {}
      if (snap.templateId) templateId.value = snap.templateId;
      try {
        Object.assign(g.state, {
          utmPoints: snap.state.utmPoints || [],
          areaM2: snap.state.areaM2 || 0,
          utmZone: snap.state.utmZone ?? null,
          centerUtm: snap.state.centerUtm || null,
          shapeCentroids: snap.state.shapeCentroids || [],
          edgeTexts: snap.state.edgeTexts || [],
          selectedShapesMeta: snap.state.selectedShapesMeta || [],
          templateId: snap.state.templateId || templateId.value,
          orientation: snap.state.orientation || "portrait",
          styleOverrides: { ...(snap.state.styleOverrides || {}) },
          mapImage: snap.state.mapImage || g.state.mapImage || "",
          ready: true,
          errorMsg: "",
          generating: false,
        });
        g.last.form = snap.form ? { ...snap.form } : { ...krokiForm };
        g.last.pins = pins;
        // نشانی پیشنهادی را به فرم اصلی هم برگردان
        if (!krokiForm.address && g.last.form?.address) {
          krokiForm.address = g.last.form.address;
        }
        logger.info("preview", "بازیابی پیش‌نمایش پس از رفرش از حافظه محلی");
        return true;
      } catch (e) {}
    }
    // ۲) fallback: محاسبه مجدد محلی (بدون نیاز به نقشه؛ فقط mapImage خالی می‌ماند)
    try {
      g.setTemplate(templateId.value);
      const ok = await g.computeGeometry(pins, krokiForm);
      if (ok) {
        if (!krokiForm.address && g.last?.form?.address) {
          krokiForm.address = g.last.form.address;
        }
        persistGen();
        logger.info("preview", "بازیابی پیش‌نمایش پس از رفرش با محاسبه مجدد");
        return true;
      }
    } catch (e) {}
    return false;
  } finally {
    genRestoring = false;
  }
}

const krokiForm = reactive({
  title: savedWizard?.form?.title ?? "پلان وضعیت موجود",
  client: savedWizard?.form?.client ?? "",
  clientPhone: savedWizard?.form?.clientPhone ?? "",
  clientNationalId: savedWizard?.form?.clientNationalId ?? "",
  address: savedWizard?.form?.address ?? "",
  city: savedWizard?.form?.city ?? "",
  date: savedWizard?.form?.date || getTodayJalali(),
  surveyor: savedWizard?.form?.surveyor ?? "",
  plaque: savedWizard?.form?.plaque ?? "",
  streetWidth: savedWizard?.form?.streetWidth ?? "",
  initialSurveyType: savedWizard?.form?.initialSurveyType ?? "",
  logo: savedWizard?.form?.logo ?? "",
  description: savedWizard?.form?.description ?? "",
});

// با رفرش، ترسیم‌ها و فرم نباید پاک شوند → ذخیره خودکار در localStorage
let persistTimer = null;
// بعد از پرداخت، هیچ‌چیز از کروکی پرداخت‌شده نباید در حافظه بماند؛
// با این پرچم، ذخیره خودکار (حتی beforeunload) تا سفارش بعدی متوقف می‌شود
let persistSuspended = false;
function persistSession() {
  if (persistSuspended) return;
  try {
    savePins(pins);
  } catch (e) {}
  try {
    saveWizard({
      step: step.value,
      reachedIndex: reachedIndex.value,
      templateId: templateId.value,
      trackingCode: trackingCode.value || "",
      form: { ...krokiForm },
    });
  } catch (e) {}
}
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistSession, 300);
}

watch(
  pins,
  () => schedulePersist(),
  { deep: true },
);
watch([step, reachedIndex, templateId], () => schedulePersist());
watch(krokiForm, () => schedulePersist(), { deep: true });
// هر تغییر پیش‌نمایش (جهت، استایل، مجاورت‌ها) هم ذخیره شود
watch(
  () => gen.value?.state,
  () => schedulePersistGen(),
  { deep: true },
);

watch(step, (s) => {
  logger.info("step", "تغییر مرحله", { step: s });
  // اگر وارد پیش‌نمایش/پرداخت شدیم ولی gen خالی است (مثلاً بعد رفرش)، برگردان
  if (s === "preview" || s === "payment") {
    ensureGen()
      .then(() => restoreGenIfNeeded())
      .catch(() => {});
  }
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
  // ورود به ترسیم یعنی شروع کار جدید → ذخیره خودکار دوباره فعال شود
  if (id === "draw") persistSuspended = false;
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
  // اگر کاربر وسط مکثِ «در حال انتقال...» خودش برگشته باشد، جلو نبریمش
  if (page.value !== "auth") return;
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
  persistSuspended = false;
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
  // فلاش نهایی قبل از رفرش/بستن تا آخرین تغییر (دیبانس‌شده) گم نشود
  window.addEventListener("beforeunload", persistSession);
  window.addEventListener("pagehide", persistSession);
  window.addEventListener("beforeunload", persistGen);
  window.addEventListener("pagehide", persistGen);
  auth.syncUser();
  // اگر با رفرش مستقیم روی پیش‌نمایش/پرداخت آمدیم، gen را برگردان
  if (step.value === "preview" || step.value === "payment") {
    ensureGen()
      .then(() => restoreGenIfNeeded())
      .catch(() => {});
  }
});

onUnmounted(() => {
  window.removeEventListener("hashchange", enforceFromHash);
  window.removeEventListener("beforeunload", persistSession);
  window.removeEventListener("pagehide", persistSession);
  window.removeEventListener("beforeunload", persistGen);
  window.removeEventListener("pagehide", persistGen);
});

watch([page, step], syncHash);

function onMapReady({ map: m }) {
  map.value = m;
}

function removePin(pin) {
  const idx = pins.findIndex((x) => x.id === pin.id);
  if (idx !== -1) pins.splice(idx, 1);
  // حذف باید بلافاصله در حافظه محلی هم اعمال شود تا بعد رفرش برنگردد
  try {
    persistSession();
  } catch (e) {}

  const m = map.value;
  if (!m) return;
  const removeSource = (sid) => {
    if (!sid) return;
    let layers = [];
    try {
      layers = m.getStyle().layers || [];
    } catch (e) {}
    layers
      .filter((l) => l.source === sid)
      .forEach((l) => {
        try {
          m.removeLayer(l.id);
        } catch (e) {}
      });
    try {
      if (m.getSource(sid)) m.removeSource(sid);
    } catch (e) {}
  };
  // علاوه بر سورس اصلی، سورس لیبل‌ها (شماره رئوس/طول اضلاع/مجاورت‌ها) هم
  // باید پاک شود وگرنه اطلاعات نقاط روی نقشه می‌ماند
  const sids = [];
  if (pin.shape?._sourceIds?.length) sids.push(...pin.shape._sourceIds);
  if (pin.shape) {
    sids.push("draw-pin-" + pin.id);
    sids.push("file-" + pin.id);
  }
  const allSids = [...new Set([...sids, ...sids.map((s) => s + "-labels")])];
  allSids.forEach((sid) => removeSource(sid));
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
  try {
    persistGen();
  } catch (e) {}
  go("preview");
}

function onPaymentDone(result) {
  trackingCode.value = result?.trackingCode || "";
  editingKrokiId.value = null;
  // کروکی در سرور ثبت و پرداخت شده («کروکی‌های من»)؛ پس هیچ‌چیز از آن —
  // نه ترسیم‌ها، نه فرم، نه پیش‌نویس، نه پیش‌نمایش — نباید در حافظه بماند
  persistSuspended = true;
  try {
    pins.splice(0, pins.length);
  } catch (e) {}
  try {
    savePins([]);
  } catch (e) {}
  try {
    clearDraft();
  } catch (e) {}
  try {
    clearGen();
  } catch (e) {}
  try {
    saveWizard({
      step: "done",
      reachedIndex: reachedIndex.value,
      templateId: "technical",
      trackingCode: trackingCode.value || "",
      form: { ...defaultKrokiForm() },
    });
  } catch (e) {}
  go("done");
}

// فرم خالی پیش‌فرض برای پاک‌سازی حافظه بعد پرداخت
function defaultKrokiForm() {
  return {
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
    initialSurveyType: "",
    logo: "",
    description: "",
  };
}

// بازگردانی یک کروکی ذخیره‌شده (پیش‌نویس) به ویزارد برای ادامه/ویرایش ترسیم
function pinsFromSavedKroki(k) {
  const out = [];
  try {
    const dd = k?.drawing_data;
    if (Array.isArray(dd) && dd.length) {
      for (const p of dd) {
        if (!p || !p.shape) continue;
        let copy = null;
        try {
          copy = JSON.parse(JSON.stringify(p));
        } catch (e) {
          continue;
        }
        if (copy.shape) delete copy.shape._sourceIds;
        copy.selected = copy.selected !== false;
        if (!copy.id) copy.id = crypto.randomUUID();
        if (!copy.type) copy.type = "draw";
        out.push(copy);
      }
      if (out.length) return out;
    }
    // fallback قدیمی: فقط مختصات تخت
    const pts = Array.isArray(k?.geometry_points) ? k.geometry_points : [];
    const positions = pts
      .map((p) => ({
        lon: Number(p.lon ?? p.lng ?? p.x),
        lat: Number(p.lat ?? p.y),
        height: 0,
      }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    if (positions.length >= 2) {
      out.push({
        id: crypto.randomUUID(),
        name: k?.title || "کروکی بازیابی‌شده",
        descr: "",
        shape: {
          type: "polygon",
          positions,
          color: "#ff0000",
          outlineColor: "#ff0000",
          opacity: 0.7,
          width: 3,
          show: true,
        },
        date: new Date(),
        save: -1,
        type: "draw",
        selected: true,
      });
    }
  } catch (e) {}
  return out;
}

function formFromSavedKroki(k) {
  return {
    title: k?.title ?? "پلان وضعیت موجود",
    client: k?.client_name ?? "",
    clientPhone: k?.client_phone ?? "",
    clientNationalId: k?.client_national_id ?? "",
    address: k?.address ?? "",
    city: k?.city ?? "",
    date: k?.survey_date || getTodayJalali(),
    surveyor: k?.surveyor ?? "",
    plaque: k?.plaque ?? "",
    streetWidth: k?.street_width ?? "",
    initialSurveyType: k?.initial_survey_type ?? "",
    logo: k?.logo_url ?? "",
    description: k?.description ?? "",
  };
}

async function openDraftForEdit(kroki) {
  if (!kroki) return;
  let full = kroki;
  // لیست سبک است؛ جزئیات کامل (ترسیم‌ها) را بگیر
  if (!Array.isArray(full.drawing_data) && (!Array.isArray(full.geometry_points) || !full.geometry_points.length)) {
    try {
      const d = await auth.getKroki(full.id);
      if (d?.success && d?.kroki) full = d.kroki;
    } catch (e) {}
  }
  if (pins.length) {
    const ok = confirm("ترسیم‌های فعلی جایگزین می‌شود. ادامه می‌دهید؟");
    if (!ok) return;
  }
  pins.splice(0, pins.length);
  const restored = pinsFromSavedKroki(full);
  if (!restored.length) {
    alert("ترسیم معتبری در این کروکی یافت نشد.");
    return;
  }
  restored.forEach((p) => pins.push(p));
  Object.assign(krokiForm, formFromSavedKroki(full));
  templateId.value = full.template_key || templateId.value || "technical";
  editingKrokiId.value = full.id;
  persistSuspended = false;
  try {
    clearDraft();
  } catch (e) {}
  try {
    clearGen();
  } catch (e) {}
  if (gen.value) {
    try {
      gen.value.state.ready = false;
      gen.value.state.errorMsg = "";
    } catch (e) {}
  }
  reachedIndex.value = 0;
  page.value = "app";
  step.value = "draw";
  persistSession();
  logger.info("kroki", "باز شدن پیش‌نویس ذخیره‌شده برای ویرایش", { id: full.id });
}

function restart() {
  persistSuspended = false;
  pins.splice(0, pins.length);
  templateId.value = "technical";
  trackingCode.value = "";
  editingKrokiId.value = null;
  krokiForm.title = "پلان وضعیت موجود";
  krokiForm.client = "";
  krokiForm.clientPhone = "";
  krokiForm.clientNationalId = "";
  krokiForm.address = "";
  krokiForm.city = "";
  krokiForm.surveyor = "";
  krokiForm.plaque = "";
  krokiForm.streetWidth = "";
  krokiForm.initialSurveyType = "";
  krokiForm.logo = "";
  krokiForm.description = "";
  krokiForm.date = getTodayJalali();
  reachedIndex.value = 0;
  step.value = "landing";
  // شروع سفارش جدید یعنی پاک شدن عمدی → حافظه محلی هم پاک شود
  try {
    clearAllSession();
  } catch (e) {}
  try {
    clearGen();
  } catch (e) {}
  try {
    persistSession();
  } catch (e) {}
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