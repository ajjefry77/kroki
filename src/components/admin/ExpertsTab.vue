<template>
  <section>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 font-bold text-sm flex items-center gap-2">
        <i class="fas fa-user-tie text-[var(--accent)]"></i> کارشناسان تأییدشده (لیست عمومی)
        <span class="text-[11px] text-[var(--text-muted)] font-semibold">({{ approvedExperts.length }})</span>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>نام</th>
              <th>تماس</th>
              <th>عنوان‌ها / تخصص‌ها</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="approvedExperts.length === 0">
              <td colspan="4" class="text-center text-[var(--text-faint)] py-10">هنوز کارشناسی تأیید نشده است</td>
            </tr>
            <tr v-for="e in approvedExperts" :key="e.id">
              <td class="text-xs font-semibold">{{ e.fullName || e.name }}</td>
              <td class="text-xs" dir="ltr">{{ e.phone }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ [...(e.titles || []), ...(e.specialties || [])].join('، ') || '—' }}</td>
              <td>
                <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="removeExpertRow(e)">
                  <i class="fas fa-trash text-xs ml-0.5"></i> حذف از لیست
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, ref } from "vue";
import { auth } from "../../stores/auth";

const notify = inject("notify", () => {});

const busy = ref(false);
const approvedExperts = computed(() => auth.state.experts || []);

async function removeExpertRow(r) {
  busy.value = true;
  const res = await auth.removeExpert(r.id);
  busy.value = false;
  if (res.success) notify("کارشناس از لیست عمومی حذف شد.");
  else notify(res.error || "خطا در حذف کارشناس", "error");
}
</script>
