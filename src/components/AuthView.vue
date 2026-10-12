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
          {{
            mode === "register"
              ? "حساب کاربری بسازید، ۵ کروکی رایگان هدیه بگیرید و کروکی بسازید"
              : loginMethod === "otp"
                ? "با شماره همراه و کد پیامکی وارد شوید"
                : "برای ورود نام کاربری و رمز عبور را وارد کنید"
          }}
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
          <AuthAlert
            v-if="alert.message"
            :type="alert.type"
            :title="alert.title || (alert.type === 'success' ? 'عملیات موفق' : 'خطا')"
            :message="alert.message"
            @close="alert.message = ''"
          />
        </Transition>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">نام و نام خانوادگی</label>
          <input v-model="fields.name" type="text" class="input" placeholder="نام و نام خانوادگی" maxlength="100" autocomplete="name" spellcheck="false" />
        </div>

        <div v-if="mode === 'login' && loginMethod === 'password'">
          <label class="block mb-1.5 text-xs font-medium">نام کاربری *</label>
          <input v-model="fields.username" type="text" class="input" required placeholder="شماره همراه یا نام کاربری" maxlength="64" autocomplete="username" spellcheck="false" />
        </div>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">شماره همراه *</label>
          <input v-model="fields.phone" type="tel" inputmode="numeric" dir="ltr" class="input ltr" required placeholder="09xxxxxxxxx" maxlength="11" autocomplete="tel" @input="fields.phone = faToEn(fields.phone).replace(/[^\d]/g, '').slice(0, 11)" />
        </div>

        <div v-if="mode === 'register'">
          <label class="block mb-1.5 text-xs font-medium">کد معرف (اختیاری)</label>
          <input v-model="fields.agentCode" type="text" class="input ltr" dir="ltr" placeholder="کد معرف معرف شما" maxlength="32" autocomplete="off" spellcheck="false" />
          <p class="mt-1 text-[10px] text-[var(--text-faint)]">با وارد کردن کد معرف یک کاربر، زیرمجموعه او می‌شوید و کروکی رایگان می‌گیرید.</p>
        </div>

        <!-- ورود با رمز یکبار مصرف (پیش‌فرض) -->
        <div v-if="mode === 'login' && loginMethod === 'otp'" class="space-y-4">
          <!-- مرحله ۱: شماره موبایل -->
          <div v-if="otpStep === 1">
            <label class="block mb-1.5 text-xs font-medium">شماره همراه</label>
            <input v-model="otp.phone" type="tel" inputmode="numeric" dir="ltr" class="input ltr !py-3 !text-lg text-center tracking-widest" required placeholder="09xxxxxxxxx" maxlength="11" autocomplete="tel" @input="otp.phone = faToEn(otp.phone).replace(/[^\d]/g, '').slice(0, 11)" />
            <p class="mt-1.5 text-[11px] text-[var(--text-faint)] text-center">کد تایید به همین شماره پیامک می‌شود</p>
          </div>

          <!-- مرحله ۲: باکس‌های کد -->
          <div v-else>
            <p class="text-center text-sm">
              کد تایید به شماره
              <button type="button" class="phone-edit-link" @click="backToPhone" title="تغییر شماره">
                <span dir="ltr">{{ otp.phone }}</span>
                <i class="fas fa-pen"></i>
              </button>
              پیامک شد
            </p>
            <div class="code-boxes" dir="ltr">
              <input
                v-for="(_, i) in OTP_LEN"
                :key="i"
                :ref="(el) => setBoxEl(el, i)"
                v-model="codeDigits[i]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                autocomplete="one-time-code"
                class="code-box"
                :disabled="loading || navigating"
                @input="onDigitInput(i)"
                @keydown="onDigitKeydown(i, $event)"
                @paste="onDigitPaste($event)"
                @focus="$event.target.select()"
              />
            </div>
            <button
              type="button"
              class="block mx-auto mt-1 text-xs font-semibold text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="otpCooldown > 0 || loading"
              @click="sendOtp(true)"
            >
              <span v-if="otpCooldown > 0">ارسال مجدد کد تا {{ otpCooldown }} ثانیه دیگر</span>
              <span v-else>ارسال مجدد کد</span>
            </button>
          </div>
        </div>

        <div v-if="mode === 'register' || (mode === 'login' && loginMethod === 'password')">
          <label class="block mb-1.5 text-xs font-medium">رمز عبور *</label>
          <div class="relative">
            <input
              v-model="fields.password"
              :type="showPw ? 'text' : 'password'"
              class="input !pl-10"
              required
              :minlength="mode === 'register' ? 8 : 1"
              maxlength="72"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              placeholder="رمز عبور"
            />
            <button type="button" class="pw-eye" @click="showPw = !showPw" tabindex="-1" :aria-label="showPw ? 'پنهان کردن رمز' : 'نمایش رمز'">
              <i class="fas" :class="showPw ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
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

        <Captcha v-if="!isOtpMode || otpStep === 1" ref="captchaRef" @submit="submit" />

        <button type="submit" class="btn btn-primary w-full !py-3 !text-base" :disabled="loading || navigating">
          <i class="fas fa-circle-notch fa-spin ml-1" v-if="loading"></i>
          <i :class="submitIcon" v-else></i>
          {{ submitLabel }}
        </button>

        <!-- رمز عبور پشت یک لینک کوچک -->
        <button
          v-if="mode === 'login'"
          type="button"
          class="method-link"
          :disabled="loading || navigating"
          @click="switchLoginMethod(loginMethod === 'otp' ? 'password' : 'otp')"
        >
          {{ loginMethod === "otp" ? "ورود با رمز عبور" : "ورود با کد پیامکی" }}
        </button>
      </form>

      <button class="mt-3 w-full btn btn-ghost text-sm" :disabled="loading || navigating" @click="$emit('back')">
        <i class="fas fa-arrow-right ml-1"></i>
        بازگشت به صفحه اصلی
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from "vue";
import { auth } from "../stores/auth";
import { faToEn } from "../utils/validators";
import Captcha from "./Captcha.vue";
import AuthAlert from "./AuthAlert.vue";

