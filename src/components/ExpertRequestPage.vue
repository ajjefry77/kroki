<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-user-tie text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">ثبت‌نام کارشناس</div>
            <div class="text-[11px] text-[var(--text-muted)]">تکمیل اطلاعات و ارسال درخواست همکاری</div>
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
            <h2 class="text-xl font-extrabold mb-2">درخواست همکاری شما ثبت شد</h2>
            <p class="text-sm text-[var(--text-muted)] leading-7 mb-6">
              درخواست شما با موفقیت ارسال شد. پس از بررسی مدارک و تأیید مدیر سیستم،
              نام شما در لیست کارشناسان سامانه نمایش داده می‌شود.
            </p>
            <button class="btn btn-primary" @click="$emit('home')">
              <i class="fas fa-house ml-1"></i> بازگشت به صفحه اصلی
            </button>
          </div>
        </div>

        <div v-else key="form">
          <div class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-glow)] text-[var(--accent-soft)] text-xs font-medium mb-4">
              <i class="fas fa-handshake"></i>
              همکاری با سامانه کروکی
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold mb-2">ثبت‌نام کارشناس</h1>
            <p class="text-sm text-[var(--text-muted)] leading-7 max-w-lg mx-auto">
              اطلاعات هویتی، عنوان‌های تخصصی و حداقل یک مدرک را بارگذاری کنید.
              پس از تأیید مدیر، در لیست کارشناسان به کاربران معرفی می‌شوید.
            </p>
          </div>

          <div class="card !rounded-2xl p-6 md:p-8">
            <div class="space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">نام *</label>
                  <input v-model="form.firstName" type="text" class="input" placeholder="نام" />
                </div>
                <div>
                  <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">نام خانوادگی *</label>
                  <input v-model="form.lastName" type="text" class="input" placeholder="نام خانوادگی" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">کد ملی *</label>
                  <input v-model="form.nationalId" type="text" inputmode="numeric" class="input" dir="ltr" placeholder="۱۰ رقم" maxlength="10" />
                  <p v-if="form.nationalId && !nationalOk" class="text-[11px] text-[var(--danger)] mt-1">کد ملی معتبر نیست</p>
                </div>
                <div>
                  <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">شماره تماس *</label>
                  <input v-model="form.phone" type="tel" class="input" dir="ltr" placeholder="۰۹۱۲XXXXXXX" maxlength="11" />
                  <p v-if="form.phone && !phoneOk" class="text-[11px] text-[var(--danger)] mt-1">شماره موبایل معتبر (۱۱ رقم با 09) وارد کنید</p>
                </div>
              </div>

              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">عنوان تخصصی * (حداقل یکی)</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="t in titles"
                    :key="t"
                    type="button"
                    class="title-chip"
                    :class="{ active: form.titles.includes(t) }"
                    @click="toggleTitle(t)"
                  >
                    <i class="fas ml-1" :class="titleMeta(t).icon" :style="{ color: form.titles.includes(t) ? '#fff' : titleMeta(t).color }"></i>
                    {{ t }}
                    <i v-if="form.titles.includes(t)" class="fas fa-check text-[10px]"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">تخصص‌ها (تگ — اختیاری)</label>
                <div class="flex gap-2">
                  <input
                    v-model="tagInput"
                    type="text"
                    class="input flex-1"
                    placeholder="مثلاً UTM، تفکیک آپارتمان… (Enter برای افزودن)"
                    @keydown.enter.prevent="addTag"
                  />
                  <button type="button" class="btn btn-secondary" @click="addTag">
                    <i class="fas fa-plus ml-1"></i> افزودن
                  </button>
                </div>
                <div v-if="form.specialties.length" class="flex flex-wrap gap-2 mt-2">
                  <span v-for="(s, i) in form.specialties" :key="s + i" class="spec-tag">
                    {{ s }}
                    <button type="button" class="mr-1 text-[var(--danger)]" @click="form.specialties.splice(i, 1)" title="حذف">
                      <i class="fas fa-xmark text-[10px]"></i>
                    </button>
                  </span>
                </div>
              </div>

              <div>
                <label class="block mb-1.5 text-xs font-semibold text-[var(--text-muted)]">مدارک * (حداقل یک مدرک اجباری)</label>
                <label class="upload-box">
                  <input ref="fileInput" type="file" multiple class="hidden" accept=".pdf,.jpg,.jpeg,.png" @change="onFiles" />
                  <i class="fas fa-cloud-arrow-up text-2xl text-[var(--accent)] mb-2"></i>
                  <div class="text-xs font-bold">انتخاب مدارک (PDF / JPG / PNG)</div>
                  <div class="text-[11px] text-[var(--text-muted)] mt-1">حداکثر ۵ فایل، هر فایل تا ۱۰ مگابایت</div>
                </label>
                <div v-if="form.documents.length" class="space-y-2 mt-3">
                  <div v-for="(f, i) in form.documents" :key="f.name + f.size + i" class="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-xs">
                    <i class="fas fa-file-lines text-[var(--info)]"></i>
                    <span class="font-semibold truncate flex-1" dir="ltr">{{ f.name }}</span>
                    <span class="text-[var(--text-muted)]" dir="ltr">{{ (f.size / 1024).toFixed(0) }} KB</span>
                    <button type="button" class="text-[var(--danger)]" @click="form.documents.splice(i, 1)" title="حذف">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p v-if="docError" class="text-[11px] text-[var(--danger)] mt-1">{{ docError }}</p>
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
              {{ busy ? "در حال ارسال..." : "ارسال درخواست همکاری" }}
            </button>

            <p class="text-[11px] text-[var(--text-faint)] mt-4 leading-5 text-center">
              پس از ارسال، درخواست شما در پنل ادمین (درخواست‌های همکاری) بررسی خواهد شد.
            </p>
          </div>
        </div>
      </Transition>
    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — ثبت‌نام کارشناس
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { auth } from "../stores/auth";
import { EXPERT_TITLES, expertTitleMeta } from "../utils/experts";
import { faToEn, isValidIranianMobile, isValidNationalCode } from "../utils/validators";

