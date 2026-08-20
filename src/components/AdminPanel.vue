<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <!-- سربرگ -->
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-shield-halved text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">پنل مدیریت</div>
            <div class="text-[11px] text-[var(--text-muted)]">{{ user?.name }} — مدیر سیستم</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" @click="$emit('home')">
            <i class="fas fa-house ml-1"></i> صفحه اصلی
          </button>
          <button class="btn btn-ghost btn-sm" @click="logout">
            <i class="fas fa-right-from-bracket ml-1"></i> خروج
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-5 py-6">
      <!-- آمار -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">کل کاربران</div>
          <div class="font-extrabold text-2xl">{{ stats.users }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">کاربران عادی</div>
          <div class="font-extrabold text-2xl">{{ stats.normalUsers }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">شارژهای در انتظار</div>
          <div class="font-extrabold text-2xl text-[var(--warning)]">{{ stats.pending }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">مجموع شارژ شده</div>
          <div class="font-extrabold text-xl text-[var(--success)]" dir="ltr">{{ fmtMoney(stats.totalApproved) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></div>
        </div>
      </div>

      <!-- تب‌ها -->
      <div class="flex gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] mb-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="py-2.5 px-4 rounded-lg text-sm font-semibold transition whitespace-nowrap"
          :class="activeTab === tab.id ? 'bg-[var(--accent)] text-[#241a05] shadow' : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
          @click="activeTab = tab.id"
        >
          <i class="fas ml-1" :class="tab.icon"></i>{{ tab.label }}
        </button>
      </div>

      <!-- درخواست‌های شارژ -->
      <section v-if="activeTab === 'requests'">
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>مبلغ</th>
                  <th>شماره کارت مبدأ</th>
                  <th>شناسه پرداخت</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pendingRequests.length === 0">
                  <td colspan="7" class="text-center text-[var(--text-faint)] py-10">درخواست شارژ در انتظار وجود ندارد</td>
                </tr>
                <tr v-for="r in pendingRequests" :key="r.id">
                  <td>
                    <div class="text-xs font-semibold">{{ r.name || r.username }}</div>
                    <div class="text-[10px] text-[var(--text-muted)]">{{ r.username }}</div>
                  </td>
                  <td class="font-extrabold" dir="ltr">{{ fmtMoney(r.amount) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></td>
                  <td class="text-xs" dir="ltr">{{ maskedCard(r.card) }}</td>
                  <td class="text-xs" dir="ltr">{{ r.paymentId }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--warning-glow)] text-[var(--warning)]">در انتظار</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button class="btn btn-secondary btn-xs" @click="showNote(r)"> جزئیات</button>
                      <button class="btn btn-primary btn-xs" @click="approve(r)">
                        <i class="fas fa-check ml-0.5"></i> تأیید
                      </button>
                      <button class="btn btn-ghost btn-xs !text-[var(--danger)]" @click="reject(r)">
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
                  <td class="text-xs" dir="ltr">{{ r.paymentId }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
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

      <!-- مدیریت کاربران -->
      <section v-else-if="activeTab === 'users'">
        <div class="flex items-center gap-2 mb-3">
          <div class="relative flex-1 max-w-xs">
            <i class="fas fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]"></i>
            <input v-model="q" type="text" class="input !pr-9" placeholder="جستجوی نام کاربری یا نام" />
          </div>
          <span class="text-xs text-[var(--text-muted)]">{{ filteredUsers.length }} کاربر</span>
        </div>

        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش</th>
                  <th>موجودی (تومان)</th>
                  <th>کروکی رایگان</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="usersLoading">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">
                    <i class="fas fa-circle-notch fa-spin ml-1"></i> در حال دریافت کاربران...
                  </td>
                </tr>
                <tr v-else-if="filteredUsers.length === 0">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">کاربری یافت نشد</td>
                </tr>
                <tr v-for="u in filteredUsers" :key="u.id">
                  <td>
                    <div class="text-xs font-semibold">{{ u.name }}</div>
                    <div class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ u.username }}</div>
                  </td>
                  <td>
                    <select v-model="u.role" class="input !py-1.5 !px-2 text-xs w-28" @change="onRole(u)">
                      <option value="user">کاربر</option>
                      <option value="admin">مدیر</option>
                    </select>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <input :value="u.wallet" type="number" min="0" step="10000" class="input !py-1.5 !px-2 text-xs w-28" dir="ltr" @change="onWallet(u, $event)" />
                      <button class="btn btn-ghost btn-xs" @click="addWalletPrompt(u)" title="افزودن مبلغ (شارژ دستی)">
                        <i class="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <input :value="u.freeKroki" type="number" min="0" class="input !py-1.5 !px-2 text-xs w-20" @change="onFree(u, $event)" />
                    </div>
                  </td>
                  <td>
                    <button
                      class="px-2 py-1 rounded-full text-[10px] font-semibold transition"
                      :class="u.active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                      @click="auth.toggleActive(u.id)"
                    >
                      {{ u.active ? "فعال" : "غیرفعال" }}
                    </button>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button class="btn btn-ghost btn-xs" @click="editUser(u)" title="تغییر رمز و نام">
                        <i class="fas fa-pen text-xs"></i>
                      </button>
                      <button v-if="u.id !== user?.id" class="btn btn-ghost btn-xs !text-[var(--danger)]" @click="removeUser(u)" title="حذف کاربر">
                        <i class="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — پنل مدیریتی
    </footer>

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
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">کارت مبدأ</dt><dd class="font-mono" dir="ltr">{{ detail.card || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">شناسه پرداخت</dt><dd class="font-mono" dir="ltr">{{ detail.paymentId }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">توضیحات</dt><dd>{{ detail.note || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">تاریخ درخواست</dt><dd>{{ fmtDate(detail.at) }}</dd></div>
            </dl>
            <div class="flex gap-2 mt-5">
              <button class="btn btn-primary flex-1" @click="approve(detail); detail = null">
                <i class="fas fa-check ml-1"></i> تأیید و افزودن به کیف پول
              </button>
              <button class="btn btn-ghost flex-1 !text-[var(--danger)]" @click="reject(detail); detail = null">
                <i class="fas fa-xmark ml-1"></i> رد درخواست
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { auth, fmtMoney, fmtDate } from "../stores/auth";

defineEmits(["home"]);

const user = computed(() => auth.state.user);
const activeTab = ref("requests");
const usersLoading = ref(false);
const tabs = [
  { id: "requests", label: "شارژها", icon: "fa-money-bill-wave" },
  { id: "users", label: "کاربران", icon: "fa-users" },
];
const q = ref("");
const detail = ref(null);

const stats = computed(() => ({
  users: auth.state.users.length,
  normalUsers: auth.state.users.filter((u) => u.role === "user").length,
  pending: auth.state.requests.filter((r) => r.status === "pending").length,
  totalApproved: auth.state.requests.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0),
}));

const pendingRequests = computed(() => auth.state.requests.filter((r) => r.status === "pending"));
const decidedRequests = computed(() => auth.state.requests.filter((r) => r.status !== "pending").slice(0, 40));
const filteredUsers = computed(() => {
  const needle = q.value.trim().toLowerCase();
  if (!needle) return auth.state.users;
  return auth.state.users.filter((u) => (u.name || "").toLowerCase().includes(needle) || (u.username || "").toLowerCase().includes(needle));
});

function maskedCard(c) {
  const s = String(c || "");
  if (s.length < 8) return s;
  return s.slice(0, 4) + "••••••••" + s.slice(-4);
}
function showNote(r) {
  detail.value = r;
}
function approve(r) {
  const res = auth.approveRequest(r.id);
  if (res.success) {
    detail.value = null;
    alert("شارژ تأیید شد و به کیف پول کاربر افزوده شد.");
  }
}
function reject(r) {
  auth.rejectRequest(r.id);
  detail.value = null;
}

function onRole(u) {
  auth.setRole(u.id, u.role).then((res) => {
    if (!res.success) alert(res.error || "خطا در تغییر نقش کاربر");
  });
}
function onWallet(u, e) {
  auth.setWallet(u.id, e.target.value);
}
function addWalletPrompt(u) {
  const add = prompt("مبلغی که می‌خواهید به کیف پول اضافه شود (تومان):");
  const n = Number(add);
  if (isNaN(n) || n <= 0) return;
  auth.setWallet(u.id, (Number(u.wallet) || 0) + n);
}
function onFree(u, e) {
  auth.setFreeKroki(u.id, e.target.value);
}
function editUser(u) {
  const name = prompt("نام کاربر:", u.name || "");
  if (name === null) return;
  const pass = prompt("رمز عبور جدید (خالی = بدون تغییر):");
  if (pass === null) return;
  auth.editUser(u.id, { name, password: pass }).then((res) => {
    if (!res.success) alert(res.error || "خطا در ویرایش کاربر");
  });
}
function removeUser(u) {
  if (!confirm("کاربر " + u.name + " حذف شود؟")) return;
  auth.removeUser(u.id).then((res) => {
    if (!res.success) alert(res.error || "خطا در حذف کاربر");
  });
}

function logout() {
  auth.logout();
  location.reload();
}

watch(activeTab, () => {
  if (activeTab.value === "users") q.value = "";
});

onMounted(() => {
  const pending = auth.state.requests.filter((r) => r.status === "pending").length;
  if (pending) document.title = "پنل مدیریت — " + pending + " شارژ در انتظار";
  usersLoading.value = true;
  auth.loadUsers().finally(() => {
    usersLoading.value = false;
  });
});
</script>