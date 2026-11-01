<template>
  <section>
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1 max-w-xs">
        <i class="fas fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]"></i>
        <input :value="q" @input="$emit('update:q', $event.target.value)" type="text" class="input !pr-9" placeholder="جستجوی نام کاربری یا نام" />
      </div>
      <span class="text-xs text-[var(--text-muted)]">{{ filteredUsers.length }} کاربر</span>
    </div>

    <div class="card !rounded-2xl overflow-hidden users-table">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>شهر</th>
              <th>نقش</th>
              <th>موجودی (تومان)</th>
              <th>کروکی رایگان</th>
              <th>کد معرف شخصی</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center text-[var(--text-faint)] py-10">
                <i class="fas fa-circle-notch fa-spin ml-1"></i> در حال دریافت کاربران...
              </td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="8" class="text-center text-[var(--text-faint)] py-10">کاربری یافت نشد</td>
            </tr>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td>
                <div class="text-xs font-semibold">{{ u.name }}</div>
                <div class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ u.username }}</div>
                <div class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ u.phone }}</div>
              </td>
              <td class="text-xs">{{ u.city || "—" }}</td>
              <td>
                <div class="role-dropdown" :class="{ open: roleOpenId === u.id }">
                  <button class="role-trigger" @click.stop="roleOpenId = roleOpenId === u.id ? null : u.id">
                    <span class="role-dot" :class="u.role === 'admin' ? 'admin' : u.role === 'agent' ? 'agent' : 'user'"></span>
                    <span class="role-text">{{ u.role === 'admin' ? 'مدیر' : u.role === 'agent' ? 'نماینده' : 'کاربر' }}</span>
                    <i class="fas fa-chevron-down role-chevron"></i>
                  </button>
                  <Transition name="drop">
                    <div v-if="roleOpenId === u.id" class="role-menu">
                      <button class="role-option" :class="{ selected: u.role === 'user' }" @click="setRole(u, 'user'); roleOpenId = null">
                        <span class="role-dot user"></span>
                        کاربر
                      </button>
                      <button class="role-option" :class="{ selected: u.role === 'agent' }" @click="setRole(u, 'agent'); roleOpenId = null">
                        <span class="role-dot agent"></span>
                        نماینده
                      </button>
                      <button class="role-option" :class="{ selected: u.role === 'admin' }" @click="setRole(u, 'admin'); roleOpenId = null">
                        <span class="role-dot admin"></span>
                        مدیر
                      </button>
                    </div>
                  </Transition>
                </div>
              </td>
              <td>
                <div class="field-card wallet-field">
                  <div class="field-icon-wrap wallet-icon">
                    <i class="fas fa-wallet"></i>
                  </div>
                  <div class="field-content">
                    <div class="field-value" dir="ltr">{{ fmtMoney(u.wallet) }}</div>
                    <span class="field-unit">تومان</span>
                  </div>
                  <button class="field-action-btn wallet-action" @click="showAddWallet(u)" title="افزودن مبلغ (شارژ دستی)">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
              </td>
              <td>
                <div class="field-card freekroki-field">
                  <div class="field-icon-wrap freekroki-icon">
                    <i class="fas fa-drafting-compass"></i>
                  </div>
                  <div class="field-content">
                    <input :value="u.freeKroki" type="number" min="0" class="field-input" @change="onFree(u, $event)" />
                    <span class="field-unit">عدد</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <input
                    type="text"
                    class="input !w-24 !py-1.5 !text-xs text-center tracking-widest"
                    dir="ltr"
                    placeholder="—"
                    :value="referralCodeDrafts[u.id] ?? u.referralCode ?? ''"
                    @input="referralCodeDrafts[u.id] = $event.target.value"
                    @keyup.enter="saveUserReferralCode(u)"
                  />
                  <button class="btn btn-secondary btn-xs" :disabled="busy" title="ثبت کد معرف برای این کاربر" @click="saveUserReferralCode(u)">
                    <i class="fas fa-check text-xs"></i>
                  </button>
                  <button v-if="u.referralCode" class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" title="حذف کد معرف شخصی" @click="deleteUserReferralCode(u)">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
              <td>
                <button
                  class="px-2 py-1 rounded-full text-[10px] font-semibold transition"
                  :class="u.active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                  :disabled="busy"
                  @click="toggleActive(u)"
                >
                  {{ u.active ? "فعال" : "غیرفعال" }}
                </button>
              </td>
              <td>
                <div class="flex items-center gap-1.5">
                  <button class="btn btn-ghost btn-xs" @click="showEditUser(u)" title="ویرایش اطلاعات کاربر">
                    <i class="fas fa-pen text-xs"></i>
                  </button>
                  <button
                    class="btn btn-ghost btn-xs !text-[var(--danger)]"
                    :disabled="deletingUserId === u.id || String(u.id) === String(auth.state.user?.id)"
                    :title="String(u.id) === String(auth.state.user?.id) ? 'نمی‌توانید خودتان را حذف کنید' : 'حذف کاربر'"
                    @click="removeUser(u)"
                  >
                    <i class="fas text-xs" :class="deletingUserId === u.id ? 'fa-circle-notch fa-spin' : 'fa-trash'"></i>
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
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { auth, fmtMoney } from "../../stores/auth";

