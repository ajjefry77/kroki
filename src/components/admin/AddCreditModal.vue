<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="$emit('close')">
        <div class="card !rounded-2xl max-w-sm w-full modal">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--success)] to-[var(--success-glow)] flex items-center justify-center">
                <i class="fas fa-coins text-white text-sm"></i>
              </div>
              <h3 class="font-bold text-sm">شارژ دستی کیف پول</h3>
            </div>
            <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]" @click="$emit('close')">
              <i class="fas fa-xmark text-xs"></i>
            </button>
          </div>
          <p class="text-xs text-[var(--text-muted)] mb-4">
            مبلغی که می‌خواهید به کیف پول <strong class="text-[var(--text)]">{{ modal.user.name }}</strong> اضافه شود:
          </p>
          <div class="relative">
            <input v-model="modal.amount" type="number" min="0" step="10000" class="input !text-lg !font-bold !py-3 !pr-4 !pl-20" dir="ltr" placeholder="0" />
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">تومان</span>
          </div>
          <p class="text-[10px] text-[var(--text-faint)] mt-2">
            موجودی فعلی: <strong dir="ltr">{{ fmtMoney(modal.user.wallet) }}</strong> تومان
          </p>
          <div class="flex gap-2 mt-5">
            <button class="btn btn-primary flex-1" :disabled="!modal.amount || Number(modal.amount) <= 0 || modal.saving" @click="confirmAddWallet">
              <i v-if="modal.saving" class="fas fa-circle-notch fa-spin ml-1"></i>
              <i v-else class="fas fa-plus ml-1"></i>
              افزودن مبلغ
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
import { auth, fmtMoney } from "../../stores/auth";

const props = defineProps({
  modal: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const notify = inject("notify", () => {});

async function confirmAddWallet() {
  const m = props.modal;
  const amt = Number(m.amount);
  if (!amt || amt <= 0) return;
  m.saving = true;
  const res = await auth.creditUser(m.user.id, amt);
  m.saving = false;
  if (res.success) {
    notify(`مبلغ ${fmtMoney(amt)} تومان به کیف پول اضافه شد.`);
    emit("close");
  } else {
    notify(res.error || "خطا در افزودن مبلغ", "error");
  }
}
</script>
