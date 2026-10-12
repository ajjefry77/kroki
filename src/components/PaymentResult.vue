<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-10">
    <div class="card !rounded-3xl py-12 px-6 text-center max-w-lg w-full">
      <!-- موفق -->
      <template v-if="status === 'success'">
        <div class="w-20 h-20 mx-auto rounded-full bg-[var(--success-glow)] border-2 border-[var(--success)] flex items-center justify-center mb-6">
          <i class="fas fa-check text-3xl text-[var(--success)]"></i>
        </div>
        <h2 class="text-2xl font-extrabold mb-2">پرداخت موفق بود</h2>
        <p class="text-sm text-[var(--text-muted)] mb-1">
          مبلغ <strong class="text-[var(--success)]" dir="ltr">{{ fmtMoney(amount) }} تومان</strong>
          به کیف پول شما افزوده شد.
        </p>
        <p v-if="charge" class="text-xs text-[var(--text-muted)] mb-8">
          شماره درخواست: <span class="font-bold" dir="ltr">#{{ charge }}</span>
          <span v-if="wallet !== null" class="block mt-1">
            موجودی فعلی: <strong dir="ltr">{{ fmtMoney(wallet) }} تومان</strong>
          </span>
        </p>
        <p v-else class="text-xs text-[var(--text-muted)] mb-8"></p>
      </template>

      <!-- لغو توسط کاربر -->
      <template v-else-if="status === 'cancelled'">
        <div class="w-20 h-20 mx-auto rounded-full bg-[var(--warning-glow)] border-2 border-[var(--warning)] flex items-center justify-center mb-6">
          <i class="fas fa-ban text-3xl text-[var(--warning)]"></i>
        </div>
        <h2 class="text-2xl font-extrabold mb-2">پرداخت لغو شد</h2>
        <p class="text-sm text-[var(--text-muted)] mb-8">{{ reason || "پرداخت توسط شما لغو شد؛ مبلغی کسر نشده است." }}</p>
      </template>

      <!-- ناموفق -->
      <template v-else>
        <div class="w-20 h-20 mx-auto rounded-full bg-[var(--danger-glow)] border-2 border-[var(--danger)] flex items-center justify-center mb-6">
          <i class="fas fa-xmark text-3xl text-[var(--danger)]"></i>
        </div>
        <h2 class="text-2xl font-extrabold mb-2">پرداخت ناموفق بود</h2>
        <p class="text-sm text-[var(--text-muted)] mb-8">{{ reason || "پرداخت انجام نشد؛ در صورت کسر وجه، مبلغ بازگردانده می‌شود." }}</p>
      </template>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button class="btn btn-primary !px-8 !py-3" @click="$emit('home')">
          <i class="fas fa-house ml-2"></i>
          بازگشت به صفحه اصلی
        </button>
        <button class="btn btn-ghost !px-8 !py-3" @click="$emit('profile')">
          <i class="fas fa-wallet ml-2"></i>
          مشاهده کیف پول
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { auth, fmtMoney } from "../stores/auth";

defineEmits(["home", "profile"]);

const status = ref("failed");
const charge = ref("");
const amount = ref(0);
const reason = ref("");
const wallet = ref(null);

function parseHash() {
  const h = window.location.hash || "";
  const qIndex = h.indexOf("?");
  const qs = qIndex >= 0 ? h.slice(qIndex + 1) : "";
  const p = new URLSearchParams(qs);
  status.value = (p.get("status") || "failed").toLowerCase();
  charge.value = p.get("charge") || "";
  amount.value = Number(p.get("amount") || 0);
  reason.value = p.get("reason") || "";
}

onMounted(async () => {
  parseHash();
  window.addEventListener("hashchange", parseHash);
  try {
    await auth.refreshMe();
    wallet.value = auth.walletOf();
  } catch {}
  try {
    await auth.loadMyCharges();
  } catch {}
});
</script>
