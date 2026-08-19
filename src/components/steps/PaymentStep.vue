<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-[var(--bg)]">
    <div class="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <!-- موفق -->
      <Transition name="modal">
        <div v-if="success" class="card !rounded-3xl py-14 text-center">
          <div class="w-20 h-20 mx-auto rounded-full bg-[var(--success-glow)] border-2 border-[var(--success)] flex items-center justify-center mb-6 animate-pop">
            <i class="fas fa-check text-3xl text-[var(--success)]"></i>
          </div>
          <h2 class="text-2xl font-extrabold mb-2">پرداخت با موفقیت انجام شد</h2>
          <p class="text-sm text-[var(--text-muted)] mb-2">
            کد پیگیری: <span class="font-bold text-[var(--accent-soft)]" dir="ltr">{{ trackingCode }}</span>
          </p>
          <p class="text-xs text-[var(--text-muted)] mb-8">
            کروکی شما آماده دانلود است.
          </p>
          <button class="btn btn-primary !px-10 !py-3.5 !text-base !rounded-xl" @click="$emit('done')">
            <i class="fas fa-download ml-2"></i>
            مشاهده و دانلود کروکی
          </button>
        </div>
      </Transition>

      <!-- پرداخت -->
      <template v-if="!success">
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success-glow)] text-[var(--success)] text-xs font-medium mb-3">
            <i class="fas fa-lock"></i>
            درگاه پرداخت امن — نمادین
          </div>
          <h2 class="font-extrabold text-2xl">پرداخت هزینه کروکی</h2>
          <p class="text-xs text-[var(--text-muted)] mt-2">این مرحله صرفاً برای نمایش گردش‌کار است و پرداخت واقعی انجام نمی‌شود.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
          <!-- خلاصه سفارش -->
          <div class="md:col-span-2 card !rounded-2xl h-fit">
            <div class="font-bold text-sm mb-4 flex items-center gap-2">
              <i class="fas fa-receipt text-[var(--accent)]"></i>
              خلاصه سفارش
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-muted)]">عنوان کروکی</span>
                <span class="font-medium truncate max-w-[180px]">{{ form.title }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-muted)]">قالب</span>
                <span class="font-medium">{{ currentTemplate.name }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-muted)]">تعداد ترسیم</span>
                <span class="font-medium">{{ eligibleCount }} مورد</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-muted)]">مساحت</span>
                <span class="font-medium">{{ gen.state.areaM2.toFixed(2) }} m²</span>
              </div>
              <div class="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <span class="text-xs text-[var(--text-muted)]">مبلغ قابل پرداخت</span>
                <span class="font-extrabold text-[var(--accent-soft)] text-lg">{{ formatPrice(price) }}</span>
              </div>
            </div>
          </div>

          <!-- فرم پرداخت -->
          <div class="md:col-span-3 card !rounded-2xl">
            <div class="font-bold text-sm mb-4 flex items-center gap-2">
              <i class="fas fa-credit-card text-[var(--accent)]"></i>
              اطلاعات پرداخت
            </div>

            <div class="grid grid-cols-2 gap-3 mb-5">
              <button
                v-for="m in methods"
                :key="m.id"
                class="rounded-xl border-2 p-3 text-center transition"
                :class="method === m.id ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'"
                @click="method = m.id"
              >
                <i class="fas text-xl" :class="m.icon + ' ' + (method === m.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')"></i>
                <div class="text-xs font-medium mt-1.5">{{ m.label }}</div>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block mb-1.5 text-xs font-medium">شماره کارت</label>
                <input
                  v-model="card.number"
                  type="text"
                  class="input text-center tracking-widest"
                  placeholder="0000-0000-0000-0000"
                  dir="ltr"
                  maxlength="19"
                  @input="formatCard"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block mb-1.5 text-xs font-medium">تاریخ انقضا</label>
                  <input
                    v-model="card.expiry"
                    type="text"
                    class="input text-center"
                    placeholder="MM/YY"
                    dir="ltr"
                    maxlength="5"
                  />
                </div>
                <div>
                  <label class="block mb-1.5 text-xs font-medium">CVV2</label>
                  <input
                    v-model="card.cvv"
                    type="password"
                    class="input text-center"
                    placeholder="•••"
                    dir="ltr"
                    maxlength="4"
                  />
                </div>
              </div>
              <div>
                <label class="block mb-1.5 text-xs font-medium">توضیحات پرداخت (اختیاری)</label>
                <input v-model="card.note" type="text" class="input" placeholder="کد پیگیری یا توضیحات" />
              </div>
            </div>

            <div v-if="processing" class="mt-6 py-4 flex flex-col items-center gap-3">
              <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--accent)]"></i>
              <span class="text-xs text-[var(--text-muted)]">در حال اتصال به درگاه بانکی…</span>
            </div>

            <button
              v-else
              class="btn btn-primary w-full !py-3.5 mt-6 !text-base"
              :disabled="!cardValid"
              @click="pay"
            >
              <i class="fas fa-lock ml-2"></i>
              پرداخت {{ formatPrice(price) }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between mt-6">
          <button class="btn btn-ghost" @click="$emit('back')">
            <i class="fas fa-arrow-right ml-1"></i>
            بازگشت به پیش‌نمایش
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { getTemplate } from "../../utils/templates";
import { eligiblePinsOf } from "../../composables/useKrokiGenerator";
import { logger } from "../../utils/logger";

const props = defineProps({
  gen: { type: Object, required: true },
  pins: { type: Object, required: true },
  form: { type: Object, required: true },
  templateId: { type: String, default: "technical" },
});

const emit = defineEmits(["back", "done"]);

const method = ref("online");
const processing = ref(false);
const success = ref(false);
const trackingCode = ref("");
const price = 150000;

const card = reactive({ number: "", expiry: "", cvv: "", note: "" });

const methods = [
  { id: "online", label: "درگاه آنلاین", icon: "fa-credit-card" },
  { id: "card", label: "کارت به کارت", icon: "fa-money-bill-transfer" },
];

const currentTemplate = computed(() => getTemplate(props.templateId));
const eligibleCount = computed(() => eligiblePinsOf(props.pins).length);

const cardValid = computed(() => {
  if (card.number.replace(/[\s-]/g, "").length < 16) return false;
  if (card.expiry.length < 5) return false;
  if (card.cvv.length < 3) return false;
  return true;
});

function formatCard() {
  let digits = card.number.replace(/[^\d]/g, "").slice(0, 16);
  card.number = digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

function formatPrice(v) {
  return v.toLocaleString("fa-IR") + " تومان";
}

function pay() {
  processing.value = true;
  logger.info("payment", "شروع پرداخت (نمادین)", {
    method: method.value,
    amount: price,
    template: props.templateId,
  });
  setTimeout(() => {
    processing.value = false;
    success.value = true;
    trackingCode.value = "KRK-" + Date.now().toString(36).toUpperCase().slice(-8);
    logger.info("payment", "پرداخت با موفقیت انجام شد", { code: trackingCode.value });
  }, 2200);
}

onMounted(() => {
  logger.info("step", "ورود به صفحه پرداخت", { amount: price });
});
</script>

<style scoped>
.animate-pop {
  animation: pop 0.45s var(--ease-spring);
}
@keyframes pop {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
