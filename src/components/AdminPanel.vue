<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <!-- سربرگ -->
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-[1560px] mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button class="lg:hidden btn btn-ghost btn-sm" @click="sidebarOpen = !sidebarOpen">
            <i class="fas fa-bars text-lg"></i>
          </button>
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

    <div class="flex-1 flex max-w-[1560px] w-full mx-auto">
      <!-- سایدبار -->
      <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-overlay lg:hidden" @click="sidebarOpen = false"></div>
        <nav class="sidebar-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="sidebar-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id; sidebarOpen = false"
          >
            <span class="sidebar-icon">
              <i class="fas" :class="tab.icon"></i>
            </span>
            <span class="sidebar-label">{{ tab.label }}</span>
            <span v-if="tab.badge" class="sidebar-badge">{{ tab.badge }}</span>
          </button>
        </nav>
      </aside>

      <!-- محتوا -->
      <main class="flex-1 min-w-0 px-5 py-6">
        <!-- آمار -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">کل کاربران</div>
            <div class="font-extrabold text-2xl">{{ stats.users }}</div>
          </div>
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">کل کروکی‌ها</div>
            <div class="font-extrabold text-2xl">{{ stats.krokis }}</div>
          </div>
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">پرداخت‌های در انتظار</div>
            <div class="font-extrabold text-2xl text-[var(--warning)]">{{ stats.pendingCharges }}</div>
          </div>
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">درآمد</div>
            <div class="font-extrabold text-xl text-[var(--success)]" dir="ltr">{{ fmtMoney(stats.revenue) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></div>
          </div>
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">کروکی‌های پرداختی</div>
            <div class="font-extrabold text-2xl text-[var(--info)]">{{ stats.paid }}</div>
          </div>
          <div class="card !rounded-2xl p-4">
            <div class="text-[11px] text-[var(--text-muted)] mb-1">مجموع موجودی کیف پول‌ها</div>
            <div class="font-extrabold text-xl text-[var(--accent-soft)]" dir="ltr">{{ fmtMoney(stats.walletTotal) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></div>
          </div>
        </div>

        <!-- تب‌ها -->
        <RequestsTab v-if="activeTab === 'requests'" />
        <UsersTab v-else-if="activeTab === 'users'" :q="usersQuery" :loading="usersLoading" @update:q="usersQuery = $event" @edit="showEditUser" @add-wallet="showAddWallet" />
        <KrokisAdminTab v-else-if="activeTab === 'krokis'" :status="krokiStatus" @update:status="krokiStatus = $event" />
        <TransactionsTab v-else-if="activeTab === 'transactions'" />
        <RolesTab v-else-if="activeTab === 'roles'" />
        <ReferralsTab v-else-if="activeTab === 'referrals'" @go-to-user="goToUser" />
        <FreeAccessTab v-else-if="activeTab === 'freeAccess'" />
        <AgencyRequestsTab v-else-if="activeTab === 'agencyRequests'" />
        <ExpertRequestsTab v-else-if="activeTab === 'expertRequests'" />
        <ExpertsTab v-else-if="activeTab === 'experts'" />
        <AgentsTab v-else-if="activeTab === 'agents'" :city-filter="agentCityFilter" @update:cityFilter="agentCityFilter = $event" />
      </main>
    </div>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — پنل مدیریتی
    </footer>

    <!-- مودال ویرایش کاربر -->
    <Teleport to="body">
      <UserEditModal v-if="editModal" :modal="editModal" @close="editModal = null" />
    </Teleport>

    <!-- مودال شارژ دستی کیف پول -->
    <Teleport to="body">
      <AddCreditModal v-if="addWalletModal" :modal="addWalletModal" @close="addWalletModal = null" />
    </Teleport>

    <!-- نوتیفیکیشن -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="toast" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.3)" @click.self="toast = null">
          <div class="card !rounded-2xl max-w-xs w-full modal text-center">
            <div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" :class="toast.type === 'success' ? 'bg-[var(--success-glow)]' : 'bg-[var(--danger-glow)]'">
              <i class="fas text-xl" :class="toast.type === 'success' ? 'fa-check text-[var(--success)]' : 'fa-xmark text-[var(--danger)]'"></i>
            </div>
            <p class="text-sm font-semibold mb-4">{{ toast.message }}</p>
            <button class="btn btn-primary w-full" @click="toast = null">بستن</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, provide, reactive, ref, watch } from "vue";
import { auth, fmtMoney } from "../stores/auth";

const RequestsTab = defineAsyncComponent(() => import("./admin/RequestsTab.vue"));
const UsersTab = defineAsyncComponent(() => import("./admin/UsersTab.vue"));
const KrokisAdminTab = defineAsyncComponent(() => import("./admin/KrokisAdminTab.vue"));
const TransactionsTab = defineAsyncComponent(() => import("./admin/TransactionsTab.vue"));
const RolesTab = defineAsyncComponent(() => import("./admin/RolesTab.vue"));
const ReferralsTab = defineAsyncComponent(() => import("./admin/ReferralsTab.vue"));
const FreeAccessTab = defineAsyncComponent(() => import("./admin/FreeAccessTab.vue"));
const AgencyRequestsTab = defineAsyncComponent(() => import("./admin/AgencyRequestsTab.vue"));
const ExpertRequestsTab = defineAsyncComponent(() => import("./admin/ExpertRequestsTab.vue"));
const ExpertsTab = defineAsyncComponent(() => import("./admin/ExpertsTab.vue"));
const AgentsTab = defineAsyncComponent(() => import("./admin/AgentsTab.vue"));
const UserEditModal = defineAsyncComponent(() => import("./admin/UserEditModal.vue"));
const AddCreditModal = defineAsyncComponent(() => import("./admin/AddCreditModal.vue"));

defineEmits(["home"]);

const user = computed(() => auth.state.user);
const activeTab = ref("requests");
const sidebarOpen = ref(false);
const usersLoading = ref(false);
const toast = ref(null);

/* جستجوی کاربران در تب کاربران (با @update:q بین والد و فرزند همگام می‌شود) */
const usersQuery = ref("");
const krokiStatus = ref("");
const agentCityFilter = ref("");

const stats = computed(() => ({
  users: auth.state.stats?.users ?? 0,
  krokis: auth.state.stats?.krokis ?? 0,
  paid: auth.state.stats?.paid ?? 0,
  pendingCharges: auth.state.stats?.pendingCharges ?? 0,
  revenue: auth.state.stats?.revenue ?? 0,
  walletTotal: auth.state.stats?.walletTotal ?? 0,
}));

const tabs = computed(() => [
  { id: "requests", label: "شارژها", icon: "fa-money-bill-wave", badge: stats.value.pendingCharges || null },
  { id: "users", label: "کاربران", icon: "fa-users", badge: null },
  { id: "krokis", label: "کروکی‌ها", icon: "fa-drafting-compass", badge: null },
  { id: "transactions", label: "تراکنش‌ها", icon: "fa-clock-rotate-left", badge: null },
  { id: "roles", label: "نقش‌ها", icon: "fa-user-shield", badge: null },
  { id: "referrals", label: "طرح ها", icon: "fa-ticket", badge: null },
  { id: "freeAccess", label: "روزهای رایگان", icon: "fa-calendar-days", badge: null },
  { id: "agencyRequests", label: "درخواست نمایندگی", icon: "fa-user-clock", badge: pendingAgencyCount.value || null },
  { id: "expertRequests", label: "درخواست‌های همکاری", icon: "fa-handshake", badge: pendingExpertCount.value || null },
  { id: "experts", label: "کارشناسان", icon: "fa-user-tie", badge: null },
  { id: "agents", label: "نمایندگان", icon: "fa-sitemap", badge: null },
]);

const pendingAgencyCount = computed(() => auth.state.agencyRequests.filter((r) => r.status === "pending").length);
const pendingExpertCount = computed(() => (auth.state.expertRequests || []).filter((r) => r.status === "pending").length);

/* اعلان مشترک همه تب‌ها و مودال‌ها (مودال نوتیفیکیشن در همین پوسته است) */
provide("notify", notify);

function notify(message, type = "success") {
  toast.value = { message, type };
}

/* ───────── مودال ویرایش کاربر و شارژ دستی کیف پول ───────── */
const editModal = ref(null);
const addWalletModal = ref(null);

function showEditUser(u) {
  editModal.value = {
    user: u,
    name: u.name || "",
    phone: u.phone || "",
    nationalId: u.nationalId || "",
    city: u.city || "",
    password: "",
    freeAccessDays: "",
    error: "",
    saving: false,
  };
}

function showAddWallet(u) {
  addWalletModal.value = { user: u, amount: "", saving: false };
}

/* رفتن از تب کدهای شخصی به تب کاربران و جستجوی همان کاربر */
function goToUser(id) {
  const u = auth.state.users.find((x) => String(x.id) === String(id));
  activeTab.value = "users";
  if (u) usersQuery.value = u.username || "";
}

function logout() {
  auth.logout();
  location.reload();
}

const tabLoaded = reactive({ krokis: false, transactions: false, roles: false, referrals: false, agencyRequests: false, agents: false, expertRequests: false, experts: false });

watch(activeTab, (tab) => {
  if (tab === "krokis" && !tabLoaded.krokis) {
    tabLoaded.krokis = true;
    auth.loadAdminKrokis("");
  } else if (tab === "transactions" && !tabLoaded.transactions) {
    tabLoaded.transactions = true;
    auth.loadAdminTransactions();
  } else if (tab === "roles" && !tabLoaded.roles) {
    tabLoaded.roles = true;
    auth.loadRoles();
  } else if (tab === "referrals" && !tabLoaded.referrals) {
    tabLoaded.referrals = true;
    auth.loadAllReferrals();
    auth.loadPersonalReferralCodes().catch(() => {});
    if (!auth.state.users.length) auth.loadUsers().catch(() => {});
  } else if (tab === "agencyRequests") {
    tabLoaded.agencyRequests = true;
    auth.loadAgencyRequests();
  } else if (tab === "expertRequests") {
    tabLoaded.expertRequests = true;
    auth.loadExpertRequests();
  } else if (tab === "experts") {
    tabLoaded.experts = true;
    auth.loadExperts();
  } else if (tab === "agents" && !tabLoaded.agents) {
    tabLoaded.agents = true;
    auth.loadAdminAgents("");
  }
});

watch(krokiStatus, (s) => auth.loadAdminKrokis(s));
watch(agentCityFilter, (c) => auth.loadAdminAgents(c));

onMounted(() => {
  const pending = auth.state.requests.filter((r) => r.status === "pending").length;
  if (pending) document.title = "پنل مدیریت — " + pending + " شارژ در انتظار";
  auth.loadStats();
  auth.loadAllCharges();
  usersLoading.value = true;
  auth.loadUsers().finally(() => {
    usersLoading.value = false;
  });
});
</script>

<style scoped>
.admin-sidebar {
  position: relative;
  flex-shrink: 0;
  width: 240px;
}

@media (max-width: 1023px) {
  .admin-sidebar {
    position: fixed;
    top: 64px;
    right: 0;
    bottom: 0;
    z-index: 30;
    width: 260px;
    transform: translateX(100%);
    transition: transform 0.35s var(--ease-out);
  }
  .admin-sidebar.open {
    transform: translateX(0);
  }
}

.sidebar-overlay {
  display: none;
}
@media (max-width: 1023px) {
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    top: 64px;
    background: rgba(11, 21, 36, 0.3);
    z-index: -1;
  }
}

.sidebar-nav {
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 12px;
  background: var(--surface);
  border-left: 1px solid var(--border);
}

@media (max-width: 1023px) {
  .sidebar-nav {
    height: 100%;
    border-radius: 0;
    border-left: none;
    background: var(--bg);
  }
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.2s var(--ease-out);
  text-align: right;
  user-select: none;
}

.sidebar-item:hover:not(.active) {
  color: var(--text);
  background: var(--surface2);
}

.sidebar-item.active {
  background: var(--accent);
  color: #241a05;
  box-shadow: 0 4px 16px var(--accent-glow-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.sidebar-item:active:not(:disabled) {
  transform: scale(0.98);
}

.sidebar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  flex-shrink: 0;
  transition: all 0.2s var(--ease-out);
}

.sidebar-item.active .sidebar-icon {
  background: rgba(36, 26, 5, 0.15);
}

.sidebar-label {
  flex: 1;
  line-height: 1;
  white-space: nowrap;
}

.sidebar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  background: var(--danger);
  color: white;
}

.sidebar-item.active .sidebar-badge {
  background: #241a05;
  color: white;
}

/* انیمیشن بخش‌ها (روی ریشه <section> هر تب فرزند اعمال می‌شود) */
section {
  animation: fadeSlideIn 0.35s var(--ease-out);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