defineEmits(["home"]);

const titles = EXPERT_TITLES;
const titleMeta = expertTitleMeta;

const form = reactive({
  firstName: "",
  lastName: "",
  nationalId: "",
  phone: "",
  titles: [],
  specialties: [],
  documents: [],
});

const tagInput = ref("");
const fileInput = ref(null);
const docError = ref("");
const busy = ref(false);
const msg = ref("");
const msgOk = ref(true);
const submitted = ref(false);

const nationalOk = computed(() => isValidNationalCode(form.nationalId));
const phoneOk = computed(() => isValidIranianMobile(form.phone));

const valid = computed(() => {
  return (
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    nationalOk.value &&
    phoneOk.value &&
    form.titles.length >= 1 &&
    form.documents.length >= 1
  );
});

function toggleTitle(t) {
  const i = form.titles.indexOf(t);
  if (i === -1) form.titles.push(t);
  else form.titles.splice(i, 1);
}

function addTag() {
  const v = faToEn(tagInput.value).trim();
  if (!v) return;
  if (form.specialties.length >= 10) return;
  if (!form.specialties.includes(v)) form.specialties.push(v);
  tagInput.value = "";
}

function onFiles(e) {
  docError.value = "";
  const files = Array.from(e.target.files || []);
  const accept = [".pdf", ".jpg", ".jpeg", ".png"];
  for (const f of files) {
    const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
    if (!accept.includes(ext)) {
      docError.value = "فقط PDF و JPG و PNG مجاز است";
      continue;
    }
    if (f.size > 10 * 1024 * 1024) {
      docError.value = "حجم هر فایل حداکثر ۱۰ مگابایت است";
      continue;
    }
    if (form.documents.length >= 5) {
      docError.value = "حداکثر ۵ فایل می‌توانید بارگذاری کنید";
      break;
    }
    const dup = form.documents.some((d) => d.name === f.name && d.size === f.size);
    if (!dup) form.documents.push(f);
  }
  if (fileInput.value) fileInput.value.value = "";
}

async function submit() {
  busy.value = true;
  msg.value = "";
  const res = await auth.requestExpert({
    firstName: faToEn(form.firstName).trim(),
    lastName: faToEn(form.lastName).trim(),
    nationalId: faToEn(form.nationalId).trim(),
    phone: faToEn(form.phone).trim(),
    titles: [...form.titles],
    specialties: [...form.specialties],
    documents: [...form.documents],
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
.step-enter-active { transition: all 0.3s var(--ease-out); }
.step-leave-active { transition: all 0.2s ease-in; }
.step-enter-from { opacity: 0; transform: translateY(12px); }
.step-leave-to { opacity: 0; transform: translateY(-12px); }

.title-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: var(--surface2);
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}
.title-chip:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.title-chip.active {
  background: linear-gradient(135deg, #e0702f, #f09050);
  border-color: transparent;
  color: #241a05;
  box-shadow: 0 6px 18px var(--accent-glow-strong);
}

.spec-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--accent-glow);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-soft);
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 22px 16px;
  border: 1.5px dashed var(--border-strong);
  border-radius: 14px;
  background: var(--surface2);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}
.upload-box:hover { border-color: var(--accent); background: var(--accent-glow); }
</style>
