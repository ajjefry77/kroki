<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="gift"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style="background: rgba(11, 21, 36, 0.45)"
        @click.self="$emit('close')"
      >
        <div class="card !rounded-3xl max-w-md w-full text-center relative">
          <button
            class="absolute top-3 left-3 w-8 h-8 rounded-full bg-[var(--surface2)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="بستن"
            @click="$emit('close')"
          >
            <i class="fas fa-xmark"></i>
          </button>
          <div
            class="w-16 h-16 mx-auto rounded-2xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-4"
          >
            <i class="fas fa-gift text-2xl text-[var(--accent)]"></i>
          </div>
          <h3 class="text-lg font-extrabold mb-2">به سامانه کروکی خوش آمدید</h3>
          <p class="text-sm text-[var(--text-muted)] leading-7 mb-2">به مناسبت ورود شما</p>
          <div class="text-xl font-extrabold text-[var(--success)] mb-4">{{ amountLabel }}</div>
          <p class="text-xs text-[var(--text-muted)] leading-6 mb-6">
            {{
              gift?.type === "days"
                ? "تا پایان این مدت، ساخت کروکی برای شما رایگان است."
                : "این سهمیه هنگام ساخت کروکی به‌صورت خودکار مصرف می‌شود."
            }}
          </p>
          <button class="btn btn-primary w-full !py-3" @click="$emit('close')">شروع کنید</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  gift: { type: Object, default: null },
});
defineEmits(["close"]);

const amountLabel = computed(() => {
  const g = props.gift;
  if (!g) return "";
  const n = Number(g.value || 0).toLocaleString("fa-IR");
  return g.type === "days" ? `${n} روز استفاده رایگان` : `${n} کروکی رایگان`;
});
</script>
