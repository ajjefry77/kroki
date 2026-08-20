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
            <span v-if="payMode === 'free'" class="block mt-1 text-[var(--info)]">
              <i class="fas fa-gift ml-1"></i>از کروکی رایگان شما استفاده شد ({{ remainingFree }} عدد باقی‌مانده)
            </span>
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
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-glow)] text-[var(--accent-soft)] text-xs font-medium mb-3">
            <i class="fas fa-wallet"></i>
            پرداخت از کیف پول
          </div>
          <h2 class="font-extrabold text-2xl">پرداخت هزینه کروکی</h2>
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
              <div class="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                <span class="text-xs text-[var(--text-muted)]">مبلغ هر کروکی</span>
                <span class="font-extrabold text-[var(--accent-soft)] text-lg">{{ formatPrice(price) }}</span>
              </div>
            </div>
          </div>

          <!-- پرداخت -->
          <div class="md:col-span-3 card !rounded-2xl">
            <div class="font-bold text-sm mb-4 flex items-center gap-2">
              <i class="fas fa-credit-card text-[var(--accent)]"></i>
              روش پرداخت
            </div>

            <!-- کروکی رایگان -->
            <label
              class="rounded-xl border-2 p-4 mb-3 flex items-start gap-3 cursor-pointer transition"
              :class="freeKroki > 0 && payMode === 'free' ? 'border-[var(--success)] bg-[var(--success-glow)]' : 'border-[var(--border)]'"
            >
              <input type="radio" value="free" v-model="payMode" :disabled="freeKroki <= 0" class="mt-1" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <i class="fas fa-gift text-[var(--success)]"></i>
                  <strong class="text-sm">استفاده از کروکی رایگان</strong>
                  <span class="px-2 py-0.5 rounded-full bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)] text-[10px] font-bold">{{ freeKroki }} عدد باقی‌مانده</span>
                </div>
                <p class="text-[11px] text-[var(--text-muted)] mt-1">هزینه کروکی از سهمیه رایگان شما کسر می‌شود.</p>
              </div>
            </label>

            <!-- کیف پول -->
            <label
              class="rounded-xl border-2 p-4 mb-3 flex items-start gap-3 cursor-pointer transition"
              :class="payMode === 'wallet' ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-[var(--border)]'"
            >
              <input type="radio" value="wallet" v-model="payMode" :disabled="freeKroki > 0" class="mt-1" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <i class="fas fa-wallet text-[var(--accent)]"></i>
                  <strong class="text-sm">پرداخت از کیف پول</strong>
                </div>
                <p class="text-[11px] text-[var(--text-muted)] mt-1">موجودی فعلی کیف پول شما:</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="font-extrabold text-xl" :class="wallet >= price ? 'text-[var(--success)]' : 'text-[var(--danger)]'" dir="ltr">{{ formatPrice(wallet) }}</span>
                  <span v-if="wallet < price" class="text-[11px] font-semibold text-[var(--danger)]">— کافی نیست (کمبود {{ formatPrice(price - wallet) }})</span>
                </div>
              </div>
            </label>

            <!-- شارژ سریع -->
            <button
              v-if="wallet < price"
              class="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--accent)]/50 bg-[var(--accent-glow)] py-3 text-xs font-bold text-[var(--accent-soft)] transition hover:bg-[var(--accent-glow-strong)] mb-3"
              @click="chargeOpen = true"
            >
              <i class="fas fa-arrow-up-right-from-square"></i>
              افزایش موجودی کیف پول
            </button>

            <!-- مودال شارژ -->
            <Transition name="modal">
              <Teleport to="body">
                <div v-if="chargeOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="chargeOpen = false">
                  <div class="card !rounded-2xl max-w-md w-full modal max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="font-bold text-sm flex items-center gap-2">
                        <i class="fas fa-money-bill-wave text-[var(--accent)]"></i> افزایش موجودی
                      </h3>
                      <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]" @click="chargeOpen = false">
                        <i class="fas fa-xmark text-xs"></i>
                      </button>
                    </div>

                    <div class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-4 mb-4">
                      <div class="text-xs font-semibold text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                        <i class="fas fa-money-bill-transfer text-[var(--accent)]"></i>
                        مبلغ را به این کارت واریز کنید
                      </div>
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-lg font-extrabold tracking-widest text-center" dir="ltr">{{ bankCard }}</div>
                          <div class="text-[11px] text-[var(--text-muted)] mt-1 text-center">{{ cardOwner }}</div>
                        </div>
                        <button class="btn btn-ghost btn-xs shrink-0" @click="copyCard">
                          <i class="fas mr-0.5" :class="copied ? 'fa-check' : 'fa-copy'"></i>
                          {{ copied ? "کپی شد" : "کپی" }}
                        </button>
                      </div>
                    </div>

                    <label class="block mb-1.5 text-xs font-medium">مبلغ (تومان)</label>
                    <input v-model.number="charge.amount" type="number" min="10000" step="10000" class="input mb-3" dir="ltr" placeholder="مبلغ دلخواه" />

                    <label class="block mb-1.5 text-xs font-medium">شماره کارت مبدأ *</label>
                    <input v-model="charge.card" type="text" class="input mb-3 text-center tracking-widest" dir="ltr" maxlength="19" placeholder="0000-0000-0000-0000" @input="formatCard" />

                    <label class="block mb-1.5 text-xs font-medium">شناسه پرداخت *</label>
                    <input v-model="charge.paymentId" type="text" class="input mb-3 text-center tracking-widest" dir="ltr" maxlength="16" placeholder="شناسه ۱۶ رقمی پیامک شده" @input="formatPaymentId" />

                    <button class="btn btn-primary w-full !py-2.5" :disabled="!chargeValid" @click="submitCharge">
                      <i class="fas fa-paper-plane ml-1"></i> ثبت درخواست شارژ
                    </button>
                    <p class="text-[11px] text-[var(--text-faint)] mt-3 leading-5 text-center">
                      درخواست شما برای مدیر ارسال می‌شود. پس از تأیید، موجودی به صورت خودکار قابل مشاهده است.
                    </p>

                    <Transition name="modal">
                      <div v-if="chargeMsg" class="mt-3 rounded-xl px-4 py-3 text-sm font-medium" :class="chargeMsgOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
                        <i class="fas ml-1" :class="chargeMsgOk ? 'fa-circle-check' : 'fa-circle-xmark'"></i>{{ chargeMsg }}
                      </div>
                    </Transition>
                  </div>
                </div>
              </Teleport>
            </Transition>

            <div v-if="processing" class="mt-6 py-4 flex flex-col items-center gap-3">
              <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--accent)]"></i>
              <span class="text-xs text-[var(--text-muted)]">در حال پردازش پرداخت…</span>
            </div>

            <button
              v-else
              class="btn btn-primary w-full !py-3.5 mt-4 !text-base"
              :disabled="!canPay(payMode)"
              @click="pay"
            >
              <i class="fas fa-lock ml-2"></i>
              {{ payMode === 'free' ? 'استفاده از کروکی رایگان' : 'پرداخت ' + formatPrice(price) }}
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
import { auth, fmtMoney } from "../../stores/auth";

