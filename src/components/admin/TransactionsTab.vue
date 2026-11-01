<template>
  <section>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>عنوان</th>
              <th>مقدار</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="adminTransactions.length === 0">
              <td colspan="5" class="text-center text-[var(--text-faint)] py-10">تراکنشی ثبت نشده است</td>
            </tr>
            <tr v-for="tx in adminTransactions" :key="tx.id">
              <td class="text-xs" dir="ltr">{{ tx.user_id }}</td>
              <td class="text-xs">{{ tx.typeLabel }}</td>
              <td class="text-xs font-bold" :class="txTypeColor(tx)" dir="ltr">{{ txSign(tx) }} {{ fmtMoney(tx.amount) }}</td>
              <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="txStatusClass(tx.status)">
                  {{ txStatusLabel(tx.status) }}
                </span>
              </td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(tx.at) }}</td>
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
import { txSign, txTypeColor, txStatusClass, txStatusLabel } from "../../utils/txStatus";

const adminTransactions = computed(() => auth.state.adminTransactions);
</script>
