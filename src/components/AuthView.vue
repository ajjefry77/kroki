<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20" style="background: radial-gradient(circle, #FA6C04, transparent 70%)"></div>
      <div class="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full opacity-15" style="background: radial-gradient(circle, #2f6fd0, transparent 70%)"></div>
    </div>

    <div class="relative w-full max-w-md p-8 rounded-2xl card !rounded-2xl shadow-xl auth-card">
      <div class="text-center mb-6">
        <img src="/favicon.png" alt="لوگوی سامانه کروکی" class="w-14 h-14 mx-auto rounded-2xl object-contain shadow-lg shadow-[var(--accent-glow-strong)] mb-4" />
        <h2 class="text-2xl font-extrabold">{{ mode === "login" ? "خوش آمدید" : "ثبت‌نام در سامانه" }}</h2>
        <p class="mt-2 text-sm text-[var(--text-muted)]">
          {{ mode === "login" ? "برای ورود نام کاربری و رمز عبور را وارد کنید" : "حساب کاربری بسازید تا کروکی بسازید و کیف پول داشته باشید" }}
        </p>
      </div>

      <!-- تب‌ها -->
      <div class="auth-tabs mb-6">
        <button
          class="auth-tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >
          <i class="fas fa-right-to-bracket ml-1.5"></i>
          ورود
        </button>
        <button
          class="auth-tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >
          <i class="fas fa-user-plus ml-1.5"></i>
          ثبت‌نام
        </button>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <Transition name="fade-slide">
          <div v-if="error" class="flex items-center gap-2 border border-[var(--danger)]/25 bg-[var(--danger-glow)] px-4 py-3 rounded-xl text-sm text-[var(--danger)]">
            <i class="fas fa-triangle-exclamation"></i>
            <span>{{ error }}</span>
          </div>
        </Transition>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">نام و نام خانوادگی</label>
          <input v-model="fields.name" type="text" class="input" placeholder="نام و نام خانوادگی" maxlength="100" autocomplete="name" spellcheck="false" />
        </div>

        <div>
          <label class="block mb-1.5 text-xs font-medium">نام کاربری *</label>
          <input v-model="fields.username" type="text" class="input" required placeholder="شماره همراه یا ایمیل" maxlength="64" autocomplete="username" spellcheck="false" />
        </div>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">شماره همراه</label>
          <input v-model="fields.phone" type="tel" inputmode="numeric" dir="ltr" class="input ltr" placeholder="09xxxxxxxxx" maxlength="11" autocomplete="tel" @input="fields.phone = faToEn(fields.phone).replace(/[^\d]/g, '').slice(0, 11)" />
        </div>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">کد معرف نماینده (اختیاری)</label>
          <input v-model="fields.agentCode" type="text" class="input ltr" dir="ltr" placeholder="کد نماینده" maxlength="32" autocomplete="off" spellcheck="false" />
        </div>

        <div>
          <label class="block mb-1.5 text-xs font-medium">رمز عبور *</label>
          <input
            v-model="fields.password"
            type="password"
            class="input"
            required
            :minlength="mode === 'register' ? 8 : 1"
            maxlength="72"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            placeholder="رمز عبور"
          />
          <ul v-if="mode === 'register'" class="mt-2 space-y-1 text-[11px]">
            <li class="flex items-center gap-1.5" :class="pwCheck.length ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'">
              <i class="fas" :class="pwCheck.length ? 'fa-circle-check' : 'fa-circle'"></i> حداقل ۸ کاراکتر
            </li>
            <li class="flex items-center gap-1.5" :class="pwCheck.lower ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'">
              <i class="fas" :class="pwCheck.lower ? 'fa-circle-check' : 'fa-circle'"></i> حروف کوچک انگلیسی (a-z)
            </li>
            <li class="flex items-center gap-1.5" :class="pwCheck.upper ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'">
              <i class="fas" :class="pwCheck.upper ? 'fa-circle-check' : 'fa-circle'"></i> حروف بزرگ انگلیسی (A-Z)
            </li>
          </ul>
        </div>

        <Captcha ref="captchaRef" @submit="submit" />

        <button type="submit" class="btn btn-primary w-full !py-3 !text-base" :disabled="loading">
          <i class="fas fa-circle-notch fa-spin ml-1" v-if="loading"></i>
          <i :class="mode === 'login' ? 'fas fa-right-to-bracket ml-1' : 'fas fa-user-plus ml-1'" v-else></i>
          {{ loading ? "در حال انجام..." : mode === "login" ? "ورود به سامانه" : "ساخت حساب و ورود" }}
        </button>
      </form>

      <button class="mt-5 w-full btn btn-ghost text-sm" @click="$emit('back')">
        <i class="fas fa-arrow-right ml-1"></i>
        بازگشت به صفحه اصلی
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { auth } from "../stores/auth";
import { faToEn } from "../utils/validators";
import Captcha from "./Captcha.vue";

const emit = defineEmits(["back", "success"]);

const mode = ref("login");
const loading = ref(false);
const error = ref("");
const captchaRef = ref(null);
const fields = reactive({ name: "", username: "", phone: "", password: "", agentCode: "" });

const pwCheck = computed(() => ({
  length: fields.password.length >= 8,
  lower: /[a-z]/.test(fields.password),
  upper: /[A-Z]/.test(fields.password),
}));

// با عوض شدن حالت، چالش امنیتی تازه می‌شود
watch(mode, () => {
  error.value = "";
  captchaRef.value?.refresh();
});

async function submit() {
  if (loading.value) return;
  if (!captchaRef.value?.validate()) {
    error.value = "کد امنیتی اشتباه است؛ کد جدید را وارد کنید";
    return;
  }
  loading.value = true;
  error.value = "";
  const result =
    mode.value === "login"
      ? await auth.login(fields.username, fields.password)
      : await auth.register(fields);
  loading.value = false;
  if (result.success) {
    fields.username = "";
    fields.password = "";
    emit("success");
  } else {
    error.value = result.error;
    captchaRef.value?.refresh();
  }
}
</script>

<style scoped>
.auth-card {
  animation: auth-in 0.4s ease-out;
}
@keyframes auth-in {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.fade-slide-enter-active { animation: fade-in 0.35s ease-out; }
.fade-slide-leave-active { animation: fade-out 0.25s ease-in; }
@keyframes fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-6px); } }

.auth-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: var(--surface2);
  border: 1px solid var(--border);
}

.auth-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.25s var(--ease-out);
}

.auth-tab:hover:not(.active) {
  color: var(--text);
  background: var(--surface);
}

.auth-tab.active {
  background: var(--accent);
  color: #241a05;
  box-shadow: 0 3px 12px var(--accent-glow-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.auth-tab:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}
</style>