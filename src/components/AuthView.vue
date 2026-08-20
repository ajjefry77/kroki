<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20" style="background: radial-gradient(circle, #e07b39, transparent 70%)"></div>
      <div class="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full opacity-15" style="background: radial-gradient(circle, #2f6fd0, transparent 70%)"></div>
    </div>

    <div class="relative w-full max-w-md p-8 rounded-2xl card !rounded-2xl shadow-xl auth-card">
      <div class="text-center mb-6">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)] mb-4">
          <i class="fas fa-drafting-compass text-2xl text-[#241a05]"></i>
        </div>
        <h2 class="text-2xl font-extrabold">{{ mode === "login" ? "خوش آمدید" : "ثبت‌نام در سامانه" }}</h2>
        <p class="mt-2 text-sm text-[var(--text-muted)]">
          {{ mode === "login" ? "برای ورود نام کاربری و رمز عبور را وارد کنید" : "حساب کاربری بسازید تا کروکی بسازید و کیف پول داشته باشید" }}
        </p>
      </div>

      <!-- تب‌ها -->
      <div class="grid grid-cols-2 gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] mb-6">
        <button
          class="py-2.5 rounded-lg text-sm font-semibold transition"
          :class="mode === 'login' ? 'bg-[var(--accent)] text-[#241a05] shadow' : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
          @click="mode = 'login'"
        >
          ورود
        </button>
        <button
          class="py-2.5 rounded-lg text-sm font-semibold transition"
          :class="mode === 'register' ? 'bg-[var(--accent)] text-[#241a05] shadow' : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
          @click="mode = 'register'"
        >
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
          <input v-model="fields.name" type="text" class="input" placeholder="مثلاً علی رضایی" />
        </div>

        <div>
          <label class="block mb-1.5 text-xs font-medium">نام کاربری *</label>
          <input v-model="fields.username" type="text" class="input" required placeholder="شماره همراه یا ایمیل" />
        </div>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">شماره همراه</label>
          <input v-model="fields.phone" type="text" class="input ltr" dir="ltr" placeholder="09xxxxxxxxx" />
        </div>

        <div>
          <label class="block mb-1.5 text-xs font-medium">رمز عبور *</label>
          <input v-model="fields.password" type="password" class="input" required :minlength="mode === 'register' ? 6 : 1" placeholder="رمز عبور" />
        </div>

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
import { ref, reactive } from "vue";
import { auth } from "../stores/auth";

const emit = defineEmits(["back", "success"]);

const mode = ref("login");
const loading = ref(false);
const error = ref("");
const fields = reactive({ name: "", username: "", phone: "", password: "" });

async function submit() {
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
</style>