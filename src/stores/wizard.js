// فروشگاه ویزارد کروکی (Pinia):
// ترسیم‌ها (pins)، فرم اطلاعات، قالب، کد پیگیری و پیشرفت مراحل.
// ماندگاری در localStorage را useSessionSync (در App) انجام می‌دهد؛
// اینجا فقط حالت و عملیات موضعی است.
import { defineStore } from "pinia";
import { loadPins, loadWizard } from "../utils/sessionPersist";
import { normalizeSingleSelection } from "../utils/pins";
import { defaultKrokiForm, mergeForm } from "../utils/krokiDraft";

export const wizardStepIds = ["draw", "info", "preview", "done"];

export const useWizardStore = defineStore("wizard", {
  state: () => {
    // بازیابی اولیه از localStorage تا رفرش، کاربر را وسط کار ناتمام نگه ندارد
    let saved = null;
    try {
      saved = loadWizard();
    } catch {
      saved = null;
    }
    const pins = [];
    try {
      const savedPins = loadPins();
      if (Array.isArray(savedPins) && savedPins.length) {
        savedPins.forEach((p) => pins.push(p));
        // تک‌انتخابی: اگر چند ترسیم انتخاب مانده، فقط آخری می‌ماند
        try {
          normalizeSingleSelection(pins);
        } catch {}
      }
    } catch {}
    return {
      pins,
      form: mergeForm(saved?.form),
      templateId: saved?.templateId || "technical",
      trackingCode: saved?.trackingCode || "",
      // وقتی یک پیش‌نویسِ ذخیره‌شده در سرور برای ادامه/ویرایش باز می‌شود
      editingKrokiId: null,
      reachedIndex: Number(saved?.reachedIndex) || 0,
    };
  },

  actions: {
    markReached(stepId) {
      const idx = wizardStepIds.indexOf(stepId);
      if (idx !== -1) {
        this.reachedIndex = Math.max(this.reachedIndex, idx);
      }
    },

    replacePins(list) {
      this.pins.splice(0, this.pins.length, ...list);
    },

    removePinById(pinId) {
      const idx = this.pins.findIndex((x) => x.id === pinId);
      if (idx !== -1) this.pins.splice(idx, 1);
    },

    // بازنشانی کامل (شروع سفارش جدید / خروج از حساب)
    reset() {
      this.pins.splice(0, this.pins.length);
      this.templateId = "technical";
      this.trackingCode = "";
      this.editingKrokiId = null;
      this.reachedIndex = 0;
      this.form = defaultKrokiForm();
    },
  },
});
