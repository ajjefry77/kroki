<template>
  <section>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>شهر</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="agencyRequests.length === 0">
              <td colspan="4" class="text-center text-[var(--text-faint)] py-10">درخواست نمایندگی در انتظار وجود ندارد</td>
            </tr>
            <tr v-for="r in agencyRequests" :key="r.id">
              <td class="text-xs font-semibold">{{ r.full_name || r.username }}</td>
              <td class="text-xs">{{ r.city }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.created_at) }}</td>
              <td>
                <div class="flex items-center gap-1.5">
                  <button class="btn btn-primary btn-xs" :disabled="busy" @click="decideAgency(r, true)">
                    <i class="fas fa-check ml-0.5"></i> تأیید
                  </button>
                  <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="decideAgency(r, false)">
                    <i class="fas fa-xmark ml-0.5"></i> رد
                  </button>
                </div>
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
import { auth, fmtDate } from "../../stores/auth";

const notify = inject("notify", () => {});

const busy = ref(false);
const agencyRequests = computed(() => auth.state.agencyRequests.filter((r) => r.status === "pending"));

async function decideAgency(r, approve) {
  busy.value = true;
  const res = await auth.decideAgencyRequest(r.id, approve);
  busy.value = false;
  if (!res.success) notify(res.error || "خطا در ثبت تصمیم", "error");
}
</script>
