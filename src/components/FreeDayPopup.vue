<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
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
            class="w-16 h-16 mx-auto rounded-2xl bg-[var(--success-glow)] border border-[var(--success)]/30 flex items-center justify-center mb-4"
          >
            <i class="fas fa-gift text-2xl text-[var(--success)]"></i>
          </div>
          <h3 class="text-lg font-extrabold mb-2">امروز سامانه رایگان است</h3>
          <p class="text-sm text-[var(--text-muted)] leading-7 mb-1">
            به مناسبت
            <span class="font-bold text-[var(--accent-soft)]">«{{ occasion || "مناسبت ویژه" }}»</span>
          </p>
          <p class="text-xs text-[var(--text-muted)] leading-6 mb-6">
            امروز ساخت و دریافت کروکی برای همه کاربران سامانه رایگان است.
          </p>
          <button class="btn btn-primary w-full !py-3" @click="$emit('close')">متوجه شدم</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  occasion: { type: String, default: "" },
});
defineEmits(["close"]);
</script>
