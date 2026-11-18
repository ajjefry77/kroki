<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg)]">
    <LogPanel v-model="logOpen" />

    <SignupGiftPopup :gift="signupGift" @close="onGiftClose" />
    <FreeDayPopup :occasion="freeDayInfo?.occasion || ''" :open="freeDayPopup" @close="freeDayPopup = false" />

    <Transition name="page" mode="out-in">
      <AuthView v-if="page === 'auth'" key="auth" @back="goHome" @success="onAuthSuccess" />

      <AdminPanel v-else-if="page === 'admin'" key="admin" @home="goHome" />

      <UserPanel v-else-if="page === 'userpanel'" key="userpanel" :initial-tab="userPanelTab" @home="goHome" @editDraft="openDraftForEdit" />

      <AgencyRequestPage v-else-if="page === 'agency-request'" key="agency-request" @home="goHome" />

      <ExpertRequestPage v-else-if="page === 'expert-request'" key="expert-request" @home="goHome" @login="openAuth('expert-request')" />

      <ExpertListPage v-else-if="page === 'experts'" key="experts" @home="goHome" @request="openExpertRequest" />

      <PaymentResult v-else-if="page === 'payment-result'" key="payment-result" @home="goHome" @profile="openUserPanel" />

      <LandingPage
        v-else-if="step === 'landing'"
        key="landing"
        :authed="auth.isAuthenticated.value"
        :user-name="auth.state.user?.name"
        :is-admin="auth.isAdmin.value"
        :wallet="auth.walletOf()"
        :free="auth.freeOf()"
        :free-days="auth.freeDaysLeft()"
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
              :pins="pins"
              :form="krokiForm"
              :editing-kroki-id="editingKrokiId"
              @back="go('info')"
              @done="onPaymentDone"
              @charge="openUserPanel('wallet')"
            />

            <DownloadStep
              v-else-if="step === 'done' && gen"
              key="done"
              :gen="gen"
              :form="krokiForm"
              :template-id="templateId"
              :tracking-code="trackingCode"
              :form-index="1"
              :authed="auth.isAuthenticated.value"
              @login="openAuth('done')"
              @restart="restart"
              @home="go('landing')"
            />

            <div v-else-if="step === 'done'" key="done-restored" class="flex-1 flex items-center justify-center px-4 py-10">
              <div class="card !rounded-3xl py-12 text-center max-w-lg w-full">
                <div class="w-20 h-20 mx-auto rounded-full bg-[var(--success-glow)] border-2 border-[var(--success)] flex items-center justify-center mb-6">
                  <i class="fas fa-circle-check text-3xl text-[var(--success)]"></i>
                </div>
                <h2 class="text-xl font-extrabold mb-2">سفارش شما ثبت و صادر شد</h2>
                <p v-if="trackingCode" class="text-sm text-[var(--text-muted)] mb-2">
                  کد پیگیری: <span class="font-bold text-[var(--accent-soft)]" dir="ltr">{{ trackingCode }}</span>
                </p>
                <p class="text-xs text-[var(--text-muted)] leading-6 mb-8">
                  اطلاعات ترسیم پس از صدور از این دستگاه پاک شد.<br />
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

            <div v-else-if="step === 'preview' || step === 'done'" key="gen-loading" class="flex-1 flex items-center justify-center">
              <Loading :active="true" title="در حال آماده‌سازی..." message="لطفاً چند لحظه صبر کنید" />
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
// App یک لایه‌ی نازک است: مسیرها در src/router، حالت ویزارد در stores/wizard،
// پیش‌نمایش در composables/usePreviewGen و ماندگاری در composables/useSessionSync.
import { ref, watch, computed, onMounted, onUnmounted, defineAsyncComponent, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { sharedMapQuery } from "./utils/sharedMapLink.js";
import { logger } from "./utils/logger";
import { auth } from "./stores/auth";
import { useWizardStore, wizardStepIds } from "./stores/wizard";
import { usePreviewGen } from "./composables/usePreviewGen";
import { createSessionSync, suspendPersist, resumePersist } from "./composables/useSessionSync";
import { cleanupPinLayers } from "./utils/mapLayers";
import { defaultKrokiForm, pinsFromSavedKroki, formFromSavedKroki } from "./utils/krokiDraft";
import {
  savePins,
  saveWizard,
  clearDraft,
  clearGen,
  clearAllSession,
} from "./utils/sessionPersist";

const LandingPage = defineAsyncComponent(() => import("./components/LandingPage.vue"));
import Loading from "./components/Loading.vue";
import FreeDayPopup from "./components/FreeDayPopup.vue";
import SignupGiftPopup from "./components/SignupGiftPopup.vue";

const WizardHeader = defineAsyncComponent(() => import("./components/WizardHeader.vue"));
const LogPanel = defineAsyncComponent(() => import("./components/LogPanel.vue"));
const AuthView = defineAsyncComponent(() => import("./components/AuthView.vue"));
const AdminPanel = defineAsyncComponent(() => import("./components/AdminPanel.vue"));
const UserPanel = defineAsyncComponent(() => import("./components/UserPanel.vue"));
const AgencyRequestPage = defineAsyncComponent(() => import("./components/AgencyRequestPage.vue"));
const ExpertRequestPage = defineAsyncComponent(() => import("./components/ExpertRequestPage.vue"));
const ExpertListPage = defineAsyncComponent(() => import("./components/ExpertListPage.vue"));
const PaymentResult = defineAsyncComponent(() => import("./components/PaymentResult.vue"));
const DrawStep = defineAsyncComponent(() => import("./components/steps/DrawStep.vue"));
const InfoStep = defineAsyncComponent(() => import("./components/steps/InfoStep.vue"));
const PreviewStep = defineAsyncComponent(() => import("./components/steps/PreviewStep.vue"));
const DownloadStep = defineAsyncComponent(() => import("./components/steps/DownloadStep.vue"));

const steps = [
  { id: "draw", label: "ترسیم نقشه" },
  { id: "info", label: "اطلاعات و قالب" },
  { id: "preview", label: "پیش‌نمایش" },
  { id: "done", label: "دانلود" },
];

const route = useRoute();
const router = useRouter();
const wizard = useWizardStore();
const { pins, form: krokiForm, templateId, trackingCode, editingKrokiId, reachedIndex } = storeToRefs(wizard);

// صفحات مستقل (auth/admin/...) از روی route.name و مراحل ویزارد از meta.step
const page = computed(() => (route.meta.wizard ? "app" : route.name));
const step = computed(() => route.meta.step || "landing");

const genApi = usePreviewGen();
const gen = genApi.gen;
const userPanelTab = ref("wallet");
const logOpen = ref(false);
const logStats = computed(() => logger.getStats());

const sessionSync = createSessionSync(wizard, genApi);

const map = shallowRef(null);

onMounted(() => {
  auth.syncUser();
});

// ---------- پاپ‌آپ‌های استفاده رایگان ----------
// ۱) هدیه خوش‌آمدگویی بعد از ثبت‌نام ۲) اعلام روز رایگان سراسری
const signupGift = ref(null);
const freeDayPopup = ref(false);
const freeDayInfo = computed(() => auth.state.freeDay);
let freeDayPopupShown = false;

async function showFreeDayPopup() {
  if (freeDayPopupShown) return;
  const day = await auth.loadFreeDay();
  if (!day) return;
  freeDayPopupShown = true;
  freeDayPopup.value = true;
}

function onGiftClose() {
  signupGift.value = null;
  if (auth.isAuthenticated.value) void showFreeDayPopup();
}

function takePendingGift() {
  if (signupGift.value) return true;
  const gift = auth.takeSignupGift();
  if (!gift) return false;
  signupGift.value = gift;
  return true;
}

watch(
  [() => auth.isAuthenticated.value, () => route.name],
  () => {
    if (!auth.isAuthenticated.value) {
      freeDayPopup.value = false;
      return;
    }
    if (route.name !== "landing") {
      // در صفحه‌های دیگر فقط وضعیت روز رایگان را تازه می‌کنیم (برای پرداخت رایگان)
      void auth.loadFreeDay();
      return;
    }
    // اگر هدیه ثبت‌نام در انتظار است، اول آن نمایش داده می‌شود و پس از بستن، روز رایگان
    if (takePendingGift()) return;
    void showFreeDayPopup();
  },
  { immediate: true },
);

onUnmounted(() => {
  sessionSync.dispose();
});

// ---------- پیمایش و گاردها ----------
// مقصد بازگشت بعد از ورود موفق. به جای threading دستی بین توابع،
// بازگشت هدف در این ref ثبت و in onAuthSuccess حل می‌شود.
const authReturn = ref("");

function openAuth(returnTo) {
  authReturn.value = returnTo;
  router.push({ name: "auth", query: { ...currentMapQuery(), return: returnTo } });
}

function goHome() {
  router.push({ name: "landing" });
}

function openAdmin() {
  authReturn.value = "admin";
  router.push({ name: "admin" });
}

function openUserPanel(tab) {
  if (tab) userPanelTab.value = tab;
  authReturn.value = "userpanel";
  router.push({ name: "userpanel" });
}

function openAgencyRequest() {
  authReturn.value = "agency-request";
  router.push({ name: "agency-request" });
}

function openExpertRequest() {
  // دکمه «درخواست همکاری» باید همیشه فرم را باز کند (حتی برای مهمان).
  // کنترل ورود/نقش موقع ارسال در ExpertRequestPage انجام می‌شود تا دکمه هیچ‌وقت بی‌اثر به‌نظر نرسد.
  router.push({ name: "expert-request" });
}

function openExperts() {
  router.push({ name: "experts" });
}

function onAuthSuccess() {
  // اگر کاربر وسط مکثِ «در حال انتقال...» خودش برگشته باشد، جلو نبریمش
  if (route.name !== "auth") return;
  const ret = authReturn.value || route.query.return || "";
  authReturn.value = "";
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
  if (ret === "done") {
    go("done");
    return;
  }
  if (ret === "start") {
    start();
  } else if (auth.isAdmin.value) {
    openAdmin();
  } else {
    goHome();
  }
}

// اگر session کاربر از دست رفت (توکن منقضی/لاگ‌اوت دیگر tab)، به صفحه‌ی
// ورود برگردیم و مقصد بازگشت را ثبت کنیم
watch(
  () => auth.isAuthenticated.value,
  (ok) => {
    if (ok || route.name === "auth") return;
    const name = route.name;
    if (name !== "admin" && name !== "userpanel") return;
    authReturn.value = name === "admin" ? "admin" : name === "userpanel" ? "userpanel" : "start";
    router.push({ name: "auth", query: { ...currentMapQuery(), return: authReturn.value } });
  },
);

// ---------- پیمایش ویزارد ----------
// پارامترهای view نقشه (لینک اشتراکی) باید هنگام جابه‌جایی مراحل حفظ شوند
function currentMapQuery() {
  return sharedMapQuery();
}

function pushStep(id) {
  router.push({ path: "/" + id, query: currentMapQuery() });
}

function go(id) {
  if (id !== "landing") genApi.ensureGen().catch(() => {});
  // نشانی خودکار (پیشنهاد map.ir در پیش‌نمایش) را به فرم اصلی برمی‌گردانیم
  // تا در payload ثبت/صدور به سرور هم ارسال شود
  if ((id === "preview" || id === "done") && !wizard.form.address) {
    const auto = genApi.gen.value?.last?.form?.address || "";
    if (auto) wizard.form.address = auto;
  }
  if (id === "draw") resumePersist();
  if (id === "landing") goHome();
  else pushStep(id);
}

function navigate(id) {
  go(id);
}

function start() {
  logger.info("step", "شروع فرآیند ساخت کروکی");
  wizard.reachedIndex = 0;
  resumePersist();
  genApi.ensureGen().catch(() => {});
  pushStep("draw");
}

function logout() {
  auth.logout();
  logger.info("auth", "خروج از حساب کاربری");
  restart();
}

// اگر با رفرش مستقیم روی پیش‌نمایش آمدیم، gen را برگردان
function restorePreviewAfterLoad() {
  if (step.value === "preview") {
    genApi
      .ensureGen()
      .then(() => genApi.restoreGenIfNeeded({ wizard, persistGen: sessionSync.persistGen }))
      .catch(() => {});
  }
}
onMounted(restorePreviewAfterLoad);

// نشانی و پیشرفت مراحل: ورود به هر مرحله، بیشینه‌ی مراحل قابل بازگشت را ثبت می‌کند
watch(
  step,
  (s) => {
    wizard.markReached(s);
  },
  { immediate: true },
);

// ---------- ترسیم‌ها ----------
function onMapReady({ map: m }) {
  map.value = m;
}

function removePin(pin) {
  wizard.removePinById(pin.id);
  // حذف باید بلافاصله در حافظه محلی هم اعمال شود تا بعد رفرش برنگردد
  try {
    sessionSync.persistSession();
  } catch {}
  cleanupPinLayers(map.value, pin);
}

async function onDrawSubmit() {
  const g = await genApi.ensureGen();
  const geom = g.buildGeometry(pins.value);
  if (!geom) return;
  // نشانی خودکار را موازی با برداشت تصویر می‌گیریم تا موقع ورود به
  // قسمت اطلاعات، فیلد نشانی از قبل پر باشد
  const addrPromise = import("./composables/useKrokiGenerator")
    .then((m) => m.suggestAddressForPositions(geom.allPositions))
    .catch(() => "");
  try {
    g.state.mapImage = await g.captureMapImage(map.value, pins.value, geom.allPositions);
    logger.info("draw", "ثبت ترسیم‌ها و برداشت تصویر نقشه", {
      shapes: geom.metas.length,
      points: geom.allPositions.length,
    });
  } catch (e) {
    logger.error("draw", "خطا در برداشت تصویر نقشه", e.message);
  }
  try {
    const auto = await addrPromise;
    if (auto && !String(wizard.form.address || "").trim()) wizard.form.address = auto;
  } catch {}
  go("info");
}

async function onInfoSubmit() {
  const g = await genApi.ensureGen();
  g.setTemplate(wizard.templateId);
  const ok = await g.computeGeometry(pins.value, wizard.form);
  if (!ok) return;
  // نشانی خودکار map.ir را به فرم اصلی برمی‌گردانیم تا در فیلد اطلاعات
  // دیده شود و در ثبت/پرداخت به سرور ارسال شود
  if (!wizard.form.address && g.last?.form?.address) wizard.form.address = g.last.form.address;
  try {
    sessionSync.persistGen();
  } catch {}
  go("preview");
}

function onPaymentDone(result) {
  if (result?.guest) {
    wizard.trackingCode = "";
    go("done");
    return;
  }
  wizard.trackingCode = result?.trackingCode || "";
  wizard.editingKrokiId = null;
  // کروکی در سرور ثبت و پرداخت شده («کروکی‌های من»)؛ پس هیچ‌چیز از آن —
  // نه ترسیم‌ها، نه فرم، نه پیش‌نویس، نه پیش‌نمایش — نباید در حافظه بماند
  suspendPersist();
  try {
    wizard.pins.splice(0, wizard.pins.length);
  } catch {}
  try {
    savePins([]);
  } catch {}
  try {
    clearDraft();
  } catch {}
  try {
    clearGen();
  } catch {}
  try {
    saveWizard({
      step: "done",
      reachedIndex: wizard.reachedIndex,
      templateId: "technical",
      trackingCode: wizard.trackingCode || "",
      form: { ...defaultKrokiForm() },
    });
  } catch {}
  // شروع سفارش بعدی دوباره ذخیره را فعال می‌کند (در go/start)
  go("done");
}

// ---------- بازگردانی پیش‌نویس ذخیره‌شده ----------
// بازگردانی یک کروکی ذخیره‌شده (پیش‌نویس) به ویزارد برای ادامه/ویرایش ترسیم
async function openDraftForEdit(kroki) {
  if (!kroki) return;
  let full = kroki;
  // لیست سبک است؛ جزئیات کامل (ترسیم‌ها) را بگیر
  if (!Array.isArray(full.drawing_data) && (!Array.isArray(full.geometry_points) || !full.geometry_points.length)) {
    try {
      const d = await auth.getKroki(full.id);
      if (d?.success && d?.kroki) full = d.kroki;
    } catch {}
  }
  if (wizard.pins.length) {
    const ok = confirm("ترسیم‌های فعلی جایگزین می‌شود. ادامه می‌دهید؟");
    if (!ok) return;
  }
  const restored = pinsFromSavedKroki(full);
  if (!restored.length) {
    alert("ترسیم معتبری در این کروکی یافت نشد.");
    return;
  }
  wizard.replacePins(restored);
  Object.assign(wizard.form, formFromSavedKroki(full));
  wizard.templateId = full.template_key || wizard.templateId || "technical";
  wizard.editingKrokiId = full.id;
  resumePersist();
  try {
    clearDraft();
  } catch {}
  try {
    clearGen();
  } catch {}
  genApi.resetGen();
  wizard.reachedIndex = 0;
  resumePersist();
  pushStep("draw");
  sessionSync.persistSession();
  logger.info("kroki", "باز شدن پیش‌نویس ذخیره‌شده برای ویرایش", { id: full.id });
}

function restart() {
  resumePersist();
  wizard.reset();
  // شروع سفارش جدید یعنی پاک شدن عمدی → حافظه محلی هم پاک شود
  try {
    clearAllSession();
  } catch {}
  try {
    clearGen();
  } catch {}
  try {
    sessionSync.persistSession();
  } catch {}
  goHome();
  logger.info("system", "شروع سفارش جدید — بازنشانی وضعیت");
}
</script>
