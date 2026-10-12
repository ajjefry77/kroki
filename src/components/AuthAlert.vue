<template>
  <div class="auth-alert" :class="type" role="alert">
    <span class="auth-alert-icon">
      <i class="fas" :class="type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>
    </span>
    <div class="auth-alert-body">
      <div class="auth-alert-title">{{ title }}</div>
      <div v-if="message" class="auth-alert-msg">{{ message }}</div>
      <slot />
    </div>
    <button v-if="dismissible" type="button" class="auth-alert-close" @click="$emit('close')" aria-label="بستن">
      <i class="fas fa-xmark"></i>
    </button>
  </div>
</template>

<script setup>
defineProps({
  type: { type: String, default: "error", validator: (v) => ["success", "error"].includes(v) },
  title: { type: String, default: "" },
  message: { type: String, default: "" },
  dismissible: { type: Boolean, default: true },
});
defineEmits(["close"]);
</script>

<style scoped>
.auth-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.8;
  border: 1px solid var(--border);
  background: var(--surface2);
  animation: alert-in 0.35s var(--ease-spring);
  box-shadow: var(--shadow-sm);
}
.auth-alert.success {
  border-color: rgba(31, 161, 92, 0.35);
  background: var(--success-glow);
  color: #14663b;
}
.auth-alert.error {
  border-color: rgba(214, 69, 80, 0.3);
  background: var(--danger-glow);
  color: #a02a34;
}
.auth-alert-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  margin-top: 1px;
}
.auth-alert.success .auth-alert-icon {
  background: var(--success);
  box-shadow: 0 3px 10px rgba(31, 161, 92, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.auth-alert.error .auth-alert-icon {
  background: var(--danger);
  box-shadow: 0 3px 10px rgba(214, 69, 80, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.auth-alert-body {
  flex: 1;
  min-width: 0;
}
.auth-alert-title {
  font-weight: 800;
  font-size: 13px;
}
.auth-alert-msg {
  font-weight: 500;
  font-size: 12px;
  opacity: 0.9;
  word-break: break-word;
}
.auth-alert-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  transition: all 0.2s var(--ease-out);
}
.auth-alert-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}
@keyframes alert-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