const emit = defineEmits(["back", "success"]);

const mode = ref("login");
const loginMethod = ref("password"); // password | otp — پیش‌فرض: رمز عبور
const showPw = ref(false);
const loading = ref(false);
const navigating = ref(false);
const alert = reactive({ type: "error", title: "", message: "" });
const captchaRef = ref(null);
const fields = reactive({ name: "", username: "", phone: "", password: "", agentCode: "" });
// وضعیت رمز یکبار مصرف
const OTP_LEN = 5;
const otp = reactive({ phone: "" });
const codeDigits = reactive(Array(OTP_LEN).fill(""));
const boxEls = [];
const otpStep = ref(1); // 1 = ورود شماره، 2 = ورود کد
const otpCooldown = ref(0); // ثانیه تا ارسال مجدد
let navTimer = 0;
let cooldownTimer = 0;

onBeforeUnmount(() => {
  if (navTimer) {
    clearTimeout(navTimer);
    navTimer = 0;
  }
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = 0;
  }
});

const isOtpMode = computed(() => mode.value === "login" && loginMethod.value === "otp");

const submitLabel = computed(() => {
  if (loading.value) return "در حال انجام...";
  if (mode.value === "register") return "ساخت حساب و ورود";
  if (isOtpMode.value) return otpStep.value === 1 ? "ارسال کد تایید" : "ورود با کد تایید";
  return "ورود به سامانه";
});

const submitIcon = computed(() => {
  if (mode.value === "register") return "fas fa-user-plus ml-1";
  if (isOtpMode.value) return "fas fa-message-sms ml-1";
  return "fas fa-right-to-bracket ml-1";
});

const pwCheck = computed(() => ({
  length: fields.password.length >= 8,
  lower: /[a-z]/.test(fields.password),
  upper: /[A-Z]/.test(fields.password),
}));

// با عوض شدن حالت، چالش امنیتی تازه می‌شود
watch(mode, () => {
  alert.type = "error";
  alert.title = "";
  alert.message = "";
  resetOtp();
  captchaRef.value?.refresh();
});

watch(loginMethod, () => {
  alert.type = "error";
  alert.title = "";
  alert.message = "";
  resetOtp();
});

function resetOtp() {
  otpStep.value = 1;
  for (let i = 0; i < OTP_LEN; i++) codeDigits[i] = "";
  otpCooldown.value = 0;
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = 0;
  }
}

