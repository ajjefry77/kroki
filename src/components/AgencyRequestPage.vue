<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-user-tie text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">درخواست اخذ نمایندگی</div>
            <div class="text-[11px] text-[var(--text-muted)]">تکمیل اطلاعات و ارسال درخواست</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" @click="$emit('home')">
            <i class="fas fa-house ml-1"></i> صفحه اصلی
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
      <Transition name="step" mode="out-in">
        <div v-if="submitted" key="success" class="text-center">
          <div class="card !rounded-2xl p-10">
            <div class="w-16 h-16 rounded-full bg-[var(--success-glow)] border border-[var(--success)]/30 flex items-center justify-center mx-auto mb-5">
              <i class="fas fa-check text-2xl text-[var(--success)]"></i>
            </div>
            <h2 class="text-xl font-extrabold mb-2">درخواست شما ثبت شد</h2>
            <p class="text-sm text-[var(--text-muted)] leading-7 mb-6">
              درخواست نمایندگی شما با موفقیت ارسال شد. پس از بررسی و تأیید مدیر سیستم، نماینده خواهید شد و کد معرف اختصاصی دریافت خواهید کرد.
            </p>
            <button class="btn btn-primary" @click="$emit('home')">
              <i class="fas fa-house ml-1"></i> بازگشت به صفحه اصلی
            </button>
          </div>
        </div>

        <div v-else key="form">
          <div class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-glow)] text-[var(--accent-soft)] text-xs font-medium mb-4">
              <i class="fas fa-user-tie"></i>
              نمایندگی سامانه کروکی
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold mb-2">درخواست اخذ نمایندگی</h1>
            <p class="text-sm text-[var(--text-muted)] leading-7 max-w-lg mx-auto">
              با تکمیل فرم زیر و تأیید مدیر سیستم، نماینده رسمی سامانه کروکی در شهر خود خواهید شد
              و کد معرف اختصاصی برای جذب زیرمجموعه دریافت می‌کنید.
            </p>
          </div>

          <div class="card !rounded-2xl p-6 md:p-8">
            <div class="space-y-5">
              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">نام *</label>
                <input v-model="form.firstName" type="text" class="input" placeholder="نام خود را وارد کنید" />
              </div>
              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">نام خانوادگی *</label>
                <input v-model="form.lastName" type="text" class="input" placeholder="نام خانوادگی خود را وارد کنید" />
              </div>
              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">شماره تماس *</label>
                <input v-model="form.phone" type="tel" class="input" dir="ltr" placeholder="۰۹۱۲XXXXXXX" maxlength="11" />
              </div>
              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">شهر *</label>
                <input v-model="form.city" type="text" class="input" placeholder="نام شهر محل فعالیت" />
              </div>
            </div>

            <Transition name="step">
              <div v-if="msg" class="mt-5 rounded-xl px-4 py-3 text-sm font-medium" :class="msgOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
                <i class="fas ml-1" :class="msgOk ? 'fa-circle-check' : 'fa-circle-xmark'"></i>{{ msg }}
              </div>
            </Transition>

            <button class="btn btn-primary w-full !py-3 mt-6" :disabled="!valid || busy" @click="submit">
              <i v-if="busy" class="fas fa-circle-notch fa-spin ml-1"></i>
              <i v-else class="fas fa-paper-plane ml-1"></i>
              {{ busy ? "در حال ارسال..." : "ارسال درخواست" }}
            </button>

            <p class="text-[11px] text-[var(--text-faint)] mt-4 leading-5 text-center">
              پس از ارسال، درخواست شما توسط مدیر سیستم بررسی خواهد شد.
            </p>
          </div>
        </div>
      </Transition>
    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — درخواست نمایندگی
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { auth } from "../stores/auth";

defineEmits(["home"]);

const form = reactive({
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
});

const busy = ref(false);
const msg = ref("");
const msgOk = ref(true);
const submitted = ref(false);

const valid = computed(() => {
  return (
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim().length >= 10 &&
    form.city.trim()
  );
});

async function submit() {
  busy.value = true;
  msg.value = "";
  const res = await auth.requestAgency({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
  });
  busy.value = false;
  msgOk.value = res.success;
  if (res.success) {
    submitted.value = true;
  } else {
    msg.value = res.error || "خطا در ثبت درخواست";
  }
}
</script>

<style scoped>
.step-enter-active {
  transition: all 0.3s var(--ease-out);
}
.step-leave-active {
  transition: all 0.2s ease-in;
}
.step-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.step-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