const props = defineProps({
  q: { type: String, default: "" },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(["update:q", "edit", "add-wallet"]);

const notify = inject("notify", () => {});

const busy = ref(false);
const roleOpenId = ref(null);
const deletingUserId = ref(null);
const referralCodeDrafts = reactive({});

const filteredUsers = computed(() => {
  const needle = props.q.trim().toLowerCase();
  if (!needle) return auth.state.users;
  return auth.state.users.filter((u) => (u.name || "").toLowerCase().includes(needle) || (u.username || "").toLowerCase().includes(needle));
});

async function setRole(u, role) {
  const res = await auth.setRole(u.id, role);
  if (!res.success) notify(res.error || "خطا در تغییر نقش کاربر", "error");
}

async function onFree(u, e) {
  const res = await auth.setFreeKroki(u.id, e.target.value);
  if (!res.success) notify(res.error || "خطا در تغییر کروکی رایگان", "error");
}

async function toggleActive(u) {
  const res = await auth.toggleActive(u.id);
  if (!res.success) notify(res.error || "خطا در تغییر وضعیت کاربر", "error");
}

function showAddWallet(u) {
  emit("add-wallet", u);
}

function showEditUser(u) {
  emit("edit", u);
}

async function removeUser(u) {
  const label = `${u.name || u.username || ""}`.trim() || "این کاربر";
  if (!confirm(`کاربر «${label}» برای همیشه حذف شود؟\nکروکی‌ها، تراکنش‌ها و قالب‌های او هم پاک می‌شود.`)) return;
  deletingUserId.value = u.id;
  try {
    const res = await auth.deleteUser(u.id);
    if (res.success) notify(`کاربر «${label}» حذف شد.`);
    else notify(res.error || "خطا در حذف کاربر", "error");
  } finally {
    deletingUserId.value = null;
  }
}

async function saveUserReferralCode(u) {
  const draft = referralCodeDrafts[u.id] ?? u.referralCode ?? "";
  if (!String(draft || "").trim()) {
    notify("کد معرف را وارد کنید", "error");
    return;
  }
  busy.value = true;
  const res = await auth.adminSetUserReferralCode(u.id, draft);
  busy.value = false;
  if (res.success) {
    delete referralCodeDrafts[u.id];
    notify(`کد معرف ${u.name || u.username} ثبت شد: ${res.code}`);
  } else {
    notify(res.error || "خطا در ثبت کد معرف کاربر", "error");
  }
}

async function deleteUserReferralCode(u) {
  if (!confirm(`کد شخصی «${u.referralCode}» حذف شود؟`)) return;
  busy.value = true;
  const res = await auth.adminDeleteUserReferralCode(u.id);
  busy.value = false;
  if (res.success) {
    delete referralCodeDrafts[u.id];
    notify("کد شخصی حذف شد.");
  } else {
    notify(res.error || "خطا در حذف کد شخصی", "error");
  }
}

function closeRoleDropdown() {
  roleOpenId.value = null;
}

onMounted(() => {
  document.addEventListener("click", closeRoleDropdown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeRoleDropdown);
});
</script>

<style scoped>
/* جدول کاربران: فشرده تا بدون اسکرول افقی جا شود */
.users-table th,
.users-table td {
  padding: 8px 10px;
  font-size: 11px;
}
.users-table .field-card {
  min-width: 148px;
  gap: 4px;
}
.users-table .role-trigger {
  white-space: nowrap;
}

/* فیلدهای زیبا */
.role-dropdown {
  position: relative;
  display: inline-block;
}

.role-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  transition: all 0.2s var(--ease-out);
  min-width: 110px;
}

.role-trigger:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.role-dropdown.open .role-trigger {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.role-dot.admin {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow-strong);
}

.role-dot.user {
  background: var(--info);
  box-shadow: 0 0 6px var(--info-glow);
}

.role-dot.agent {
  background: var(--warning);
  box-shadow: 0 0 6px var(--warning-glow);
}

.role-text {
  flex: 1;
  text-align: right;
}

.role-chevron {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.2s var(--ease-out);
}

.role-dropdown.open .role-chevron {
  transform: rotate(180deg);
}

.role-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 20;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: right;
  transition: all 0.15s var(--ease-out);
}

.role-option:hover {
  background: var(--surface2);
  color: var(--text);
}

.role-option.selected {
  background: var(--accent-glow);
  color: var(--accent);
}

.role-option.selected .role-dot {
  box-shadow: 0 0 8px var(--accent-glow-strong);
}

.drop-enter-active {
  transition: all 0.2s var(--ease-out);
}
.drop-leave-active {
  transition: all 0.15s ease-in;
}
.drop-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

/* فیلدهای زیبا */
.field-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 4px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  transition: all 0.2s var(--ease-out);
  min-width: 170px;
}

.field-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.field-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 12px;
  flex-shrink: 0;
}

.wallet-icon {
  background: linear-gradient(135deg, var(--success-glow), rgba(31, 161, 92, 0.05));
  color: var(--success);
}

.freekroki-icon {
  background: linear-gradient(135deg, var(--accent-glow), rgba(250, 108, 4, 0.05));
  color: var(--accent);
}

.field-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.field-value {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  min-width: 0;
}

.field-input {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: background 0.15s;
}

.field-input:hover {
  background: var(--surface2);
}

.field-input:focus {
  background: var(--bg-elevated);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.field-unit {
  font-size: 10px;
  color: var(--text-faint);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.field-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  flex-shrink: 0;
  transition: all 0.2s var(--ease-out);
}

.wallet-action:hover {
  background: var(--success-glow);
  color: var(--success);
  border-color: var(--success);
}
</style>