function switchLoginMethod(m) {
  loginMethod.value = m;
}

function backToPhone() {
  resetOtp();
}

function startCooldown(sec) {
  otpCooldown.value = sec || 60;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    otpCooldown.value -= 1;
    if (otpCooldown.value <= 0) {
      otpCooldown.value = 0;
      clearInterval(cooldownTimer);
      cooldownTimer = 0;
    }
  }, 1000);
}

// ───── باکس‌های کد تایید ─────
function setBoxEl(el, i) {
  if (el) boxEls[i] = el;
}

function focusBox(i) {
  const el = boxEls[Math.max(0, Math.min(OTP_LEN - 1, i))];
  if (el) nextTick(() => el.focus());
}

function onDigitInput(i) {
  const clean = faToEn(codeDigits[i] || "").replace(/[^\d]/g, "");
  codeDigits[i] = clean.slice(-1);
  if (!codeDigits[i]) return;
  if (i < OTP_LEN - 1) focusBox(i + 1);
  else if (codeDigits.every((d) => d)) submitOtp(); // تکمیل شد → ورود خودکار
}

function onDigitKeydown(i, e) {
  if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
    e.preventDefault();
    codeDigits[i - 1] = "";
    focusBox(i - 1);
  } else if (e.key === "ArrowRight" && i < OTP_LEN - 1) {
    e.preventDefault();
    focusBox(i + 1);
  } else if (e.key === "ArrowLeft" && i > 0) {
    e.preventDefault();
    focusBox(i - 1);
  }
}

function onDigitPaste(e) {
  const text = faToEn(e.clipboardData?.getData("text") || "").replace(/[^\d]/g, "").slice(0, OTP_LEN);
  if (!text) return;
  e.preventDefault();
  for (let i = 0; i < OTP_LEN; i++) codeDigits[i] = text[i] || "";
  if (text.length >= OTP_LEN) submitOtp();
  else focusBox(text.length);
}

async function sendOtp(resend = false) {
  if (loading.value || navigating.value) return;
  if (!resend && !captchaRef.value?.validate()) {
    showError("کد امنیتی اشتباه است؛ کد جدید را وارد کنید");
    return;
  }
  const mobile = faToEn(otp.phone || "").trim();
  if (!/^09\d{9}$/.test(mobile)) {
    showError("شماره موبایل معتبر (11 رقم با 09) وارد کنید");
    return;
  }
  loading.value = true;
  alert.title = "";
  alert.message = "";
  try {
    const result = await auth.requestOtp(mobile);
    if (result.success) {
      otpStep.value = 2;
      for (let i = 0; i < OTP_LEN; i++) codeDigits[i] = "";
      startCooldown(60);
      showSuccess(
        result.devCode
          ? `کد تایید (حالت توسعه): ${result.devCode}`
          : "کد تایید به شماره همراه شما پیامک شد؛ آن را وارد کنید",
      );
      focusBox(0);
    } else {
      showError(result.error);
      captchaRef.value?.refresh();
    }
  } catch (e) {
    showError(e?.message || "خطای غیرمنتظره؛ دوباره تلاش کنید");
    captchaRef.value?.refresh();
  } finally {
    loading.value = false;
  }
}

async function submitOtp() {
  if (loading.value || navigating.value) return;
  const code = codeDigits.map((d) => faToEn(d || "").trim()).join("");
  if (code.length < OTP_LEN) {
    showError("کد تایید ۵ رقمی را کامل وارد کنید");
    return;
  }
  loading.value = true;
  alert.title = "";
  alert.message = "";
  try {
    const result = await auth.verifyOtpLogin(otp.phone, code);
    if (result.success) {
      showSuccess(
        result.isNew
          ? "حساب شما ساخته شد؛ ۵ کروکی رایگان هدیه گرفتید. در حال انتقال..."
          : "ورود با موفقیت انجام شد؛ در حال انتقال...",
      );
      navigating.value = true;
      navTimer = setTimeout(() => {
        navTimer = 0;
        otp.phone = "";
        resetOtp();
        navigating.value = false;
        emit("success");
      }, 900);
    } else {
      showError(result.error);
      for (let i = 0; i < OTP_LEN; i++) codeDigits[i] = "";
      focusBox(0);
    }
  } catch (e) {
    showError(e?.message || "خطای غیرمنتظره؛ دوباره تلاش کنید");
  } finally {
    loading.value = false;
  }
}

