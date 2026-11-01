<template>
  <section>
    <div class="card !rounded-2xl overflow-hidden mb-6">
      <div class="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 font-bold text-sm flex items-center gap-2">
        <i class="fas fa-handshake text-[var(--accent)]"></i> درخواست‌های در انتظار بررسی
        <span class="text-[11px] text-[var(--text-muted)] font-semibold">({{ expertRequests.length }})</span>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کارشناس</th>
              <th>کد ملی</th>
              <th>تماس</th>
              <th>عنوان‌ها / تخصص‌ها</th>
              <th>مدارک</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="expertRequests.length === 0">
              <td colspan="7" class="text-center text-[var(--text-faint)] py-10">درخواست همکاری در انتظار وجود ندارد</td>
            </tr>
            <tr v-for="r in expertRequests" :key="r.id">
              <td class="text-xs font-semibold">{{ r.fullName || r.name }}</td>
              <td class="text-xs" dir="ltr">{{ r.nationalId }}</td>
              <td class="text-xs" dir="ltr">{{ r.phone }}</td>
              <td class="text-xs">
                <div class="flex flex-wrap gap-1 max-w-[220px]">
                  <span v-for="t in (r.titles || [])" :key="t" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-glow)] text-[var(--accent-soft)]">{{ t }}</span>
                  <span v-for="s in (r.specialties || [])" :key="s" class="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface3)] text-[var(--text-muted)]">{{ s }}</span>
                </div>
              </td>
              <td class="text-xs">
                <div v-if="(r.documents || []).length === 0" class="text-[var(--text-faint)]">—</div>
                <div v-else class="flex flex-col gap-0.5 max-w-[200px]">
                  <span v-for="(d, i) in r.documents" :key="i" class="truncate text-[10px] text-[var(--text-muted)]" dir="ltr" :title="d.name">
                    <i class="fas fa-paperclip ml-1"></i>{{ d.name || ('مدرک ' + (i + 1)) }}
                  </span>
                </div>
              </td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.created_at || r.at) }}</td>
              <td>
                <div class="flex items-center gap-1.5">
                  <button class="btn btn-primary btn-xs" :disabled="busy" @click="decideExpert(r, true)">
                    <i class="fas fa-check ml-0.5"></i> تأیید
                  </button>
                  <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="decideExpert(r, false)">
                    <i class="fas fa-xmark ml-0.5"></i> رد
                  </button>
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
              <th>کارشناس</th>
              <th>عنوان‌ها</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="decidedExpertRequests.length === 0">
              <td colspan="4" class="text-center text-[var(--text-faint)] py-8">هنوز تصمیمی ثبت نشده است</td>
            </tr>
            <tr v-for="r in decidedExpertRequests" :key="r.id">
              <td class="text-xs font-semibold">{{ r.fullName || r.name }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ (r.titles || []).join('، ') }}</td>
              <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.created_at || r.at) }}</td>
              <td>
                <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="r.status === 'approved' ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'">
                  {{ r.status === "approved" ? "تأیید شد" : "رد شد" }}
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
import { computed, inject, ref } from "vue";
import { auth, fmtDate } from "../../stores/auth";

const notify = inject("notify", () => {});

const busy = ref(false);

const expertRequests = computed(() => (auth.state.expertRequests || []).filter((r) => r.status === "pending"));
const decidedExpertRequests = computed(() => (auth.state.expertRequests || []).filter((r) => r.status !== "pending").slice(0, 40));

async function decideExpert(r, approve) {
  busy.value = true;
  const res = await auth.decideExpertRequest(r.id, approve);
  busy.value = false;
  if (res.success) {
    notify(approve ? "کارشناس تأیید شد و به لیست کارشناسان اضافه شد." : "درخواست همکاری رد شد.");
  } else {
    notify(res.error || "خطا در ثبت تصمیم", "error");
  }
}
</script>
