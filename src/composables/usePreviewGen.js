// تک‌نمونه (singleton) پیش‌نمایش کروکی: ماژول سنگین useKrokiGenerator فقط
// بار اول lazy import می‌شود و نتیجه بین همه‌ی صفحه‌ها مشترک می‌ماند.
import { shallowRef } from "vue";
import { logger } from "../utils/logger";

const gen = shallowRef(null);
let genPromise = null;
let restoring = false;

// بارگیری پیش‌نمایش (ماژول سنگین فقط یکبار import می‌شود)
export function ensureGen() {
  if (gen.value) return Promise.resolve(gen.value);
  if (!genPromise) {
    genPromise = import("./useKrokiGenerator")
      .then((m) => {
        gen.value = m.useKrokiGenerator();
        return gen.value;
      })
      .catch((e) => {
        genPromise = null;
        throw e;
      });
  }
  return genPromise;
}

export function resetGen() {
  if (!gen.value) return;
  try {
    gen.value.state.ready = false;
    gen.value.state.errorMsg = "";
  } catch {}
}

// پیش‌نمایش را بعد رفرش برمی‌گرداند: اول از snapshot (فوری، بدون شبکه)،
// اگر نبود با محاسبه مجدد محلی از روی pins+form
export async function restoreGenIfNeeded({ wizard, persistGen } = {}) {
  if (restoring) return false;
  const g = gen.value;
  if (!g) return false;
  if (g.state?.ready) return true;
  restoring = true;
  try {
    // ۱) تلاش با snapshot ذخیره‌شده
    let snap = null;
    try {
      snap = (await import("../utils/sessionPersist")).loadGen();
    } catch {
      snap = null;
    }
    if (snap?.state) {
      try {
        g.setTemplate(snap.templateId || wizard?.templateId);
      } catch {}
      if (snap.templateId && wizard) wizard.templateId = snap.templateId;
      try {
        Object.assign(g.state, {
          utmPoints: snap.state.utmPoints || [],
          outputTableIndices: snap.state.outputTableIndices || [],
          areaM2: snap.state.areaM2 || 0,
          tableEdges: snap.state.tableEdges || [],
          utmZone: snap.state.utmZone ?? null,
          centerUtm: snap.state.centerUtm || null,
          shapeCentroids: snap.state.shapeCentroids || [],
          edgeTexts: snap.state.edgeTexts || [],
          selectedShapesMeta: snap.state.selectedShapesMeta || [],
          templateId: snap.state.templateId || wizard?.templateId,
          orientation: snap.state.orientation || "portrait",
          styleOverrides: { ...(snap.state.styleOverrides || {}) },
          mapImage: snap.state.mapImage || g.state.mapImage || "",
          ready: true,
          errorMsg: "",
          generating: false,
        });
        g.last.form = snap.form ? { ...snap.form } : { ...(wizard?.form || {}) };
        g.last.pins = wizard?.pins;
        // نشانی پیشنهادی را به فرم اصلی هم برگردان
        if (wizard && !wizard.form.address && g.last.form?.address) {
          wizard.form.address = g.last.form.address;
        }
        logger.info("preview", "بازیابی پیش‌نمایش پس از رفرش از حافظه محلی");
        return true;
      } catch {}
    }
    // ۲) fallback: محاسبه مجدد محلی (بدون نیاز به نقشه؛ فقط mapImage خالی می‌ماند)
    try {
      g.setTemplate(wizard?.templateId);
      const ok = await g.computeGeometry(wizard?.pins || [], wizard?.form || {});
      if (ok) {
        if (wizard && !wizard.form.address && g.last?.form?.address) {
          wizard.form.address = g.last.form.address;
        }
        persistGen?.();
        logger.info("preview", "بازیابی پیش‌نمایش پس از رفرش با محاسبه مجدد");
        return true;
      }
    } catch {}
    return false;
  } finally {
    restoring = false;
  }
}

// سازگاری با API قبلی (App.vue از usePreviewGen() استفاده می‌کند)
export function usePreviewGen() {
  return { gen, ensureGen, resetGen, restoreGenIfNeeded };
}