function showError(msg) {
  alert.type = "error";
  alert.title = "";
  alert.message = msg;
}

function showSuccess(msg) {
  alert.type = "success";
  alert.title = "";
  alert.message = msg;
}

function showWarning(title, msg) {
  alert.type = "error";
  alert.title = title;
  alert.message = msg;
}

async function submit() {
  if (loading.value || navigating.value) return;
  // مسیر رمز یکبار مصرف
  if (isOtpMode.value) {
    if (otpStep.value === 1) await sendOtp(false);
    else await submitOtp();
    return;
  }
  if (!captchaRef.value?.validate()) {
    showError("کد امنیتی اشتباه است؛ کد جدید را وارد کنید");
    return;
  }
  loading.value = true;
  alert.title = "";
  alert.message = "";
  try {
    const result =
      mode.value === "login"
        ? await auth.login(fields.username, fields.password)
        : await auth.register(fields);
    if (result.success) {
      const hadCode = mode.value === "register" && faToEn(fields.agentCode || "").trim();
      if (mode.value === "login") {
        showSuccess("ورود با موفقیت انجام شد؛ در حال انتقال...");
      } else if (hadCode && result.referral?.applied) {
        // همان پیام پنل کاربری تا رفتار هر دو فیلد یکسان باشد
        showSuccess(
          `ثبت‌نام با موفقیت انجام شد؛ کد معرف فعال شد و ${result.referral.freeKroki ?? ""} عدد کروکی رایگان دریافت کردید. در حال انتقال...`,
        );
      } else if (hadCode && result.referral && !result.referral.applied) {
        // ثبت‌نام موفق است و حتماً وارد می‌شویم؛ فقط علت رد کد را نشان می‌دهیم
        showWarning(
          "توجه",
          `حساب شما ساخته شد و در حال ورود هستید، اما کد معرف اعمال نشد: ${result.referral.error}`,
        );
      } else {
        showSuccess("ثبت‌نام با موفقیت انجام شد؛ ۵ کروکی رایگان هدیه گرفتید. در حال انتقال...");
      }
      navigating.value = true;
      // وقتی هشدار کد معرف هست، مکث بیشتری تا خوانده شود
      const delay = hadCode && result.referral && !result.referral.applied ? 2200 : 900;
      const done = () => {
        navTimer = 0;
        fields.name = "";
        fields.username = "";
        fields.phone = "";
        fields.password = "";
        fields.agentCode = "";
        captchaRef.value?.refresh();
        navigating.value = false;
        emit("success");
      };
      navTimer = setTimeout(done, delay);
    } else {
      showError(result.error);
      captchaRef.value?.refresh();
    }
  } catch (e) {
    showError(e?.message || "خطای غیرمنتظره؛ دوباره تلاش کنید");
    captchaRef.value?.refresh();
  } finally {
    loading.value = false;
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

/* باکس‌های جداگانه کد تایید */
.code-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 14px 0 10px;
}
.code-box {
  width: 52px;
  height: 60px;
  text-align: center;
  font-size: 24px;
  font-weight: 800;
  font-family: var(--font);
  color: var(--text);
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), transform 0.15s var(--ease-out);
  caret-color: var(--accent);
}
.code-box:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow-strong);
  transform: translateY(-2px);
}
.code-box:disabled {
  opacity: 0.6;
}

/* دکمه چشم نمایش رمز */
.pw-eye {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  font-size: 14px;
  padding: 4px;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.2s;
}
.pw-eye:hover {
  color: var(--text);
}

/* لینک کوچک جابه‌جایی روش ورود */
.method-link {
  display: block;
  margin: 10px auto 0;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  color: var(--accent);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}
.method-link:hover:not(:disabled) {
  text-decoration: underline;
}
.method-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* لینک شماره همراه با آیکون مداد */
.phone-edit-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
  font-family: var(--font);
  color: var(--accent);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
}
.phone-edit-link i {
  font-size: 10px;
  opacity: 0.8;
}
.phone-edit-link:hover:not(:disabled) {
  text-decoration: underline;
}
</style>