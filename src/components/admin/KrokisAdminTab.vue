<template>
  <section>
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
        :class="status === s.value ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'"
        @click="$emit('update:status', s.value)"
      >
        {{ s.label }}
      </button>
      <span class="text-xs text-[var(--text-muted)] mr-auto">{{ adminKrokis.length }} کروکی</span>
    </div>

    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کد پیگیری</th>
              <th>عنوان</th>
              <th>متقاضی</th>
              <th>مبلغ پرداختی</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="adminKrokis.length === 0">
              <td colspan="6" class="text-center text-[var(--text-faint)] py-10">کروکی‌ای یافت نشد</td>
            </tr>
            <tr v-for="k in adminKrokis" :key="k.id">
              <td class="text-xs font-bold text-[var(--accent-soft)]" dir="ltr">{{ k.tracking_code }}</td>
              <td class="text-xs font-semibold">{{ k.title }}</td>
              <td class="text-xs">{{ k.client_name }}</td>
              <td class="text-xs font-bold" dir="ltr">{{ fmtMoney(k.price_paid) }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(k.created_at) }}</td>
              <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="krokiStatusClass(k.status)">
                  {{ krokiStatusLabel(k.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { auth, fmtMoney, fmtDate } from "../../stores/auth";
import { krokiStatusClass, krokiStatusLabel } from "../../utils/txStatus";

defineProps({
  status: { type: String, default: "" },
});
defineEmits(["update:status"]);

const statusFilters = [
  { value: "", label: "همه" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "paid", label: "پرداخت شده" },
  { value: "issued", label: "صادر شده" },
];

const adminKrokis = computed(() => auth.state.adminKrokis);
</script>
