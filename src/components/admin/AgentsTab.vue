<template>
  <section>
    <div class="flex items-center gap-2 mb-4">
      <input :value="cityFilter" @input="$emit('update:cityFilter', $event.target.value)" type="text" class="input !max-w-xs" placeholder="فیلتر بر اساس شهر" />
    </div>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>نماینده</th>
              <th>شهر</th>
              <th>کد معرف</th>
              <th>تعداد زیرمجموعه</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="adminAgents.length === 0">
              <td colspan="5" class="text-center text-[var(--text-faint)] py-10">نماینده‌ای ثبت نشده است</td>
            </tr>
            <template v-for="a in adminAgents" :key="a.id">
              <tr class="cursor-pointer" @click="toggleAgent(a)">
                <td class="text-xs font-semibold">{{ a.full_name || a.name || a.username }}</td>
                <td class="text-xs">{{ a.city }}</td>
                <td class="text-xs font-bold tracking-widest" dir="ltr">{{ a.code }}</td>
                <td class="text-xs" dir="ltr">{{ a.subordinate_count ?? "—" }}</td>
                <td class="text-xs text-[var(--text-muted)]"><i class="fas" :class="openAgentId === a.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i></td>
              </tr>
              <tr v-if="openAgentId === a.id">
                <td colspan="5" class="!p-0">
                  <div class="p-4 bg-[var(--bg-elevated)]/50">
                    <div v-if="!agentDetail || agentDetail.agentId !== a.id" class="text-xs text-[var(--text-faint)]">در حال دریافت...</div>
                    <template v-else>
                      <div class="font-bold text-sm mb-3">
                        جمع تراکنش‌های زیرمجموعه‌ها:
                        <span class="text-[var(--success)]" dir="ltr">{{ fmtMoney(agentDetail.total) }} تومان</span>
                      </div>
                      <div class="overflow-x-auto">
                        <table>
                          <thead>
                            <tr>
                              <th>کاربر</th>
                              <th>مبلغ</th>
                              <th>تاریخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-if="agentDetail.items.length === 0">
                              <td colspan="3" class="text-center text-[var(--text-faint)] py-6">تراکنشی ثبت نشده است</td>
                            </tr>
                            <tr v-for="tx in agentDetail.items" :key="tx.id">
                              <td class="text-xs">{{ tx.full_name || tx.username }}</td>
                              <td class="text-xs font-semibold" dir="ltr">{{ fmtMoney(tx.amount) }}</td>
                              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(tx.created_at) }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </template>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { auth, fmtMoney, fmtDate } from "../../stores/auth";

defineProps({
  cityFilter: { type: String, default: "" },
});
defineEmits(["update:cityFilter"]);

const openAgentId = ref(null);
const adminAgents = computed(() => auth.state.adminAgents);
const agentDetail = computed(() => auth.state.agentDetail);

function toggleAgent(a) {
  if (openAgentId.value === a.id) {
    openAgentId.value = null;
    return;
  }
  openAgentId.value = a.id;
  auth.loadAgentDetail(a.id);
}
</script>
