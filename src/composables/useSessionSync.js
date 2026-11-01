// ماندگاری session در localStorage: ترسیم‌ها + ویزارد (مرحله/فرم/قالب/کد پیگیری)
// و snapshot پیش‌نمایش. منطق قبلاً داخل App.vue بود؛ اینجا متمرکز شده
// تا App فقط یک لایه‌ی نازک باشد. فقط در App یک‌بار ساخته می‌شود.
import { watch } from "vue";
import { useRoute } from "vue-router";
import {
  savePins,
  saveWizard,
  clearAllSession,
  clearDraft,
  clearGen,
} from "../utils/sessionPersist";
import { logger } from "../utils/logger";

let persistTimer = null;
let genPersistTimer = null;
// بعد از پرداخت، هیچ‌چیز از کروکی پرداخت‌شده نباید در حافظه بماند؛
// با این پرچم، ذخیره خودکار (حتی beforeunload) تا سفارش بعدی متوقف می‌شود
let suspended = false;

export function suspendPersist() {
  suspended = true;
}

export function resumePersist() {
  suspended = false;
}

export function isPersistSuspended() {
  return suspended;
}

export function createSessionSync(wizard, genApi) {
  const route = useRoute();

  function persistSession() {
    if (suspended) return;
    try {
      savePins(wizard.pins);
    } catch {}
    try {
      saveWizard({
        step: route.meta.step || route.name || "landing",
        reachedIndex: wizard.reachedIndex,
        templateId: wizard.templateId,
        trackingCode: wizard.trackingCode || "",
        form: { ...wizard.form },
      });
    } catch {}
  }

  // snapshot پیش‌نمایش (gen) — ورود wizard تضمین می‌کند form/pins از دسترس
  // خارج نباشند؛ جدا از persistSession تا تسریع UI مختل نشود
  function persistGen() {
    if (suspended) return;
    try {
      const g = genApi.gen.value;
      if (!g || !g.state?.ready) return;
      saveGenSnapshot({
        state: {
          utmPoints: g.state.utmPoints,
          outputTableIndices: g.state.outputTableIndices,
          areaM2: g.state.areaM2,
          tableEdges: g.state.tableEdges,
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
        form: g.last?.form ? { ...g.last.form } : { ...wizard.form },
        templateId: wizard.templateId,
      });
    } catch {}
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistSession, 300);
  }

  function schedulePersistGen() {
    if (genPersistTimer) clearTimeout(genPersistTimer);
    genPersistTimer = setTimeout(persistGen, 400);
  }

  // ---------- ویزارد: فرم، ترسیم‌ها، مراحل، قالب ----------
  watch(() => wizard.pins, () => schedulePersist(), { deep: true });
  watch(
    [() => route.meta.step, () => wizard.reachedIndex, () => wizard.templateId, () => wizard.editingKrokiId],
    () => schedulePersist(),
  );
  watch(() => wizard.form, () => schedulePersist(), { deep: true });

  // ---------- پیش‌نمایش: هر تغییر (جهت، استایل، مجاورت‌ها) ذخیره شود ----------
  watch(() => genApi.gen.value?.state, () => schedulePersistGen(), { deep: true });

  // مرحله‌ها: لاگ + بازیابی پیش‌نمایش + بارگیری ماژول سنگین gen.
  // ورود به ترسیم یعنی شروع کار جدید → ذخیره خودکار دوباره فعال شود
  watch(
    () => route.meta.step,
    (step, prev) => {
      if (step === "draw" && prev && prev !== "draw") resumePersist();
      if (!step || step === "landing") return;
      logger.info("step", "تغییر مرحله", { step });
      genApi.ensureGen().catch(() => {});
      // اگر وارد پیش‌نمایش شدیم ولی gen خالی است (مثلاً بعد رفرش)، برگردان
      if (step === "preview") {
        genApi
          .ensureGen()
          .then(() => genApi.restoreGenIfNeeded({ wizard, persistGen }))
          .catch(() => {});
      }
    },
    { immediate: true },
  );

  // فلاش نهایی قبل از رفرش/بستن تا آخرین تغییر (دیبانس‌شده) گم نشود
  window.addEventListener("beforeunload", persistSession);
  window.addEventListener("pagehide", persistSession);
  window.addEventListener("beforeunload", persistGen);
  window.addEventListener("pagehide", persistGen);

  return {
    persistSession,
    persistGen,
    schedulePersist,
    clearSession: clearAllSession,
    clearDraft,
    clearGen,
    dispose: () => {
      window.removeEventListener("beforeunload", persistSession);
      window.removeEventListener("pagehide", persistSession);
      window.removeEventListener("beforeunload", persistGen);
      window.removeEventListener("pagehide", persistGen);
    },
  };
}