const props = defineProps({
  gen: { type: Object, required: true },
  pins: { type: Object, required: true },
  form: { type: Object, required: true },
  templateId: { type: String, default: "technical" },
});

const emit = defineEmits(["back", "done"]);

const price = auth.KROKI_PRICE;
const bankCard = auth.WALLET_CARD;
const cardOwner = auth.CARD_OWNER;

const processing = ref(false);
const success = ref(false);
const trackingCode = ref("");
const payMode = ref("wallet");
const chargeOpen = ref(false);
const chargeMsg = ref("");
const chargeMsgOk = ref(true);
const copied = ref(false);

const charge = reactive({ amount: price, card: "", paymentId: "" });

const freeKroki = computed(() => auth.freeOf());
const wallet = computed(() => auth.walletOf());

const currentTemplate = computed(() => getTemplate(props.templateId));
const eligibleCount = computed(() => eligiblePinsOf(props.pins).length);

const chargeValid = computed(() => Number(charge.amount) >= 10000 && String(charge.paymentId).replace(/\D/g, "").length >= 8 && charge.card.replace(/[\s-]/g, "").length >= 16);

function canPay(mode) {
  if (mode === "free") return freeKroki.value > 0;
  return wallet.value >= price;
}

function formatPrice(v) {
  return fmtMoney(v) + " تومان";
}

function formatCard() {
  const digits = charge.card.replace(/[^\d]/g, "").slice(0, 16);
  charge.card = digits.replace(/(\d{4})(?=\d)/g, "$1-");
}
function formatPaymentId() {
  charge.paymentId = charge.paymentId.replace(/[^\d]/g, "").slice(0, 16);
}

async function copyCard() {
  try {
    await navigator.clipboard.writeText(bankCard);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {}
}

function submitCharge() {
  const res = auth.requestCharge({ amount: charge.amount, card: charge.card, paymentId: charge.paymentId });
  chargeMsgOk.value = res.success;
  chargeMsg.value = res.success ? "درخواست شارژ ثبت شد و در انتظار تأیید مدیر است." : res.error;
  if (res.success) {
    charge.card = "";
    charge.paymentId = "";
    charge.amount = price;
  }
}

function pay() {
  processing.value = true;
  setTimeout(() => {
    const res = auth.payForKroki();
    processing.value = false;
    if (!res.success) {
      alert((res.error || "پرداخت انجام نشد") + (res.need ? " — کمبود " + formatPrice(res.need) : ""));
      if (res.error && res.error.includes("وارد")) window.location.reload();
      return;
    }
    payMode.value = res.mode;
    success.value = true;
    trackingCode.value = "KRK-" + Date.now().toString(36).toUpperCase().slice(-8);
    logger.info("payment", "پرداخت کروکی انجام شد", { mode: res.mode, code: trackingCode.value });
  }, 1200);
}

onMounted(() => {
  if (freeKroki.value > 0) payMode.value = "free";
  logger.info("step", "ورود به صفحه پرداخت", { amount: price, wallet: wallet.value, free: freeKroki.value });
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