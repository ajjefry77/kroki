<template>
  <section>
    <div class="card !rounded-2xl overflow-hidden mb-6">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>مبلغ</th>
              <th>پیگیری / درگاه</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pendingRequests.length === 0">
              <td colspan="6" class="text-center text-[var(--text-faint)] py-10">پرداخت آنلاینی در انتظار نیست</td>
            </tr>
            <tr v-for="r in pendingRequests" :key="r.id">
              <td>
                <div class="text-xs font-semibold">{{ r.name || r.username }}</div>
                <div class="text-[10px] text-[var(--text-muted)]">{{ r.username }}</div>
              </td>
              <td class="font-extrabold" dir="ltr">{{ fmtMoney(r.amount) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></td>
              <td class="text-xs" dir="ltr">{{ r.transId || r.gatewayId || r.paymentId || "—" }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
              <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--warning-glow)] text-[var(--warning)]">در انتظار پرداخت</span>
              </td>
              <td>
                <div class="flex items-center gap-1.5">
                  <button class="btn btn-secondary btn-xs" @click="showNote(r)"> جزئیات</button>
                  <!-- پرداخت آنلاین خودکار وریفای می‌شود؛ تایید دستی فقط برای رکوردهای دستی قدیمی -->
                  <template v-if="r.paymentId && !r.gatewayId">
                    <button class="btn btn-primary btn-xs" :disabled="busy" @click="approve(r)">
                      <i class="fas fa-check ml-0.5"></i> تأیید
                    </button>
                    <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="reject(r)">
                      <i class="fas fa-xmark ml-0.5"></i> رد
                    </button>
                  </template>
                  <span v-else class="text-[10px] text-[var(--text-faint)]">خودکار (درگاه)</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <h3 class="font-bold text-sm mt-8 mb-3">تاریخچه تصمیم‌ها</h3>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>مبلغ</th>
              <th>شناسه</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="decidedRequests.length === 0">
              <td colspan="5" class="text-center text-[var(--text-faint)] py-8">هنوز تصمیمی ثبت نشده است</td>
            </tr>
            <tr v-for="r in decidedRequests" :key="r.id">
              <td>
                <div class="text-xs font-semibold">{{ r.name || r.username }}</div>
                <div class="text-[10px] text-[var(--text-muted)]">{{ r.username }}</div>
              </td>
              <td class="font-bold" dir="ltr">{{ fmtMoney(r.amount) }}</td>
              <td class="text-xs" dir="ltr">{{ r.transId || r.gatewayId || r.paymentId || "—" }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
              <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="r.status === 'approved' ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'">
                  {{ r.status === "approved" ? "پرداخت موفق" : "ناموفق" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- جزئیات درخواست -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detail" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="detail = null">
          <div class="card !rounded-2xl max-w-md w-full modal">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm">جزئیات درخواست شارژ</h3>
              <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]" @click="detail = null">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
            <dl class="space-y-2.5 text-xs">
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">کاربر</dt><dd class="font-semibold">{{ detail.name || detail.username }} ({{ detail.username }})</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">مبلغ</dt><dd class="font-extrabold" dir="ltr">{{ fmtMoney(detail.amount) }} تومان</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">کد پیگیری بانک</dt><dd class="font-mono" dir="ltr">{{ detail.transId || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">شناسه درگاه</dt><dd class="font-mono" dir="ltr">{{ detail.gatewayId || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">کارت پرداخت‌کننده</dt><dd class="font-mono" dir="ltr">{{ detail.card || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">توضیحات</dt><dd>{{ detail.note || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">تاریخ درخواست</dt><dd>{{ fmtDate(detail.at) }}</dd></div>
            </dl>
            <div v-if="detail.paymentId && !detail.gatewayId" class="flex gap-2 mt-5">
              <button class="btn btn-primary flex-1" :disabled="busy" @click="approve(detail); detail = null">
                <i class="fas fa-check ml-1"></i> تأیید و افزودن به کیف پول
              </button>
              <button class="btn btn-ghost flex-1 !text-[var(--danger)]" :disabled="busy" @click="reject(detail); detail = null">
                <i class="fas fa-xmark ml-1"></i> رد درخواست
              </button>
            </div>
            <p v-else class="text-[11px] text-[var(--text-faint)] mt-5 text-center">پرداخت آنلاین به‌صورت خودکار وریفای و به کیف پول افزوده می‌شود.</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, inject, ref } from "vue";
import { auth, fmtMoney, fmtDate } from "../../stores/auth";

const notify = inject("notify", () => {});

const busy = ref(false);
const detail = ref(null);

const pendingRequests = computed(() => auth.state.requests.filter((r) => r.status === "pending"));
const decidedRequests = computed(() => auth.state.requests.filter((r) => r.status !== "pending").slice(0, 40));

function showNote(r) {
  detail.value = r;
}

async function approve(r) {
  busy.value = true;
  const res = await auth.approveRequest(r.id);
  busy.value = false;
  if (res.success) {
    notify("شارژ تأیید شد و به کیف پول کاربر افزوده شد.");
  } else {
    notify(res.error || "خطا در تأیید شارژ", "error");
  }
}

async function reject(r) {
  busy.value = true;
  const res = await auth.rejectRequest(r.id);
  busy.value = false;
  if (!res.success) notify(res.error || "خطا در رد شارژ", "error");
}
</script>
