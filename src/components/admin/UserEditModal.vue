<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="$emit('close')">
        <div class="card !rounded-2xl max-w-md w-full modal">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--info)] to-[var(--info-glow)] flex items-center justify-center">
                <i class="fas fa-user-pen text-white text-sm"></i>
              </div>
              <h3 class="font-bold text-sm">ویرایش کاربر</h3>
            </div>
            <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]" @click="$emit('close')">
              <i class="fas fa-xmark text-xs"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">نام کاربر *</label>
              <input v-model="modal.name" type="text" class="input" placeholder="نام کامل" maxlength="120" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">شماره همراه</label>
                <input v-model="modal.phone" type="text" inputmode="numeric" dir="ltr" class="input text-center" placeholder="09123456789" maxlength="11" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">کد ملی</label>
                <input v-model="modal.nationalId" type="text" inputmode="numeric" dir="ltr" class="input text-center" placeholder="۱۰ رقمی" maxlength="10" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">شهر</label>
              <input v-model="modal.city" type="text" class="input" placeholder="شهر محل سکونت" maxlength="100" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">رمز عبور جدید</label>
              <input v-model="modal.password" type="password" class="input" placeholder="خالی = بدون تغییر" maxlength="72" autocomplete="new-password" />
            </div>
            <div class="rounded-xl border border-[var(--info)]/25 bg-[var(--info-glow)] p-3">
              <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">مدت استفاده رایگان (روز)</label>
              <input v-model="modal.freeAccessDays" type="number" min="0" max="36500" class="input" dir="ltr" placeholder="خالی = بدون تغییر" />
              <p class="text-[10px] text-[var(--text-muted)] mt-1.5 leading-5">
                وضعیت فعلی: {{ freeAccessUntilLabel }}. ثبت تعداد روز، دوره را از امروز شروع می‌کند؛ ۰ یعنی لغو دسترسی زمان‌دار. هر ماه ۳۰ روز است.
              </p>
            </div>
            <div v-if="modal.error" class="text-xs text-[var(--danger)] bg-[var(--danger-glow)] px-3 py-2 rounded-lg">
              {{ modal.error }}
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button class="btn btn-primary flex-1" :disabled="modal.saving" @click="saveEditUser">
              <i v-if="modal.saving" class="fas fa-circle-notch fa-spin ml-1"></i>
              <i v-else class="fas fa-check ml-1"></i>
              {{ modal.saving ? 'در حال ذخیره...' : 'ذخیره تغییرات' }}
            </button>
            <button class="btn btn-ghost flex-1" @click="$emit('close')">انصراف</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { inject } from "vue";
import { auth } from "../../stores/auth";
import { validatePassword, faToEn, isValidNationalCode } from "../../utils/validators";

const props = defineProps({
  modal: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const freeAccessUntilLabel = props.modal.user.freeAccessUntil
  ? new Date(props.modal.user.freeAccessUntil).toLocaleString("fa-IR")
  : "فعال نیست";

const notify = inject("notify", () => {});

async function saveEditUser() {
  const m = props.modal;
  m.error = "";
  const name = String(m.name || "").trim();
  if (!name) {
    m.error = "نام کاربر را وارد کنید.";
    return;
  }
  const phone = faToEn(String(m.phone || "")).trim().replace(/[^\d]/g, "");
  if (phone && !/^09\d{9}$/.test(phone)) {
    m.error = "شماره همراه معتبر نیست (۱۱ رقم با 09).";
    return;
  }
  const nationalId = faToEn(String(m.nationalId || "")).trim().replace(/[^\d]/g, "");
  if (nationalId && !isValidNationalCode(nationalId)) {
    m.error = "کد ملی معتبر نیست (۱۰ رقم).";
    return;
  }
  // رمز جدید هم باید سیاست امنیتی را پاس کند (خالی = بدون تغییر)
  if (String(m.password || "").trim()) {
    const pwErr = validatePassword(m.password);
    if (pwErr) {
      m.error = pwErr;
      return;
    }
  }
  m.saving = true;
  const payload = { name };
  // خالی کردن موبایل مجاز نیست (فیلد اجباری و یکتاست)؛ فقط مقدار معتبر جدید ارسال می‌شود
  if (phone && phone !== String(m.user.phone || "")) payload.phone = phone;
  if (nationalId !== String(m.user.nationalId || "")) payload.nationalId = nationalId;
  if (String(m.city || "").trim() !== String(m.user.city || "")) payload.city = String(m.city || "").trim();
  if (String(m.password || "").trim()) payload.password = String(m.password).trim();
  if (m.freeAccessDays !== "") payload.freeAccessDays = m.freeAccessDays;
  const res = await auth.editUser(m.user.id, payload);
  m.saving = false;
  if (res.success) {
    notify("اطلاعات کاربر با موفقیت به‌روزرسانی شد.");
    emit("close");
  } else {
    m.error = res.error || "خطا در ویرایش کاربر";
  }
}
</script>
